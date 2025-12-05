# DocAI - Chat with Any Documentation

A serverless single-page application that enables users to chat with any documentation site using client-side crawling, embeddings, and RAG (Retrieval-Augmented Generation).

## Tech Stack

- **Frontend**: Vite + React + TypeScript
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui
- **Database**: Supabase (PostgreSQL + pgvector)
- **Embeddings**: Transformers.js (client-side, all-MiniLM-L6-v2)
- **Crawling**: Jina AI Reader API
- **LLM**: User-provided API key (OpenAI/Anthropic/Custom)

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new Supabase project at [https://app.supabase.com](https://app.supabase.com)
2. Enable the pgvector extension:
   - Go to **Database** → **Extensions**
   - Search for "vector" and enable it
3. Run the database schema:
   - Go to **SQL Editor**
   - Copy and paste the contents of `supabase-schema.sql`
   - Execute the SQL

### 3. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Update `.env` with your Supabase credentials:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

You can find these values in your Supabase project:
- Go to **Settings** → **API**
- Copy the **Project URL** and **anon/public** key

### 4. Run the Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Development Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build locally
npm run lint     # Run ESLint
npm run test     # Run tests (Vitest)
```

## Project Structure

```
docai/
├── src/
│   ├── components/     # React components
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utility libraries
│   │   ├── utils.ts        # General utilities (Tailwind cn)
│   │   ├── supabase.ts     # Supabase client & helpers
│   │   ├── url-utils.ts    # URL normalization & validation
│   │   └── chunking.ts     # Markdown chunking logic
│   ├── types/          # TypeScript type definitions
│   ├── App.tsx         # Main app component
│   ├── main.tsx        # Entry point
│   └── index.css       # Global styles
├── supabase-schema.sql # Database schema
├── vitest.config.ts    # Vitest test configuration
├── CLAUDE.md           # Claude Code guidance
└── prd.md              # Product Requirements Document
```

## Current Status

**Milestone 1 Complete** ✓
- Vite + React + TypeScript project initialized
- Tailwind CSS configured
- shadcn/ui set up
- Supabase client configured
- Database schema created
- Basic project structure in place

**Milestone 2 Complete** ✓
- URL utilities: normalize, compute document key, validate scope
- Markdown link extraction
- Chunking logic with smart boundary detection (700-900 chars, 100 char overlap)
- Comprehensive test suite with Vitest (42 tests passing)
- All utilities tested and ready for integration

## Next Steps

See the development plan in `.claude/plans/jazzy-toasting-teapot.md` for upcoming milestones:
- Milestone 3: Client-Side Embeddings (Transformers.js integration)
- Milestone 4: Jina Reader Integration & Crawling System
- Milestone 5: Basic UI Components
- And more...

## License

ISC
