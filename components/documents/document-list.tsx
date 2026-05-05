"use client";

import { useState } from "react";
import { FileText, Trash2, Loader2, FileUp, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatFileSize, cn } from "@/lib/utils";
import type { Document } from "@/lib/supabase/types";

interface DocumentListProps {
  documents: Document[];
  onDelete: (id: string) => void;
  isLoading?: boolean;
}

export function DocumentList({ documents, onDelete, isLoading }: DocumentListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Delete this document and all its data?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/documents?id=${id}`, { method: "DELETE" });
      if (res.ok) onDelete(id);
    } finally {
      setDeletingId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading documents…
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FileUp className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="font-medium text-muted-foreground">No documents yet</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Upload your first document above to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border rounded-xl border overflow-hidden">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="flex items-center gap-4 p-4 bg-card hover:bg-accent/30 transition-colors"
        >
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <FileText className="h-4 w-4 text-primary" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{doc.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatFileSize(doc.file_size)} · {formatDate(doc.created_at)}
              {doc.status === "ready" && ` · ${doc.chunk_count} chunks`}
            </p>
          </div>

          <StatusBadge status={doc.status} />

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
            onClick={() => handleDelete(doc.id)}
            disabled={deletingId === doc.id}
          >
            {deletingId === doc.id ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: Document["status"] }) {
  if (status === "ready")
    return (
      <Badge variant="success" className="gap-1">
        <CheckCircle className="h-3 w-3" /> Ready
      </Badge>
    );
  if (status === "processing")
    return (
      <Badge variant="warning" className="gap-1">
        <Loader2 className="h-3 w-3 animate-spin" /> Processing
      </Badge>
    );
  return (
    <Badge variant="error" className="gap-1">
      <AlertCircle className="h-3 w-3" /> Error
    </Badge>
  );
}
