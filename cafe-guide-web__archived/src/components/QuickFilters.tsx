'use client';

import type { QuickFilterKey } from "@/types/roastery";
import { twMerge } from "tailwind-merge";

const QUICK_FILTERS: Array<{ key: QuickFilterKey; label: string; icon: string }> = [
  { key: "all", label: "הכל", icon: "✨" },
  { key: "filter", label: "פילטר", icon: "🫗" },
  { key: "espresso", label: "אספרסו", icon: "☕" },
];

type QuickFiltersProps = {
  active: QuickFilterKey;
  onSelect: (key: QuickFilterKey) => void;
};

export function QuickFilters({ active, onSelect }: QuickFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {QUICK_FILTERS.map((filter) => (
        <button
          key={filter.key}
          type="button"
          className={twMerge(
            "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold shadow-sm transition",
            active === filter.key
              ? "border-transparent bg-coffee-accent text-white shadow-lg shadow-coffee-accent/30"
              : "border-coffee-ink/10 bg-white text-coffee-ink hover:bg-coffee-card",
          )}
          onClick={() => onSelect(filter.key)}
        >
          <span aria-hidden>{filter.icon}</span>
          {filter.label}
        </button>
      ))}
    </div>
  );
}
