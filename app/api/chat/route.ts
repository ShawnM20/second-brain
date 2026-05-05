import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { groq } from "@ai-sdk/groq";
import { generateText } from "ai";
import { streamText } from "ai";
import { createServiceClient } from "@/lib/supabase/server";
import { retrieveRelevantChunks } from "@/lib/rag/retriever";
import { buildSystemPrompt, buildTitlePrompt } from "@/lib/rag/prompts";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import type { ChunkSource, ChatSession } from "@/lib/supabase/types";

const bodySchema = z.object({
  sessionId: z.string().uuid().optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(8000),
      })
    )
    .min(1),
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await rateLimit(req, userId, { limit: 30, windowSecs: 60 });
  if (!allowed) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { sessionId: existingSessionId, messages } = parsed.data;
  const userMessage = messages[messages.length - 1];
  if (userMessage.role !== "user")
    return NextResponse.json({ error: "Last message must be from user" }, { status: 400 });

  const supabase = createServiceClient();

  // Create or reuse session
  let sessionId = existingSessionId;
  if (!sessionId) {
    const { data: rawSession, error } = await supabase
      .from("chat_sessions")
      .insert({ user_id: userId, title: "New Chat" })
      .select()
      .single();
    if (error || !rawSession)
      return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
    const session = rawSession as ChatSession;
    sessionId = session.id;
    generateTitle(userMessage.content, sessionId, userId).catch(console.error);
  }

  const finalSessionId = sessionId;

  // Persist user message
  await supabase.from("chat_messages").insert({
    session_id: finalSessionId,
    user_id: userId,
    role: "user",
    content: userMessage.content,
  });

  // Retrieve context
  let systemPrompt: string;
  let sources: ChunkSource[] = [];
  try {
    const retrieval = await retrieveRelevantChunks(userMessage.content, userId, 6, 0.3);
    sources = retrieval.sources;
    systemPrompt = buildSystemPrompt(retrieval.context);
  } catch (e) {
    console.error("Retrieval error:", e);
    systemPrompt = buildSystemPrompt("No documents found.");
  }

  const capturedSources = sources;

  const result = streamText({
    model: groq("llama-3.3-70b-versatile"),
    system: systemPrompt,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    maxTokens: 1024,
    onFinish: async ({ text }) => {
      await supabase.from("chat_messages").insert({
        session_id: finalSessionId,
        user_id: userId,
        role: "assistant",
        content: text,
        sources: capturedSources.length > 0 ? capturedSources : null,
      });
    },
  });

  const response = result.toDataStreamResponse();
  response.headers.set("X-Session-Id", finalSessionId);
  return response;
}

async function generateTitle(firstMessage: string, sessionId: string, userId: string) {
  const supabase = createServiceClient();

  const { text } = await generateText({
    model: groq("llama-3.3-70b-versatile"),
    prompt: buildTitlePrompt(firstMessage),
    maxTokens: 20,
  });

  const title = text.trim() || "New Chat";
  await supabase
    .from("chat_sessions")
    .update({ title })
    .eq("id", sessionId)
    .eq("user_id", userId);
}
