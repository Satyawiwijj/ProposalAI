type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
const WINDOW_MS = 60_000;
const MAX = 5;

let redis: any = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  try {
    const { Redis } = require('@upstash/redis');
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  } catch {}
}

export async function rateLimit(key: string) {
  if (redis) {
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - Math.floor(WINDOW_MS / 1000);
    await redis.zremrangebyscore(key, '-inf', windowStart);
    const count = await redis.zcard(key);
    if (count >= MAX) return false;
    await redis.zadd(key, { score: now, member: `${now}-${Math.random()}` });
    await redis.expire(key, Math.ceil(WINDOW_MS / 1000));
    return true;
  }
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (b.count >= MAX) return false;
  b.count++;
  return true;
}
