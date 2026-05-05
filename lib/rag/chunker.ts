// Recursive character text splitter with token-aware sizing
// Targets ~512 tokens per chunk, 10% overlap — tuned for text-embedding-3-small

const CHUNK_SIZE = 512;       // target tokens
const CHUNK_OVERLAP = 52;     // ~10% overlap
const AVG_CHARS_PER_TOKEN = 4; // rough estimate; tiktoken is accurate but slow in edge

function estimateTokens(text: string): number {
  return Math.ceil(text.length / AVG_CHARS_PER_TOKEN);
}

const SEPARATORS = ["\n\n", "\n", ". ", "! ", "? ", "; ", ", ", " ", ""];

function splitOnSeparator(text: string, separator: string): string[] {
  if (separator === "") return text.split("");
  return text.split(separator).map((s, i, arr) =>
    i < arr.length - 1 ? s + separator : s
  );
}

function mergeChunks(splits: string[], chunkSize: number): string[] {
  const chunks: string[] = [];
  let current = "";

  for (const split of splits) {
    const candidate = current ? current + split : split;
    if (estimateTokens(candidate) <= chunkSize) {
      current = candidate;
    } else {
      if (current) chunks.push(current.trim());
      current = split;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

function recursiveSplit(text: string, separators: string[]): string[] {
  const [sep, ...rest] = separators;
  const splits = splitOnSeparator(text, sep);

  const good: string[] = [];
  const large: string[] = [];

  for (const s of splits) {
    if (estimateTokens(s) <= CHUNK_SIZE) {
      good.push(s);
    } else if (rest.length > 0) {
      large.push(...recursiveSplit(s, rest));
    } else {
      // No more separators — force-split by chars
      for (let i = 0; i < s.length; i += CHUNK_SIZE * AVG_CHARS_PER_TOKEN) {
        large.push(s.slice(i, i + CHUNK_SIZE * AVG_CHARS_PER_TOKEN));
      }
    }
  }

  return mergeChunks([...good, ...large], CHUNK_SIZE);
}

export interface TextChunk {
  content: string;
  chunkIndex: number;
  tokenCount: number;
  metadata: Record<string, unknown>;
}

export function chunkText(
  text: string,
  baseMetadata: Record<string, unknown> = {}
): TextChunk[] {
  const rawChunks = recursiveSplit(text.trim(), SEPARATORS);

  // Add overlap by prepending last N chars of previous chunk
  const overlapChars = CHUNK_OVERLAP * AVG_CHARS_PER_TOKEN;
  const overlapped: string[] = rawChunks.map((chunk, i) => {
    if (i === 0) return chunk;
    const prev = rawChunks[i - 1];
    const tail = prev.slice(-overlapChars);
    return tail + " " + chunk;
  });

  return overlapped
    .filter((c) => c.trim().length > 20)
    .map((content, i) => ({
      content: content.trim(),
      chunkIndex: i,
      tokenCount: estimateTokens(content),
      metadata: { ...baseMetadata, chunkIndex: i },
    }));
}
