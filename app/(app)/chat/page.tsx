"use client";

import { useState, useEffect, useCallback } from "react";
import { SessionList } from "@/components/chat/session-list";
import { ChatInterface } from "@/components/chat/chat-interface";
import type { ChatSession, ChatMessage } from "@/lib/supabase/types";

export default function ChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const fetchSessions = useCallback(async () => {
    const res = await fetch("/api/chat/sessions");
    const data = await res.json();
    setSessions(data.sessions ?? []);
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  async function handleSelectSession(session: ChatSession) {
    setActiveSession(session);
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/chat/sessions/${session.id}/messages`);
      const data = await res.json();
      setMessages(data.messages ?? []);
    } finally {
      setLoadingMessages(false);
    }
  }

  function handleNewChat() {
    setActiveSession(null);
    setMessages([]);
  }

  function handleDeleteSession(id: string) {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeSession?.id === id) handleNewChat();
  }

  function handleSessionCreated(id: string) {
    // Refresh sessions list after new chat is created
    fetchSessions();
    // Keep current chat active
  }

  return (
    <div className="flex h-full">
      {/* Sidebar — session list */}
      <div className="w-56 flex-shrink-0 border-r h-full flex flex-col bg-muted/30">
        <div className="px-4 pt-5 pb-2">
          <h2 className="font-semibold text-sm">Chat History</h2>
        </div>
        <div className="flex-1 overflow-hidden">
          <SessionList
            sessions={sessions}
            activeSessionId={activeSession?.id}
            onSelect={handleSelectSession}
            onNew={handleNewChat}
            onDelete={handleDeleteSession}
          />
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeSession && (
          <div className="border-b px-6 py-3">
            <h1 className="font-semibold text-sm truncate">{activeSession.title}</h1>
          </div>
        )}

        {loadingMessages ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Loading messages…
          </div>
        ) : (
          <ChatInterface
            key={activeSession?.id ?? "new"}
            sessionId={activeSession?.id}
            initialMessages={messages.map((m) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              sources: m.sources,
            }))}
            onSessionCreated={handleSessionCreated}
          />
        )}
      </div>
    </div>
  );
}
