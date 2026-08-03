"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FilterChipProps {
  /** Whether the filter is on — drives both styling and `aria-pressed`. */
  active: boolean;
  onClick: () => void;
  label: string;
  /** Rendered after the label, which in this RTL layout puts it on the left. */
  icon?: ReactNode;
  /** Optional count pinned to the chip's far edge (e.g. saved favourites). */
  badge?: number | null;
  /** Active-state styling. Defaults to the flat brand solid; filters with their
   *  own semantic colour (open-now green, Shabbat amber, matcha emerald,
   *  online-store purple) pass their own. */
  activeClass?: string;
  /** Layout only (`w-full`, `flex-1`, a tighter `px-*`) — the chip owns its
   *  own shape, size and typography. */
  className?: string;
}

/**
 * The app's single filter control.
 *
 * The desktop sidebar, the mobile filter sheet and the two brew-method rows
 * each hand-rolled their own chip, with different padding, radius, icon
 * placement and element type (a glass `LiquidButton` in the sidebar, a plain
 * button on mobile) — so the *same* filter looked like a different control
 * depending on viewport. This owns the shared shape and the 44px touch target;
 * callers pass layout only.
 */
export function FilterChip({
  active,
  onClick,
  label,
  icon,
  badge,
  activeClass = "bg-brand text-white shadow-md",
  className,
}: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full px-4 py-2.5",
        "text-sm font-medium transition-colors duration-200",
        active
          ? activeClass
          : "bg-slate-100 text-slate-600 dark:border dark:border-white/20 dark:bg-slate-800/80 dark:text-slate-200",
        className,
      )}
      style={{ fontFamily: "var(--font-aran), sans-serif" }}
    >
      <span>{label}</span>
      {icon}
      {badge != null && badge > 0 && (
        <span className="ms-auto rounded-full bg-white/20 px-1.5 py-0.5 text-xs">
          {badge}
        </span>
      )}
    </button>
  );
}
