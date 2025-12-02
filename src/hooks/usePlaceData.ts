"use client";

import { useMemo } from "react";
import type { Place, AppMode } from "@/types/place";
import { ROASTERIES } from "@/data/roasteries";
import { MATCHA_PLACES } from "@/data/matcha";

function normalizeMatchaPlace(raw: any): Place {
  return {
    id: String(raw.id || `${raw.name}-${raw.city}`),
    name: raw.name,
    city: raw.city || null,
    address: raw.address || null,
    openingHours: raw.openingHours || null,
    description: raw.description || "",
    vibeTags: Array.isArray(raw.vibeTags) ? raw.vibeTags : [],
    instagramHandle: raw.instagramHandle?.replace(/^@/, "") || null,
    website: raw.website || null,
    latitude: raw.coordinates?.lat ?? raw.latitude ?? null,
    longitude: raw.coordinates?.lng ?? raw.longitude ?? null,
    heroImage: raw.heroImage || null,
    matchaOrigin: raw.matchaOrigin || undefined,
    milkOptions: raw.milkOptions || undefined,
    reviews: [],
  };
}

function normalizeCoffeePlace(roastery: any): Place {
  return {
    ...roastery,
    reviews: roastery.reviews || [],
  } as Place;
}

export function usePlaceData(mode: AppMode): {
  places: Place[];
  loading: boolean;
  error: string | null;
} {
  return useMemo(() => {
    try {
      if (mode === "coffee") {
        const normalized = ROASTERIES.map(normalizeCoffeePlace);
        return {
          places: normalized,
          loading: false,
          error: null,
        };
      } else {
        const normalized = MATCHA_PLACES.map(normalizeMatchaPlace);
        return {
          places: normalized,
          loading: false,
          error: null,
        };
      }
    } catch (err) {
      console.error(`Error loading ${mode} data:`, err);
      return {
        places: [],
        loading: false,
        error: err instanceof Error ? err.message : "Failed to load data",
      };
    }
  }, [mode]);
}


