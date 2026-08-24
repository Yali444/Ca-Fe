import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import type L from "leaflet";
import { useMemo } from "react";
import { Icon } from "@/components/ui/Icon";
import { MapContainer, Marker, Popup } from "react-leaflet";

import { ResultsEmptyState } from "@/components/ResultsEmptyState";
import { SkeletonMapLoader } from "@/components/SkeletonLoader";
import {
  createAddressMarker,
  createCafeMarker,
  createCafeMarkerClosed,
  createMatchaMarker,
  createMatchaMarkerClosed,
  createUserLocationMarker,
  israelBounds,
} from "@/components/map/map-icons";
import {
  ClusteredMarker,
  FitBounds,
  FlyToAddress,
  FlyToShop,
  FlyToUserLocation,
  MapController,
  MarkerClusterGroup,
  ThemeTileLayer,
} from "@/components/map/leaflet-helpers";
import type { CoffeeShop } from "@/lib/coffee-shop";
import { isConfirmedOpenNow } from "@/lib/opening-hours";

type LatLng = { lat: number; lng: number };

interface MapViewProps {
  /** Number of active filters, for the overlay badge (0 hides the badge). */
  activeFilterCount: number;
  /** Shops with a physical location (online-only places excluded). */
  mapShops: CoffeeShop[];
  addressLocation: LatLng | null;
  userLocation: LatLng | null;
  lastSearchedAddress: string;
  addressQuery: string;
  /** True when the favourites-only filter is active (for a tailored empty state). */
  favoritesActive: boolean;
  /** True when any shop filter (brew/beans/favourites/open-now/matcha/online/region) is on. */
  hasActiveFilters: boolean;
  isBrowser: boolean;
  mapReady: boolean;
  error: string | null;
  flyToAddressKey: number;
  flyToShopTarget: LatLng | null;
  flyToShopKey: number;
  flyToUserKey: number;
  fitBoundsEnabled: boolean;
  /** Close the detail panel when the map background is clicked. */
  onCloseDetail: () => void;
  /** Receive the Leaflet map instance once it's ready. */
  onMapReady: (map: L.Map) => void;
  onClearAddressSearch: () => void;
  onClearUserLocation: () => void;
  /** Reset every shop filter back to its default (used by the empty state). */
  onClearAllFilters: () => void;
  onSelectShop: (shop: CoffeeShop, event?: React.MouseEvent | MouseEvent) => void;
  /** Fired after a fly-to-shop animation settles (opens the pending shop). */
  onFlyToShopArrived: () => void;
}

/**
 * "Map" view of the guide: the interactive Leaflet map with clustered shop
 * markers, address/user-location markers, and fly-to animations. Stateless —
 * the map instance, fly-to triggers and filters all live in the parent.
 */
export function MapView({
  activeFilterCount,
  mapShops,
  addressLocation,
  userLocation,
  lastSearchedAddress,
  addressQuery,
  favoritesActive,
  hasActiveFilters,
  isBrowser,
  mapReady,
  error,
  flyToAddressKey,
  flyToShopTarget,
  flyToShopKey,
  flyToUserKey,
  fitBoundsEnabled,
  onCloseDetail,
  onMapReady,
  onClearAddressSearch,
  onClearUserLocation,
  onClearAllFilters,
  onSelectShop,
  onFlyToShopArrived,
}: MapViewProps) {
  // Marker icons are built here (inside the lazily-loaded map chunk) rather than
  // in the parent, so the Leaflet-dependent icon factory never reaches the main
  // bundle. Created once — they don't depend on props.
  const cafeMarker = useMemo(() => createCafeMarker(), []);
  const matchaMarker = useMemo(() => createMatchaMarker(), []);
  const cafeMarkerClosed = useMemo(() => createCafeMarkerClosed(), []);
  const matchaMarkerClosed = useMemo(() => createMatchaMarkerClosed(), []);

  return (
    // The map is full-bleed on a plain themed background.
    <div className="relative h-full w-full bg-zinc-50 dark:bg-[#0B1120]">
        <div
          className="relative h-full w-full"
          onClick={(e) => {
            // Only close if clicking directly on the map background, not on popups or cards
            if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('leaflet-container')) {
              onCloseDetail();
            }
          }}
        >
          {/* Active filter indicator overlay */}
          {activeFilterCount > 0 ? (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none" role="status" aria-live="polite">
              <div className="flex items-center gap-1.5 rounded-full bg-white/95 dark:bg-zinc-900/95 border border-slate-200 dark:border-zinc-700 px-3 py-1.5 shadow-lg text-xs font-medium text-foreground">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white text-xs font-bold">{activeFilterCount}</span>
                <span style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                  {activeFilterCount === 1 ? 'מסנן פעיל' : 'מסננים פעילים'} · {mapShops.length} מקומות במפה
                </span>
              </div>
            </div>
          ) : (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none" role="status" aria-live="polite">
              <div className="flex items-center gap-1.5 rounded-full bg-white/95 dark:bg-zinc-900/95 border border-slate-200 dark:border-zinc-700 px-3 py-1.5 shadow text-xs text-muted-foreground">
                <span style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                  {mapShops.length} מקומות
                </span>
              </div>
            </div>
          )}
          {/* Address clear chip — visible on map view when sidebar is closed on mobile */}
          {addressLocation && !userLocation && lastSearchedAddress && (
            <div className="absolute top-12 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2 rounded-full bg-white/95 dark:bg-zinc-900/95 border border-sky-200 dark:border-sky-800 px-3 py-1.5 shadow-lg">
              <span className="text-xs text-foreground whitespace-nowrap" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                📍 {lastSearchedAddress}
              </span>
              <button
                type="button"
                onClick={onClearAddressSearch}
                aria-label="נקה חיפוש"
                className="relative flex items-center justify-center rounded-full p-0.5 text-muted-foreground hover:text-foreground transition-colors after:absolute after:-inset-3 after:content-['']"
                title="נקה חיפוש"
              >
                <Icon name="X" className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          {(!isBrowser || !mapReady) ? (
            <SkeletonMapLoader />
          ) : error ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-red-600 dark:text-red-400 p-8">
              <p className="text-lg font-semibold">שגיאה בטעינת הנתונים</p>
              <p className="text-sm">{error}</p>
            </div>
          ) : (
            <MapContainer
              center={[31.5, 34.75]}
              zoom={8}
              minZoom={7}
              maxZoom={19}
              maxBounds={israelBounds}
              // 1.0 makes the edges fully solid, so dragging near the boundary
              // feels sticky/rubber-bandy; 0.5 keeps the map within Israel while
              // letting pans glide.
              maxBoundsViscosity={0.5}
              className="h-full w-full theme-map-container"
              scrollWheelZoom={true}
              key="main-map"
            >
              <MapController onReady={onMapReady} />
              <ThemeTileLayer />
              <FlyToAddress location={addressLocation} trigger={flyToAddressKey} />
              <FlyToShop
                target={flyToShopTarget}
                trigger={flyToShopKey}
                onArrived={onFlyToShopArrived}
              />
              <FlyToUserLocation location={userLocation} trigger={flyToUserKey} />
              {!addressLocation && !userLocation && (
                <FitBounds shops={mapShops} enabled={fitBoundsEnabled && mapShops.length > 0} />
              )}
              {/* Address search marker */}
              {addressLocation && ((loc) => (
                <Marker
                  position={[loc.lat, loc.lng]}
                  icon={createAddressMarker()}
                  zIndexOffset={1000}
                >
                  <Popup>
                    <div className="p-2 text-center">
                      <p className="font-semibold text-sm text-foreground" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                        📍 המיקום שחיפשת
                      </p>
                      <p className="text-xs text-muted-foreground mt-1" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                        {lastSearchedAddress || addressQuery}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              ))(addressLocation)}
              {/* User location marker */}
              {userLocation && ((loc) => (
                <Marker
                  position={[loc.lat, loc.lng]}
                  icon={createUserLocationMarker()}
                  zIndexOffset={999}
                >
                  <Popup>
                    <div className="p-2 text-center">
                      <p className="font-semibold text-sm text-foreground" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                        📍 המיקום שלך
                      </p>
                    </div>
                  </Popup>
                </Marker>
              ))(userLocation)}
              {/* Clustered markers for shops (exclude online-only places — no physical location) */}
              <MarkerClusterGroup>
                {mapShops.map((shop) => {
                  // Pick the marker icon by type (matcha = green, coffee = blue)
                  // and dim it when the place is currently closed, so the map
                  // shows what's open at a glance.
                  const open = isConfirmedOpenNow(shop.hours);
                  const markerIcon = shop.type === 'matcha'
                    ? (open ? matchaMarker : matchaMarkerClosed)
                    : (open ? cafeMarker : cafeMarkerClosed);

                  return (
                    <ClusteredMarker
                      key={shop.id}
                      position={[shop.lat, shop.lng]}
                      icon={markerIcon}
                      title={shop.name}
                      eventHandlers={{
                        click: (e) => {
                          // Get the original browser event from Leaflet
                          const originalEvent = e.originalEvent as MouseEvent;
                          onSelectShop(shop, originalEvent);
                        },
                      }}
                    />
                  );
                })}
              </MarkerClusterGroup>
            </MapContainer>
          )}
          {/* Zero results: the basemap alone is a dead end — no markers, and
              nothing to say which filter emptied it or how to undo it. Sits
              beside the map (not inside MapContainer, whose children must be
              Leaflet layers) and shares the list view's recovery state. */}
          {isBrowser && mapReady && !error && mapShops.length === 0 && (
            <ResultsEmptyState
              variant="overlay"
              favoritesActive={favoritesActive}
              addressLocation={addressLocation}
              userLocation={userLocation}
              hasActiveFilters={hasActiveFilters}
              onClearAddressSearch={onClearAddressSearch}
              onClearUserLocation={onClearUserLocation}
              onClearAllFilters={onClearAllFilters}
            />
          )}
        </div>
    </div>
  );
}
