import { useCallback, useRef, useState } from "react";
import type { CoffeeShop } from "@/lib/coffee-shop";
import { tapHaptic } from "@/lib/haptics";

interface LatLng {
  lat: number;
  lng: number;
}

interface UseMapSelectionOptions {
  /** Switch the app to the map view (selection happens on the map). */
  onActivateMap: () => void;
}

/**
 * Owns map selection and fly-to navigation: which shop is selected, whether the
 * full detail panel is open, the map-camera "fit bounds" toggle, and the
 * imperative fly-to-shop trigger consumed by MapView. Consolidates all the
 * selection write-logic (map clicks, shops-view taps, search results, preview
 * open/close) behind named methods.
 *
 * The selection state itself is read by DetailPanel, SelectionBubble and
 * useReviews — that read-coupling is inherent; this hook's value is giving the
 * scattered write-logic one tested home. The on-map preview card is anchored to
 * a fixed bottom position, so no screen coordinates are tracked here.
 */
export function useMapSelection({ onActivateMap }: UseMapSelectionOptions) {
  const [selectedShop, setSelectedShop] = useState<CoffeeShop | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [fitBoundsEnabled, setFitBoundsEnabled] = useState(true);
  const [flyToShopTarget, setFlyToShopTarget] = useState<LatLng | null>(null);
  const [flyToShopKey, setFlyToShopKey] = useState(0);
  // Shop awaiting the map's fly-to-arrival callback (set by flyToShop).
  const pendingSearchShopRef = useRef<CoffeeShop | null>(null);

  // Select a shop. From the shops view we open the detail panel directly;
  // from the map we show the bottom preview card — without moving the map.
  const selectShop = useCallback(
    (shop: CoffeeShop, fromShopsView = false) => {
      tapHaptic();
      setSelectedShop(shop);

      if (fromShopsView) {
        setDetailOpen(true);
        return;
      }

      // Show the preview card first, not the full panel. The card is anchored
      // to a fixed bottom position, so the map stays put (no disorienting jump)
      // and the card never overflows the screen — consistent every time.
      setDetailOpen(false);
      onActivateMap();
      setFitBoundsEnabled(false); // Don't re-fit the camera when selecting
    },
    [onActivateMap]
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

  // Fully dismiss the current selection (detail panel + preview card).
  const clearSelection = useCallback(() => {
    setDetailOpen(false);
    setSelectedShop(null);
  }, []);

  return {
    selectedShop,
    detailOpen,
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
