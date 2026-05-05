// Rate limiting — uses Upstash Redis when configured, falls back to in-memory map for dev
import { NextRequest } from "next/server";

// In-memory fallback for local dev (resets on server restart)
const inMemoryStore = new Map<string, { count: number; resetAt: number }>();

async function checkInMemory(key: string, limit: number, windowMs: number): Promise<boolean> {
  const now = Date.now();
  const record = inMemoryStore.get(key);

  if (!record || now > record.resetAt) {
    inMemoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= limit) return false;
  record.count++;
  return true;
}

async function checkUpstash(key: string, limit: number, windowSecs: number): Promise<boolean> {
  const { Ratelimit } = await import("@upstash/ratelimit");
  const { Redis } = await import("@upstash/redis");

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });

  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, `${windowSecs} s`),
    prefix: "second-brain",
  });

  const { success } = await ratelimit.limit(key);
  return success;
}

export async function rateLimit(
  req: NextRequest,
  userId: string,
  options: { limit: number; windowSecs: number } = { limit: 20, windowSecs: 60 }
): Promise<{ allowed: boolean }> {
  const key = `${userId}`;

  try {
    const allowed =
      process.env.UPSTASH_REDIS_REST_URL
        ? await checkUpstash(key, options.limit, options.windowSecs)
        : await checkInMemory(key, options.limit, options.windowSecs * 1000);

    return { allowed };
  } catch {
    // Fail open — don't block requests if rate limiter is down
    return { allowed: true };
  }
}
