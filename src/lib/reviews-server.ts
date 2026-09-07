import { backendConfig, backendHeaders } from "@/lib/backend";
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
  const config = backendConfig();
  if (!config) return [];
  try { return await fetchReviewsById(reviewCafeId(name, rawCity)); } catch { return []; }
}

export async function fetchReviewsById(cafeId: number): Promise<Review[]> {
  const config = backendConfig();
  if (!config) throw new Error("Reviews unavailable");
  const { url, key } = config;
  const endpoint =
    `${url}/rest/v1/${encodeURIComponent("Cafe Reviews")}` +
    `?cafe_id=eq.${cafeId}` +
    `&hidden=eq.false` +
    `&order=created_at.desc` +
    `&limit=100` +
    `&select=id,%D7%A9%D7%9D,%D7%93%D7%99%D7%A8%D7%95%D7%92,%D7%94%D7%A2%D7%A8%D7%94,created_at`;

  try {
    const res = await fetch(endpoint, {
      headers: backendHeaders(key),
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error("Reviews unavailable");
    const rows = (await res.json()) as SupabaseReviewRow[];
    return rows.map(mapRow).filter((r): r is Review => r !== null);
  } catch {
    throw new Error("Reviews unavailable");
  }
}
