"use client";

import type { Roastery } from "@/types/roastery";
import type { OpeningHours } from "@/types/place";
import { generatePlaceId } from "@/lib/place-id";
import { parseBrewMethods } from "@/lib/brew-methods";
import { parseGlutenFreeItems } from "@/lib/gluten-free";

// --- Helper Functions ---

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
  /** Set only on cafes whose gluten-free status has been confirmed. */
  glutenFree?: boolean;
  glutenFreeItems?: string[];
  roasteryOnly?: boolean;
  isOnlineOnly?: boolean;
  type?: 'coffee' | 'matcha' | 'workshops';
};

// --- Transformer ---

// This function converts the raw JSON data into your app's Roastery format
export function transformCafeToRoastery(cafe: CafeRaw): Roastery {
  return {
    id: generatePlaceId(cafe.name, cafe.city),
    datasetId: String(cafe.id),
    name: cafe.name,
    city: cafe.city || null,
    address: cafe.address || null,
    openingHours: cafe.openingHours || null,
    description: cafe.description,
    brewMethods: parseBrewMethods(cafe.brewMethods),
    vibeTags: parseVibeTags(cafe.vibeTags),
    instagramHandle: cleanInstagramHandle(cafe.instagramHandle) || null,
    website: cafe.website && cafe.website.trim() !== "" ? cafe.website : null,
    latitude: cafe.coordinates?.lat ?? null,
    longitude: cafe.coordinates?.lng ?? null,
    heroImage: cafe.heroImage || null,
    reviews: [],
    isRoaster: cafe.isRoaster,
    sellsBeans: cafe.sellsBeans,
    glutenFree: cafe.glutenFree,
    // Validated at the data boundary, same as brew methods — an unknown
    // category never reaches the UI as a dietary claim.
    glutenFreeItems: parseGlutenFreeItems(cafe.glutenFreeItems),
    roasteryOnly: cafe.roasteryOnly,
    isOnlineOnly: cafe.isOnlineOnly,
    type: cafe.type,
  };
}