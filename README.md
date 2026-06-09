```markdown
# Human-in-the-Loop (HITL) AI Anti-Money Laundering Orchestration Engine

An enterprise-grade, serverless compliance blueprint demonstrating how to manage, track, and resume long-running financial auditing workflows in the cloud. By pairing **AWS Step Functions** (`waitForTaskToken` pattern) with **Amazon Bedrock**, **AWS Lambda**, and **Next.js**, this architecture safely pauses a live compliance workflow indefinitely when high-risk anomalies are discovered. It presents an AI-augmented network graph and narrative summary to a human auditor and seamlessly resumes the cloud pipeline the millisecond a decision is submitted—all with zero idle server costs.

---

## 📌 Core Architectural Design & Data Flow

Traditional request-response systems struggle with human decision gates because human compliance reviews take hours or days to complete. Keeping a compute container active to "wait" for an auditor's choice is expensive and breaches maximum timeout boundaries. 

This architecture addresses the problem using an entirely event-driven, tokenized callback structure:


```

[Synthetic CSV Stream]
│ (EventBridge / 20 rows/min)
▼
[AML-S3-Stream-Ingestor] ──> Writes Items ──> [Transactions-Ledger NoSQL]
│
(DynamoDB Stream)
▼
[AML-Stream-Router Lambda]
│
(Starts Execution)
▼
[AML-Risk-Escalator Step Function]
│
(If Algorithmic Risk >= 75)
▼
[waitForTaskToken Milestone]
(Freezes State / Saves Token)
│
┌──────────────┴──────────────┐
▼                             ▼
[Amazon Bedrock Brain]        [Next.js Compliance Dashboard]
(Streams Narrative Analysis)   (Pulls Active Tokens Queue)
└──────────────┬──────────────┘
│
(Human Reviews)
▼
[Auditor Clicks "Approve"]
│
(POST to API Edge)
▼
[AML-Case-Resolver Lambda]
│
(send_task_success + Notes)
▼
[Resumes Workflow]

```

1. **Scheduled Ingestion:** An Amazon EventBridge rule triggers `AML-S3-Stream-Ingestor` every minute to fetch a 20-row batch from the raw `HI-Small_Trans.csv` file inside Amazon S3, writing entries cleanly to Amazon DynamoDB while updating a persistent S3 checkpoint file (`ingestion-checkpoint.json`).
2. **Database Mutation Tripwire:** The newly inserted entries trip the DynamoDB Stream (`New image` specification), firing the `AML-Stream-Router` Lambda to map properties and launch an execution instance of the `AML-Risk-Escalator` state machine.
3. **The State Pause (`waitForTaskToken`):** If an automated scoring block flags a transaction as high-risk, the state machine hits a specialized task gate: `aws-sdk:dynamodb:putItem.waitForTaskToken`. The orchestrator generates a unique cryptographic string (**Task Token**), pauses execution entirely, and writes the token alongside transaction metadata into a pending review table.
4. **AI-Co-pilot Augmentation:** While paused, **Amazon Bedrock** uses `invoke_model_with_response_stream` to evaluate the transaction anomalies, streaming a markdown report directly through an API Gateway WebSocket stage (`wss://`) to the frontend browser interface.
5. **Closing the Loop:** The auditor reviews the visual graph topology (rendered using a structured grid in Cytoscape.js) and the Bedrock narrative on their Next.js GitHub Pages site (`https://wahidsaeed.github.io`). Clicking "Approve" dispatches an HTTP POST payload containing the audit notes and the Task Token back to the `AML-Case-Resolver` Lambda, which issues `sfn.send_task_success()`, unlocking the machine to log audit records and finish securely.

---

## 🛠️ Global AWS Resource Inventory

The complete engine operates 100% serverless, ensuring costs scale down to absolute zero when there are no transactions flowing through the system:

* **AWS Step Functions (The Orchestrator):** Manages the central `AML-Risk-Escalator` workflow state engine, enforces structural waiting milestones, and coordinates conditional logic branching.
* **Amazon Bedrock (The Brain):** Provides serverless AI assistance by acting as a compliance co-pilot, digesting raw ledger mutations into concise case summaries.
* **AWS Lambda (The Compute Workers):** Handles single-purpose operational execution contexts. It is decoupled into independent roles:
  * `AML-S3-Stream-Ingestor`: Processes persistent sliding window CSV slices.
  * `AML-Stream-Router`: Monitors DynamoDB Streams to launch executions.
  * `AML-Case-Resolver`: Matches frontend forms to task callback gates.
  * `AML-WebSocket-Stream-Trail`: Feeds real-time background tokens to Cytoscape hooks.
* **Amazon DynamoDB (The State Layers):** Houses the NoSQL `Transactions-Ledger` and reviews tables, tracking transaction states and active execution callback strings.
* **Amazon API Gateway (The Connected Edge):** Hosts standard REST HTTP routing paths (`/cases`, `/resolve`) for data adjustments alongside low-latency bidirectional WebSocket stages (`wss://`).

---

## 💻 Technical Implementation Artifacts

### 1. Ingestion Worker Script (`AML-S3-Stream-Ingestor`)
Deployed inside AWS Lambda (`Python 3.11+`). Replaces volatile local container storage with a persistent cloud checkpoint pattern inside S3 to ensure data continuity across container resets.

```python
import csv
import json
import boto3
import codecs

s3_client = boto3.client('s3', region_name='eu-central-1')
dynamodb = boto3.resource('dynamodb', region_name='eu-central-1')
ledger_table = dynamodb.Table('Transactions-Ledger')

BUCKET_NAME = 'aml-raw-ingestion-pool'
FILE_KEY = 'HI-Small_Trans.csv'
CHECKPOINT_KEY = 'ingestion-checkpoint.json' 
BATCH_SIZE = 20  

def get_saved_checkpoint():
    try:
        response = s3_client.get_object(Bucket=BUCKET_NAME, Key=CHECKPOINT_KEY)
        state_data = json.loads(response['Body'].read().decode('utf-8'))
        return state_data.get('last_processed_row', 0)
    except s3_client.exceptions.NoSuchKey:
        print("No prior checkpoint file found. Starting stream from baseline row 0.")
        return 0

def save_new_checkpoint(new_row_index):
    state_payload = {'last_processed_row': new_row_index}
    s3_client.put_object(
        Bucket=BUCKET_NAME,
        Key=CHECKPOINT_KEY,
        Body=json.dumps(state_payload).encode('utf-8'),
        ContentType='application/json'
    )

def lambda_handler(event, context):
    try:
        start_row = get_saved_checkpoint()
        print(f"Starting ingestion batch from S3 line checkpoint: {start_row}")

        response = s3_client.get_object(Bucket=BUCKET_NAME, Key=FILE_KEY)
        stream_reader = codecs.getreader('utf-8')(response['Body'])
        csv_reader = csv.DictReader(stream_reader)

        processed_count = 0
        current_row_idx = 0

        for row in csv_reader:
            current_row_idx += 1
            
            if current_row_idx <= start_row:
                continue

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

            ledger_table.put_item(Item=ledger_payload)
            processed_count += 1

            if processed_count >= BATCH_SIZE:
                break

        new_checkpoint = start_row + processed_count
        save_new_checkpoint(new_checkpoint)

        print(f"Batch processed successfully. Advanced cloud checkpoint to line: {new_checkpoint}")
        return {
            'statusCode': 200,
            'body': f"Successfully streamed {processed_count} records to DynamoDB."
        }
    except Exception as e:
        print(f"Error executing cloud stream batch: {str(e)}")
        return {'statusCode': 500, 'body': json.dumps({'error': str(e)})}

```

### 2. Client-Side Presentation Layer API Connector (`actions.ts`)

Configured within Next.js. Stripped of `'use server'` directives to guarantee 100% compilation compatibility with static web servers and hosting platforms (e.g., GitHub Pages).

```typescript
import API_BASE_URL from '../util/common';

export async function getPendingTransactions() {
  try {
    const response = await fetch(`${API_BASE_URL}/cases`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });

    if (!response.ok) throw new Error("API failed to fetch active queue.");
    return await response.json();
  } catch (error) {
    console.error("Dashboard table load failure:", error);
    return [];
  }
}

export async function submitApproval(transactionId: string, taskToken: string, decision: string, notes: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transaction_id: transactionId,
        task_token: taskToken,
        human_decision: decision,
        decision_note: notes
      }),
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "API processing failure.");

    return { success: true };
  } catch (error: unknown) {
    console.error("API Gateway communication network fault:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

```

---

## 📦 Multi-Tenant Infrastructure-as-Code Setup

This single-file CloudFormation template (`template.yaml`) defines your serverless resource footprint. Hardcoded properties have been stripped in favor of dynamic Pseudo Parameters (`${AWS::AccountId}`, `${AWS::Region}`) to support automated, cross-account deployment pipelines.

```yaml
AWSTemplateFormatVersion: "2012-10-17"
Description: "AML Streaming HITL Core Stack - Multi-Account Portable Template"

Parameters:
  ProjectEnvironment:
    Type: "String"
    Default: "production"

  S3CodeBucketPlaceholder:
    Type: "String"
    Default: "aml-universal-deployment-packages"

Resources:
  ApiGatewayV2HttpApi:
    Type: "AWS::ApiGatewayV2::Api"
    Properties:
      Name: "AML-Transaction-Streaming-API"
      ProtocolType: "HTTP"
      CorsConfiguration:
        AllowOrigins:
          - "[https://wahidsaeed.github.io](https://wahidsaeed.github.io)"
          - "http://localhost:3000"
        AllowHeaders:
          - "content-type"
          - "authorization"
          - "x-api-key"
        AllowMethods:
          - "GET"
          - "POST"
          - "OPTIONS"
        MaxAge: 300

  ApiGatewayV2Stage:
    Type: "AWS::ApiGatewayV2::Stage"
    Properties:
      ApiId: !Ref ApiGatewayV2HttpApi
      StageName: !Ref ProjectEnvironment
      AutoDeploy: true

  LambdaFunctionAMLCaseResolver:
    Type: "AWS::Lambda::Function"
    Properties:
      FunctionName: "AML-Case-Resolver"
      Handler: "index.lambda_handler"
      Runtime: "python3.11"
      MemorySize: 512
      Timeout: 60
      Role: !GetAtt IAMRoleUniversalLambdaExecution.Arn
      Code:
        S3Bucket: !Ref S3CodeBucketPlaceholder
        S3Key: "aml-case-resolver.zip"

  LambdaFunctionAMLRiskScorer:
    Type: "AWS::Lambda::Function"
    Properties:
      FunctionName: "AML-Risk-Scorer"
      Handler: "index.lambda_handler"
      Runtime: "python3.11"
      MemorySize: 256
      Timeout: 30
      Role: !GetAtt IAMRoleUniversalLambdaExecution.Arn
      Code:
        S3Bucket: !Ref S3CodeBucketPlaceholder
        S3Key: "aml-risk-scorer.zip"

  IAMRoleUniversalLambdaExecution:
    Type: "AWS::IAM::Role"
    Properties:
      Path: "/service-role/"
      RoleName: !Sub "AML-Universal-Execution-Role-${AWS::Region}"
      ManagedPolicyArns:
        - "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Action: "sts:AssumeRole"
            Effect: "Allow"
            Principal:
              Service: "lambda.amazonaws.com"
      Policies:
        - PolicyName: "AMLDataAndAIPermissionBoundary"
          PolicyDocument:
            Version: "2012-10-17"
            Statement:
              - Effect: "Allow"
                Action:
                  - "s3:GetObject"
                  - "s3:ListBucket"
                Resource: "arn:aws:s3:::*"
              - Effect: "Allow"
                Action:
                  - "execute-api:ManageConnections"
                Resource: !Sub "arn:aws:execute-api:${AWS::Region}:${AWS::AccountId}:*/*"
              - Effect: "Allow"
                Action:
                  - "bedrock:InvokeModelWithResponseStream"
                Resource: "arn:aws:bedrock:*::foundation-model/*"
              - Effect: "Allow"
                Action:
                  - "states:SendTaskSuccess"
                  - "states:SendTaskFailure"
                Resource: "*"

  AMLCaseOrchestrationStateMachine:
    Type: "AWS::StepFunctions::StateMachine"
    Properties:
      StateMachineName: "AML-Case-Processing-Orchestration"
      RoleArn: !GetAtt IAMRoleStepFunctionsWorkflowExecution.Arn
      DefinitionString: !Sub |
        {
          "Comment": "Coordinates transaction analysis, risk scoring, and manual compliance approval gates",
          "StartAt": "CalculateRiskScore",
          "States": {
            "CalculateRiskScore": {
              "Type": "Task",
              "Resource": "${LambdaFunctionAMLRiskScorer.Arn}",
              "Next": "EvaluateRiskThreshold"
            },
            "EvaluateRiskThreshold": {
              "Type": "Choice",
              "Choices": [
                {
                  "Variable": "$.risk_score",
                  "NumericGreaterThanEquals": 75,
                  "Next": "CreateHumanAuditCase"
                }
              ],
              "Default": "AutoApproveTransaction"
            },
            "CreateHumanAuditCase": {
              "Type": "Task",
              "Resource": "arn:aws:states:${AWS::Region}:${AWS::AccountId}:activity:HumanComplianceReview",
              "TimeoutSeconds": 86400,
              "End": true
            },
            "AutoApproveTransaction": {
              "Type": "Pass",
              "End": true
            }
          }
        }

  IAMRoleStepFunctionsWorkflowExecution:
    Type: "AWS::IAM::Role"
    Properties:
      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Effect: "Allow"
            Principal:
              Service: "states.amazonaws.com"
            Action: "sts:AssumeRole"
      Policies:
        - PolicyName: "StepFunctionsLambdaInvocationAccess"
          PolicyDocument:
            Version: "2012-10-17"
            Statement:
              - Effect: "Allow"
                Action:
                  - "lambda:InvokeFunction"
                Resource:
                  - !GetAtt LambdaFunctionAMLRiskScorer.Arn

  LambdaPermissionCaseResolver:
    Type: "AWS::Lambda::Permission"
    Properties:
      FunctionName: !GetAtt LambdaFunctionAMLCaseResolver.Arn
      Action: "lambda:InvokeFunction"
      Principal: "apigateway.amazonaws.com"
      SourceArn: !Sub "arn:aws:execute-api:${AWS::Region}:${AWS::AccountId}:${ApiGatewayV2HttpApi}/*/*/resolve"

Outputs:
  HttpApiEndpoint:
    Description: "Base URL to configure within your Next.js environment workspace variables"
    Value: !Sub "https://${ApiGatewayV2HttpApi}.execute-api.${AWS::Region}[.amazonaws.com/$](https://.amazonaws.com/$){ApiGatewayV2Stage}"

```

---

## 📈 Deployment & Verification

1. **Deploy Backend Infrastructure:** Upload the `template.yaml` to AWS CloudFormation in your designated region, ensuring your Lambda code packages are present in your target deployment S3 bucket.
2. **Launch Frontend Monitor:** Clone the matching Next.js repository, configure your target `API_BASE_URL` inside your client parameters to match the output parameter generated by CloudFormation, compile using `npm run build`, and deploy as a zero-server static site.
3. **Activate the Ingestion Timer:** Turn on your EventBridge Scheduler (`AML-Transaction-Stream-Trigger`). It will begin feeding lines from the synthetic file into the pipeline, allowing you to monitor the automated risk evaluation loops and human-in-the-loop task state transitions via your dashboard.

## 📜 License

This architecture code map and technical blueprint are distributed under the terms of the **MIT License**.

```

```
