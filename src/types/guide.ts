import type { CoffeeShop } from "@/lib/coffee-shop";
import type { CafeRating } from "@/lib/ratings";

export type GpsStatus = "idle" | "locating" | "success" | "denied" | "unavailable" | "timeout" | "error" | "unsupported";

// ShopCard component for displaying individual cafe cards
export interface ShopCardProps {
  shop: CoffeeShop;
  favorites: string[];
  onSelectShop: (shop: CoffeeShop) => void;
  onToggleFavorite: (shopId: string) => void;
  index?: number; // Optional index for priority prop (first 6 items get priority)
  /** Pre-formatted distance (e.g. "450 מ'") when the list is location-sorted.
   *  Rendered inside the card's badge stack so it can't collide with the
   *  matcha / sells-beans badge. */
  distanceLabel?: string;
  /** Community rating aggregate, when the cafe has reviews. */
  rating?: CafeRating | null;
}
