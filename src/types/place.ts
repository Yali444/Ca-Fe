import type { Review } from "./roastery";

export type AppMode = "coffee" | "matcha";

export type Place = {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  openingHours: string | null;
  description: string;
  vibeTags: string[];
  instagramHandle?: string | null;
  website?: string | null;
  latitude: number | null;
  longitude: number | null;
  heroImage?: string | null;
  reviews?: Review[];
  // Coffee-specific fields
  brewMethods?: string[];
  // Matcha-specific fields
  matchaOrigin?: string;
  milkOptions?: string;
};

export const isCoffeePlace = (place: Place): place is Place & { brewMethods: string[] } => {
  return Array.isArray(place.brewMethods) && place.brewMethods.length > 0;
};

export const isMatchaPlace = (place: Place): place is Place & { matchaOrigin: string; milkOptions: string } => {
  return typeof place.matchaOrigin === "string" && typeof place.milkOptions === "string";
};


