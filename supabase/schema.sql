-- Enable pgvector extension
create extension if not exists vector;

-- Documents table
create table if not exists documents (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null,
  name        text not null,
  file_type   text not null,           -- 'pdf' | 'txt' | 'md'
  file_size   bigint not null,
  storage_path text,                   -- Supabase Storage path
  status      text not null default 'processing', -- 'processing' | 'ready' | 'error'
  chunk_count int  not null default 0,
  token_count int  not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Chunks table (each document is split into overlapping chunks)
create table if not exists document_chunks (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  user_id     text not null,
  content     text not null,
  chunk_index int  not null,
  token_count int  not null default 0,
  embedding   vector(512),            -- text-embedding-3-small dimension
  metadata    jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

-- Chat sessions
create table if not exists chat_sessions (
  id         uuid primary key default gen_random_uuid(),
  user_id    text not null,
  title      text not null default 'New Chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Chat messages
create table if not exists chat_messages (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references chat_sessions(id) on delete cascade,
  user_id     text not null,
  role        text not null,           -- 'user' | 'assistant'
  content     text not null,
  sources     jsonb,                   -- cited chunk ids + excerpts
  created_at  timestamptz not null default now()
);

-- Indexes
create index if not exists documents_user_id_idx on documents(user_id);
create index if not exists chunks_document_id_idx on document_chunks(document_id);
create index if not exists chunks_user_id_idx on document_chunks(user_id);
create index if not exists chat_sessions_user_id_idx on chat_sessions(user_id);
create index if not exists chat_messages_session_id_idx on chat_messages(session_id);

-- HNSW index for fast approximate nearest-neighbor search
create index if not exists chunks_embedding_idx on document_chunks
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- Row-level security (users can only access their own data)
alter table documents         enable row level security;
alter table document_chunks   enable row level security;
alter table chat_sessions     enable row level security;
alter table chat_messages     enable row level security;

-- Policies (service role bypasses these; anon/authenticated use them)
create policy "users_own_documents"
  on documents for all using (user_id = auth.uid()::text);

create policy "users_own_chunks"
  on document_chunks for all using (user_id = auth.uid()::text);

create policy "users_own_sessions"
  on chat_sessions for all using (user_id = auth.uid()::text);

create policy "users_own_messages"
  on chat_messages for all using (user_id = auth.uid()::text);

-- Semantic search function (called from API with service role)
create or replace function match_chunks(
  query_embedding vector(512),
  match_user_id   text,
  match_count     int     default 5,
  match_threshold float   default 0.70
)
returns table (
  id          uuid,
  document_id uuid,
  content     text,
  metadata    jsonb,
  similarity  float,
  document_name text
)
language sql stable
as $$
  select
    dc.id,
    dc.document_id,
    dc.content,
    dc.metadata,
    1 - (dc.embedding <=> query_embedding) as similarity,
    d.name as document_name
  from document_chunks dc
  join documents d on d.id = dc.document_id
  where
    dc.user_id = match_user_id
    and d.status = 'ready'
    and 1 - (dc.embedding <=> query_embedding) > match_threshold
  order by dc.embedding <=> query_embedding
  limit match_count;
$$;

-- Auto-update updated_at
create or replace function handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger documents_updated_at
  before update on documents
  for each row execute procedure handle_updated_at();

create trigger chat_sessions_updated_at
  before update on chat_sessions
  for each row execute procedure handle_updated_at();
