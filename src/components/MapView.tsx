import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import type L from "leaflet";
import { X } from "lucide-react";
import { MapContainer, Marker, Popup } from "react-leaflet";

import { SkeletonMapLoader } from "@/components/SkeletonLoader";
import {
  createAddressMarker,
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
import { isOpenNow } from "@/lib/opening-hours";

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
  isBrowser: boolean;
  mapReady: boolean;
  error: string | null;
  flyToAddressKey: number;
  flyToShopTarget: LatLng | null;
  flyToShopKey: number;
  flyToUserKey: number;
  fitBoundsEnabled: boolean;
  cafeMarker: L.DivIcon;
  matchaMarker: L.DivIcon;
  /** Dimmed marker variants used for places that are currently closed. */
  cafeMarkerClosed: L.DivIcon;
  matchaMarkerClosed: L.DivIcon;
  /** Close the detail panel when the map background is clicked. */
  onCloseDetail: () => void;
  /** Receive the Leaflet map instance once it's ready. */
  onMapReady: (map: L.Map) => void;
  onClearAddressSearch: () => void;
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
  isBrowser,
  mapReady,
  error,
  flyToAddressKey,
  flyToShopTarget,
  flyToShopKey,
  flyToUserKey,
  fitBoundsEnabled,
  cafeMarker,
  matchaMarker,
  cafeMarkerClosed,
  matchaMarkerClosed,
  onCloseDetail,
  onMapReady,
  onClearAddressSearch,
  onSelectShop,
  onFlyToShopArrived,
}: MapViewProps) {
  return (
    // The map is full-bleed, so it sits on a plain themed background rather than
    // the animated AuroraBackground used elsewhere: that gradient kept animating
    // (blur + blend) behind the opaque tiles where it can't be seen, stealing
    // GPU/compositor frames from panning and zooming. Removing it makes the map
    // noticeably smoother.
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
              <div className="flex items-center gap-1.5 rounded-full bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-slate-200 dark:border-zinc-700 px-3 py-1.5 shadow-lg text-xs font-medium text-[#0C4A6E] dark:text-blue-300">
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-white text-[10px] font-bold">{activeFilterCount}</span>
                <span style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                  {activeFilterCount === 1 ? 'מסנן פעיל' : 'מסננים פעילים'} · {mapShops.length} מקומות במפה
                </span>
              </div>
            </div>
          ) : (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none" role="status" aria-live="polite">
              <div className="flex items-center gap-1.5 rounded-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-slate-200 dark:border-zinc-700 px-3 py-1.5 shadow text-xs text-slate-500 dark:text-slate-400">
                <span style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                  {mapShops.length} מקומות
                </span>
              </div>
            </div>
          )}
          {/* Address clear chip — visible on map view when sidebar is closed on mobile */}
          {addressLocation && !userLocation && lastSearchedAddress && (
            <div className="absolute top-12 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2 rounded-full bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-sky-200 dark:border-sky-800 px-3 py-1.5 shadow-lg">
              <span className="text-xs text-[#0C4A6E] dark:text-blue-200 whitespace-nowrap" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                📍 {lastSearchedAddress}
              </span>
              <button
                type="button"
                onClick={onClearAddressSearch}
                aria-label="נקה חיפוש"
                className="flex items-center justify-center rounded-full p-0.5 text-slate-400 hover:text-[#0C4A6E] dark:hover:text-white transition-colors"
                title="נקה חיפוש"
              >
                <X className="h-3.5 w-3.5" />
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
                      <p className="font-semibold text-sm text-slate-700" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                        📍 המיקום שחיפשת
                      </p>
                      <p className="text-xs text-slate-500 mt-1" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
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
                      <p className="font-semibold text-sm text-slate-700" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
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
                  const open = isOpenNow(shop.hours);
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
        </div>
    </div>
  );
}
