"use client";

import { useEffect, useState } from "react";
import type { Place, AppMode } from "@/types/place";
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
    
    // Detect mobile Safari
    const isMobileSafari = typeof navigator !== "undefined" && (
      /iP(hone|od|ad)/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    ) && /Safari/.test(navigator.userAgent) && !/Chrome|CriOS|FxiOS|OPiOS/.test(navigator.userAgent);
    
    const load = async () => {
      setLoading(true);
      setError(null);
      
      // Add longer delay on mobile Safari to prevent crashes
      // Give browser time to stabilize after component mount
      if (isMobileSafari) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      if (cancelled) return;
      
      try {
        // Load data in chunks on mobile Safari to reduce memory pressure
        if (mode === "coffee") {
          // Fetch cafes data from JSON file
          const response = await fetch("/data/cafes.json");
          if (!response.ok) {
            throw new Error(`Failed to fetch cafes data: ${response.statusText}`);
          }
          const cafesRaw: CafeRaw[] = await response.json();
          
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
        } else {
          const { MATCHA_PLACES } = await import("@/data/matcha");
          
          if (cancelled) return;
          
          if (isMobileSafari && MATCHA_PLACES.length > 50) {
            const batchSize = 20;
            const normalized: Place[] = [];
            
            for (let i = 0; i < MATCHA_PLACES.length; i += batchSize) {
              if (cancelled) return;
              
              const batch = MATCHA_PLACES.slice(i, i + batchSize);
              const batchNormalized = batch.map(normalizeMatchaPlace);
              normalized.push(...batchNormalized);
              
              if (i + batchSize < MATCHA_PLACES.length) {
                await new Promise(resolve => setTimeout(resolve, 10));
              }
            }
            
            if (!cancelled) setPlaces(normalized);
          } else {
            const normalized = MATCHA_PLACES.map(normalizeMatchaPlace);
            if (!cancelled) setPlaces(normalized);
          }
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


