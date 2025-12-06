# DocAI - Technical Documentation Archive & Retrieval System

A serverless, client-side documentation chat application that crawls, indexes, and enables intelligent question-answering over technical documentation using RAG (Retrieval-Augmented Generation).

## Features

- **🕷️ Intelligent Crawling**: BFS-based web crawler that processes up to 100 pages with depth limits and scope validation
- **🧠 Client-Side Embeddings**: Generate 384-dimensional vectors using Transformers.js entirely in your browser
- **🔍 Vector Search**: Semantic similarity search powered by Supabase with pgvector
- **💬 AI Chat Interface**: Ask questions and get accurate answers with source citations
- **🎨 Beautiful UI**: "Technical Manuscript" aesthetic with polished, production-grade design
- **🔒 Privacy-Focused**: API keys stored only in browser memory, never sent to our servers
- **📱 Responsive**: Works seamlessly on desktop, tablet, and mobile devices
- **♿ Accessible**: ARIA labels, keyboard navigation, and screen reader support
- **🔔 Toast Notifications**: Real-time feedback for all user actions

## Tech Stack

- **Frontend**: Vite + React + TypeScript
- **Styling**: Tailwind CSS with custom design system
- **Database**: Supabase (PostgreSQL + pgvector)
- **Embeddings**: Transformers.js (all-MiniLM-L6-v2, 384 dimensions)
- **Crawling**: Jina AI Reader API
- **LLMs**: OpenAI (GPT-4o Mini) or Anthropic (Claude 3.5 Haiku)
- **Testing**: Vitest with 42+ passing tests

## Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (free tier works)
- OpenAI or Anthropic API key (for chat functionality)

## Setup Instructions

### 1. Clone and Install

```bash
git clone <repository-url>
cd docai
npm install
```

### 2. Configure Supabase

1. Create a new Supabase project at https://supabase.com
2. Go to **Database** → **Extensions** and enable `vector`
3. Go to Project Settings → API to get your project URL and anon key
4. Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Set Up Database Schema

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase-schema.sql`
4. Execute the SQL to create tables and functions

The schema includes:
- `documents` table for tracking indexed documentation
- `document_sections` table with vector embeddings
- `match_sections` RPC function for similarity search

### 4. Run Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### 5. Build for Production

```bash
npm run build
npm run preview  # Preview production build
```

## Development Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
npm test         # Run Vitest tests
```

## Usage Guide

### Indexing Documentation

1. **Enter Documentation URL**: Input the root URL of the documentation you want to index (e.g., `https://docs.stripe.com/payments`)
2. **Start Crawling**: The system will:
   - Normalize the URL and compute a unique document key
   - Check if documentation is already indexed
   - Crawl up to 100 pages using BFS (max depth: 3)
   - Extract markdown content via Jina AI Reader
   - Chunk content into 700-900 character sections
   - Generate embeddings client-side using Transformers.js
   - Store chunks with embeddings in Supabase

3. **Monitor Progress**: Watch real-time stats for:
   - Pages discovered and processed
   - Chunks created
   - Failed URLs (if any)

### Chatting with Documentation

1. **Configure AI Provider**: After successful crawl, choose your LLM provider (OpenAI or Anthropic)
2. **Enter API Key**: Provide your API key (stored only in browser memory)
3. **Ask Questions**: Start chatting with the documentation
   - Responses are generated using RAG (Retrieval-Augmented Generation)
   - Each answer includes source citations with clickable links
   - Supports streaming responses for a smooth experience
   - Use example queries to get started

## Architecture

### Client-Orchestrated Serverless Design

The application runs entirely client-side with no custom backend:

```
User Browser
  ├── React Application (Vite)
  ├── Transformers.js (Local ML Model)
  ├── ↓ Jina AI Reader API (Markdown Extraction)
  ├── ↓ Supabase (Database + Vector Search)
  └── ↓ OpenAI/Anthropic API (LLM Responses)
```

### Data Flow

**Indexing Pipeline:**
```
URL → Jina Reader → Markdown → Chunking → Embeddings → Supabase
```

**Query Pipeline:**
```
Question → Embedding → Vector Search → RAG Prompt → LLM → Answer + Citations
```

### Key Components

- **`src/hooks/useCrawler.ts`**: BFS crawl orchestrator with progress tracking
- **`src/hooks/useChat.ts`**: RAG-powered chat logic with streaming
- **`src/hooks/useToast.ts`**: Toast notification management
- **`src/lib/embeddings.ts`**: Client-side embedding generation
- **`src/lib/vector-search.ts`**: Supabase vector similarity search
- **`src/lib/rag.ts`**: RAG prompt construction with citations
- **`src/lib/llm-client.ts`**: OpenAI/Anthropic streaming integration
- **`src/lib/url-utils.ts`**: URL normalization and validation
- **`src/lib/chunking.ts`**: Smart markdown chunking

## Project Structure

```
docai/
├── src/
│   ├── components/          # React components
│   │   ├── UrlInput.tsx        # URL input component
│   │   ├── CrawlProgress.tsx   # Crawl progress display
│   │   ├── Chat.tsx            # Chat interface
│   │   ├── ChatMessage.tsx     # Message display with citations
│   │   ├── ChatInput.tsx       # Chat input with auto-resize
│   │   └── Toast.tsx           # Toast notifications
│   ├── hooks/               # Custom React hooks
│   │   ├── useCrawler.ts       # Crawling orchestration
│   │   ├── useChat.ts          # Chat with RAG
│   │   ├── useEmbeddings.ts    # Embedding model lifecycle
│   │   └── useToast.ts         # Toast notifications
│   ├── lib/                 # Utility libraries
│   │   ├── supabase.ts         # Supabase client & helpers
│   │   ├── url-utils.ts        # URL processing
│   │   ├── chunking.ts         # Markdown chunking
│   │   ├── embeddings.ts       # Transformers.js embeddings
│   │   ├── jina-client.ts      # Jina AI Reader
│   │   ├── vector-search.ts    # Vector similarity search
│   │   ├── rag.ts              # RAG prompt building
│   │   └── llm-client.ts       # LLM streaming
│   ├── types/               # TypeScript types
│   ├── App.tsx              # Main application
│   ├── main.tsx             # Entry point
│   └── index.css            # Global styles & design system
├── supabase-schema.sql      # Database schema
├── vitest.config.ts         # Test configuration
├── CLAUDE.md                # Development guidance
└── prd.md                   # Product requirements
```

## Design System

The application features a distinctive "Technical Manuscript" aesthetic:

- **Typography**:
  - Headings: Crimson Pro (serif, elegant)
  - Body: Inter (sans-serif, readable)
  - Code: JetBrains Mono (monospace, crisp)
- **Colors**:
  - Parchment backgrounds (warm, subtle)
  - Deep ink text (high contrast)
  - Amber accents (warmth, attention)
  - Teal highlights (professionalism)
- **Details**:
  - Paper texture background
  - Library card-inspired layouts
  - Gradient accent bars
  - Subtle animations and transitions

## Performance Constraints

- **Crawl Time**: ~120 seconds for 100 pages
- **Cached Load**: <5 seconds (existing documentation)
- **Chat Response**: 3-6 seconds (including vector search)
- **Embedding Model**: ~25 MB one-time download
- **Browser Requirements**: WebAssembly + ES2020 support

## Limitations

- Maximum 300 URLs discovered per crawl
- Maximum 100 pages processed per crawl
- Maximum depth of 3 from root URL
- Same domain and path prefix only
- Requires at least 5 chunks to enable chat
- Client-side embeddings may be slower on low-end devices

## Browser Compatibility

- ✅ Chrome/Edge 90+ (recommended)
- ✅ Firefox 90+
- ✅ Safari 14+
- Requires WebAssembly and ES2020 support

## Troubleshooting

### Crawl Fails with "Bot Blocked"
Some sites block automated crawlers. Try different documentation or check robots.txt.

### Embeddings Model Won't Load
- Check internet connection (25 MB download)
- Verify WebAssembly support in browser
- Try clearing cache and reloading

### Chat Responses Are Slow
- First query includes model download
- Subsequent queries faster (model cached)
- Check network connection

### API Key Invalid
- OpenAI keys: start with `sk-`
- Anthropic keys: start with `sk-ant-`
- Check for typos and trailing spaces

## Milestone Progress

**All 8 Milestones Complete** ✅

- ✅ **Milestone 1**: Project setup & database schema
- ✅ **Milestone 2**: URL utilities & chunking
- ✅ **Milestone 3**: Client-side embeddings
- ✅ **Milestone 4**: Jina Reader & crawling system
- ✅ **Milestone 5**: Basic UI components
- ✅ **Milestone 6**: Vector search & RAG
- ✅ **Milestone 7**: Chat interface
- ✅ **Milestone 8**: Error handling, polish & optimization

## Testing

Run the test suite:

```bash
npm test
```

42+ tests covering:
- URL normalization and validation
- Document key computation
- Markdown link extraction
- Chunking logic with boundaries
- All edge cases and error scenarios

## License

MIT License - See LICENSE file for details

## Acknowledgments

- [Jina AI Reader](https://jina.ai/reader) for markdown extraction
- [Transformers.js](https://huggingface.co/docs/transformers.js) for client-side embeddings
- [Supabase](https://supabase.com) for vector database
- [OpenAI](https://openai.com) and [Anthropic](https://anthropic.com) for LLM capabilities

---

Built with ❤️ for the documentation-reading community
