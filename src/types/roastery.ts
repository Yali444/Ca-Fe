import type { OpeningHours } from "./place";

export type Review = {
  id: string;
  author: string;
  rating: number;
  text: string;
  source?: string | null;
  date?: string | null;
};

export type Roastery = {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  openingHours: string | OpeningHours | null;
  description: string;
  brewMethods: string[];
  vibeTags: string[];
  instagramHandle?: string | null;
  website?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  heroImage?: string | null;
  reviews?: Review[];
  isRoaster?: boolean;
  sellsBeans?: boolean;
  roasteryOnly?: boolean;
  type?: 'coffee' | 'matcha';
};

export type QuickFilterKey = "all" | "filter" | "espresso";
