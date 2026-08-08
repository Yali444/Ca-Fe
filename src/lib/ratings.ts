import ratingsData from "../../public/data/ratings.json";
import { getNumericId } from "@/lib/numeric-id";
import { generatePlaceId } from "@/lib/place-id";

/**
 * Read side of the ratings snapshot (public/data/ratings.json, produced by
 * scripts/build-ratings.ts). The file is keyed by the numeric `cafe_id` — the
 * same key reviews are stored under in Supabase, derived as
 * `getNumericId(placeId)` where `placeId = generatePlaceId(name, city)`.
 *
 * This lets both sides look the same rating up:
 *  - the client, from a shop's `id` (already a placeId): `getRatingForPlaceId`
 *  - the server/SEO pages, from a cafe's name + city:     `getRatingForMeta`
 */
export interface CafeRating {
  count: number;
  average: number;
}

const RATINGS = ratingsData as Record<string, CafeRating>;

/** Look a rating up directly by its numeric Supabase `cafe_id`. */
export function getRatingByNumericId(id: number): CafeRating | null {
  const rating = RATINGS[String(id)];
  return rating && rating.count > 0 ? rating : null;
}

/**
 * Client path: a shop's `id` is already the placeId (see
 * data/roasteries.ts), so map it straight to the numeric id.
 */
export function getRatingForPlaceId(placeId: string): CafeRating | null {
  return getRatingByNumericId(getNumericId(placeId));
}

/**
 * Server/SEO path: the per-cafe page keys on the dataset id, so rebuild the
 * placeId from name + city (the same inputs the client uses) to reach the
 * numeric review key.
 */
export function getRatingForMeta(name: string, city: string): CafeRating | null {
  return getRatingByNumericId(getNumericId(generatePlaceId(name, city)));
}
