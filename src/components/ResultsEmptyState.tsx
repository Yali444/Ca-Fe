import { Icon } from "@/components/ui/Icon";
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import { suggestMissingPlace } from "@/lib/report";

type LatLng = { lat: number; lng: number };

interface ResultsEmptyStateProps {
  /** True when the favourites-only filter is active (tailors copy + icon). */
  favoritesActive: boolean;
  addressLocation: LatLng | null;
  userLocation: LatLng | null;
  /** True when any shop filter is on — gates the "clear filters" CTA. */
  hasActiveFilters: boolean;
  onClearAddressSearch: () => void;
  onClearUserLocation: () => void;
  onClearAllFilters: () => void;
  /**
   * `page` fills the list column; `overlay` floats the same content as a card
   * above the map, which has no background of its own to read against.
   */
  variant?: "page" | "overlay";
}

/**
 * The "nothing matched" state, shared by the list and the map so the two can't
 * drift. Whichever of address / GPS / filters produced the empty result is the
 * one the CTA offers to undo, and the dead end always ends in a contribution
 * prompt.
 */
export function ResultsEmptyState({
  favoritesActive,
  addressLocation,
  userLocation,
  hasActiveFilters,
  onClearAddressSearch,
  onClearUserLocation,
  onClearAllFilters,
  variant = "page",
}: ResultsEmptyStateProps) {
  const isOverlay = variant === "overlay";

  const body = (
    <>
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
        {favoritesActive ? (
          <Icon name="Heart" className="h-8 w-8 text-muted-foreground" />
        ) : (
          <Icon name="Coffee" className="h-8 w-8 text-muted-foreground" />
        )}
      </div>
      <div className="space-y-1">
        <h2
          className="text-xl font-bold text-foreground"
          style={{ fontFamily: 'var(--font-aran), sans-serif' }}
        >
          {favoritesActive ? "עדיין אין מועדפים" : "לא נמצאו בתי קפה"}
        </h2>
        <p
          className="text-sm text-muted-foreground"
          style={{ fontFamily: 'var(--font-aran), sans-serif' }}
        >
          {favoritesActive
            ? "הקישו על הלב בכרטיס כדי לשמור מקומות אהובים"
            : addressLocation
              ? "לא מצאנו בתי קפה ליד הכתובת הזו"
              : userLocation
                ? "לא מצאנו בתי קפה קרובים אליך"
                : "נסו לשנות את הסינון או לבחור אזור אחר"}
        </p>
      </div>
      {(addressLocation || userLocation || hasActiveFilters) && (
        <LiquidButton
          type="button"
          onClick={
            addressLocation
              ? onClearAddressSearch
              : userLocation
                ? onClearUserLocation
                : onClearAllFilters
          }
          className="flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong transition-colors"
          style={{ fontFamily: 'var(--font-aran), sans-serif' }}
        >
          <Icon name="X" className="h-4 w-4" />
          {addressLocation
            ? "נקה חיפוש"
            : userLocation
              ? "נקה מיקום"
              : "נקה את כל המסננים"}
        </LiquidButton>
      )}
      {/* Turn a dead-end (no results) into a contribution opportunity. */}
      <button
        type="button"
        onClick={suggestMissingPlace}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        style={{ fontFamily: 'var(--font-aran), sans-serif' }}
      >
        <Icon name="Plus" className="h-4 w-4" />
        הוסיפו מקום חסר
      </button>
    </>
  );

  if (!isOverlay) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-4 px-6 py-24 text-center"
        dir="rtl"
      >
        {body}
      </div>
    );
  }

  return (
    // The wrapper spans the map so the card can centre in it, but stays
    // click-through: panning an empty map is still the user's business.
    <div
      className="absolute inset-0 z-[1000] flex items-center justify-center p-4 pointer-events-none"
      role="status"
      aria-live="polite"
      dir="rtl"
    >
      <div className="pointer-events-auto flex max-w-sm flex-col items-center justify-center gap-4 rounded-2xl border border-black/5 dark:border-white/10 bg-white/95 dark:bg-zinc-900/95 px-6 py-8 text-center shadow-xl backdrop-blur-2xl">
        {body}
      </div>
    </div>
  );
}
