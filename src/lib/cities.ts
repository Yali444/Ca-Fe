/**
 * City-name normalization for the SEO layer.
 *
 * The dataset stores the same city under several spellings (most notably Tel
 * Aviv: "תל אביב", "תל אביב-יפו", "תל אביב - יפו"), which would otherwise
 * produce separate /city/<name> pages and split their SEO equity. This maps the
 * known variants to one canonical display name.
 *
 * IMPORTANT: this normalizes only the *display / grouping* city. The client's
 * place id — and therefore the reviews/ratings key — is derived from the raw
 * city (generatePlaceId(name, rawCity)), so callers that need that key must use
 * the raw value, never the normalized one.
 */

/** Raw city string → canonical display city. */
export const CITY_ALIASES: Record<string, string> = {
  "תל אביב-יפו": "תל אביב",
  "תל אביב - יפו": "תל אביב",
};

/** Canonical display city for a raw dataset city string. */
export function normalizeCity(raw: string | null | undefined): string {
  const trimmed = (raw ?? "").trim();
  return CITY_ALIASES[trimmed] ?? trimmed;
}
