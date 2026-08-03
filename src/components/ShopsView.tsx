import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";

import ShopCard from "@/components/ShopCard";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import type { CoffeeShop } from "@/lib/coffee-shop";
import { calculateDistance } from "@/lib/geo";
import type { MainArea } from "@/lib/israel-areas";

type LatLng = { lat: number; lng: number };

interface ShopsViewProps {
  /** Set when the catalogue failed to load — shows an error state instead of
   *  the (misleading) "no results" empty state. */
  error: string | null;
  /** All shops matching the active filters (used for counts/"show more"). */
  filteredShops: CoffeeShop[];
  /** Filtered shops capped to the current pagination window, flat order. */
  paginatedFilteredShops: CoffeeShop[];
  /** Filtered shops grouped by area, capped to pagination — null when a
   *  flat (distance-sorted) list should be shown instead. */
  paginatedGroupedShops: { area: string; shops: CoffeeShop[] }[] | null;
  /** Total shop count per area, before pagination, for the area headers. */
  groupedAreaTotalCounts: Map<string, number>;
  availableRegions: { area: MainArea; count: number }[];
  addressLocation: LatLng | null;
  userLocation: LatLng | null;
  lastSearchedAddress: string;
  addressQuery: string;
  selectedRegionFilter: MainArea | null;
  /** True when the favourites-only filter is active (for a tailored empty state). */
  favoritesActive: boolean;
  /** True when any shop filter (brew/beans/favourites/open-now/matcha/online/region) is on. */
  hasActiveFilters: boolean;
  favorites: string[];
  shopsToDisplay: number;
  /** Tailwind class for the responsive grid column count. */
  gridColsClass: string;
  onClearAddressSearch: () => void;
  onSelectRegion: (area: MainArea | null) => void;
  onSelectShop: (shop: CoffeeShop) => void;
  onToggleFavorite: (shopId: string) => void;
  onShowMore: () => void;
  onClearUserLocation: () => void;
  /** Reset every shop filter back to its default (used by the empty state). */
  onClearAllFilters: () => void;
}

/**
 * "Shops" view of the guide: the scrollable catalogue of coffee shops.
 * Renders either an area-grouped grid (default browsing) or a flat,
 * distance-sorted grid when an address/GPS location is active. All data and
 * handlers are supplied by the parent — this component holds no state.
 */
export function ShopsView({
  error,
  filteredShops,
  paginatedFilteredShops,
  paginatedGroupedShops,
  groupedAreaTotalCounts,
  availableRegions,
  addressLocation,
  userLocation,
  lastSearchedAddress,
  addressQuery,
  selectedRegionFilter,
  favoritesActive,
  hasActiveFilters,
  favorites,
  shopsToDisplay,
  gridColsClass,
  onClearAddressSearch,
  onSelectRegion,
  onSelectShop,
  onToggleFavorite,
  onShowMore,
  onClearUserLocation,
  onClearAllFilters,
}: ShopsViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);

  // `scroll` fires far more often than once a frame. This handler only ever
  // needs to answer a yes/no question, so it reads scrollTop inside a single
  // rAF and lets React's bail-out swallow the (overwhelmingly common) case
  // where the answer hasn't changed — instead of dispatching an update per
  // scroll event while the catalogue is being flung.
  const backToTopFrame = useRef(0);
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    if (backToTopFrame.current) return;
    const target = event.currentTarget;
    backToTopFrame.current = window.requestAnimationFrame(() => {
      backToTopFrame.current = 0;
      setShowBackToTop(target.scrollTop > 600);
    });
  }, []);

  useEffect(() => {
    return () => {
      if (backToTopFrame.current) window.cancelAnimationFrame(backToTopFrame.current);
    };
  }, []);

  return (
    <AuroraBackground className="h-full w-full">
      <div className="relative h-full flex flex-col p-0 md:p-8 max-w-full">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 relative overflow-y-auto overflow-x-hidden overscroll-y-contain scroll-smooth"
      >
        <div className="w-full max-w-full px-0 md:px-4 pb-28 md:pb-12 pt-2 md:pt-6 snap-y snap-proximity md:snap-none scroll-pb-32">
          {/* Show content immediately - no loading skeleton needed */}
          {error ? (
            /* Data failed to load — distinct from "no results" so users
               aren't misdirected into fiddling with filters. */
            <div
              role="alert"
              className="flex flex-col items-center justify-center gap-4 px-6 py-24 text-center"
              dir="rtl"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/40">
                <Icon name="TriangleAlert" className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              <div className="space-y-1">
                <h2
                  className="text-xl font-bold text-[#0C4A6E] dark:text-blue-200"
                  style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                >
                  שגיאה בטעינת הנתונים
                </h2>
                <p
                  className="text-sm text-slate-600 dark:text-slate-400"
                  style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                >
                  בדקו את החיבור לאינטרנט ונסו שוב
                </p>
              </div>
              <LiquidButton
                type="button"
                onClick={() => window.location.reload()}
                className="flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong transition-colors"
                style={{ fontFamily: 'var(--font-aran), sans-serif' }}
              >
                נסה שוב
              </LiquidButton>
            </div>
          ) : filteredShops.length > 0 ? (
            <>
              {/* Address search active banner — lets user clear the search without going back to sidebar */}
              {addressLocation && !userLocation && (
                <div
                  className="sticky top-0 z-50 mb-4 px-3 py-2 backdrop-blur-xl"
                  dir="rtl"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-[#0C4A6E] dark:text-blue-200">
                      📍 מציג תוצאות ליד
                    </span>
                    <span className="text-sm font-medium text-[#0C4A6E] dark:text-white truncate max-w-[200px]">
                      {lastSearchedAddress || addressQuery}
                    </span>
                    <LiquidButton
                      type="button"
                      onClick={onClearAddressSearch}
                      size="sm"
                      className="flex items-center gap-1 rounded-full bg-brand px-3 py-1 text-xs text-white hover:bg-brand-strong transition-colors"
                    >
                      <Icon name="X" className="h-3 w-3" />
                      נקה חיפוש
                    </LiquidButton>
                  </div>
                </div>
              )}

              {/* Region Filter Chips - only show when not searching by address/user location */}
              {!addressLocation && !userLocation && availableRegions.length > 0 && (
                <div
                  className="sticky top-0 z-50 mb-4 overflow-x-auto px-3 py-2 md:static md:px-0 md:py-0 md:mb-6 backdrop-blur-xl bg-white/85 dark:bg-zinc-900/85 md:bg-transparent md:dark:bg-transparent border-b border-slate-200/60 dark:border-slate-700/50 md:border-0 [mask-image:linear-gradient(to_left,transparent_0,black_20px,black_calc(100%-20px),transparent_100%)] [-webkit-mask-image:linear-gradient(to_left,transparent_0,black_20px,black_calc(100%-20px),transparent_100%)] md:[mask-image:none] md:[-webkit-mask-image:none]"
                  style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                  }}
                  dir="rtl"
                >
                  <div className="flex w-max snap-x snap-proximity justify-start gap-2 pb-1 pr-14 md:pr-3 after:block after:w-0 after:flex-shrink-0 after:content-[''] after:md:w-16">
                    {[
                      { area: null as MainArea | null, label: "הכל", count: availableRegions.reduce((sum, r) => sum + r.count, 0) },
                      ...availableRegions.map((r) => ({ area: r.area as MainArea | null, label: r.area, count: r.count })),
                    ].map(({ area, label, count }) => {
                      const active = selectedRegionFilter === area;
                      return (
                        <button
                          key={label}
                          type="button"
                          onClick={() => onSelectRegion(area)}
                          aria-pressed={active}
                          className={`shrink-0 snap-start whitespace-nowrap rounded-full px-4 py-2.5 min-h-[44px] text-sm font-medium transition-colors duration-200 ${
                            active
                              ? "bg-brand text-white shadow-sm"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-700"
                          }`}
                          style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                        >
                          {label}{" "}
                          <span className="tabular-nums font-normal">{count}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Grouped by area when no address search */}
              {paginatedGroupedShops && paginatedGroupedShops.length > 0 ? (
                <div className="space-y-8">
                  {paginatedGroupedShops.map(({ area, shops }) => (
                    <div key={area} className="snap-start">
                      {/* Area Header */}
                      <div className="mb-4 flex items-baseline gap-2.5">
                        <h2
                          className="text-xl font-bold text-[#0C4A6E] dark:text-blue-200 transition-colors duration-300"
                          style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                        >
                          {area}
                        </h2>
                        <span
                          className="text-sm font-medium text-slate-600 dark:text-slate-500"
                          style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                        >
                          {groupedAreaTotalCounts.get(area) ?? shops.length} מקומות
                        </span>
                      </div>
                      {/* Shops Grid */}
                      <div className={`grid ${gridColsClass} gap-6 lg:grid-cols-3 w-full`}>
                        {shops.map((shop, index) => (
                          <div key={shop.id} className="snap-start">
                            <ShopCard
                              shop={shop}
                              favorites={favorites}
                              onSelectShop={onSelectShop}
                              onToggleFavorite={onToggleFavorite}
                              index={index}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {/* Show More button for grouped shops */}
                  {filteredShops.length > shopsToDisplay && (
                    <div className="flex justify-center mt-8">
                      <LiquidButton
                        type="button"
                        onClick={onShowMore}
                        className="px-6 py-3 text-base font-medium transition-colors duration-200 dark:border dark:border-white/20 bg-brand text-white shadow-md hover:bg-brand-strong"
                        style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                      >
                        הצג עוד ({filteredShops.length - shopsToDisplay} נותרו)
                      </LiquidButton>
                    </div>
                  )}
                </div>
              ) : (
                /* Flat list when searching by address or using user location (sorted by distance) */
                <div>
                  {/* Header for user location sorted results */}
                  {userLocation && !addressLocation && (
                    <div className="mb-6 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <h2
                          className="text-xl font-bold transition-colors duration-300 text-[#0C4A6E] dark:text-blue-200"
                          style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                        >
                          📍 בתי קפה קרובים אליך
                        </h2>
                        <span
                          className="text-sm font-medium text-slate-600 dark:text-slate-500"
                          style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                        >
                          {filteredShops.length} מקומות
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={onClearUserLocation}
                        className="text-sm text-[#64748B] dark:text-slate-400 hover:text-[#0C4A6E] dark:hover:text-slate-200 transition-colors"
                        style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                      >
                        נקה מיקום ❌
                      </button>
                    </div>
                  )}

                  <div className={`grid ${gridColsClass} gap-6 lg:grid-cols-3 w-full`}>
                    {paginatedFilteredShops.map((shop, index) => {
                      const sortLocation = addressLocation || userLocation;
                      const distance = sortLocation
                        ? calculateDistance(sortLocation.lat, sortLocation.lng, shop.lat, shop.lng)
                        : null;

                      // When the card already shows a matcha / "sells beans" badge
                      // (top-right of the hero image), drop the distance badge below it
                      // so the two don't overlap.
                      const hasHeroBadge = shop.type === 'matcha' || shop.sellsBeans;

                      return (
                        <div key={shop.id} className="relative snap-start">
                          {/* Distance badge — shown for both GPS and address search */}
                          {distance !== null && (
                            <div
                              className={`absolute right-3 z-10 rounded-full bg-brand px-3 py-1 text-xs font-medium text-white shadow-lg ${
                                hasHeroBadge ? 'top-12' : 'top-3'
                              }`}
                              style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                            >
                              {distance < 1
                                ? `${Math.round(distance * 1000)} מ'`
                                : `${distance.toFixed(1)} ק"מ`}
                            </div>
                          )}
                          <ShopCard
                            shop={shop}
                            favorites={favorites}
                            onSelectShop={onSelectShop}
                            onToggleFavorite={onToggleFavorite}
                            index={index}
                          />
                        </div>
                      );
                    })}
                  </div>
                  {/* Show More button for flat list */}
                  {filteredShops.length > shopsToDisplay && (
                    <div className="flex justify-center mt-8">
                      <LiquidButton
                        type="button"
                        onClick={onShowMore}
                        className="px-6 py-3 text-base font-medium transition-colors duration-200 dark:border dark:border-white/20 bg-brand text-white shadow-md hover:bg-brand-strong"
                        style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                      >
                        הצג עוד ({filteredShops.length - shopsToDisplay} נותרו)
                      </LiquidButton>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* Empty state — filters/search yielded no shops. Without this the
               view would render blank and look broken. */
            <div
              className="flex flex-col items-center justify-center gap-4 px-6 py-24 text-center"
              dir="rtl"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                {favoritesActive ? (
                  <Icon name="Heart" className="h-8 w-8 text-slate-600 dark:text-slate-500" />
                ) : (
                  <Icon name="Coffee" className="h-8 w-8 text-slate-600 dark:text-slate-500" />
                )}
              </div>
              <div className="space-y-1">
                <h2
                  className="text-xl font-bold text-[#0C4A6E] dark:text-blue-200"
                  style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                >
                  {favoritesActive ? "עדיין אין מועדפים" : "לא נמצאו בתי קפה"}
                </h2>
                <p
                  className="text-sm text-slate-500 dark:text-slate-400"
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
            </div>
          )}
          <div className="h-[400px]" />
        </div>
        {/* Back-to-top — appears once the list is scrolled down a fair way */}
        {showBackToTop && (
          <button
            type="button"
            onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="חזרה למעלה"
            className="absolute bottom-28 left-4 z-[60] flex h-11 w-11 items-center justify-center rounded-full bg-brand text-white shadow-lg transition-colors hover:bg-brand-strong md:bottom-6"
          >
            <Icon name="ArrowUp" className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  </AuroraBackground>
  );
}
