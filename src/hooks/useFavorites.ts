"use client";

import { useCallback, useEffect, useState } from "react";
import { tapHaptic } from "@/lib/haptics";

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);

  // Initialize favorites from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("favorites");
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
  }, []);

  useEffect(() => {
    localStorage.setItem("favorites", JSON.stringify(favorites));
  }, [favorites]);

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
