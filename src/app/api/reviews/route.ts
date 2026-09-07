import { NextResponse } from "next/server";
import { backendConfig, backendHeaders, consumeLimit } from "@/lib/backend";
import { createRateLimiter, clientIp } from "@/lib/rate-limit";
import { isReviewCafeId, readReviewBody } from "@/lib/review-input";
import { fetchReviewsById } from "@/lib/reviews-server";

const localLimit = createRateLimiter({ limit: 30, windowMs: 60_000 });

export async function GET(request: Request) {
  const cafeId = Number(new URL(request.url).searchParams.get("cafeId"));
  if (!isReviewCafeId(cafeId)) return NextResponse.json({ error: "Bad cafe id" }, { status: 400 });
  try {
    return NextResponse.json({ reviews: await fetchReviewsById(cafeId) }, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch { return NextResponse.json({ error: "Reviews unavailable" }, { status: 503 }); }
}

export async function POST(request: Request) {
  const ip = clientIp(request);
  if (localLimit(ip)) return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": "60" } });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ error: "Expected JSON" }, { status: 415 });
  }
  let body: unknown;
  try { body = await readReviewBody(request); }
  catch (error) { return NextResponse.json({ error: error instanceof RangeError ? "Body too large" : "Invalid JSON" }, { status: error instanceof RangeError ? 413 : 400 }); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  const { cafeId, name: rawName, rating, text: rawText } = body as Record<string, unknown>;
  const name = typeof rawName === "string" ? rawName.trim() : "";
  const text = typeof rawText === "string" ? rawText.trim() : "";
  if (!isReviewCafeId(cafeId)) return NextResponse.json({ error: "Bad cafe id" }, { status: 400 });
  if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) return NextResponse.json({ error: "Rating must be 1–5" }, { status: 400 });
  if (!name || name.length > 40) return NextResponse.json({ error: "Bad name" }, { status: 400 });
  if (!text || text.length > 1000) return NextResponse.json({ error: "Bad review text" }, { status: 400 });

  const config = backendConfig();
  if (!config) return NextResponse.json({ error: "Reviews unavailable" }, { status: 503 });
  const limit = await consumeLimit(`reviews:${ip}`, 5, 60_000);
  if (limit !== "allowed") return NextResponse.json({ error: limit === "limited" ? "Too many requests" : "Reviews unavailable" }, { status: limit === "limited" ? 429 : 503, headers: { "Retry-After": "60" } });
  try {
    const res = await fetch(`${config.url}/rest/v1/${encodeURIComponent("Cafe Reviews")}?select=id,created_at`, {
      method: "POST",
      headers: { ...backendHeaders(config.key), "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({ cafe_id: cafeId, שם: name, דירוג: rating, הערה: text, hidden: false }),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Insert failed");
    const rows = await res.json() as Array<{ id: number; created_at: string }>;
    if (!rows[0]?.id) throw new Error("Insert failed");
    return NextResponse.json({ review: { id: String(rows[0].id), author: name, rating, text, source: "Ca Fe community", date: rows[0].created_at?.slice(0, 10) ?? new Date().toISOString().slice(0, 10) } }, { status: 201 });
  } catch { return NextResponse.json({ error: "Insert failed" }, { status: 502 }); }
}
