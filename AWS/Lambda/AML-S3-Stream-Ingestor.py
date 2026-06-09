import csv
import json
import boto3
import os
import codecs

s3_client = boto3.client('s3', region_name='eu-central-1')
dynamodb = boto3.resource('dynamodb', region_name='eu-central-1')
ledger_table = dynamodb.Table('Transactions-Ledger')

BUCKET_NAME = 'aml-raw-ingestion-pool'
FILE_KEY = 'HI-Small_Trans.csv'
STATE_FILE = '/tmp/checkpoint.txt'
BATCH_SIZE = 20  # Number of transactions to process per minute

def lambda_handler(event, context):
    try:
        # 1. Get the current line checkpoint (if running on a warm container)
        start_row = 0
        if os.path.exists(STATE_FILE):
            with open(STATE_FILE, 'r') as f:
                start_row = int(f.read().strip())

        print(f"Starting ingestion batch from S3 line checkpoint: {start_row}")

        # 2. Open a stream link straight out of S3
        response = s3_client.get_object(Bucket=BUCKET_NAME, Key=FILE_KEY)
        stream_reader = codecs.getreader('utf-8')(response['Body'])
        csv_reader = csv.DictReader(stream_reader)

        processed_count = 0
        current_row_idx = 0

        for row in csv_reader:
            current_row_idx += 1
            
            # Fast-forward to our last saved checkpoint
            if current_row_idx <= start_row:
                continue

            # Remap IBM dataset properties onto our Ledger table schema
            transaction_id = f"TX-IBM-{current_row_idx:05d}"
            try:
                amount_raw = float(row.get('Amount Paid', 0))
            except ValueError:
                amount_raw = 0.0

            currency = row.get('Payment Currency', 'USD')
            origin_country = 'USA' if currency == 'USD' else 'DEU'
            dest_country = 'CHE' if 'Pattern' in row.get('Payment Format', '') else 'FRA'

            ledger_payload = {
                'id': transaction_id,
                'amount': int(amount_raw),
                'currency': currency,
                'origin_country': origin_country,
                'dest_country': dest_country,
                'ibm_meta': {
                    'from_account': row.get('Account'),
                    'to_account': row.get('Account.1'),
                    'format': row.get('Payment Format'),
                    'is_laundering_ground_truth': int(row.get('Is Laundering', 0))
                }
            }

            # Push to DynamoDB (Triggers the downstream AML-Risk-Escalator Step Function)
            ledger_table.put_item(Item=ledger_payload)
            processed_count += 1

            # Break out of loop once the designated minute batch size is filled
            if processed_count >= BATCH_SIZE:
                break

        # 3. Save the new checkpoint position for the next invocation run
        new_checkpoint = start_row + processed_count
        with open(STATE_FILE, 'w') as f:
            f.write(str(new_checkpoint))

        print(f"Batch processed successfully. Advanced checkpoint to line: {new_checkpoint}")
        return {
            'statusCode': 200,
            'body': f"Successfully streamed {processed_count} records to DynamoDB."
        }

    except Exception as e:
        print(f"Error executing cloud stream batch: {str(e)}")
        return {'statusCode': 500, 'body': json.dumps({'error': str(e)})}
