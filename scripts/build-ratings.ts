/**
 * Builds a static ratings snapshot from the Supabase "Cafe Reviews" table into
 * public/data/ratings.json, keyed by the numeric `cafe_id` (the same key the
 * app writes reviews under — see src/lib/numeric-id.ts). Both the SEO pages
 * (AggregateRating JSON-LD) and the interactive cards read this file, so no
 * per-request database calls are needed at runtime.
 *
 * Run via `npm run build:ratings`; also wired into `prebuild` so each deploy
 * refreshes it. This is intentionally NON-FATAL: if credentials are missing or
 * Supabase is unreachable, it logs a warning and leaves any existing
 * ratings.json untouched (writing an empty {} only if none exists) so the
 * build never fails on it.
 */
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const OUT = path.join(process.cwd(), "public", "data", "ratings.json");

type Rating = { count: number; average: number };

function ensureFileExists() {
  if (!fs.existsSync(OUT)) {
    fs.writeFileSync(OUT, "{}\n");
    console.log("[build-ratings] wrote empty ratings.json");
  }
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.warn(
      "[build-ratings] Supabase env not set — skipping refresh, keeping existing ratings.json.",
    );
    ensureFileExists();
    return;
  }

  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from("Cafe Reviews")
    .select('cafe_id, "דירוג"')
    .eq("hidden", false);

  if (error) {
    console.warn("[build-ratings] query failed, keeping existing file:", error.message);
    ensureFileExists();
    return;
  }

  // Group by cafe_id → { count, sum } and reduce to { count, average }.
  const acc = new Map<number, { count: number; sum: number }>();
  for (const row of (data ?? []) as { cafe_id: number | null; דירוג: number | null }[]) {
    if (row.cafe_id == null || row.דירוג == null) continue;
    const cur = acc.get(row.cafe_id) ?? { count: 0, sum: 0 };
    cur.count += 1;
    cur.sum += row.דירוג;
    acc.set(row.cafe_id, cur);
  }

  const out: Record<string, Rating> = {};
  for (const [cafeId, { count, sum }] of acc) {
    if (count < 1) continue;
    out[String(cafeId)] = { count, average: Math.round((sum / count) * 10) / 10 };
  }

  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
  console.log(
    `[build-ratings] wrote ${Object.keys(out).length} cafe ratings to ${path.relative(process.cwd(), OUT)}`,
  );
}

main().catch((err) => {
  console.warn("[build-ratings] failed:", err instanceof Error ? err.message : err);
  ensureFileExists();
});
