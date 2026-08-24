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
    brewMethods: Array.isArray(roastery.brewMethods) ? roastery.brewMethods : [],
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

    const load = async () => {
      setLoading(true);
      setError(null);

      if (cancelled) return;

      try {
        // Load all places from cafes.json (contains both coffee and matcha places)
        const response = await fetch("/data/cafes.json");
        if (!response.ok) {
          throw new Error(`Failed to fetch cafes data: ${response.statusText}`);
        }
        const cafesRaw: CafeRaw[] = await response.json();

        if (cancelled) return;

        // Types (coffee, matcha, hybrid) are all included — the UI styles them
        // from the `type` field. The one thing dropped here is `hidden`.
        //
        // It has to happen at this boundary because the two transforms below
        // build new objects from explicit field lists, so `hidden` never
        // reached `Place` at all. Every downstream `!hidden` check was
        // therefore reading `undefined` and passing everything through — the
        // flag looked implemented and did nothing. Filtering the raw records
        // makes it real for every consumer at once, and mirrors how
        // cafe-lookup does it for the server-rendered pages.
        const visibleRaw = cafesRaw.filter((cafe) => !cafe.hidden);

        // Transform cafes to roasteries format
        const ROASTERIES = visibleRaw.map(transformCafeToRoastery);

        if (cancelled) return;

        // Both transforms are plain field-mapping over a few hundred records —
        // a couple of milliseconds. This used to be chunked into batches of 20
        // with an awaited 10ms timer between them on mobile Safari, which added
        // ~80ms of pure waiting to the slowest platform to avoid blocking that
        // was never happening.
        const normalized = ROASTERIES.map(normalizeCoffeePlace);
        if (!cancelled) setPlaces(normalized);
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


