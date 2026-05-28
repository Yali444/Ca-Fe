/**
 * Generates a deterministic, URL-safe ID from a place's name and city.
 *
 * The format is `<name-slug>-<city-slug>-<hash>`, where the hash disambiguates
 * places whose Latin-letter slugs collide (e.g., places named entirely in
 * Hebrew get scrubbed to "cafe" / "city" by the slug step).
 *
 * IMPORTANT: this hash is part of the URL contract for cafe deep-links.
 * Changing it invalidates every saved link, so the algorithm is frozen here
 * and exercised by snapshot tests in place-id.test.ts.
 */
export function generatePlaceId(name: string, city: string): string {
  const str = `${name}-${city}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }

  const namePart =
    name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "-")
      .replace(/[()]/g, "")
      .substring(0, 20) || "cafe";
  const cityPart =
    city
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "-")
      .substring(0, 15) || "city";

  const hashStr = Math.abs(hash).toString(36).substring(0, 6);
  return `${namePart}-${cityPart}-${hashStr}`;
}
