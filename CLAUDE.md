# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A serverless single-page application that enables users to chat with any documentation site. The architecture is **client-orchestrated with zero backend** - all crawling, embedding generation, and chat logic runs in the browser.

**Tech Stack:**
- Frontend: Vite + React + TypeScript
- Styling: Tailwind CSS + shadcn/ui
- Database: Supabase (PostgreSQL + pgvector)
- Crawling: Jina AI Reader API
- Embeddings: Transformers.js (client-side, all-MiniLM-L6-v2)
- LLM: User-provided API key (OpenAI/Anthropic/Custom)

## Core Architecture Principles

1. **Zero Backend Cost**: All heavy logic (crawling, embedding, chunking) performed in client browser
2. **Global Shared Index**: Documentation crawled once per `document_key`, reused by all users
3. **LLM Privacy**: User's API key stored in browser memory only, never persisted server-side
4. **Predictable Scope**: Max 100 pages per crawl, max 3 hops depth, domain-restricted

## Database Schema

### `documents` table
- `id` (uuid, PK)
- `document_key` (text, unique) - Computed as `domain + path_prefix`
- `root_url` (text) - Original seed URL
- `metadata` (jsonb)
- `created_at` (timestamptz)

### `document_sections` table
- `id` (uuid, PK)
- `document_id` (uuid, FK to documents)
- `url` (text) - Source page URL
- `heading` (text) - Section title
- `content` (text) - Chunk text (700-900 chars)
- `order_index` (int) - Chunk ordering
- `embedding` (vector(384)) - Using pgvector
- `created_at` (timestamptz)
- Index: ivfflat on `embedding` with `vector_cosine_ops`

### RPC Functions
- `match_sections(query_embedding vector(384), filter_document_id uuid, match_count int)`: Returns top-k similar chunks using cosine similarity (threshold: 0.15, default k=5)

## Key Implementation Components

### URL Processing (`lib/url-utils.ts`)
- `normalizeUrl()`: Lowercase, strip query/hash, standardize trailing slash, remove default filenames
- `computeDocumentKey()`: Extract `domain + path_prefix` from seed URL
- `isAllowedUrl()`: Validate same domain, prefix match, exclude disallowed paths (`/blog`, `/pricing`, `/legal`, `/careers`, `/changelog`)

### Crawling (`hooks/useCrawler.ts`)
Client-side orchestrator that:
1. Checks if `document_key` exists in Supabase
2. If not, initiates BFS crawl (max 300 discovered, max 100 processed, max depth 3)
3. For each URL: fetch via Jina Reader → validate markdown → chunk → embed → upsert
4. Shows progress UI (pages processed, failures, completion when ≥5 chunks exist)

### Chunking (`lib/chunking.ts`)
- Chunk size: 700-900 characters
- Overlap: 100 characters
- Preserve metadata: `url`, `page_title`, `heading`, `order_index`

### Embeddings (`lib/embeddings.ts`)
- Library: `@xenova/transformers`
- Model: `all-MiniLM-L6-v2` (quantized, 384 dimensions)
- WebGPU if available, fallback to WASM
- Show "Browser not supported" if model fails to load

### RAG Chat (`components/Chat.tsx`)
1. User sends query → generate query embedding
2. Call `match_sections` RPC with `document_id`
3. Retrieve top 5 chunks
4. Build prompt with strict RAG template (respond "I could not find this in the documentation" if answer not found)
5. Stream LLM response with clickable citations

## Performance Constraints

- Total crawl + embedding: ≤120 seconds
- Cached doc load: <5 seconds
- Chat response: 3-6 seconds
- DB size per doc: ≤3 MB
- Chunk size: ≤4 KB per row
- Max live memory: ≤400 MB

## Cleanup Policy

To stay within Supabase free tier:
- Retain only last 200 documents
- Auto-delete older entries via Supabase scheduled function
- Enforce storage quota <500 MB

## Error Handling

**Crawl Errors:**
- Show descriptive messages for Cloudflare/bot blocks, unreadable markdown
- If <5 chunks exist: "Documentation incomplete. Cannot start chat."

**Embedding Errors:**
- "Your browser does not support on-device embeddings. Try Chrome desktop."

**LLM Errors:**
- Handle invalid API key, provider unavailable, unsupported model

**Partial Crawls:**
- Proceed if ≥5 chunks successfully stored

## Development Commands

```bash
npm run dev      # Start development server (http://localhost:5173)
npm run build    # Build for production (TypeScript check + Vite build)
npm run preview  # Preview production build locally
npm run lint     # Run ESLint
npm run test     # Run tests with Vitest
```

**Environment Setup:**
1. Copy `.env.example` to `.env`
2. Add Supabase credentials from project settings
3. Run `supabase-schema.sql` in Supabase SQL Editor

## Out of Scope (Post-MVP)

- Multi-document chat
- Full conversation memory
- SPA/JS-heavy documentation crawling
- Server-side crawling with Playwright
- Authentication & team workspaces
