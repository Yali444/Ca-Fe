import cafesData from "../../public/data/cafes.json";

/**
 * Server-side readers over the raw cafes dataset, used by the per-cafe SEO
 * pages, the homepage metadata/JSON-LD and the sitemap. The dataset stores the
 * location as `city`, coordinates under `coordinates`, and mixes numeric/string
 * ids — these helpers normalise just what those consumers need and never depend
 * on the client-side `mapPlaceToCoffeeShop` (whose input is the parsed `Place`).
 */
export interface CafeMeta {
  id: string;
  name: string;
  /** City — the human-readable location line. */
  location: string;
  address: string | null;
  description: string;
  image: string;
  lat: number | null;
  lng: number | null;
  /** Map of english weekday -> "HH:MM-HH:MM", missing days are closed. */
  hours: Record<string, string> | null;
  brewMethods: string[];
  vibeTags: string[];
  instagram: string | null;
  website: string | null;
  /** ISO-ish date string from the dataset, used for sitemap lastModified. */
  lastModified: string | null;
}

interface RawCafe {
  // The dataset mixes numeric and string ids; compare as strings.
  id: string | number;
  name?: string;
  city?: string;
  address?: string;
  description?: string;
  heroImage?: string;
  coordinates?: { lat?: number; lng?: number };
  openingHours?: Record<string, string> | null;
  brewMethods?: string | string[];
  vibeTags?: string[];
  instagramHandle?: string;
  website?: string;
  _last_updated?: string;
}

/** Fallback preview image when a cafe has no hero set. */
const FALLBACK_IMAGE = "/images/ca_fe_logo.png";

const ALL = cafesData as unknown as RawCafe[];

function normalise(rec: RawCafe): CafeMeta {
  const brewMethods = Array.isArray(rec.brewMethods)
    ? rec.brewMethods
    : (rec.brewMethods ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

  return {
    id: String(rec.id),
    name: rec.name ?? "בית קפה",
    location: rec.city ?? "",
    address: rec.address ?? null,
    description: rec.description ?? "",
    image: rec.heroImage || FALLBACK_IMAGE,
    lat: rec.coordinates?.lat ?? null,
    lng: rec.coordinates?.lng ?? null,
    hours: rec.openingHours ?? null,
    brewMethods,
    vibeTags: rec.vibeTags ?? [],
    instagram: rec.instagramHandle ?? null,
    website: rec.website ?? null,
    lastModified: rec._last_updated ?? null,
  };
}

export function findCafeMeta(id: string): CafeMeta | null {
  const rec = ALL.find((c) => String(c.id) === id);
  return rec ? normalise(rec) : null;
}

/** All cafes, normalised — for the sitemap and the homepage ItemList. */
export function getAllCafes(): CafeMeta[] {
  return ALL.map(normalise);
}

/** Just the ids — for `generateStaticParams` on the per-cafe route. */
export function getAllCafeIds(): string[] {
  return ALL.map((c) => String(c.id));
}

/** Unique cities with their cafe counts, busiest first — for the city pages. */
export function getAllCities(): { city: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const c of ALL) {
    const city = (c.city ?? "").trim();
    if (city) counts.set(city, (counts.get(city) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count || a.city.localeCompare(b.city, "he"));
}

/** All cafes in a given city (normalised), sorted by name. */
export function getCafesByCity(city: string): CafeMeta[] {
  return ALL.filter((c) => (c.city ?? "").trim() === city)
    .map(normalise)
    .sort((a, b) => a.name.localeCompare(b.name, "he"));
}
