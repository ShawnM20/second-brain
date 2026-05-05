export type DocumentStatus = "processing" | "ready" | "error";
export type MessageRole = "user" | "assistant";

export interface Document {
  id: string;
  user_id: string;
  name: string;
  file_type: string;
  file_size: number;
  storage_path: string | null;
  status: DocumentStatus;
  chunk_count: number;
  token_count: number;
  created_at: string;
  updated_at: string;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  user_id: string;
  content: string;
  chunk_index: number;
  token_count: number;
  embedding: number[] | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  user_id: string;
  role: MessageRole;
  content: string;
  sources: ChunkSource[] | null;
  created_at: string;
}

export interface ChunkSource {
  chunkId: string;
  documentId: string;
  documentName: string;
  excerpt: string;
  similarity: number;
}

export interface MatchChunksResult {
  id: string;
  document_id: string;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
  document_name: string;
}

// Minimal Database type for createClient generic
export type Database = {
  public: {
    Tables: {
      documents: { Row: Document; Insert: Omit<Document, "id" | "created_at" | "updated_at">; Update: Partial<Document> };
      document_chunks: { Row: DocumentChunk; Insert: Omit<DocumentChunk, "id" | "created_at">; Update: Partial<DocumentChunk> };
      chat_sessions: { Row: ChatSession; Insert: Omit<ChatSession, "id" | "created_at" | "updated_at">; Update: Partial<ChatSession> };
      chat_messages: { Row: ChatMessage; Insert: Omit<ChatMessage, "id" | "created_at">; Update: Partial<ChatMessage> };
    };
    Functions: {
      match_chunks: {
        Args: { query_embedding: number[]; match_user_id: string; match_count?: number; match_threshold?: number };
        Returns: MatchChunksResult[];
      };
    };
  };
};
