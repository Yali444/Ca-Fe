import { NextResponse } from "next/server";

/** Max accepted query length — guards against oversized upstream queries / abuse. */
const MAX_QUERY_LENGTH = 200;

/** Fixed-window rate limit, keyed by client IP. */
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;

/**
 * In-memory fixed-window rate limiter. NOTE: this is per serverless instance,
 * not shared across instances — it's a pragmatic guard for a single low-traffic
 * proxy endpoint, not a distributed limit. If real abuse shows up, swap this for
 * a durable store (e.g. Upstash Redis). The 30 req/min budget is well above
 * normal debounced typing usage.
 */
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

const isRateLimited = (key: string): boolean => {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  bucket.count += 1;
  return bucket.count > RATE_LIMIT_MAX_REQUESTS;
};

/** Test-only: clear the rate-limit state so cases don't leak into each other. */
export const __resetRateLimitForTests = (): void => {
  rateLimitBuckets.clear();
};

const getClientKey = (request: Request): string => {
  const forwarded = request.headers.get("x-forwarded-for");
  // x-forwarded-for can be a comma-separated list; the first entry is the client.
  return forwarded?.split(",")[0]?.trim() || "unknown";
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q || !q.trim()) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  if (q.length > MAX_QUERY_LENGTH) {
    return NextResponse.json({ error: "Query too long" }, { status: 400 });
  }

  if (isRateLimited(getClientKey(request))) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  const encodedQuery = encodeURIComponent(q);

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&limit=1&addressdetails=1`,
      {
        headers: {
          "User-Agent": "Ca-Fe-Coffee-Guide/1.0 (Vercel Next.js)",
          Accept: "application/json",
        },
        // Addresses are effectively static, so cache aggressively. This is the
        // single biggest win for staying within Nominatim's usage policy
        // (≤1 req/sec) — repeat lookups are served from cache, not re-fetched.
        next: { revalidate: 86400 },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Geocoding failed" },
        { status: response.status }
      );
    }

    const data = (await response.json()) as Array<{ lat?: string; lon?: string }>;

    if (!data || data.length === 0 || !data[0]?.lat || !data[0]?.lon) {
      return NextResponse.json({ result: null }, { status: 200 });
    }

    return NextResponse.json(
      {
        result: {
          lat: Number.parseFloat(data[0].lat),
          lng: Number.parseFloat(data[0].lon),
        },
      },
      {
        status: 200,
        // Let Vercel's edge serve repeat queries without invoking the function.
        headers: {
          "Cache-Control":
            "public, s-maxage=86400, stale-while-revalidate=604800",
        },
      }
    );
  } catch {
    return NextResponse.json({ error: "Fetch failed" }, { status: 502 });
  }
}
