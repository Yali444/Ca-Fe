import { X } from "lucide-react";

import ShopCard from "@/components/ShopCard";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import { blueColors } from "@/components/map/map-icons";
import type { CoffeeShop } from "@/lib/coffee-shop";
import { calculateDistance } from "@/lib/geo";
import type { MainArea } from "@/lib/israel-areas";

type LatLng = { lat: number; lng: number };

interface ShopsViewProps {
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
}

/**
 * "Shops" view of the guide: the scrollable catalogue of coffee shops.
 * Renders either an area-grouped grid (default browsing) or a flat,
 * distance-sorted grid when an address/GPS location is active. All data and
 * handlers are supplied by the parent — this component holds no state.
 */
export function ShopsView({
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
  favorites,
  shopsToDisplay,
  gridColsClass,
  onClearAddressSearch,
  onSelectRegion,
  onSelectShop,
  onToggleFavorite,
  onShowMore,
  onClearUserLocation,
}: ShopsViewProps) {
  return (
    <AuroraBackground className="h-full w-full">
      <div className="h-full flex flex-col p-0 md:p-8 max-w-full">
      <div className="flex-1 relative overflow-y-auto overflow-x-hidden overscroll-y-contain scroll-smooth">
        <div className="w-full max-w-full px-0 md:px-4 pb-28 md:pb-12 pt-2 md:pt-6 snap-y snap-proximity md:snap-none scroll-pb-32">
          {/* Show content immediately - no loading skeleton needed */}
          {filteredShops.length > 0 ? (
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
                      className="flex items-center gap-1 rounded-full bg-[#0071E3] px-3 py-1 text-xs text-white hover:bg-[#0062c4] transition-colors"
                    >
                      <X className="h-3 w-3" />
                      נקה חיפוש
                    </LiquidButton>
                  </div>
                </div>
              )}

              {/* Region Filter Chips - only show when not searching by address/user location */}
              {!addressLocation && !userLocation && availableRegions.length > 0 && (
                <div
                  className="sticky top-0 z-50 mb-4 overflow-x-auto px-3 py-2 md:static md:px-0 md:py-0 md:mb-6 backdrop-blur-xl"
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
                          className={`shrink-0 snap-start whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                            active
                              ? "bg-[#0071E3] text-white shadow-sm"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-700"
                          }`}
                          style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                        >
                          {label}{" "}
                          <span className={active ? "opacity-80" : "opacity-50"}>{count}</span>
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
                          className="text-sm font-medium text-slate-400 dark:text-slate-500"
                          style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                        >
                          {groupedAreaTotalCounts.get(area) ?? shops.length} מקומות
                        </span>
                      </div>
                      {/* Shops Grid */}
                      <div className={`grid ${gridColsClass} gap-6 md:grid-cols-2 lg:grid-cols-3 w-full`}>
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
                        className={`px-6 py-3 text-base font-medium transition-all duration-200 dark:border dark:border-white/20 ${
                          `bg-gradient-to-r ${blueColors.primary.gradient} ${blueColors.primary.gradientDark} text-white shadow-md hover:shadow-lg`
                        }`}
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
                          className="text-sm font-medium text-slate-400 dark:text-slate-500"
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

                  <div className={`grid ${gridColsClass} gap-6 md:grid-cols-2 lg:grid-cols-3 w-full`}>
                    {paginatedFilteredShops.map((shop, index) => {
                      const sortLocation = addressLocation || userLocation;
                      const distance = sortLocation
                        ? calculateDistance(sortLocation.lat, sortLocation.lng, shop.lat, shop.lng)
                        : null;

                      return (
                        <div key={shop.id} className="relative snap-start">
                          {/* Distance badge for user location */}
                          {userLocation && !addressLocation && distance !== null && (
                            <div
                              className="absolute top-2 right-2 z-10 rounded-full bg-blue-500/90 backdrop-blur-sm px-3 py-1 text-xs font-medium text-white shadow-lg"
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
                        className={`px-6 py-3 text-base font-medium transition-all duration-200 dark:border dark:border-white/20 ${
                          `bg-gradient-to-r ${blueColors.primary.gradient} ${blueColors.primary.gradientDark} text-white shadow-md hover:shadow-lg`
                        }`}
                        style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                      >
                        הצג עוד ({filteredShops.length - shopsToDisplay} נותרו)
                      </LiquidButton>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : null}
          <div className="h-[400px]" />
        </div>
      </div>
    </div>
  </AuroraBackground>
  );
}
