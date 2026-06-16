"use client";

import { useEffect } from "react";
import { Clock, Heart, Package, SlidersHorizontal, X } from "lucide-react";

import { LiquidButton } from "@/components/ui/liquid-glass-button";
import { blueColors } from "@/components/map/map-icons";
import { BREW_METHODS } from "@/lib/brew-methods";

interface MobileFilterSheetProps {
  /** Closes the sheet (backdrop tap, close button, Escape). */
  onClose: () => void;
  selectedBrewMethods: string[];
  sellsBeansFilter: boolean;
  favoritesFilter: boolean;
  noMatchaFilter: boolean;
  onlineOnlyFilter: boolean;
  showOpenNowOnly: boolean;
  openShabbatFilter: boolean;
  favoritesCount: number;
  /** Total active filters, shown in the header so the state is obvious. */
  activeFilterCount: number;
  /** How many shops currently match — previews the outcome on the CTA. */
  resultCount: number;
  onToggleBrewMethod: (method: string) => void;
  onToggleSellsBeans: () => void;
  onToggleFavorites: () => void;
  onToggleNoMatcha: () => void;
  onToggleOnlineOnly: () => void;
  onToggleOpenNow: () => void;
  onToggleOpenShabbat: () => void;
  onClearAll: () => void;
}

/**
 * Mobile-only bottom-sheet exposing the full filter set that otherwise lives in
 * the desktop sidebar (hidden behind the hamburger on phones). Stateless — every
 * value and toggle is owned by the parent so this mirrors the sidebar exactly.
 */
export function MobileFilterSheet({
  onClose,
  selectedBrewMethods,
  sellsBeansFilter,
  favoritesFilter,
  noMatchaFilter,
  onlineOnlyFilter,
  showOpenNowOnly,
  openShabbatFilter,
  favoritesCount,
  activeFilterCount,
  resultCount,
  onToggleBrewMethod,
  onToggleSellsBeans,
  onToggleFavorites,
  onToggleNoMatcha,
  onToggleOnlineOnly,
  onToggleOpenNow,
  onToggleOpenShabbat,
  onClearAll,
}: MobileFilterSheetProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const toggleChip = (active: boolean, activeClass: string) =>
    `flex items-center justify-center gap-1.5 rounded-full px-3 py-2.5 text-sm font-medium transition-all min-h-[44px] ${
      active
        ? activeClass
        : "bg-slate-100 text-slate-600 dark:bg-slate-800/80 dark:text-slate-200"
    }`;

  const blueActive = `bg-gradient-to-r ${blueColors.primary.gradient} ${blueColors.primary.gradientDark} text-white shadow-md`;

  return (
    <div
      className="fixed inset-0 z-[9998] md:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="מסננים"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-xl rounded-t-3xl border border-slate-200/60 dark:border-slate-700/60 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-2xl"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        dir="rtl"
      >
        {/* Drag-handle affordance */}
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="h-1.5 w-10 rounded-full bg-slate-300 dark:bg-zinc-600" />
        </div>

        <div className="px-4 pb-2">
          {/* Header */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-[#0C4A6E] dark:text-blue-200" />
              <span
                className="text-base font-bold text-[#0C4A6E] dark:text-blue-200"
                style={{ fontFamily: "var(--font-aran), sans-serif" }}
              >
                מסננים
              </span>
              {activeFilterCount > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-500 px-1.5 text-xs font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={onClearAll}
                  className="rounded-lg px-2 py-1 text-sm text-[#64748B] dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  style={{ fontFamily: "var(--font-aran), sans-serif" }}
                >
                  נקה הכל
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="סגור"
                className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[#0C4A6E] dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Quick filters */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button type="button" onClick={onToggleOpenNow} className={toggleChip(showOpenNowOnly, "bg-green-500 text-white shadow-md")} style={{ fontFamily: "var(--font-aran), sans-serif" }}>
              <Clock className="h-4 w-4 shrink-0" />
              פתוח עכשיו
            </button>
            <button type="button" onClick={onToggleOpenShabbat} className={toggleChip(openShabbatFilter, "bg-amber-500 text-white shadow-md")} style={{ fontFamily: "var(--font-aran), sans-serif" }}>
              <span className="text-sm leading-none">🕯️</span>
              פתוח בשבת
            </button>
            <button type="button" onClick={onToggleFavorites} className={toggleChip(favoritesFilter, blueActive)} style={{ fontFamily: "var(--font-aran), sans-serif" }}>
              <Heart className={`h-4 w-4 shrink-0 ${favoritesFilter ? "fill-white" : ""}`} />
              מועדפים{favoritesCount > 0 ? ` (${favoritesCount})` : ""}
            </button>
            <button type="button" onClick={onToggleSellsBeans} className={toggleChip(sellsBeansFilter, blueActive)} style={{ fontFamily: "var(--font-aran), sans-serif" }}>
              <Package className="h-4 w-4 shrink-0" />
              מוכרים פולים
            </button>
            <button type="button" onClick={onToggleNoMatcha} className={toggleChip(noMatchaFilter, "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md")} style={{ fontFamily: "var(--font-aran), sans-serif" }}>
              <span className="text-sm leading-none">🍃</span>
              ללא מאצ&apos;ה
            </button>
            <button type="button" onClick={onToggleOnlineOnly} className={toggleChip(onlineOnlyFilter, "bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md")} style={{ fontFamily: "var(--font-aran), sans-serif" }}>
              <span className="text-sm leading-none">📦</span>
              חנות אינטרנטית
            </button>
          </div>

          {/* Brew methods */}
          <div className="mt-4 border-t border-slate-200/70 dark:border-slate-700/60 pt-3">
            <p className="mb-2 text-xs text-[#64748B] dark:text-slate-400" style={{ fontFamily: "var(--font-aran), sans-serif" }}>
              שיטת הכנה
            </p>
            <div className="flex gap-2">
              {BREW_METHODS.map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => onToggleBrewMethod(method)}
                  aria-pressed={selectedBrewMethods.includes(method)}
                  className={`flex-1 ${toggleChip(selectedBrewMethods.includes(method), blueActive)}`}
                  style={{ fontFamily: "var(--font-aran), sans-serif" }}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          {/* Primary "show results" action — previews the match count */}
          <LiquidButton
            type="button"
            onClick={onClose}
            size="lg"
            className={`mt-4 w-full rounded-2xl py-3 text-base font-semibold text-white shadow-lg ${
              resultCount > 0
                ? `bg-gradient-to-r ${blueColors.primary.gradient} ${blueColors.primary.gradientDark}`
                : "bg-slate-400 dark:bg-slate-600"
            }`}
            style={{ fontFamily: "var(--font-aran), sans-serif" }}
          >
            {resultCount > 0 ? `הצג ${resultCount} תוצאות` : "אין תוצאות תואמות"}
          </LiquidButton>
        </div>
      </div>
    </div>
  );
}
