"use client";

import { useCallback, useEffect, useState } from "react";

import { getNumericId } from "@/lib/numeric-id";
import type { CafeRating } from "@/lib/ratings";

/**
 * Loads the static ratings snapshot (public/data/ratings.json, produced by
 * scripts/build-ratings.ts) once and returns a lookup by a shop's placeId.
 *
 * Fetched at runtime — like cafes.json — rather than statically imported, so
 * the (numeric-keyed) rating data stays out of the JS bundle and is served
 * from the CDN cache. A shop's `id` is already a placeId, so the numeric
 * review key is `getNumericId(shop.id)`.
 */
export function useRatings(): (placeId: string) => CafeRating | null {
  const [ratings, setRatings] = useState<Record<string, CafeRating>>({});

  useEffect(() => {
    let cancelled = false;
    fetch("/data/ratings.json")
      .then((res) => (res.ok ? res.json() : {}))
      .then((data: Record<string, CafeRating>) => {
        if (!cancelled) setRatings(data ?? {});
      })
      .catch(() => {
        // Ratings are a non-essential enhancement — a load failure just means
        // no stars are shown.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return useCallback(
    (placeId: string): CafeRating | null => {
      const rating = ratings[String(getNumericId(placeId))];
      return rating && rating.count > 0 ? rating : null;
    },
    [ratings],
  );
}
