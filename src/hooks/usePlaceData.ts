"use client";

import { useEffect, useState } from "react";
import type { Place } from "@/types/place";
import type { Roastery } from "@/types/roastery";
import { transformCafeToRoastery, type CafeRaw } from "@/data/roasteries";

export function normalizeCoffeePlace(roastery: Roastery): Place {
  return {
    id: roastery.id,
    datasetId: roastery.datasetId,
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
    isOnlineOnly: roastery.isOnlineOnly,
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


