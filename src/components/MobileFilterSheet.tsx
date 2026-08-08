"use client";

import { useEffect } from "react";
import { Icon } from "@/components/ui/Icon";

import { FilterChip } from "@/components/ui/FilterChip";
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import { BREW_METHODS } from "@/lib/brew-methods";
import { suggestMissingPlace } from "@/lib/report";

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
  /** List density, 1 or 2 columns. Lives here rather than in the bottom bar so
   *  that bar can stay focused on the two discovery actions. */
  gridColumns: 1 | 2;
  onSetGridColumns: (cols: 1 | 2) => void;
  /** Density only means anything in the list view — hidden on the map. */
  showGridControl: boolean;
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
  gridColumns,
  onSetGridColumns,
  showGridControl,
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

  return (
    <div
      className="fixed inset-0 z-[9998] md:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="מסננים"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-xl animate-sheet-in rounded-t-3xl border-t border-black/5 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-2xl"
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
              <Icon name="SlidersHorizontal" className="h-4 w-4 text-foreground" />
              <span
                className="text-base font-bold text-foreground"
                style={{ fontFamily: "var(--font-aran), sans-serif" }}
              >
                מסננים
              </span>
              {activeFilterCount > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-xs font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={onClearAll}
                  className="rounded-lg px-2 py-1 text-sm text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10"
                  style={{ fontFamily: "var(--font-aran), sans-serif" }}
                >
                  נקה הכל
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="סגור"
                className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10 hover:text-foreground"
              >
                <Icon name="X" className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Quick filters */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            {/* Label first, icon after — in this RTL layout that puts the icon on
                the LEFT of the text, matching the desktop sidebar chips. */}
            <FilterChip
              onClick={onToggleOpenNow}
              active={showOpenNowOnly}
              activeClass="bg-green-600 text-white shadow-md"
              label="פתוח עכשיו"
              icon={<Icon name="Clock" className="h-4 w-4 shrink-0" />}
            />
            <FilterChip
              onClick={onToggleOpenShabbat}
              active={openShabbatFilter}
              activeClass="bg-amber-600 text-white shadow-md"
              label="פתוח בשבת"
              icon={<span className="text-sm leading-none shrink-0">🕯️</span>}
            />
            <FilterChip
              onClick={onToggleFavorites}
              active={favoritesFilter}
              label="מועדפים"
              badge={favoritesCount}
              icon={<Icon name="Heart" className={`h-4 w-4 shrink-0 ${favoritesFilter ? "fill-white" : ""}`} />}
            />
            <FilterChip
              onClick={onToggleSellsBeans}
              active={sellsBeansFilter}
              label="מוכרים פולים"
              icon={<Icon name="Package" className="h-4 w-4 shrink-0" />}
            />
            <FilterChip
              onClick={onToggleNoMatcha}
              active={noMatchaFilter}
              activeClass="bg-emerald-600 text-white shadow-md"
              label="ללא מאצ'ה"
              icon={<span className="text-sm leading-none shrink-0">🍃</span>}
            />
            <FilterChip
              onClick={onToggleOnlineOnly}
              active={onlineOnlyFilter}
              activeClass="bg-purple-600 text-white shadow-md"
              label="חנות אינטרנטית"
              icon={<span className="text-sm leading-none shrink-0">📦</span>}
            />
          </div>

          {/* Brew methods */}
          <div className="mt-4 border-t border-black/5 dark:border-white/10 pt-3">
            <p className="mb-2 text-xs text-muted-foreground" style={{ fontFamily: "var(--font-aran), sans-serif" }}>
              שיטת הכנה
            </p>
            <div className="flex gap-2">
              {BREW_METHODS.map((method) => (
                <FilterChip
                  key={method}
                  onClick={() => onToggleBrewMethod(method)}
                  active={selectedBrewMethods.includes(method)}
                  label={method}
                  className="flex-1 px-2"
                />
              ))}
            </div>
          </div>

          {/* List density — moved off the bottom bar, which now belongs to the
              two discovery actions. */}
          {showGridControl && (
            <div className="mt-4 border-t border-black/5 dark:border-white/10 pt-3">
              <p className="mb-2 text-xs text-muted-foreground" style={{ fontFamily: "var(--font-aran), sans-serif" }}>
                תצוגה
              </p>
              <div className="flex gap-2">
                <FilterChip
                  onClick={() => onSetGridColumns(1)}
                  active={gridColumns === 1}
                  label="עמודה אחת"
                  className="flex-1 px-2"
                />
                <FilterChip
                  onClick={() => onSetGridColumns(2)}
                  active={gridColumns === 2}
                  label="שתי עמודות"
                  className="flex-1 px-2"
                />
              </div>
            </div>
          )}

          {/* Primary "show results" action — previews the match count */}
          <LiquidButton
            type="button"
            onClick={onClose}
            size="lg"
            className={`mt-4 w-full rounded-2xl py-3 text-base font-semibold text-white shadow-md transition-colors ${
              resultCount > 0
                ? "bg-brand hover:bg-brand-strong"
                : "bg-slate-600 dark:bg-slate-600"
            }`}
            style={{ fontFamily: "var(--font-aran), sans-serif" }}
          >
            {resultCount > 0 ? `הצג ${resultCount} תוצאות` : "אין תוצאות תואמות"}
          </LiquidButton>

          {/* Content-growth CTA — the app's coverage is its moat, and most
              traffic is mobile, so this can't live only in the desktop sidebar. */}
          <button
            type="button"
            onClick={suggestMissingPlace}
            className="mt-3 flex w-full items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            style={{ fontFamily: "var(--font-aran), sans-serif" }}
          >
            <Icon name="Plus" className="h-4 w-4" />
            לא מצאתם מקום? הוסיפו מקום חסר
          </button>
        </div>
      </div>
    </div>
  );
}
