"use client";

import { useState } from "react";
import { MessageSquare, Trash2, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, formatDate } from "@/lib/utils";
import type { ChatSession } from "@/lib/supabase/types";

interface SessionListProps {
  sessions: ChatSession[];
  activeSessionId?: string;
  onSelect: (session: ChatSession) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

export function SessionList({
  sessions,
  activeSessionId,
  onSelect,
  onNew,
  onDelete,
}: SessionListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (!confirm("Delete this chat session?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/chat/sessions?id=${id}`, { method: "DELETE" });
      if (res.ok) onDelete(id);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3">
        <Button
          onClick={onNew}
          size="sm"
          className="w-full gap-2 bg-amber-400 hover:bg-amber-300 text-black font-semibold"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-2 pb-2 space-y-0.5">
          {sessions.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6 px-2">
              No chat history yet.
            </p>
          )}
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => onSelect(session)}
              className={cn(
                "w-full flex items-start gap-2 rounded-lg px-3 py-2.5 text-left hover:bg-white/5 transition-colors group",
                activeSessionId === session.id && "bg-amber-400/10 text-amber-400"
              )}
            >
              <MessageSquare className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate leading-tight">
                  {session.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDate(session.updated_at)}
                </p>
              </div>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => handleDelete(e, session.id)}
                onKeyDown={(e) => e.key === "Enter" && handleDelete(e as unknown as React.MouseEvent, session.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:text-destructive rounded"
              >
                {deletingId === session.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
              </span>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
