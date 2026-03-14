"use client";

import { useEffect, useState } from "react";
import type { Place } from "@/types/place";
import type { Roastery } from "@/types/roastery";
import { transformCafeToRoastery, type CafeRaw } from "@/data/roasteries";

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

function normalizeCoffeePlace(roastery: Roastery): Place {
  return {
    id: roastery.id,
    name: roastery.name,
    city: roastery.city || null,
    address: roastery.address || null,
    openingHours: roastery.openingHours || null,
    description: roastery.description || "",
    vibeTags: Array.isArray(roastery.vibeTags) ? roastery.vibeTags : [],
    instagramHandle: roastery.instagramHandle?.replace(/^@/, "") || null,
    website: roastery.website || null,
    latitude: roastery.latitude ?? null,
    longitude: roastery.longitude ?? null,
    heroImage: roastery.heroImage || null,
    reviews: [],
    isRoaster: roastery.isRoaster,
    sellsBeans: roastery.sellsBeans,
    roasteryOnly: roastery.roasteryOnly,
    // Preserve original type (matcha vs coffee) so UI can style markers/cards
    type: roastery.type ?? 'coffee',
  } as Place;
}

export function usePlaceData(): {
  places: Place[];
  loading: boolean;
  error: string | null;
} {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    
    // Detect mobile Safari
    const isMobileSafari = typeof navigator !== "undefined" && (
      /iP(hone|od|ad)/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    ) && /Safari/.test(navigator.userAgent) && !/Chrome|CriOS|FxiOS|OPiOS/.test(navigator.userAgent);
    
    const load = async () => {
      setLoading(true);
      setError(null);
      
      // Remove mobile Safari delay - load immediately
      
      if (cancelled) return;
      
      try {
        // Load all places from cafes.json (contains both coffee and matcha places)
        const response = await fetch("/data/cafes.json");
        if (!response.ok) {
          throw new Error(`Failed to fetch cafes data: ${response.statusText}`);
        }
        const cafesRaw: CafeRaw[] = await response.json();
        
        if (cancelled) return;
        
        // No filtering - include all places (coffee, matcha, and hybrid)
        // The UI will handle styling based on the place's type field
        
        if (cancelled) return;
        
        // Transform cafes to roasteries format
        const ROASTERIES = cafesRaw.map(transformCafeToRoastery);
        
        if (cancelled) return;
        
        // Process in smaller batches on mobile Safari
        if (isMobileSafari && ROASTERIES.length > 50) {
          const batchSize = 20;
          const normalized: Place[] = [];
          
          for (let i = 0; i < ROASTERIES.length; i += batchSize) {
            if (cancelled) return;
            
            const batch = ROASTERIES.slice(i, i + batchSize);
            const batchNormalized = batch.map(normalizeCoffeePlace);
            normalized.push(...batchNormalized);
            
            // Yield to browser between batches
            if (i + batchSize < ROASTERIES.length) {
              await new Promise(resolve => setTimeout(resolve, 10));
            }
          }
          
          if (!cancelled) setPlaces(normalized);
        } else {
          const normalized = ROASTERIES.map(normalizeCoffeePlace);
          if (!cancelled) setPlaces(normalized);
        }
      } catch (err) {
        console.error(`Error loading data:`, err);
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
  }, []);

  return { places, loading, error };
}


