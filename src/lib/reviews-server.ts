import { getNumericId } from "@/lib/numeric-id";
import { generatePlaceId } from "@/lib/place-id";
import type { Review } from "@/types/roastery";

/**
 * Server-side reader for a cafe's community reviews, used by the static
 * /cafe/[id] page so reviews are part of the crawlable HTML (good for SEO) and
 * feed Review JSON-LD.
 *
 * Uses the Supabase REST endpoint via `fetch` with `next.revalidate` rather
 * than the supabase-js client, so it participates in Next's data cache (ISR):
 * no per-request DB round-trip, no build-time DB dependency, refreshed hourly.
 * Only non-hidden rows are returned (post-moderation — hidden spam is excluded
 * server-side).
 */

const REVALIDATE_SECONDS = 60 * 60; // 1 hour

// Cap the build-time request so a misconfigured or unreachable Supabase can
// never stall static generation. /cafe/[id] is prerendered for every cafe, and
// Next aborts a page that takes >60s — an unbounded fetch here would fail the
// whole export. 8s is comfortably above a healthy Supabase REST call and well
// under that limit, so a slow endpoint degrades to "no reviews" instead of a
// broken build.
const FETCH_TIMEOUT_MS = 8000;

/** A real, fetchable http(s) URL — guards against a placeholder value being
 *  set for NEXT_PUBLIC_SUPABASE_URL (an unset var is already handled by the
 *  callers). Mirrors the same check in src/supabaseClient.ts. */
function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

type SupabaseReviewRow = {
  id: number | null;
  שם: string | null;
  דירוג: number | null;
  הערה: string | null;
  created_at: string | null;
};

function mapRow(row: SupabaseReviewRow): Review | null {
  if (row.id == null) return null;
  return {
    id: String(row.id),
    author: row.שם || "אנונימי",
    rating: row.דירוג || 5,
    text: row.הערה || "",
    source: "Ca Fe community",
    date: row.created_at ? row.created_at.slice(0, 10) : null,
  };
}

/** The numeric reviews key for a cafe — derived from name + RAW city. */
export function reviewCafeId(name: string, rawCity: string): number {
  return getNumericId(generatePlaceId(name, rawCity));
}

/** Fetch a cafe's visible reviews (newest first). Returns [] on any error or
 *  when Supabase isn't configured. */
export async function fetchCafeReviews(name: string, rawCity: string): Promise<Review[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Not configured, or configured with a placeholder/invalid URL — either way
  // there's nothing fetchable, so skip the network entirely (a bad URL would
  // otherwise hang or throw during the static build).
  if (!url || !key || !isValidHttpUrl(url)) return [];

  const cafeId = reviewCafeId(name, rawCity);
  const endpoint =
    `${url}/rest/v1/${encodeURIComponent("Cafe Reviews")}` +
    `?cafe_id=eq.${cafeId}` +
    `&hidden=eq.false` +
    `&order=created_at.desc` +
    `&limit=100` +
    `&select=id,%D7%A9%D7%9D,%D7%93%D7%99%D7%A8%D7%95%D7%92,%D7%94%D7%A2%D7%A8%D7%94,created_at`;

  try {
    const res = await fetch(endpoint, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return [];
    const rows = (await res.json()) as SupabaseReviewRow[];
    return rows.map(mapRow).filter((r): r is Review => r !== null);
  } catch {
    return [];
  }
}
