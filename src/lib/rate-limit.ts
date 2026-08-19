type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

const MAX_BUCKETS = 10_000;

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const b = buckets.get(key);

  if (buckets.size > MAX_BUCKETS) {
    // evita crescimento ilimitado de memória
    for (const [k, v] of buckets) {
      if (v.resetAt <= now) buckets.delete(k);
    }
  }

  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (b.count < limit) {
    b.count += 1;
    return { allowed: true };
  }

  return { allowed: false, retryAfterSeconds: Math.ceil((b.resetAt - now) / 1000) };
}

export function resetRateLimit(key: string): void {
  buckets.delete(key);
}

export function resetAllRateLimits(): void {
  buckets.clear();
}
