"use client";

import { useRef, useEffect, useState } from "react";
import { useChat } from "ai/react";
import { Send, Loader2, Bot, User, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChunkSource } from "@/lib/supabase/types";

interface StoredMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ChunkSource[] | null;
}

interface ChatInterfaceProps {
  sessionId?: string;
  initialMessages?: StoredMessage[];
  onSessionCreated?: (id: string) => void;
}

export function ChatInterface({
  sessionId: initialSessionId,
  initialMessages = [],
  onSessionCreated,
}: ChatInterfaceProps) {
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>(initialSessionId);
  const [sourcesMap, setSourcesMap] = useState<Record<string, ChunkSource[]>>({});
  const bottomRef = useRef<HTMLDivElement>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages } = useChat({
    api: "/api/chat",
    initialMessages: initialMessages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
    })),
    body: { sessionId: activeSessionId },
    onResponse: (response) => {
      const newSessionId = response.headers.get("X-Session-Id");
      if (newSessionId && newSessionId !== activeSessionId) {
        setActiveSessionId(newSessionId);
        onSessionCreated?.(newSessionId);
      }
    },
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading) {
        handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
      }
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <ScrollArea className="flex-1 px-4">
        <div className="max-w-3xl mx-auto py-6 space-y-6">
          {messages.length === 0 && (
            <div className="text-center py-20">
              <div className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center mx-auto mb-4">
                <Bot className="h-6 w-6 text-amber-400" />
              </div>
              <p className="font-semibold text-white mb-1">Ask anything about your documents</p>
              <p className="text-sm text-zinc-500 font-mono">
                Upload a document first, then start asking questions.
              </p>
            </div>
          )}

          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              role={message.role as "user" | "assistant"}
              content={message.content}
              sources={sourcesMap[message.id]}
            />
          ))}

          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-amber-400/10 border border-amber-400/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot className="h-4 w-4 text-amber-400" />
              </div>
              <div className="flex items-center gap-2 text-zinc-500 text-sm font-mono pt-2">
                <span className="inline-flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-bounce [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-bounce [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-bounce [animation-delay:300ms]" />
                </span>
                Searching your documents…
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border p-4 bg-background">
        <form
          onSubmit={handleSubmit}
          className="max-w-3xl mx-auto flex gap-2 items-end"
        >
          <Textarea
            value={input}
            onChange={handleInputChange}
            onKeyDown={onKeyDown}
            placeholder="Ask a question about your documents… (Enter to send, Shift+Enter for newline)"
            className="min-h-[52px] max-h-[160px] resize-none flex-1 bg-card border-border font-mono text-sm placeholder:text-zinc-600"
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            className="h-[52px] w-[52px] flex-shrink-0 bg-amber-400 hover:bg-amber-300 text-black"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
        <p className="text-xs text-zinc-600 font-mono text-center mt-2">
          Answers are based on your uploaded documents.
        </p>
      </div>
    </div>
  );
}

function MessageBubble({
  role,
  content,
  sources,
}: {
  role: "user" | "assistant";
  content: string;
  sources?: ChunkSource[];
}) {
  const [showSources, setShowSources] = useState(false);

  return (
    <div className={cn("flex gap-3", role === "user" && "flex-row-reverse")}>
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 border",
          role === "user"
            ? "bg-amber-400 border-amber-400 text-black"
            : "bg-amber-400/10 border-amber-400/20 text-amber-400"
        )}
      >
        {role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div className={cn("flex-1 min-w-0", role === "user" && "flex flex-col items-end")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-3 max-w-[85%] text-sm",
            role === "user"
              ? "bg-amber-400 text-black font-medium rounded-tr-sm"
              : "bg-card border border-border text-zinc-200 rounded-tl-sm"
          )}
        >
          {role === "assistant" ? (
            <div className="prose-chat">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
          ) : (
            <p className="whitespace-pre-wrap">{content}</p>
          )}
        </div>

        {role === "assistant" && sources && sources.length > 0 && (
          <div className="mt-2 max-w-[85%]">
            <button
              onClick={() => setShowSources((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <BookOpen className="h-3 w-3" />
              {sources.length} source{sources.length > 1 ? "s" : ""}
              <span className="text-xs">{showSources ? "▲" : "▼"}</span>
            </button>

            {showSources && (
              <div className="mt-2 space-y-2">
                {sources.map((s, i) => (
                  <div
                    key={s.chunkId}
                    className="rounded-lg bg-accent/50 border p-3 text-xs"
                  >
                    <p className="font-medium text-foreground mb-1">
                      [{i + 1}] {s.documentName}{" "}
                      <span className="text-muted-foreground font-normal">
                        — {Math.round(s.similarity * 100)}% match
                      </span>
                    </p>
                    <p className="text-muted-foreground leading-relaxed">{s.excerpt}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
