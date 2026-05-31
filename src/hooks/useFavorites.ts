"use client";

import { useCallback, useEffect, useState } from "react";

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);

  // Initialize favorites from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("favorites");
    // Hydrating persisted favorites on mount is intentional (SSR cannot read
    // localStorage, so we seed with [] and correct after hydration).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFavorites(saved ? JSON.parse(saved) : []);
  }, []);

  useEffect(() => {
    localStorage.setItem("favorites", JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = useCallback((shopId: string) => {
    setFavorites((prev) => {
      if (prev.includes(shopId)) {
        return prev.filter((id) => id !== shopId);
      }
      return [...prev, shopId];
    });
  }, []);

  return { favorites, toggleFavorite };
}
