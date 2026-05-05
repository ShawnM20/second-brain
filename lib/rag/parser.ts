// Document text extraction — runs server-side only

export async function extractText(
  buffer: Buffer,
  fileType: string
): Promise<string> {
  const type = fileType.toLowerCase();

  if (type === "pdf") {
    // pdf-parse is a CommonJS module; dynamic import keeps it out of edge runtime
    const pdfParse = (await import("pdf-parse")).default;
    const result = await pdfParse(buffer);
    return result.text;
  }

  if (type === "txt" || type === "md" || type === "markdown") {
    return buffer.toString("utf-8");
  }

  if (type === "docx") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  throw new Error(`Unsupported file type: ${fileType}`);
}

export function detectFileType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const supported = ["pdf", "txt", "md", "markdown", "docx"];
  if (!supported.includes(ext)) throw new Error(`Unsupported extension: .${ext}`);
  return ext;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
