import { auth } from "@clerk/nextjs/server";
import { createServiceClient } from "@/lib/supabase/server";
import { FileText, MessageSquare, Cpu, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import type { Document, ChatSession } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const supabase = createServiceClient();

  const [{ data: rawDocs }, { data: rawSessions }, { count: chunkCount }] =
    await Promise.all([
      supabase
        .from("documents")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("chat_sessions")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(1),
      supabase
        .from("document_chunks")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
    ]);

  const documents = (rawDocs ?? []) as Document[];
  const sessions = (rawSessions ?? []) as ChatSession[];
  const totalTokens = documents.reduce((sum, d) => sum + (d.token_count ?? 0), 0);
  const lastSession = sessions[0] ?? null;

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Your knowledge base at a glance.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          icon={FileText}
          label="Documents"
          value={documents.length}
          sub={`${chunkCount ?? 0} searchable chunks`}
        />
        <StatCard
          icon={Cpu}
          label="Tokens indexed"
          value={totalTokens.toLocaleString()}
          sub="~$0.00 in embeddings"
        />
        <StatCard
          icon={MessageSquare}
          label="Last chat"
          value={lastSession ? lastSession.title : "—"}
          sub={lastSession ? formatDate(lastSession.updated_at) : "No chats yet"}
          truncateValue
        />
      </div>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Upload documents</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Add PDFs, notes, or text files to expand your knowledge base.
            </p>
            <Button asChild size="sm">
              <Link href="/documents">
                Go to Documents <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ask a question</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Start a new chat session to query your uploaded documents.
            </p>
            <Button asChild size="sm" variant="outline">
              <Link href="/chat">
                Open Chat <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent documents */}
      {documents.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Recent documents</h2>
            <Link href="/documents" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="divide-y divide-border rounded-xl border overflow-hidden">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 p-3.5 bg-card text-sm"
              >
                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="flex-1 truncate">{doc.name}</span>
                <span className="text-muted-foreground text-xs">
                  {formatDate(doc.created_at)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  truncateValue,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub: string;
  truncateValue?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
        <p className={`font-bold ${truncateValue ? "truncate text-lg" : "text-2xl"}`}>
          {value}
        </p>
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      </CardContent>
    </Card>
  );
}
