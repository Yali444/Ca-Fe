"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";

interface SpecialDayBannerProps {
  notice: string | null;
}

/**
 * Non-intrusive top banner shown on Israeli special days (Memorial Day, Holocaust
 * Remembrance Day, holidays, …) advising that cafe hours may differ. Purely
 * informational — it does not change any open/closed status. Renders nothing when
 * there's no notice or after the user dismisses it.
 */
export function SpecialDayBanner({ notice }: SpecialDayBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (!notice || dismissed) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[10001] mx-auto w-full max-w-3xl px-4 pt-2">
      <div
        dir="rtl"
        className="flex items-center gap-2 rounded-xl border border-sky-300/80 bg-sky-100/95 px-3 py-2 text-xs text-sky-900 shadow-md dark:border-sky-700/60 dark:bg-sky-900/70 dark:text-sky-100"
        style={{ fontFamily: "var(--font-aran), sans-serif" }}
        role="status"
      >
        <Icon name="Clock" className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-center">{notice}</span>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="סגירת ההודעה"
          className="shrink-0 rounded-full p-1 text-sky-700 transition-colors hover:bg-sky-200/70 dark:text-sky-200 dark:hover:bg-sky-800/70"
        >
          <Icon name="X" className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
