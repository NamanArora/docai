PRD v2 — Chat With Any Documentation (Serverless MVP)

Architecture: Client-Orchestrated · Zero-Backend · Jina AI + Transformers.js + Supabase
Version: v2 (Improved & Engineering-Ready)

1. Product Overview

A single-page web application that allows users to chat with any documentation site by:

Entering a documentation URL

Automatically crawling & parsing pages on the client (via Jina AI Reader)

Generating embeddings locally (Transformers.js)

Storing chunks in Supabase for fast reuse

Allowing user to chat with docs via their own LLM API key

No backend servers, no authentication, no cron jobs, no workers.

2. Key Principles

Zero Backend Cost: All heavy logic performed in client browser

Global Shared Index: Documentation crawled once, reused by all future users

LLM Privacy: User provides API key; it’s never stored server-side

Predictable Scope: Only static/SSR docs; max 100 pages per crawl

3. Goals & Success Criteria
Performance

Fresh crawl < 120 seconds

Cached docs load < 5 seconds

Chat response in 3–6 seconds

Cost

Must operate in free tiers of:

Vercel (hosting)

Supabase (DB + vector search)

Jina AI Reader

Client-side Transformers.js

Reliability

Must gracefully handle partial crawls

Must restrict crawl scope to avoid runaway crawling

4. User Flow
Step 1 — Input & Initialization

User enters:

Documentation URL

LLM Provider (OpenAI / Anthropic / Custom)

LLM API Key (stored in browser memory only)

System actions:

Normalize URL

Compute document_key

Check if document_key exists in Supabase

If found → Go to Chat Mode

If not found → Go to Crawl & Index

Step 2 — Crawl & Parse (Client)

Determine allowed URL scope (domain + prefix)

Fetch seed URL using Jina Reader

Extract internal links

Normalize and filter links

Process up to 100 valid pages

For each URL:

Fetch markdown via Jina Reader

Validate markdown

Chunk markdown (700–900 chars w/ 100 char overlap)

Generate embeddings locally

Upsert chunks to Supabase

UI Requirements:

Progress bar

Pages processed vs total

Failures & warnings

“Completed” state when >5 chunks are stored

Step 3 — Chat Mode

When user sends a query:

Create query embedding locally

Call Supabase match_sections RPC

Retrieve top 5 chunks

Build RAG prompt

Call selected LLM using user’s API key

Display streaming response

Show clickable citations

5. Functional Requirements
5.1 URL Normalization

All URLs must be normalized:

Convert to lowercase

Strip query params

Strip hash fragments

Standardize trailing slash

Remove default filenames (index.html)

Example:
https://DOCS.STRIPE.COM/payments/?ref=123#top →
https://docs.stripe.com/payments/

5.2 Canonical Document Key

document_key = domain + path_prefix_of_seed_url

Examples:

Seed URL	Document Key
https://stripe.com/docs
	stripe.com/docs
https://nextjs.org/docs/app
	nextjs.org/docs/app
https://developer.paypal.com/api
	developer.paypal.com/api
5.3 Allowed Crawl Scope

A crawled URL must satisfy all:

Same domain

Begins with canonical prefix

Not inside disallowed folders:

/blog, /pricing, /legal, /careers, /changelog

Fetchable via Jina Reader

Normalized and unique

Limits:

Max discovered: 300 URLs

Max processed: 100 URLs

Max depth: 3 hops

5.4 Chunking Strategy

Chunk size: 700–900 characters

Chunk overlap: 100 characters

Metadata stored for each chunk:

chunk_id

order_index

url

page_title

heading

5.5 Embeddings (Client-Side)

Library: @xenova/transformers

Model: all-MiniLM-L6-v2 (quantized)

Dimensionality: 384

WebGPU if available, fallback to WASM

If embedding model fails to load → show “Browser not supported”

6. Database Schema (Supabase)
Table: documents
Column	Type	Description
id	uuid	Primary key
document_key	text	Unique identifier
root_url	text	Original seed URL
created_at	timestamptz	Timestamp
metadata	jsonb	Extra information

Index: unique(document_key)

Table: document_sections
Column	Type	Description
id	uuid	PK
document_id	uuid	FK to documents
url	text	Source page URL
heading	text	Section title
content	text	Chunk text
order_index	int	Chunk ordering
embedding	vector(384)	Embedding
created_at	timestamptz	Timestamp

Index:
ivfflat (embedding vector_cosine_ops)

7. Vector Search
RPC Function: match_sections

Inputs:

query_embedding vector(384)

document_id uuid

match_count int

Returns:

content

url

similarity

Settings:

k = 5

cosine similarity

min threshold = 0.15

8. RAG Prompt Template
You are an assistant that answers ONLY using the provided documentation.
If the answer is not found in the documentation, respond with:

"I could not find this in the documentation."

Use the exact text and terminology from the documentation.

Sources:
{{chunk_urls}}

9. Error Handling & UX
Crawl Errors

Show descriptive messages:

“Protected by Cloudflare / Bot Blocked”

“Page returned unreadable markdown”

“Documentation could not be parsed”

If <5 chunks exist →
“Documentation incomplete. Cannot start chat.”

Embedding Errors

Show:

“Your browser does not support on-device embeddings. Try Chrome desktop.”

LLM Errors

Show:

“Invalid API key”

“Provider unavailable”

“Model not supported”

Partial Crawls

Proceed if ≥5 chunks were successfully stored.

10. Performance Constraints

Total crawl+embedding ≤ 120 seconds

Total DB size per doc ≤ 3 MB

Chunk size ≤ 4 KB per row

Max live memory footprint ≤ 400 MB

11. Cleanup Policy

To keep within Supabase free tier:

Retain only last 200 documents

Auto-delete older entries via Supabase scheduled function

Enforce storage quota < 500 MB

12. Mandatory Deliverables (for Engineering)

Supabase SQL schema + RPC functions

useCrawler.ts client orchestrator

URL utilities:

normalizeUrl()

computeDocumentKey()

isAllowedUrl()

Markdown chunking utility

Embedding wrapper for Transformers.js

Chat UI with citations

Final RAG engine implementation

13. Out-of-Scope (Post-MVP)

Multi-document chat

Full conversation memory

SPA / JS-heavy documentation crawling

Server-side crawling with Playwright

Authentication & team workspaces

Paid plans and rate limits