# 🤖 AWS Bedrock RAG Testing Guide

This guide explains how to test the AI Q&A feature powered by Amazon Bedrock with Retrieval Augmented Generation (RAG), what documents it searches, and the value this feature adds to the platform.

## 🎯 What This Feature Does

- Answers property-specific questions in plain English.
- Grounds responses in your own documents (RAG) and returns citations.
- Reduces risk of hallucinations by retrieving relevant snippets first, then asking the model to answer using those snippets.
- Works even without RAG (falls back to structured property JSON), but RAG improves factuality and utility.

## 💎 Value Add

- **Trust & Transparency**: Answers come with sources so investors can verify claims.
- **Speed to Insight**: Users can ask natural questions (e.g., "What were the recent repairs?") and get concise, useful summaries.
- **Scalable Content**: Drop in new docs per property (disclosures, maintenance logs, etc.), sync the Knowledge Base, and answers automatically improve.
- **Consistency**: Standardized document structure and metadata keep responses consistent across properties.

## 🧱 High-Level Architecture

- Frontend: `PropertyAIChat` component on the Property Detail page calls `POST /api/ai/ask`.
- Backend: If `KNOWLEDGE_BASE_ID` is set, Bedrock Knowledge Bases retrieves top-K snippets. Backend then prompts Claude 3.5 with:
  - Structured property JSON summary
  - Retrieved document snippets (when RAG on)
  - User question
- Response: Returns `answer` and `citations` (source URIs) to the UI.

## 📂 Document Types Searched (Per Property)

RAG considers any files you upload under the property’s S3 folder. Recommended types:

- Disclosures: `disclosure-YYYY.txt`
- Inspection: `inspection-summary.txt`
- Neighborhood: `neighborhood-overview.md`
- Appraisal: `appraisal-summary.txt`
- Comps: `comps-overview.md`
- Maintenance: `maintenance-log-YYYY.md`
- Roof: `roof-status.txt`
- Pest/Termite: `pest-inspection-summary.txt`
- HVAC: `hvac-overview.txt`
- Energy: `energy-efficiency.md`
- Insurance: `insurance-notes.md`
- Flood/Storm: `flood-storm-risk.txt`
- Permits/Renovations: `permits-renovations.md`
- Safety: `safety-checklist.txt`
- Seasonal Maintenance: `seasonal-maintenance-plan.md`
- Photo Captions: `photo-captions.md`

Each file can include YAML front matter to improve context clarity, for example:

```
---
propertyId: <id>
docType: inspection
title: Inspection Summary - <Property Title>
city: <City>
state: <State>
address: "<Full Address>"
---
```

## 🪪 What Questions Are Best Supported?

- "Summarize key risks for this property."
- "What repairs or maintenance were done recently?"
- "What’s the roof condition and expected remaining life?"
- "What comparable sales support this price?"
- "Any flood or storm risk I should know about?"
- "What are typical utilities and energy efficiency notes?"

## 🧰 Setup Steps

1. Prerequisites

- AWS Bedrock enabled in your region (e.g., `us-east-1`).
- Permissions: `bedrock:InvokeModel`, `bedrock:Retrieve`, S3 read for your bucket.

2. Document Layout

- Recommended S3 paths:
  - `s3://realestate-rag-docs/properties/<propertyId>/...`
- Local samples included here:
  - `sample-listings/docs/properties/<propertyId>/...`

3. Create a Bedrock Knowledge Base

- Data source: S3 pointing at `s3://realestate-rag-docs/properties/`.
- Embeddings model: Titan Embeddings G1 – Text (or similar).
- Run an initial sync; keep the Knowledge Base ID.

4. Configure Backend

- Env vars:
  - `AWS_REGION=us-east-1`
  - `KNOWLEDGE_BASE_ID=<your_kb_id>`
  - Optional: `BEDROCK_MODEL_ID`, `BEDROCK_GUARDRAIL_ID`, `BEDROCK_GUARDRAIL_VERSION`
- Install and run:

```
cd backend
npm install
npm run dev
```

## 🧪 How to Test

Option A: API (cURL)

```
curl -X POST http://localhost:4000/api/ai/ask \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "propertyId": "<propertyId>",
    "question": "Summarize key risks and recent maintenance."
  }'
```

Expected:

```
{
  "success": true,
  "answer": "...",
  "citations": [
    { "source": "s3://realestate-rag-docs/properties/<propertyId>/inspection-summary.txt" },
    { "source": "s3://realestate-rag-docs/properties/<propertyId>/flood-storm-risk.txt" }
  ]
}
```

Option B: Frontend

- Open a property page and use the "Ask about this property" widget.
- RAG active => answer plus Sources list.

## ⚙️ Behavior, Tuning, and Safety

- RAG Toggle: If `KNOWLEDGE_BASE_ID` is set, retrieval happens; otherwise prompt-only mode.
- Rate Limiting: `/api/ai` limited to 10 requests/min/IP.
- Guardrails: Optional; set via env vars to filter unsafe content and avoid investment advice.
- Prompt Size: Backend truncates long fields and validates question length.

## ❓ FAQs

- Why do I see no sources?
  - RAG may be off (no `KNOWLEDGE_BASE_ID`) or KB hasn’t indexed your docs. Check sync status.

- What file formats are supported?
  - Text/Markdown are easiest to start. PDFs can work too via KB; keep content clean and scannable.

- How do I scope retrieval to the current property?
  - Keep per-property folders. Include propertyId/city in the document front matter and in the query (already implemented server-side).

- Can I add more document types?
  - Yes. Add to the per-property folder and re-sync the KB. The system retrieves by relevance.

## 🔐 Security & Privacy

- Do not include secrets or PII in uploaded documents.
- Use IAM policies with least-privilege access.
- Consider S3 bucket policies and server-side encryption (SSE-S3 or SSE-KMS).

## ✅ Summary

- Upload property docs to S3 under a consistent structure.
- Enable the Knowledge Base and set `KNOWLEDGE_BASE_ID`.
- Ask questions on the property page and get grounded answers with sources.
- Add more documents over time to deepen the knowledge surface.
