import type { Review } from "./roastery";

export type AppMode = "coffee" | "matcha";

export type OpeningHours = {
  sunday?: string;
  monday?: string;
  tuesday?: string;
  wednesday?: string;
  thursday?: string;
  friday?: string;
  saturday?: string;
};

export type Place = {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  openingHours: string | OpeningHours | null;
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
  // Roaster/Beans flags
  isRoaster?: boolean;
  sellsBeans?: boolean;
  roasteryOnly?: boolean; // If true, this place should only appear in roasteries list, not in cafes list
  // Type property: 'coffee' or 'matcha' - used to determine marker color
  type?: 'coffee' | 'matcha';
};

export const isCoffeePlace = (place: Place): place is Place & { brewMethods: string[] } => {
  return Array.isArray(place.brewMethods) && place.brewMethods.length > 0;
};

export const isMatchaPlace = (place: Place): place is Place & { matchaOrigin: string; milkOptions: string } => {
  return typeof place.matchaOrigin === "string" && typeof place.milkOptions === "string";
};


