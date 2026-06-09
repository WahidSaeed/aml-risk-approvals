# Human-in-the-Loop AI Orchestration Engine
### Managing Long-Running Compliance Workflows with AWS Step Functions, Bedrock & Lambda

> **Presenter:** Abdul Wahid  
> **Dataset:** [SAML-D — Synthetic Anti-Money Laundering Transaction Dataset](https://www.kaggle.com/datasets/berkanoztas/synthetic-transaction-monitoring-dataset-aml)  
> **Reference Paper:** Oztas, B., Cetinkaya, D., Adedoyin, F., Budka, M., Dogan, H. & Aksu, G. — *"Enhancing Anti-Money Laundering: Development of a Synthetic Transaction Monitoring Dataset"*, IEEE ICEBE 2023. DOI: [10.1109/ICEBE59045.2023.00028](https://ieeexplore.ieee.org/document/10356193)

---

## Table of Contents

1. [The Core Engineering Problem](#1-the-core-engineering-problem)
2. [The SAML-D Dataset](#2-the-saml-d-dataset)
3. [The HITL Architecture — Three Pillars](#3-the-hitl-architecture--three-pillars)
4. [State Machine Walkthrough](#4-state-machine-walkthrough)
5. [The Master Stroke: waitForTaskToken](#5-the-master-stroke-waitfortasktoken)
6. [Empowering the Human — Bedrock & Next.js](#6-empowering-the-human--bedrock--nextjs)
7. [Closing the Loop — Resuming the Machine](#7-closing-the-loop--resuming-the-machine)
8. [Technical Takeaways & Architecture Value](#8-technical-takeaways--architecture-value)

---

## 1. The Core Engineering Problem

### The Challenge of Long-Running Asynchronous Processes

Traditional compliance pipelines face a hard tradeoff: human review processes unfold on a human timescale (minutes, hours, sometimes days), while cloud compute charges by the millisecond. Three structural problems make naive implementations unviable:

| Problem | Description |
|---|---|
| **Idle Compute** | Keeping a Lambda function alive to *wait* for a human decision costs money and eventually hits hard timeout limits (15 min max for Lambda). |
| **State Disconnection** | Linking a browser click days after workflow initiation back to the frozen backend state is difficult without an explicit handoff mechanism. |
| **Audit Gaps** | Without a structured orchestrator, the chain of custody between machine scoring, human review, and case closure is fragmented. |

**The Solution:** A completely event-driven architecture that pauses execution on a dime, writes its full state to a database, hands a unique cryptographic token to the frontend, and goes completely to sleep — incurring *zero* compute cost until the human responds.

---

## 2. The SAML-D Dataset

The system ingests and streams records from the **SAML-D (Synthetic AML Dataset)** — a purpose-built, fully-labelled transaction monitoring dataset published by Oztas et al. at the 2023 IEEE International Conference on e-Business Engineering.

### At a Glance

| Property | Value |
|---|---|
| **Total Transactions** | 9,504,852 |
| **Features** | 12 |
| **Typologies** | 28 (11 normal + 17 suspicious) |
| **Suspicious Rate** | ~0.1039% (highly imbalanced) |
| **Graph Structures** | 15 distinct network topologies |
| **Source** | Kaggle / IEEE ICEBE 2023 |
| **License** | For research & educational use |

### Dataset Schema — 12 Features

| # | Feature | Type | Description |
|---|---|---|---|
| 1 | `Time` | Timestamp | Date and time of transaction — enables chronological ordering and velocity checks |
| 2 | `Sender_account` | Categorical | Originating account identifier — used to build behavioral profiles |
| 3 | `Receiver_account` | Categorical | Destination account identifier — key for graph-based hop detection |
| 4 | `Amount` | Numeric | Transaction value — central signal for structuring and threshold breach |
| 5 | `Payment_type` | Categorical | Mechanism: credit card, debit card, ACH, cash, cross-border transfer, cheque |
| 6 | `Sender_bank_location` | Categorical | Country/region of the originating bank — flags high-risk jurisdictions |
| 7 | `Receiver_bank_location` | Categorical | Country/region of the destination bank — detects cross-border anomalies |
| 8 | `Payment_currency` | Categorical | Currency in which the payment was initiated |
| 9 | `Receiver_currency` | Categorical | Currency received — mismatches signal potential structuring |
| 10 | `Sender_age` | Numeric | Age of the sending account (account tenure proxy) |
| 11 | `Receiver_age` | Numeric | Age of the receiving account |
| 12 | `is_suspicious` | Binary | Ground-truth label: `1` = suspicious, `0` = normal |

### High-Risk Signals in the Dataset

The SAML-D dataset was designed in collaboration with AML specialists and captures real-world laundering patterns including:

- **Geographic risk** — sender/receiver bank locations include high-risk regions such as Mexico, Turkey, Morocco, and UAE
- **Currency mismatch** — transactions where payment currency ≠ receiver currency indicate potential layering
- **High-risk payment types** — cash and cross-border transfers are weighted more heavily in risk scoring
- **Graph network structures** — 15 typology graphs model known laundering patterns such as fan-out, fan-in, cycle, and scatter-gather flows

### Why SAML-D for This System

Existing public AML datasets lack diversity, ground-truth labels, or sufficient typology coverage. SAML-D was purpose-built to address all three gaps, making it the right foundation for training and evaluating the `AML-Risk-Scorer` Lambda and the `Amazon Bedrock` risk narrative module.

---

## 3. The HITL Architecture — Three Pillars

```
AWS Step Functions (Orchestrator)  ↔  AWS Lambda (Intermediary)  ↔  Amazon Bedrock (Brain)
```

The system is built on three cooperating services, each with a single well-defined responsibility:

### Pillar 1 — AWS Step Functions (The Orchestrator)

Step Functions manages the durable state machine that governs the entire AML case lifecycle. It is responsible for:

- Evaluating initial algorithmic risk scores against configurable thresholds
- Routing transactions to auto-approval or human escalation paths
- Issuing and tracking **Task Tokens** — the cryptographic handoff mechanism
- Maintaining a complete, tamper-evident execution history for regulators

### Pillar 2 — AWS Lambda (The Intermediary)

Lambda functions execute all discrete compute tasks. In this system, they:

- Call the `AML-Risk-Scorer` to evaluate transaction telemetry from the SAML-D stream
- Write pending review cases and Task Tokens to the `AML-Pending-Reviews` DynamoDB table
- Serve the Next.js dashboard via the `AML-Get-Pending-Cases` function
- Fire `SendTaskSuccess` to resume the state machine after human decision via `AML-Case-Resolver`

### Pillar 3 — Amazon Bedrock (The Brain)

Bedrock provides the generative AI layer that transforms raw transaction data into human-readable risk narratives. It:

- Reads the 12 SAML-D features per transaction
- Streams a contextual risk assessment highlighting anomaly signals (jurisdiction risk, currency mismatch, graph hops)
- Acts as a co-pilot for the compliance officer — reducing decision time from minutes to seconds

---

## 4. State Machine Walkthrough

The `AML-Risk-Escalator` Step Functions state machine governs every transaction that crosses the ingestion threshold.

```
[START]
    │
    ▼
┌─────────────────────────────┐
│  Step 1: Call Risk Scorer   │  ← Task State
│  Invoke Lambda → risk_score │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  Step 2: Evaluate Risk      │  ← Choice State
│  risk_score ≥ 0.5?          │
└───────┬─────────────┬───────┘
        │ NO          │ YES
        ▼             ▼
  [AUTO-APPROVE]  ┌──────────────────────────┐
                  │  Step 3: Notify via SNS  │  ← SNS Task
                  │  Alert compliance team   │
                  └────────────┬─────────────┘
                               │
                               ▼
                  ┌──────────────────────────────────────┐
                  │  Step 4: waitForTaskToken            │  ← DynamoDB Task
                  │  Write token + case to DynamoDB      │
                  │  *** EXECUTION FROZEN — ZERO COST ***│
                  └────────────┬─────────────────────────┘
                               │  (Human acts — hours/days later)
                               ▼
                  ┌──────────────────────────┐
                  │  Step 5: Log Decision    │  ← Pass State
                  │  Write to audit ledger   │
                  └────────────┬─────────────┘
                               │
                               ▼
                  ┌──────────────────────────┐
                  │  Step 6: Final SNS       │  ← SNS Task
                  │  Notify case resolved    │
                  └────────────┬─────────────┘
                               │
                               ▼
                           [CLOSED]
```

### State Descriptions

| Step | State Type | Action |
|---|---|---|
| **Call Risk Scorer** | Task | Invokes `AML-Risk-Scorer` Lambda with SAML-D transaction fields; returns `risk_score` (0–1) and `reasoning` string |
| **Evaluate Risk** | Choice | Branches on `risk_score ≥ 0.5`; lower scores auto-close the case |
| **Notify Escalation** | Task (SNS) | Publishes to `AML-Review-Alerts` SNS topic; compliance officer receives email alert |
| **waitForTaskToken** | Task (DynamoDB) | Writes `TransactionID`, `Amount`, `RiskScore`, `Reasoning`, and `TaskToken` to `AML-Pending-Reviews`; state machine freezes |
| **Log Decision** | Pass | Records the human's decision and notes to the `Transactions-Ledger` DynamoDB table |
| **Final Notify** | Task (SNS) | Broadcasts case closure to the compliance team |

---

## 5. The Master Stroke: waitForTaskToken

This is the architectural keystone of the entire system. The state machine executes:

```yaml
aws-sdk:dynamodb:putItem.waitForTaskToken
```

### What Happens Step by Step

**1. State Pause**  
Step Functions freezes the entire execution pipeline in mid-air. No Lambda keeps running. No server stays warm. The workflow state is entirely encoded inside Step Functions itself.

**2. Token Generation**  
AWS generates a unique, cryptographically large Task Token — a massive random string that acts as a one-time resumption key. No two tokens are ever the same.

**3. Dashboard Hydration**  
The token and all case metadata are written to DynamoDB in a single `putItem` call:

```json
{
  "TransactionID":   "txn-84f2a...",
  "Amount":          "142000.00",
  "Currency":        "USD",
  "OriginCountry":   "Turkey",
  "DestCountry":     "UAE",
  "RiskScore":       "0.87",
  "Reasoning":       "High-risk jurisdictions on both ends. Currency mismatch...",
  "Status":          "PENDING_HUMAN_REVIEW",
  "TaskToken":       "AQD8H3k....<very long string>...."
}
```

**4. Zero-Cost Waiting**  
While the compliance officer deliberates, the state machine incurs **zero compute cost**. The workflow is completely durable and can sit paused for **up to one full year**.

### Cost Comparison

| Approach | Cost While Waiting | Max Wait Time |
|---|---|---|
| Always-on EC2 instance | ~$0.023–$0.096/hr | Unlimited (but costly) |
| Lambda polling loop | ~$0.20/million invocations | 15 min hard limit |
| **waitForTaskToken (this system)** | **$0.00** | **Up to 365 days** |

---

## 6. Empowering the Human — Bedrock & Next.js

### The Compliance Dashboard

The human reviewer accesses a **Next.js dashboard** (hosted on GitHub Pages) that communicates with two Lambda endpoints:

- `GET /cases` → `AML-Get-Pending-Cases` Lambda → reads all `PENDING_HUMAN_REVIEW` records from DynamoDB
- `POST /resolve` → `AML-Case-Resolver` Lambda → fires `SendTaskSuccess` to resume the state machine

### AI-Assisted Forensics with Amazon Bedrock

Instead of presenting raw SAML-D fields, the dashboard surfaces a **Bedrock-generated risk narrative** alongside an **interactive Cytoscape.js transaction graph** showing multi-hop relationships.

Bedrock receives the SAML-D transaction record and produces output such as:

> *"This transaction exhibits three concurrent high-risk signals: (1) Both sender and receiver bank locations are in high-risk jurisdictions — Turkey and UAE respectively. (2) Payment currency (EUR) does not match receiver currency (USD), suggesting a layering step. (3) Sender account age is 3 days, consistent with a mule account typology. Recommended action: escalate for manual review."*

### Decision Flow on the Dashboard

```
DynamoDB (AML-Pending-Reviews)
        │
        ▼
Next.js Dashboard  ←── AML-Get-Pending-Cases Lambda
        │
        │  Compliance officer sees:
        │  • Cytoscape.js transaction graph
        │  • Bedrock risk narrative
        │  • Raw SAML-D fields
        │
        ▼
  [APPROVE] or [REJECT] + decision notes
        │
        ▼
AML-Case-Resolver Lambda
        │
        ▼
sfn.send_task_success(taskToken, output)
        │
        ▼
Step Functions resumes ✓
```

---

## 7. Closing the Loop — Resuming the Machine

### The Four-Step Callback Sequence

**Step 01 — Form Submission**  
The compliance officer hits **Approve** or **Reject** on the dashboard UI and optionally adds decision notes. The frontend fires a POST request to API Gateway.

**Step 02 — Callback Lambda**  
API Gateway routes the request to `AML-Case-Resolver` Lambda, passing the human decision and the original Task Token (retrieved from the DynamoDB record).

**Step 03 — SendTaskSuccess**  
The Lambda fires the AWS SDK resumption command:

```python
import boto3, json

sfn = boto3.client("stepfunctions")

sfn.send_task_success(
    taskToken = token,              # The original cryptographic token from DynamoDB
    output    = json.dumps({
        "human_decision": "APPROVED",
        "reviewer_notes": "Reviewed cross-border pattern. Legitimate trade finance.",
        "resolved_at":    "2025-06-09T14:32:11Z"
    })
)
```

**Step 04 — The Resumption**  
Step Functions matches the token against its internal index, wakes the frozen execution instantly, and continues to the next state. The entire state transition happens in milliseconds regardless of how long the workflow was paused.

### What Gets Written to the Audit Ledger

Upon resumption, the state machine writes the following record to the `Transactions-Ledger` DynamoDB table:

| Field | Value |
|---|---|
| `TransactionID` | Original SAML-D transaction ID |
| `InitialRiskScore` | Score from `AML-Risk-Scorer` Lambda |
| `BedrockReasoning` | Full narrative from Amazon Bedrock |
| `HumanDecision` | `APPROVED` or `REJECTED` |
| `ReviewerNotes` | Free-text notes from compliance officer |
| `EscalatedAt` | Timestamp when SNS alert was fired |
| `ResolvedAt` | Timestamp of `SendTaskSuccess` call |
| `DurationMinutes` | Total human review time |

This record constitutes the complete **chain of custody** for the transaction — satisfying banking regulatory requirements for AML case documentation.

---

## 8. Technical Takeaways & Architecture Value

### Why This Architecture Wins in Production

**Bulletproof Audit Trails**  
Step Functions natively logs every state transition with exact timestamps. The combination of machine scores, Bedrock reasoning, Task Token issuance, human decision, and final case closure — all timestamped to the millisecond — creates a regulator-ready audit trail without any additional logging infrastructure.

**Separation of Concerns**  
Each component can evolve independently:

- UI designers can rebuild the Next.js frontend without touching the state machine
- Data scientists can swap Bedrock foundation models (e.g. Qwen → Claude → Titan) without changing routing logic
- Compliance rules (e.g. the `≥ 0.5` threshold) are encoded only in the Step Functions Choice state — one change, instant effect

**True Serverless Cost Structure**  
100% event-driven. If no transactions arrive, no compute runs. When a compliance officer takes 3 days to review a complex case, those 3 days cost exactly $0.00 in compute.

### Infrastructure Summary

| Service | Role | Resource |
|---|---|---|
| API Gateway (WebSocket) | Real-time streaming endpoint | `/transaction_streaming` |
| API Gateway (REST) | Dashboard API | `/cases`, `/resolve` |
| Lambda × 7 | Compute workers | See below |
| Step Functions | State orchestrator | `AML-Risk-Escalator` |
| DynamoDB × 2 | State storage | `AML-Pending-Reviews`, `Transactions-Ledger` |
| S3 | Raw data ingestion | `aml-raw-ingestion-pool` |
| SNS | Alerting | `AML-Review-Alerts` |
| Amazon Bedrock | AI risk narrative | `AML-Risk-Scorer` |
| CloudFront | Edge caching | WSS distribution |
| IAM | Least-privilege roles | Per Lambda + Step Functions |
| CloudWatch | Observability | Logs + metrics per function |

### Lambda Function Inventory

| Function | Timeout | Purpose |
|---|---|---|
| `AML-WebSocket-Stream-Trail` | 120 s | WebSocket connection handler; streams SAML-D records to Cytoscape.js |
| `AML-S3-Stream-Ingestor` | 60 s | Reads `transactions.csv` from S3; feeds the stream |
| `AML-Stream-Trigger` | 3 s | EventBridge-triggered ingestion kickoff |
| `AML-Risk-Scorer` | 3 s | Invokes Bedrock to score transaction; returns `risk_score` + `reasoning` |
| `AML-Case-Resolver` | 3 s | Receives human decision; calls `SendTaskSuccess` |
| `AML-Get-Pending-Cases` | 3 s | Lists `PENDING_HUMAN_REVIEW` records for dashboard |
| `AML-Fetch-Graph-Topology` | 30 s | Builds Cytoscape.js graph payload from transaction network |

---

## References

- **Dataset:** Oztas, B. et al. (2023). *Anti Money Laundering Transaction Data (SAML-D)*. Kaggle. [https://www.kaggle.com/datasets/berkanoztas/synthetic-transaction-monitoring-dataset-aml](https://www.kaggle.com/datasets/berkanoztas/synthetic-transaction-monitoring-dataset-aml)

- **Paper:** Oztas, B., Cetinkaya, D., Adedoyin, F., Budka, M., Dogan, H. & Aksu, G. (2023). *Enhancing Anti-Money Laundering: Development of a Synthetic Transaction Monitoring Dataset.* 2023 IEEE International Conference on e-Business Engineering (ICEBE), Sydney, Australia, pp. 47–54. DOI: [10.1109/ICEBE59045.2023.00028](https://ieeexplore.ieee.org/document/10356193)

- **GitHub:** [BOztasUK/Anti_Money_Laundering_Transaction_Data_SAML-D](https://github.com/BOztasUK/Anti_Money_Laundering_Transaction_Data_SAML-D)

- **AWS Step Functions Callback Pattern:** [https://docs.aws.amazon.com/step-functions/latest/dg/connect-to-resource.html#connect-wait-token](https://docs.aws.amazon.com/step-functions/latest/dg/connect-to-resource.html#connect-wait-token)

---

*Generated to accompany the HITL AI Orchestration Engine presentation by Abdul Wahid.*
