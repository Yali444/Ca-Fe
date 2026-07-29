import type { OpeningHours, Place } from "@/types/place";
import type { Review } from "@/types/roastery";

/**
 * The CoffeeShop shape is the internal model used by the map / cards UI.
 * It's intentionally a shallow flattening of `Place` plus a couple of
 * UI-only fields (e.g. the fallback `image` URL). Kept separate from
 * `Place` because the UI's contract for what a shop "looks like" should
 * be stable even if the underlying data model evolves.
 */
export interface CoffeeShop {
  id: string;
  /** Raw numeric id from cafes.json — the key /cafe/<id> is prerendered under. */
  datasetId?: string;
  name: string;
  location: string;
  address: string | null;
  lat: number;
  lng: number;
  image: string;
  specialty: string;
  description: string;
  brewMethods?: string[];
  vibeTags: string[];
  instagram?: string;
  website?: string;
  hours?: string | OpeningHours;
  reviews: Review[];
  // Matcha-specific fields
  matchaOrigin?: string;
  milkOptions?: string;
  // Roaster / Beans flags
  isRoaster?: boolean;
  sellsBeans?: boolean;
  /** Serves gluten-free options. Absent means unknown, not "no". */
  glutenFree?: boolean;
  /** Which kinds — see `GLUTEN_FREE_ITEMS`. */
  glutenFreeItems?: string[];
  roasteryOnly?: boolean;
  isOnlineOnly?: boolean;
  // 'coffee' | 'matcha' | 'workshops' — used to pick marker color
  type?: "coffee" | "matcha" | "workshops";
  // Hidden flag — excludes from display
  hidden?: boolean;
}

/** Fallback hero image used when a place has no `heroImage` set. */
export const DEFAULT_SHOP_IMAGE =
  "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&auto=format&fit=crop";

/**
 * Convert a `Place` (canonical data shape) into the UI's `CoffeeShop`
 * model. Pure transform: applies defaults for missing optional fields
 * and narrows the `type` field via an `in` check (so non-matcha/coffee
 * type values come out as undefined).
 *
 * Coordinates use `??` (not `||`) so a legitimate zero coordinate isn't
 * collapsed into the upstream-filter-guaranteed default.
 */
export const mapPlaceToCoffeeShop = (place: Place): CoffeeShop => {
  const location = place.city || "";

  return {
    id: place.id,
    datasetId: place.datasetId,
    name: place.name,
    location,
    address: place.address || null,
    // Coordinates are guaranteed by the upstream filter in coffeeShops;
    // the `?? 0` fallback is structurally unreachable but keeps the
    // contract non-nullable.
    lat: place.latitude ?? 0,
    lng: place.longitude ?? 0,
    image: place.heroImage || DEFAULT_SHOP_IMAGE,
    specialty: "",
    description: place.description,
    brewMethods: place.brewMethods,
    vibeTags: place.vibeTags || [],
    hours: place.openingHours || undefined,
    instagram: place.instagramHandle || undefined,
    website: place.website || undefined,
    reviews: place.reviews || [],
    matchaOrigin: place.matchaOrigin,
    milkOptions: place.milkOptions,
    isRoaster: place.isRoaster,
    sellsBeans: place.sellsBeans,
    glutenFree: place.glutenFree,
    glutenFreeItems: place.glutenFreeItems,
    roasteryOnly: place.roasteryOnly,
    isOnlineOnly: place.isOnlineOnly,
    type:
      "type" in place
        ? (place.type as "coffee" | "matcha" | "workshops")
        : undefined,
    hidden: place.hidden,
  };
};
