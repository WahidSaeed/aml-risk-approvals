import json
import boto3
import codecs

s3_client = boto3.client('s3')
BUCKET_NAME = 'aml-raw-ingestion-pool'

def lambda_handler(event, context):
    try:
        # 1. Parse API Gateway connection metadata parameters
        request_context = event.get('requestContext', {})
        connection_id = request_context.get('connectionId')
        domain_name = request_context.get('domainName')
        stage = request_context.get('stage')
        
        # Initialize the API Gateway Management client to push frames down the pipe
        apigateway_client = boto3.client(
            'apigatewaymanagementapi', 
            endpoint_url=f"https://{domain_name}/{stage}"
        )

        # Handle the Lambda Proxy Integration wrapper body parsing safely
        body = event.get('body', '{}')
        if isinstance(body, str):
            try:
                body_json = json.loads(body)
            except Exception:
                body_json = {}
        else:
            body_json = body

        action = body_json.get('action')
        seed_account = body_json.get('accountNumber')

        # Life-cycle gatekeeper: Bypasses execution during the initial connection handshake ($connect)
        if action != 'startTrace' or not seed_account:
            print(f"Lifecycle pass-through event triggered for session connection: {connection_id}")
            return {'statusCode': 200, 'body': 'Handshake complete.'}

        print(f"Executing decoupled node/edge zero-buffer stream for seed: {seed_account}")

        # 2. Open live line-buffered S3 reader
        response = s3_client.get_object(Bucket=BUCKET_NAME, Key='HI-Small_Trans.csv')
        line_reader = codecs.getreader('utf-8')(response['Body'])
        
        # Read the first line, strip whitespace, and scrub hidden UTF-8 BOM characters
        raw_header_line = next(line_reader)
        headers = [h.strip().replace('\ufeff', '').lower() for h in raw_header_line.split(',')]
        print(f"Detected and normalized CSV columns: {headers}")

        # Applying explicit structural index mapping to resolve the double 'account' column layout
        print("Applying explicit structural index mapping for transaction ledger schema.")
        time_idx   = 0  # 'timestamp'
        from_idx   = 2  # First 'account' field position (Sender)
        to_idx     = 4  # Second 'account' field position (Recipient)
        
        # Dynamic lookup for financial numeric data columns
        if 'amount paid' in headers:
            amount_idx = headers.index('amount paid')
        elif 'amount received' in headers:
            amount_idx = headers.index('amount received')
        else:
            amount_idx = 7  # Sensible structural fallback position
            
        # Dynamic lookup for currency tracking strings
        if 'payment currency' in headers:
            currency_idx = headers.index('payment currency')
        elif 'receiving currency' in headers:
            currency_idx = headers.index('receiving currency')
        else:
            currency_idx = None

        # Dynamic lookup for execution layout format types
        if 'payment format' in headers:
            format_idx = headers.index('payment format')
        elif 'format' in headers:
            format_idx = headers.index('format')
        else:
            format_idx = None

        # Tracking sets to keep memory overhead perfectly constant O(1)
        tracked_accounts = {seed_account}
        emitted_nodes = set()
        match_count = 0

        # Send the initial seed node frame first so the graph layout anchors immediately
        seed_node_frame = {
            "event": "NODE_DISCOVERED",
            "data": { "id": seed_account, "label": f"Seed Node\n..{seed_account[-4:]}", "isCenter": True }
        }
        apigateway_client.post_to_connection(Data=json.dumps(seed_node_frame), ConnectionId=connection_id)
        emitted_nodes.add(seed_account)

        # 3. Stream-scan transaction rows sequentially without data caching
        for line in line_reader:
            columns = [c.strip() for c in line.split(',')]
            if len(columns) <= max(from_idx, to_idx, amount_idx):
                continue
                
            from_acc = columns[from_idx]
            to_acc = columns[to_idx]

            if from_acc in tracked_accounts:
                match_count += 1

                # STREAM STEP A: Check and stream the SENDER node if the browser hasn't seen it yet
                if from_acc not in emitted_nodes:
                    node_frame = {
                        "event": "NODE_DISCOVERED",
                        "data": { "id": from_acc, "label": f"Entity\n..{from_acc[-4:]}", "isCenter": False }
                    }
                    try:
                        apigateway_client.post_to_connection(Data=json.dumps(node_frame), ConnectionId=connection_id)
                        emitted_nodes.add(from_acc)
                    except apigateway_client.exceptions.GoneException:
                        print("Client socket channel closed. Aborting stream.")
                        break

                # STREAM STEP B: Check and stream the RECIPIENT node on the fly
                if to_acc not in emitted_nodes:
                    node_frame = {
                        "event": "NODE_DISCOVERED",
                        "data": { "id": to_acc, "label": f"Entity\n..{to_acc[-4:]}", "isCenter": False }
                    }
                    try:
                        apigateway_client.post_to_connection(Data=json.dumps(node_frame), ConnectionId=connection_id)
                        emitted_nodes.add(to_acc)
                    except apigateway_client.exceptions.GoneException:
                        print("Client socket channel closed. Aborting stream.")
                        break

                # Parse out amount value safely
                try:
                    raw_amount = columns[amount_idx]
                    amount_val = float(raw_amount) if raw_amount else 0.0
                except ValueError:
                    amount_val = 0.0

                # STREAM STEP C: Now emit the pulsing transactional edge linking them together
                edge_frame = {
                    "event": "EDGE_PULSED",
                    "data": {
                        "timestamp": columns[time_idx],
                        "from_account": from_acc,
                        "to_account": to_acc,
                        "amount": amount_val,
                        "currency": columns[currency_idx] if currency_idx is not None else "USD",
                        "format": columns[format_idx] if format_idx is not None else "Transfer"
                    }
                }
                try:
                    apigateway_client.post_to_connection(Data=json.dumps(edge_frame), ConnectionId=connection_id)
                except apigateway_client.exceptions.GoneException:
                    print("Client socket channel closed. Aborting stream.")
                    break

                # Expand the tracking watch network dynamically for downstream jumps
                tracked_accounts.add(to_acc)

                # Safe breakout ceiling for real-time visualization throttle
                if match_count >= 120:
                    print("Reached visual throttle cutoff threshold of 120 matches. Breaking scan.")
                    break

        # 4. Dispatch close channel handshake completion signal
        try:
            apigateway_client.post_to_connection(Data=json.dumps({"event": "STREAM_COMPLETE"}), ConnectionId=connection_id)
        except Exception:
            pass

        return {'statusCode': 200, 'body': 'Streams finalized.'}

    except Exception as e:
        print(f"Exception broken loop trigger: {str(e)}")
        return {'statusCode': 500, 'body': str(e)}
