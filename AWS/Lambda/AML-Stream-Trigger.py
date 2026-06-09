import json
import boto3

sfn_client = boto3.client('stepfunctions')
STATE_MACHINE_ARN = 'arn:aws:states:eu-central-1:003325263234:stateMachine:AML-Risk-Escalator'

def lambda_handler(event, context):
    try:
        print(f"Processing event payload data: {json.dumps(event)}")
        print(f"Processing batch of {len(event['Records'])} database stream records.")
        
        for record in event['Records']:
            # We ONLY intercept new insertions into our ledger
            if record['eventName'] == 'INSERT':
                new_image = record['dynamodb']['NewImage']
                
                # Unpack the native DynamoDB typed JSON into standard clean JSON
                transaction_id = new_image['id']['S']
                amount = float(new_image['amount']['N'])
                currency = new_image['currency']['S']
                origin_country = new_image['origin_country']['S']
                dest_country = new_image['dest_country']['S']
                
                # Format the exact payload layout the Step Function expects
                state_machine_input = {
                    "transaction": {
                        "id": transaction_id,
                        "amount": amount,
                        "currency": currency,
                        "origin_country": origin_country,
                        "dest_country": dest_country
                    }
                }
                
                # Execute the State Machine asynchronously
                execution_name = f"Auto-AML-{transaction_id}"
                
                print(f"Launching automated risk escalator execution for ID: {transaction_id}")
                sfn_client.start_execution(
                    stateMachineArn=STATE_MACHINE_ARN,
                    name=execution_name,
                    input=json.dumps(state_machine_input)
                )
                
        return {
            'statusCode': 200,
            'body': json.dumps('Successfully routed stream mutations to Step Functions.')
        }
        
    except Exception as e:
        print(f"Error handling stream ingestion batch: {str(e)}")
        # Raise exception to ensure DynamoDB Stream retries and maintains zero data loss guarantee
        raise e
