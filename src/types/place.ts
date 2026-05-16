import type { Review } from "./roastery";

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
  isOnlineOnly?: boolean; // If true, this is an online-only roastery with no physical location
  // Type property: 'coffee', 'matcha', or 'workshops' - used to determine marker color
  type?: 'coffee' | 'matcha' | 'workshops';
  // Hidden property to exclude from display
  hidden?: boolean;
};

export const isCoffeePlace = (place: Place): place is Place & { brewMethods: string[] } => {
  return Array.isArray(place.brewMethods) && place.brewMethods.length > 0;
};

export const isMatchaPlace = (place: Place): place is Place & { matchaOrigin: string; milkOptions: string } => {
  return typeof place.matchaOrigin === "string" && typeof place.milkOptions === "string";
};


