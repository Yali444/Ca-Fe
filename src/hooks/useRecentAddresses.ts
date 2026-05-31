"use client";

import { useCallback, useEffect, useState } from "react";

export function useRecentAddresses() {
  const [recentAddresses, setRecentAddresses] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("recentAddressSearches");
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as string[];
      if (Array.isArray(parsed)) {
        // Hydrating persisted searches on mount is intentional (SSR cannot
        // read localStorage, so we seed with [] and correct after hydration).
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRecentAddresses(parsed.slice(0, 5));
      }
    } catch {
      setRecentAddresses([]);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("recentAddressSearches", JSON.stringify(recentAddresses.slice(0, 5)));
  }, [recentAddresses]);

  const addRecentAddress = useCallback((query: string) => {
    const normalized = query.trim();
    if (!normalized) return;
    setRecentAddresses((prev) => [normalized, ...prev.filter((item) => item !== normalized)].slice(0, 5));
  }, []);

  return { recentAddresses, addRecentAddress };
}
