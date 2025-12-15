"use client";

import { useEffect, useState } from "react";
import type { Place, AppMode } from "@/types/place";

// Helper function to generate ID (same as in matcha.ts and roasteries.ts)
function generateId(name: string, city: string): string {
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
}

function normalizeMatchaPlace(raw: any): Place {
  // Use generateId to ensure unique IDs, with "matcha-" prefix to avoid conflicts with roasteries
  const baseId = generateId(raw.name, raw.city || "");
  const uniqueId = `matcha-${baseId}`;
  
  return {
    id: uniqueId,
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
  // Ensure ID has "cafe-" prefix to avoid conflicts with matcha places
  const baseId = roastery.id || generateId(roastery.name, roastery.city || "");
  const uniqueId = baseId.startsWith('matcha-') || baseId.startsWith('cafe-') 
    ? baseId 
    : `cafe-${baseId}`;
  
  return {
    ...roastery,
    id: uniqueId,
    reviews: roastery.reviews || [],
  } as Place;
}

export function usePlaceData(mode: AppMode): {
  places: Place[];
  loading: boolean;
  error: string | null;
} {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        if (mode === "coffee") {
          const { ROASTERIES } = await import("@/data/roasteries");
          const normalized = ROASTERIES.map(normalizeCoffeePlace);
          if (!cancelled) setPlaces(normalized);
        } else {
          const { MATCHA_PLACES } = await import("@/data/matcha");
          const normalized = MATCHA_PLACES.map(normalizeMatchaPlace);
          if (!cancelled) setPlaces(normalized);
        }
      } catch (err) {
        console.error(`Error loading ${mode} data:`, err);
        if (!cancelled) {
          setPlaces([]);
          setError(err instanceof Error ? err.message : "Failed to load data");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  return { places, loading, error };
}


