type Bucket = { count: number; resetAt: number };
let kv: any = null;
try {
  kv = require('@vercel/kv');
} catch {}
const buckets = new Map<string, Bucket>();
const WINDOW_MS = 60_000;
const MAX = 5;
export async function rateLimit(key: string) {
  if (kv && process.env.KV_REST_API_URL) {
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - Math.floor(WINDOW_MS / 1000);
    await kv.zremrangebyscore(key, '-inf', windowStart);
    const count = await kv.zcard(key);
    if (count >= MAX) return false;
    await kv.zadd(key, { score: now, member: `${now}-${Math.random()}` });
    await kv.expire(key, Math.ceil(WINDOW_MS / 1000));
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
