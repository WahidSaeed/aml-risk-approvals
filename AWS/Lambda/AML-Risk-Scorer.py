import json
import boto3

bedrock = boto3.client(service_name='bedrock-runtime', region_name='eu-central-1')

def lambda_handler(event, context):
    transaction = event.get('transaction', {})
    model_id = "qwen.qwen3-coder-30b-a3b-v1:0"

    system_prompt = "You are an AML risk scorer. Output ONLY raw JSON. No markdown. No text."
    user_prompt = f"Analyze this for AML risk and return JSON with keys 'risk_score' (value should be between 0 for low to 1 for high) and 'reasoning': {json.dumps(transaction)}"

    try:
        response = bedrock.converse(
            modelId=model_id,
            messages=[{"role": "user", "content": [{"text": user_prompt}]}],
            system=[{"text": system_prompt}],
            inferenceConfig={"maxTokens": 512, "temperature": 0.1} # Low temp = more stable JSON
        )

        ai_text = response['output']['message']['content'][0]['text']
        
        clean_json = ai_text.strip().replace('```json', '').replace('```', '').strip()
        
        result = json.loads(clean_json)
        
        return {
            "transaction_id": transaction.get('id'),
            "risk_score": float(result.get('risk_score', 0)),
            "reasoning": result.get('reasoning', "No reasoning provided")
        }

    except Exception as e:
        print(f"Error detail: {str(e)}")
        raise e
