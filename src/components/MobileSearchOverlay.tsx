"use client";

import React, { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";

interface MobileSearchOverlayProps {
  /** Closes the overlay (backdrop tap, "סגור" button). */
  onClose: () => void;
  addressQuery: string;
  onAddressQueryChange: (value: string) => void;
  onSearchFocus: () => void;
  onSearchBlur: () => void;
  onAddressKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  /** Autocomplete dropdown rendered under the input (from the parent). */
  searchDropdown: React.ReactNode;
  /** id of the highlighted autocomplete option (aria-activedescendant). */
  searchActiveDescendant?: string;
  /** Triggers the geocode/search for the current query. */
  onSearch: () => void;
  isGeocoding: boolean;
  addressSearchError: string | null;
  recentAddresses: string[];
  onRecentClick: (recent: string) => void;
}

/**
 * Mobile-only bottom-sheet search overlay. Mirrors the desktop sidebar search
 * (address/cafe input, autocomplete dropdown, recent addresses, error state)
 * but presented as a full-screen modal for small viewports. Stateless — query,
 * error and recent addresses are owned by the parent.
 */
export function MobileSearchOverlay({
  onClose,
  addressQuery,
  onAddressQueryChange,
  onSearchFocus,
  onSearchBlur,
  onAddressKeyDown,
  searchDropdown,
  searchActiveDescendant,
  onSearch,
  isGeocoding,
  addressSearchError,
  recentAddresses,
  onRecentClick,
}: MobileSearchOverlayProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  // Height the on-screen keyboard occupies, so the sheet can sit above it.
  const [keyboardInset, setKeyboardInset] = useState(0);

  // Auto-focus the search field on open and close on Escape.
  useEffect(() => {
    inputRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Keep the sheet above the soft keyboard using the visual viewport (the layout
  // viewport doesn't shrink when the keyboard opens on iOS).
  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!vv) return;
    const update = () => {
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardInset(inset);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[9998] md:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="חיפוש בית קפה או כתובת"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="absolute inset-x-0 mx-auto w-full max-w-xl px-4 pb-6 transition-[bottom] duration-150"
        style={{ bottom: keyboardInset }}
      >
        <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Icon name="MapPin" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#075985] dark:text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                role="combobox"
                aria-label="חפש בית קפה או כתובת"
                aria-autocomplete="list"
                aria-expanded={searchDropdown != null}
                aria-controls={searchDropdown != null ? "cafe-search-listbox" : undefined}
                aria-activedescendant={searchActiveDescendant}
                placeholder="חפש בית קפה או כתובת..."
                value={addressQuery}
                onChange={(event) => onAddressQueryChange(event.target.value)}
                onFocus={onSearchFocus}
                onBlur={onSearchBlur}
                onKeyDown={onAddressKeyDown}
                className="w-full rounded-xl border-0 bg-black/5 dark:bg-white/10 py-3 pr-10 pl-3 text-base text-foreground placeholder:text-muted-foreground outline-none ring-brand/40 transition-all duration-200 focus:ring-2"
              />
              {searchDropdown}
            </div>
            <button
              type="button"
              onClick={onSearch}
              disabled={isGeocoding || !addressQuery.trim()}
              aria-label="חפש"
              className="rounded-xl px-4 py-3 text-sm font-medium bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg disabled:opacity-60"
              style={{ fontFamily: 'var(--font-aran), sans-serif' }}
            >
              חפש
            </button>
          </div>
          {addressSearchError && (
            <div role="alert" className="mt-3 text-xs text-red-600 dark:text-red-300" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
              {addressSearchError}
            </div>
          )}
          {!addressQuery.trim() && recentAddresses.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {recentAddresses.slice(0, 5).map((recent) => (
                <button
                  key={recent}
                  type="button"
                  onClick={() => onRecentClick(recent)}
                  className="rounded-full border border-slate-200 dark:border-slate-700 px-3 py-1 text-xs text-slate-600 dark:text-slate-200"
                  style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                >
                  {recent}
                </button>
              ))}
            </div>
          )}
          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-[#64748B] dark:text-slate-300"
              style={{ fontFamily: 'var(--font-aran), sans-serif' }}
            >
              סגור
            </button>
            {isGeocoding && (
              <div className="text-sm text-[#075985] dark:text-slate-400" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                מחפש...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
