import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServiceClient } from "@/lib/supabase/server";
import { extractText, detectFileType } from "@/lib/rag/parser";
import { chunkText } from "@/lib/rag/chunker";
import { embedBatch } from "@/lib/rag/embeddings";
import { rateLimit } from "@/lib/rate-limit";
import type { Document } from "@/lib/supabase/types";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await rateLimit(req, userId, { limit: 10, windowSecs: 60 });
  if (!allowed) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (file.size > MAX_FILE_SIZE)
    return NextResponse.json({ error: "File exceeds 20 MB limit" }, { status: 413 });

  let fileType: string;
  try {
    fileType = detectFileType(file.name);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: rawDoc, error: insertError } = await supabase
    .from("documents")
    .insert({
      user_id: userId,
      name: file.name,
      file_type: fileType,
      file_size: file.size,
      status: "processing",
      chunk_count: 0,
      token_count: 0,
    })
    .select()
    .single();

  if (insertError || !rawDoc) {
    console.error("[upload] insert error:", insertError);
    return NextResponse.json({ error: insertError?.message ?? "Failed to create document record" }, { status: 500 });
  }

  const doc = rawDoc as Document;

  // Fire-and-forget — return doc immediately so UI can start polling
  processDocument(file, doc.id, userId, fileType).catch(async (err) => {
    console.error("Document processing failed:", err);
    await supabase.from("documents").update({ status: "error" }).eq("id", doc.id);
  });

  return NextResponse.json({ document: doc }, { status: 201 });
}

async function processDocument(
  file: File,
  documentId: string,
  userId: string,
  fileType: string
) {
  const supabase = createServiceClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  // Upload raw file to storage
  const storagePath = `${userId}/${documentId}/${file.name}`;
  await supabase.storage.from("documents").upload(storagePath, buffer, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });

  // Extract text
  const text = await extractText(buffer, fileType);
  if (!text || text.trim().length < 10) {
    await supabase.from("documents").update({ status: "error" }).eq("id", documentId);
    return;
  }

  // Chunk
  const chunks = chunkText(text, { documentId, fileName: file.name });

  // Embed all chunks
  const embeddings = await embedBatch(chunks.map((c) => c.content));

  // Store chunks in batches
  const chunkRows = chunks.map((chunk, i) => ({
    document_id: documentId,
    user_id: userId,
    content: chunk.content,
    chunk_index: chunk.chunkIndex,
    token_count: chunk.tokenCount,
    embedding: embeddings[i],
    metadata: chunk.metadata,
  }));

  for (let i = 0; i < chunkRows.length; i += 50) {
    await supabase.from("document_chunks").insert(chunkRows.slice(i, i + 50));
  }

  // Mark ready
  const totalTokens = chunks.reduce((sum, c) => sum + c.tokenCount, 0);
  await supabase
    .from("documents")
    .update({
      status: "ready",
      chunk_count: chunks.length,
      token_count: totalTokens,
      storage_path: storagePath,
    })
    .eq("id", documentId);
}
