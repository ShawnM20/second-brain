"use client";

import { useState, useEffect, useCallback } from "react";
import { UploadZone } from "@/components/documents/upload-zone";
import { DocumentList } from "@/components/documents/document-list";
import { Separator } from "@/components/ui/separator";
import type { Document } from "@/lib/supabase/types";

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch("/api/documents");
      const data = await res.json();
      setDocuments(data.documents ?? []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  function handleDelete(id: string) {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Documents</h1>
        <p className="text-muted-foreground mt-1">
          Upload files to add them to your knowledge base.
        </p>
      </div>

      <UploadZone onUploadComplete={fetchDocuments} />

      <Separator className="my-8" />

      <div className="mb-4">
        <h2 className="font-semibold">Your documents</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {documents.length} document{documents.length !== 1 ? "s" : ""} in your knowledge base
        </p>
      </div>

      <DocumentList
        documents={documents}
        onDelete={handleDelete}
        isLoading={isLoading}
      />
    </div>
  );
}
