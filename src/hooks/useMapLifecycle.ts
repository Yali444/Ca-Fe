import { useEffect, useRef, useState } from "react";
import type L from "leaflet";

type ActiveView = "map" | "shops" | "about";

interface MutableRef {
  current: boolean;
}

/**
 * Claim the single throttled invalidate slot. Returns true (and marks the slot
 * busy) only when no invalidate is already in flight and at least 500ms have
 * passed since the last one — prevents overlapping invalidations during rapid
 * sidebar/view transitions.
 */
function claimInvalidateSlot(busyRef: MutableRef, lastRef: { current: number }): boolean {
  if (busyRef.current) return false;
  const now = Date.now();
  if (now - lastRef.current < 500) return false;
  lastRef.current = now;
  busyRef.current = true;
  return true;
}

/** Remeasure the Leaflet container, guarding against a detached/unmounted map. */
function invalidateMapSize(map: L.Map, busyRef: MutableRef) {
  const container = map.getContainer?.();
  if (container && document.contains(container) && typeof map.invalidateSize === "function") {
    try {
      map.invalidateSize();
    } catch (err) {
      console.error("Error invalidating map size:", err);
    }
  }
  busyRef.current = false;
}

interface UseMapLifecycleOptions {
  activeView: ActiveView;
  /** Mobile Safari needs a brief mount delay to avoid a documented crash. */
  isMobileSafari: boolean;
  sidebarCollapsed: boolean;
  sidebarOpen: boolean;
}

/**
 * Owns the Leaflet map's DOM lifecycle: the map instance handle, the
 * "ready to mount" gate (delayed on mobile Safari), and the throttled
 * invalidateSize calls that keep tiles correct after the visible area changes
 * (sidebar collapse/expand, or returning to the map view). Purely about the
 * map's mounting/sizing — it deliberately knows nothing about selection,
 * filters, or fly-to behaviour.
 */
export function useMapLifecycle({
  activeView,
  isMobileSafari,
  sidebarCollapsed,
  sidebarOpen,
}: UseMapLifecycleOptions) {
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const invalidateSizeRef = useRef(false);
  const lastInvalidateRef = useRef(0);

  // Mobile Safari needs a brief delay before mounting the map to avoid a
  // documented crash on tab switches; everywhere else we mount immediately,
  // and the gate resets whenever we leave the map view (so Safari re-delays on
  // every return). This is a genuine effect-driven sync — mapReady tracks
  // activeView plus a timer — so the synchronous setState calls are expected.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (activeView !== "map") {
      setMapReady(false);
      return;
    }
    // Don't re-trigger if already ready
    if (mapReady) return;

    if (!isMobileSafari) {
      setMapReady(true);
      return;
    }

    const timer = setTimeout(() => {
      setMapReady(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, [activeView, isMobileSafari, mapReady]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Invalidate map size when the sidebar collapses/expands so tiles load for
  // the newly visible area. Delayed slightly past the 300ms CSS transition.
  useEffect(() => {
    if (!mapInstance || activeView !== "map") return;
    if (!claimInvalidateSlot(invalidateSizeRef, lastInvalidateRef)) return;

    const timeout = setTimeout(() => invalidateMapSize(mapInstance, invalidateSizeRef), 350);
    return () => {
      clearTimeout(timeout);
      invalidateSizeRef.current = false;
    };
  }, [sidebarCollapsed, sidebarOpen, activeView, mapInstance]);

  // Remeasure when returning to the map view (next animation frame).
  useEffect(() => {
    if (!mapInstance || activeView !== "map") return;
    if (!claimInvalidateSlot(invalidateSizeRef, lastInvalidateRef)) return;

    requestAnimationFrame(() => invalidateMapSize(mapInstance, invalidateSizeRef));
  }, [activeView, mapInstance]);

  return { mapInstance, setMapInstance, mapReady };
}
