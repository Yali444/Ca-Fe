"use client";

import type { Roastery } from "@/types/roastery";
import type { OpeningHours } from "@/types/place";

// --- Helper Functions ---

// Generate ID from name and city
const generateId = (name: string, city: string): string => {
  const str = `${name}-${city}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  const namePart = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[()]/g, "")
    .substring(0, 20) || "cafe";
  const cityPart = city
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "-")
    .substring(0, 15) || "city";
  
  const hashStr = Math.abs(hash).toString(36).substring(0, 6);
  return `${namePart}-${cityPart}-${hashStr}`;
};

// Parse brew methods
const parseBrewMethods = (methods: string | undefined | null): string[] => {
  if (!methods || typeof methods !== 'string') {
    return [];
  }
  const order = ["אספרסו", "פילטר", "קולד ברו"];
  const parsed = methods.split(",").map((m) => m.trim()).filter(Boolean);
  return parsed.sort((a, b) => {
    const indexA = order.indexOf(a);
    const indexB = order.indexOf(b);
    if (indexA === -1 && indexB === -1) return 0;
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });
};

// Parse vibe tags
const parseVibeTags = (tags: string[] | string): string[] => {
  if (Array.isArray(tags)) return tags;
  return tags.split(",").map((t) => t.trim()).filter(Boolean);
};

// Clean Instagram handle
const cleanInstagramHandle = (handle: string | undefined): string | undefined => {
  if (!handle || handle.trim() === "") return undefined;
  return handle.replace(/^@/, "");
};

// --- Types ---

export type CafeRaw = {
  id: number | string;
  name: string;
  city: string;
  address: string;
  openingHours: string | OpeningHours;
  description: string;
  brewMethods?: string;
  vibeTags: string[];
  instagramHandle: string;
  website: string;
  coordinates: { lat: number; lng: number };
  heroImage: string;
  isRoaster?: boolean;
  sellsBeans?: boolean;
  roasteryOnly?: boolean;
  type?: 'coffee' | 'matcha';
};

// --- Transformer ---

// This function converts the raw JSON data into your app's Roastery format
export function transformCafeToRoastery(cafe: CafeRaw): Roastery {
  return {
    id: generateId(cafe.name, cafe.city),
    name: cafe.name,
    city: cafe.city || null,
    address: cafe.address || null,
    openingHours: cafe.openingHours || null,
    description: cafe.description,
    brewMethods: parseBrewMethods(cafe.brewMethods),
    vibeTags: parseVibeTags(cafe.vibeTags),
    instagramHandle: cleanInstagramHandle(cafe.instagramHandle) || null,
    website: cafe.website && cafe.website.trim() !== "" ? cafe.website : null,
    latitude: cafe.coordinates.lat || null,
    longitude: cafe.coordinates.lng || null,
    heroImage: cafe.heroImage || null,
    reviews: [],
    isRoaster: cafe.isRoaster,
    sellsBeans: cafe.sellsBeans,
    roasteryOnly: cafe.roasteryOnly,
  };
}