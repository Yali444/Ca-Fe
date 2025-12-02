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
  openingHours: string | null;
  description: string;
  brewMethods: string[];
  vibeTags: string[];
  instagramHandle?: string | null;
  website?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  heroImage?: string | null;
  reviews?: Review[];
};

export type QuickFilterKey = "all" | "filter" | "espresso";
