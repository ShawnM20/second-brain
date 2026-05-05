import { createServiceClient } from "@/lib/supabase/server";
import { embedText } from "./embeddings";
import type { ChunkSource, MatchChunksResult } from "@/lib/supabase/types";

export interface RetrievalResult {
  sources: ChunkSource[];
  context: string;
}

export async function retrieveRelevantChunks(
  query: string,
  userId: string,
  topK = 5,
  threshold = 0.70
): Promise<RetrievalResult> {
  const queryEmbedding = await embedText(query);
  const supabase = createServiceClient();

  const { data, error } = await supabase.rpc("match_chunks", {
    query_embedding: queryEmbedding,
    match_user_id: userId,
    match_count: topK,
    match_threshold: threshold,
  });

  if (error) throw new Error(`Vector search failed: ${error.message}`);

  const chunks = (data ?? []) as MatchChunksResult[];

  const sources: ChunkSource[] = chunks.map((c) => ({
    chunkId: c.id,
    documentId: c.document_id,
    documentName: c.document_name,
    excerpt: c.content.slice(0, 200) + (c.content.length > 200 ? "…" : ""),
    similarity: Math.round(c.similarity * 100) / 100,
  }));

  const context = chunks
    .map((c, i) => `[Source ${i + 1}: ${c.document_name}]\n${c.content}`)
    .join("\n\n---\n\n");

  return { sources, context };
}
