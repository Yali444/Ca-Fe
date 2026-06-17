import cafesData from "../../public/data/cafes.json";

/**
 * Server-side lookup of a single cafe by its `?cafe=<id>` identifier, used by
 * the page's `generateMetadata` and JSON-LD so a shared link shows the right
 * title/preview. Reads the raw cafes dataset (which uses `city`/`coordinates`)
 * and normalises just the fields those need — it intentionally does NOT depend
 * on the client-side `mapPlaceToCoffeeShop`, whose input is the already-parsed
 * `Place` shape rather than this raw record.
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
}

/** Fallback preview image when a cafe has no hero set. */
const FALLBACK_IMAGE = "/images/ca_fe_logo.png";

export function findCafeMeta(id: string): CafeMeta | null {
  const rec = (cafesData as unknown as RawCafe[]).find(
    (c) => String(c.id) === id
  );
  if (!rec) return null;
  return {
    id: String(rec.id),
    name: rec.name ?? "בית קפה",
    location: rec.city ?? "",
    address: rec.address ?? null,
    description: rec.description ?? "",
    image: rec.heroImage || FALLBACK_IMAGE,
    lat: rec.coordinates?.lat ?? null,
    lng: rec.coordinates?.lng ?? null,
  };
}
