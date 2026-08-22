"use client";

import { useCallback, useEffect, useState } from "react";
import { tapHaptic } from "@/lib/haptics";

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);
  // Gates the persist effect until the stored value has been read. Without it
  // the persist effect fires on mount against the seeded `[]` and writes that
  // over the real list before hydration lands — self-healing on the next
  // render, but a teardown inside that window loses the user's favourites.
  const [hydrated, setHydrated] = useState(false);

  // Initialize favorites from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    let saved: string | null = null;
    try {
      saved = localStorage.getItem("favorites");
    } catch {
      // Storage blocked (private mode etc.) — nothing to hydrate from.
    }
    // Hydrating persisted favorites on mount is intentional (SSR cannot read
    // localStorage, so we seed with [] and correct after hydration). A corrupt
    // stored value must not crash the tree — fall back to an empty list.
    let parsed: string[] = [];
    try {
      const value = saved ? JSON.parse(saved) : [];
      if (Array.isArray(value)) parsed = value.filter((id): id is string => typeof id === "string");
    } catch {
      parsed = [];
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFavorites(parsed);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem("favorites", JSON.stringify(favorites));
    } catch {
      // Storage blocked or over quota — favourites stay in memory for the visit.
    }
  }, [favorites, hydrated]);

  const toggleFavorite = useCallback((shopId: string) => {
    tapHaptic();
    setFavorites((prev) => {
      if (prev.includes(shopId)) {
        return prev.filter((id) => id !== shopId);
      }
      return [...prev, shopId];
    });
  }, []);

  return { favorites, toggleFavorite };
}
