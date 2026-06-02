"use client";

import React from "react";
import { MapPin } from "lucide-react";

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
  onSearch,
  isGeocoding,
  addressSearchError,
  recentAddresses,
  onRecentClick,
}: MobileSearchOverlayProps) {
  return (
    <div className="fixed inset-0 z-[9998] md:hidden">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-xl px-4 pb-6">
        <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <MapPin className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#075985] dark:text-slate-400" />
              <input
                type="text"
                placeholder="חפש בית קפה או כתובת..."
                value={addressQuery}
                onChange={(event) => onAddressQueryChange(event.target.value)}
                onFocus={onSearchFocus}
                onBlur={onSearchBlur}
                onKeyDown={onAddressKeyDown}
                className="w-full rounded-xl border border-[#BAE6FD] dark:border-slate-700 bg-[#E0F2FE] dark:bg-slate-800 py-3 pr-10 pl-3 text-base text-[#0C4A6E] dark:text-slate-200 placeholder:text-[#075985] dark:placeholder:text-slate-500 outline-none ring-[#38BDF8]/40 dark:ring-blue-400/40 transition-all duration-200 focus:border-transparent focus:ring-2"
              />
              {searchDropdown}
            </div>
            <button
              type="button"
              onClick={onSearch}
              disabled={isGeocoding || !addressQuery.trim()}
              className="rounded-xl px-4 py-3 text-sm font-medium bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg disabled:opacity-60"
              style={{ fontFamily: 'var(--font-aran), sans-serif' }}
            >
              חפש
            </button>
          </div>
          {addressSearchError && (
            <div className="mt-3 text-xs text-red-600 dark:text-red-300" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
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
