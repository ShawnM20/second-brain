"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { cn, formatFileSize } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface UploadFile {
  file: File;
  status: "pending" | "uploading" | "processing" | "done" | "error";
  error?: string;
  docId?: string;
}

interface UploadZoneProps {
  onUploadComplete: () => void;
}

const ACCEPTED_TYPES: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "text/plain": [".txt"],
  "text/markdown": [".md"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
};

export function UploadZone({ onUploadComplete }: UploadZoneProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);

  const processFile = useCallback(
    async (file: File) => {
      const newFile: UploadFile = { file, status: "uploading" };

      // Add file to list
      setFiles((prev) => [...prev, newFile]);

      try {
        const form = new FormData();
        form.append("file", file);

        const res = await fetch("/api/documents/upload", { method: "POST", body: form });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Upload failed");

        const docId: string = data.document.id;

        setFiles((prev) =>
          prev.map((f) =>
            f.file === file ? { ...f, status: "processing", docId } : f
          )
        );

        // Refresh list immediately so "Processing" badge appears
        onUploadComplete();

        // Poll until ready or error
        await pollStatus(docId);

        setFiles((prev) =>
          prev.map((f) => (f.file === file ? { ...f, status: "done" } : f))
        );

        // Refresh again when done
        onUploadComplete();
      } catch (e: unknown) {
        setFiles((prev) =>
          prev.map((f) =>
            f.file === file
              ? { ...f, status: "error", error: (e as Error).message }
              : f
          )
        );
        // Refresh even on error so any partial record shows
        onUploadComplete();
      }
    },
    [onUploadComplete]
  );

  async function pollStatus(docId: string) {
    for (let attempt = 0; attempt < 60; attempt++) {
      await new Promise((r) => setTimeout(r, 2000));
      const res = await fetch(`/api/documents/${docId}/status`);
      if (!res.ok) continue;
      const data = await res.json();
      if (data.status === "ready") return;
      if (data.status === "error") throw new Error("Processing failed");
    }
    throw new Error("Processing timed out");
  }

  const onDrop = useCallback(
    (accepted: File[]) => {
      accepted.forEach((file) => processFile(file));
    },
    [processFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: 20 * 1024 * 1024,
    multiple: true,
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors",
          isDragActive
            ? "border-amber-400 bg-amber-400/5"
            : "border-border hover:border-amber-400/40 hover:bg-white/[0.02]"
        )}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm font-medium">
          {isDragActive ? "Drop files here" : "Drag & drop files here"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          PDF, TXT, MD, DOCX — max 20 MB each
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4 border-amber-400/30 text-amber-400 hover:bg-amber-400/10 hover:text-amber-300"
          type="button"
        >
          Browse files
        </Button>
      </div>

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((uf, i) => (
            <li key={i} className="flex items-center gap-3 rounded-lg border p-3 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium">{uf.file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(uf.file.size)}
                  {uf.error && (
                    <span className="text-destructive ml-2">{uf.error}</span>
                  )}
                </p>
              </div>
              <StatusIcon status={uf.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: UploadFile["status"] }) {
  if (status === "uploading" || status === "processing")
    return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
  if (status === "done")
    return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  if (status === "error")
    return <XCircle className="h-4 w-4 text-destructive" />;
  return <div className="h-4 w-4 rounded-full border-2 border-muted" />;
}
