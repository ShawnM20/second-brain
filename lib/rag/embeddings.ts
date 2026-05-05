const VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings";
const EMBED_MODEL = "voyage-3-lite"; // 512 dimensions, free tier
const BATCH_SIZE = 128;

interface VoyageResponse {
  data: { index: number; embedding: number[] }[];
}

async function voyageEmbed(input: string | string[]): Promise<number[][]> {
  const res = await fetch(VOYAGE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({ model: EMBED_MODEL, input }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Voyage AI error ${res.status}: ${err}`);
  }

  const json: VoyageResponse = await res.json();
  return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

export async function embedText(text: string): Promise<number[]> {
  const results = await voyageEmbed(text);
  return results[0];
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const results = await voyageEmbed(batch);
    embeddings.push(...results);
  }

  return embeddings;
}
