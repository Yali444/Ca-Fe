import { useCallback, useRef, useState } from "react";
import type L from "leaflet";
import type { CoffeeShop } from "@/lib/coffee-shop";

interface LatLng {
  lat: number;
  lng: number;
}

interface ScreenPoint {
  x: number;
  y: number;
}

interface UseMapSelectionOptions {
  /** The live Leaflet map, used to pan to a shop and place its bubble. */
  mapInstance: L.Map | null;
  /** Switch the app to the map view (selection happens on the map). */
  onActivateMap: () => void;
}

/**
 * Owns map selection and fly-to navigation: which shop is selected, whether the
 * full detail panel is open, where the on-map info bubble sits, the map-camera
 * "fit bounds" toggle, and the imperative fly-to-shop trigger consumed by
 * MapView. Consolidates all the selection write-logic (map clicks, shops-view
 * taps, search results, bubble open/close) behind named methods.
 *
 * The selection state itself is read by DetailPanel, SelectionBubble and
 * useReviews — that read-coupling is inherent; this hook's value is giving the
 * scattered write-logic one tested home.
 */
export function useMapSelection({ mapInstance, onActivateMap }: UseMapSelectionOptions) {
  const [selectedShop, setSelectedShop] = useState<CoffeeShop | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [bubblePosition, setBubblePosition] = useState<ScreenPoint | null>(null);
  const [fitBoundsEnabled, setFitBoundsEnabled] = useState(true);
  const [flyToShopTarget, setFlyToShopTarget] = useState<LatLng | null>(null);
  const [flyToShopKey, setFlyToShopKey] = useState(0);
  // Shop awaiting the map's fly-to-arrival callback (set by flyToShop).
  const pendingSearchShopRef = useRef<CoffeeShop | null>(null);

  // Select a shop. From the shops view we open the detail panel directly;
  // from the map we show the info bubble first (pan without changing zoom).
  const selectShop = useCallback(
    (shop: CoffeeShop, fromShopsView = false) => {
      setSelectedShop(shop);

      if (fromShopsView) {
        setDetailOpen(true);
        return;
      }

      setDetailOpen(false); // Show bubble first, not the full panel
      onActivateMap();
      setFitBoundsEnabled(false); // Don't re-fit the camera when selecting

      if (mapInstance) {
        mapInstance.panTo([shop.lat, shop.lng]);
        // Place the bubble after the short pan animation settles.
        setTimeout(() => {
          if (mapInstance) {
            const point = mapInstance.latLngToContainerPoint([shop.lat, shop.lng]);
            const mapRect = mapInstance.getContainer().getBoundingClientRect();
            setBubblePosition({
              x: mapRect.left + point.x,
              y: mapRect.top + point.y - 20, // Offset above the marker
            });
          }
        }, 300);
      } else if (typeof window !== "undefined") {
        // Fallback to viewport centre if the map isn't mounted yet.
        setBubblePosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
      }
    },
    [mapInstance, onActivateMap]
  );

  // Fly the map to a shop via the in-map trigger (zooms past the declustering
  // threshold so the individual marker is visible); selection completes in
  // resolveFlyToShop once the map reports arrival.
  const flyToShop = useCallback(
    (shop: CoffeeShop) => {
      onActivateMap();
      setFitBoundsEnabled(false);
      pendingSearchShopRef.current = shop;
      setFlyToShopTarget({ lat: shop.lat, lng: shop.lng });
      setFlyToShopKey((k) => k + 1);
    },
    [onActivateMap]
  );

  // Called by MapView when the fly-to animation arrives at the target.
  const resolveFlyToShop = useCallback(() => {
    const shop = pendingSearchShopRef.current;
    if (shop) {
      pendingSearchShopRef.current = null;
      selectShop(shop);
    }
  }, [selectShop]);

  const openDetail = useCallback(() => setDetailOpen(true), []);
  const closeDetail = useCallback(() => setDetailOpen(false), []);

  // Fully dismiss the current selection (detail panel + bubble).
  const clearSelection = useCallback(() => {
    setDetailOpen(false);
    setSelectedShop(null);
    setBubblePosition(null);
  }, []);

  return {
    selectedShop,
    detailOpen,
    bubblePosition,
    fitBoundsEnabled,
    flyToShopTarget,
    flyToShopKey,
    setFitBoundsEnabled,
    selectShop,
    flyToShop,
    resolveFlyToShop,
    openDetail,
    closeDetail,
    clearSelection,
  };
}
