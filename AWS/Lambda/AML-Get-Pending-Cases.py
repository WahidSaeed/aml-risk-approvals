import json
import boto3
from boto3.dynamodb.conditions import Attr

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('AML-Pending-Reviews')

def lambda_handler(event, context):
    try:
        # Scan the table for items matching the pending review status
        response = table.scan(
            FilterExpression=Attr('Status').eq('PENDING_HUMAN_REVIEW')
        )
        items = response.get('Items', [])
        
        # Transform DynamoDB types into clean JSON-serializable types
        formatted_cases = []
        for item in items:
            formatted_cases.append({
                'id': item.get('TransactionID'),
                'token': item.get('TaskToken'),
                'amount': float(item.get('Amount', 0)),
                'currency': item.get('Currency'),
                'origin': item.get('OriginCountry'),
                'destination': item.get('DestCountry'),
                'riskScore': float(item.get('RiskScore', 0)),
                'reasoning': item.get('Reasoning')
            })
            
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*', # Enable CORS for frontend requests
                'Content-Type': 'application/json'
            },
            'body': json.dumps(formatted_cases)
        }
        
    except Exception as e:
        print(f"Error fetching cases: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
