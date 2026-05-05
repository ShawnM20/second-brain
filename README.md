# Second Brain — RAG-Powered Personal Knowledge Base

A full-stack AI application that lets you upload documents and have natural-language conversations with them. Built end-to-end with a custom RAG pipeline — no LangChain, no abstractions hiding the work.

**Live demo:** _add your Vercel URL here_

---

## What it does

Upload a PDF, Word doc, or text file. Ask questions in plain English. Get answers drawn directly from your content with inline source citations — not hallucinated from a model's training data.

---

## Architecture

```
DOCUMENT INGESTION
─────────────────────────────────────────────────────
User uploads file
  → Text extraction        (pdf-parse / mammoth)
  → Recursive chunking     (~512 tokens, 10% overlap)
  → Batch embedding        (Voyage AI — voyage-3-lite, 512 dims)
  → Vector storage         (Supabase pgvector, HNSW index)

Upload returns immediately with status: "processing"
Pipeline runs async — UI polls until status: "ready"

CHAT / RETRIEVAL
─────────────────────────────────────────────────────
User sends message
  → Embed query            (Voyage AI)
  → Cosine similarity search via match_chunks() RPC
  → Top-k chunks injected into system prompt as context
  → Groq Llama 3.3 70B streams grounded response
  → Vercel AI SDK streams tokens to client in real time
  → Response + sources persisted to Supabase
```

**Key design decisions:**

| Decision | Choice | Reason |
|---|---|---|
| Embedding model | Voyage AI voyage-3-lite | High quality, 512 dims, cheap per token |
| Vector index | HNSW cosine (pgvector) | Sub-100ms ANN search, tunable recall |
| LLM | Groq Llama 3.3 70B | Free tier, genuinely fast inference |
| Chunk size | ~512 tokens, 10% overlap | Prevents context loss at boundaries |
| Processing | Fire-and-forget async | Upload returns fast; pipeline runs in background |
| Auth | Clerk | Drop-in Next.js integration, free tier |
| Rate limiting | Upstash Redis + in-memory fallback | No hard dependency on Redis in dev |
| Security | Supabase RLS | Every query scoped to authenticated user ID |

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| Auth | Clerk |
| Database | Supabase — PostgreSQL + pgvector |
| Embeddings | Voyage AI — voyage-3-lite (512 dims) |
| LLM | Groq — Llama 3.3 70B Versatile |
| AI SDK | Vercel AI SDK v4 |
| Rate limiting | Upstash Redis (falls back to in-memory) |
| Styling | Tailwind CSS + shadcn/ui |
| Deployment | Vercel |

---

## Features

- Drag-and-drop upload — PDF, DOCX, MD, TXT up to 20 MB
- Async processing pipeline with real-time status polling
- Semantic search — vector similarity, not keyword matching
- Streaming chat responses via Vercel AI SDK
- Inline source citations linking back to exact document chunks
- Persistent chat sessions with auto-generated titles
- Per-user rate limiting on upload and chat endpoints
- Private by design — Supabase RLS ensures users only see their own data

---

## Running locally

**Prerequisites:** Node.js 18+, Supabase project, Clerk account, Voyage AI key, Groq key

### 1. Clone and install

```bash
git clone https://github.com/your-username/second-brain.git
cd second-brain
npm install
```

### 2. Set up Supabase

Run [`supabase/schema.sql`](supabase/schema.sql) in your Supabase SQL editor. This creates the tables, HNSW vector index, `match_chunks()` search function, and RLS policies.

Also create a Storage bucket named `documents` (private).

### 3. Environment variables

Create `.env.local` in the project root:

```env
# Clerk — https://dashboard.clerk.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Supabase — https://supabase.com/dashboard
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Voyage AI — https://dash.voyageai.com
VOYAGE_API_KEY=pa-...

# Groq — https://console.groq.com
GROQ_API_KEY=gsk_...

# Upstash Redis — optional, falls back to in-memory if not set
# UPSTASH_REDIS_REST_URL=https://...
# UPSTASH_REDIS_REST_TOKEN=...
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deploying to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo
3. Add every key from `.env.local` as a Vercel environment variable
4. In your Clerk dashboard, add your Vercel deployment URL to allowed origins
5. Deploy

---

## Project structure

```
app/
  (app)/
    dashboard/        # Stats — document count, chunks indexed, last session
    documents/        # Upload zone + document list with status badges
    chat/             # Streaming chat with session sidebar
  api/
    chat/             # POST — retrieval + streaming response + session management
    chat/sessions/    # GET session list, DELETE session
    documents/        # GET list, DELETE with storage cleanup
    documents/upload/ # POST — async ingestion pipeline
    documents/[id]/status/  # GET — polling endpoint

lib/
  rag/
    parser.ts         # Text extraction per file type
    chunker.ts        # Recursive token-aware text splitter
    embeddings.ts     # Voyage AI batch embedding calls
    retriever.ts      # pgvector similarity search via Supabase RPC
    prompts.ts        # System prompt builder
  supabase/           # Server/client factory functions + types
  rate-limit.ts       # Upstash Redis or in-memory fallback
  env.ts              # Zod env var validation at startup

components/
  chat/               # ChatInterface, SessionList
  documents/          # UploadZone, DocumentList
  layout/             # Sidebar

supabase/
  schema.sql          # Full schema — tables, indexes, RLS, match_chunks()
```
