import json
import csv
import boto3
import codecs

s3_client = boto3.client('s3')
BUCKET_NAME = 'aml-raw-ingestion-pool'

def lambda_handler(event, context):
    try:
        accounts_obj = s3_client.get_object(Bucket=BUCKET_NAME, Key='HI-Small_accounts.csv')
        accounts_reader = csv.DictReader(codecs.getreader('utf-8')(accounts_obj['Body']))
        
        accounts_list = []
        for row in accounts_reader:
            accounts_list.append({
                "bank_name": row.get('Bank Name'),
                "bank_id": row.get('Bank ID'),
                "account_number": row.get('Account Number'),
                "entity_id": row.get('Entity ID'),
                "entity_name": row.get('Entity Name')
            })

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({"accounts": accounts_list})
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({"error": str(e)})
        }
