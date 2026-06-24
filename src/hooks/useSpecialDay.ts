"use client";

import { useEffect, useState } from "react";
import { selectNotice, type SpecialDay } from "@/lib/special-days";

type SpecialDayResponse = {
  today?: SpecialDay[];
  tomorrow?: SpecialDay[];
};

/**
 * Fetches today's / tomorrow's Israeli special days from `/api/special-day` and
 * derives the Hebrew notice to show (or `null` when it's an ordinary day).
 *
 * Advisory only — it never affects the open/closed computation. Fails silently
 * to `null` so a calendar hiccup can't break the page.
 */
export function useSpecialDay(): { notice: string | null } {
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch("/api/special-day");
        if (!response.ok) return;
        const data = (await response.json()) as SpecialDayResponse;
        if (cancelled) return;

        setNotice(selectNotice(data.today ?? [], data.tomorrow ?? []));
      } catch {
        // Ignore — leave the notice null.
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { notice };
}
