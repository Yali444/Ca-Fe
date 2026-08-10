import { NextResponse } from "next/server";
import { createRateLimiter, clientIp } from "@/lib/rate-limit";

/**
 * Review insert endpoint. Routing inserts through the server (rather than
 * letting the client hit Supabase directly) gives us one place to enforce
 * per-IP rate limiting and input validation — anti-spam that a direct
 * anon-key insert from the browser could otherwise bypass.
 *
 * Reviews are inserted visible (post-moderation): the owner hides spam by
 * setting `hidden = true`. Read paths filter `hidden = false`.
 */
const RATE_WINDOW_MS = 60_000; // 1 minute
const isRateLimited = createRateLimiter({ limit: 5, windowMs: RATE_WINDOW_MS });

const MAX_NAME = 40;
const MAX_TEXT = 1000;

type Body = {
  cafeId?: unknown;
  name?: unknown;
  rating?: unknown;
  text?: unknown;
};

export async function POST(request: Request) {
  const ip = clientIp(request);
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(RATE_WINDOW_MS / 1000) } },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const cafeId = Number(body.cafeId);
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const rating = Number(body.rating);

  if (!Number.isInteger(cafeId) || cafeId <= 0) {
    return NextResponse.json({ error: "Bad cafe id" }, { status: 400 });
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be 1–5" }, { status: 400 });
  }
  if (!name || name.length > MAX_NAME) {
    return NextResponse.json({ error: "Bad name" }, { status: 400 });
  }
  if (!text || text.length > MAX_TEXT) {
    return NextResponse.json({ error: "Bad review text" }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "Reviews unavailable" }, { status: 503 });
  }

  try {
    const res = await fetch(`${url}/rest/v1/${encodeURIComponent("Cafe Reviews")}`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({ cafe_id: cafeId, שם: name, דירוג: rating, הערה: text }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Insert failed" }, { status: 502 });
    }

    const rows = (await res.json()) as Array<{ id: number | null; created_at: string | null }>;
    const inserted = rows?.[0];
    return NextResponse.json(
      {
        review: {
          id: inserted?.id != null ? String(inserted.id) : `${cafeId}-${Date.now()}`,
          author: name,
          rating,
          text,
          source: "Ca Fe community",
          date: (inserted?.created_at ?? new Date().toISOString()).slice(0, 10),
        },
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: "Insert failed" }, { status: 502 });
  }
}
