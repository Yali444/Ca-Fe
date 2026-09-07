/**
 * Bounded per-instance prefilter for cheap rejection before parsing input.
 * Cross-instance enforcement lives in backend.consumeLimit and PostgreSQL.
 */
export function createRateLimiter({
  limit,
  windowMs,
  maxKeys = 5000,
}: {
  limit: number;
  windowMs: number;
  maxKeys?: number;
}): (key: string) => boolean {
  const buckets = new Map<string, { count: number; resetAt: number }>();

  return function isRateLimited(key: string): boolean {
    const now = Date.now();
    const bucket = buckets.get(key);
    if (!bucket || now >= bucket.resetAt) {

      // Opportunistic cleanup so the map can't grow unbounded on warm instances.
      if (buckets.size >= maxKeys) {
        for (const [k, b] of buckets) if (now >= b.resetAt) buckets.delete(k);
      }
      if (!bucket && buckets.size >= maxKeys) return true;
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return false;
    }
    bucket.count += 1;
    return bucket.count > limit;
  };
}

/** Best-effort client IP from proxy headers, for use as a rate-limit key. */
export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-vercel-forwarded-for") ?? request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
