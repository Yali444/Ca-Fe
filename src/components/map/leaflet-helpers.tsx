"use client";

import React, { useEffect, useRef } from "react";
import { TileLayer, useMap } from "react-leaflet";
import { useTheme } from "next-themes";
import L from "leaflet";
import "leaflet.markercluster";
import type { CoffeeShop } from "@/lib/coffee-shop";
import { israelBounds } from "./map-icons";

// MarkerClusterGroup component for clustering markers
// This component manages the cluster group and provides context for markers
const MarkerClusterGroupContext = React.createContext<L.MarkerClusterGroup | null>(null);

export function MarkerClusterGroup({ children }: { children: React.ReactNode }) {
  const map = useMap();
  // Held in state (not a ref) so children re-render once the group is ready
  // and the context Provider value below stays a stable, React-tracked value.
  // The effect deps MUST be just [map] — putting `clusterGroup` in the deps
  // creates an infinite churn loop: each setClusterGroup triggers a re-run,
  // the cleanup removes the group from the map, then a new group is created,
  // and so on. Children's markers get added to detached groups → empty map.
  const [clusterGroup, setClusterGroup] = React.useState<L.MarkerClusterGroup | null>(null);

  React.useEffect(() => {
    const group = L.markerClusterGroup({
      maxClusterRadius: 40, // Pixels — smaller radius so dense areas (central TLV) break into clusters sooner
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      disableClusteringAtZoom: 15, // Show individual markers at zoom level 15 and above
      iconCreateFunction: function(cluster) {
        const count = cluster.getChildCount();
        let size = 'small';
        if (count > 50) {
          size = 'large';
        } else if (count > 20) {
          size = 'medium';
        }
        return L.divIcon({
          html: `<div style="
            background-color: #0ea5e9;
            color: white;
            border-radius: 50%;
            width: ${size === 'large' ? '50px' : size === 'medium' ? '40px' : '30px'};
            height: ${size === 'large' ? '50px' : size === 'medium' ? '40px' : '30px'};
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: ${size === 'large' ? '16px' : size === 'medium' ? '14px' : '12px'};
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          ">${count}</div>`,
          className: 'custom-cluster-icon',
          iconSize: L.point(size === 'large' ? 50 : size === 'medium' ? 40 : 30, size === 'large' ? 50 : size === 'medium' ? 40 : 30, true),
        });
      },
    });
    map.addLayer(group);
    setClusterGroup(group);

    return () => {
      map.removeLayer(group);
      group.clearLayers();
    };
  }, [map]);

  return (
    <MarkerClusterGroupContext.Provider value={clusterGroup}>
      {children}
    </MarkerClusterGroupContext.Provider>
  );
}

// ClusteredMarker component that adds markers to the cluster group
export function ClusteredMarker({ position, icon, eventHandlers }: {
  position: [number, number];
  icon: L.Icon | L.DivIcon;
  eventHandlers?: { click?: (e: L.LeafletMouseEvent) => void };
}) {
  const clusterGroup = React.useContext(MarkerClusterGroupContext);
  const markerRef = React.useRef<L.Marker | null>(null);
  const eventHandlersRef = React.useRef(eventHandlers);

  // Update eventHandlers ref when it changes
  React.useEffect(() => {
    eventHandlersRef.current = eventHandlers;
  }, [eventHandlers]);

  React.useEffect(() => {
    if (!clusterGroup) return;

    // Create marker if it doesn't exist
    if (!markerRef.current) {
      markerRef.current = L.marker(position, { icon });

      // Add click handler
      markerRef.current.on('click', (e) => {
        if (eventHandlersRef.current?.click) {
          eventHandlersRef.current.click(e);
        }
      });

      clusterGroup.addLayer(markerRef.current);
    } else {
      // Update marker position if it changed
      if (markerRef.current.getLatLng().lat !== position[0] || markerRef.current.getLatLng().lng !== position[1]) {
        markerRef.current.setLatLng(position);
      }
      // Update icon if it changed (by comparing icon URLs or other properties)
      if (markerRef.current.options.icon !== icon) {
        markerRef.current.setIcon(icon);
      }
    }

    return () => {
      if (markerRef.current && clusterGroup) {
        clusterGroup.removeLayer(markerRef.current);
        markerRef.current.off('click');
        markerRef.current = null;
      }
    };
  }, [clusterGroup, position, icon]);

  return null;
}

// Component to automatically fit map bounds to show all markers - runs only once on initial load
export function FitBounds({ shops, enabled }: { shops: CoffeeShop[]; enabled: boolean }) {
  const map = useMap();
  const hasRunRef = useRef(false);

  useEffect(() => {
    // Only run once: if already ran, or disabled, or no shops - skip
    if (hasRunRef.current || !enabled || shops.length === 0) return;

    const bounds = L.latLngBounds(
      shops.map((shop) => [shop.lat, shop.lng] as [number, number])
    );

    // Intersect bounds with Israel bounds instead of extending
    const constrainedBounds = L.latLngBounds(
      [
        Math.max(bounds.getSouth(), israelBounds.getSouth()),
        Math.max(bounds.getWest(), israelBounds.getWest()),
      ],
      [
        Math.min(bounds.getNorth(), israelBounds.getNorth()),
        Math.min(bounds.getEast(), israelBounds.getEast()),
      ]
    );

    // Add padding to bounds - run only once on initial load
    map.fitBounds(constrainedBounds, {
      padding: [50, 50],
      maxZoom: 19,
    });

    hasRunRef.current = true;
  }, [map, shops, enabled]);

  return null;
}

export function ThemeTileLayer() {
  const { theme, systemTheme } = useTheme();
  const resolvedTheme = theme === 'system' ? systemTheme : theme;
  const isDark = resolvedTheme === 'dark';

  return (
    <TileLayer
      url={
        isDark
          ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
          : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
      }
      attribution='&copy; OpenStreetMap contributors &copy; CARTO'
      maxZoom={19}
      // Pre-load a ring of tiles around the visible frame so panning reveals
      // already-rendered areas instead of triggering a fresh load each move.
      // keepBuffer is the radius (in tile rows/cols) kept outside the viewport;
      // the Leaflet default of 2 is what causes the off-frame "pop-in".
      keepBuffer={4}
      // Keep loading tiles continuously while panning (don't wait for the map
      // to go idle), and don't drop them mid-zoom — smoother transitions.
      updateWhenIdle={false}
      updateWhenZooming={false}
    />
  );
}

export function FlyToAddress({ location, trigger }: { location: { lat: number; lng: number } | null; trigger: number }) {
  const map = useMap();
  const lastTriggerRef = useRef(0);

  useEffect(() => {
    if (!location || trigger === 0 || trigger === lastTriggerRef.current) return;
    lastTriggerRef.current = trigger;
    map.flyTo([location.lat, location.lng], 16, { duration: 1.2 });
  }, [location, trigger, map]);

  return null;
}

export function FlyToUserLocation({ location, trigger }: { location: { lat: number; lng: number } | null; trigger: number }) {
  const map = useMap();
  const lastTriggerRef = useRef(0);

  useEffect(() => {
    if (!location || trigger === 0 || trigger === lastTriggerRef.current) return;
    lastTriggerRef.current = trigger;
    map.flyTo([location.lat, location.lng], 15, { duration: 1.1 });
  }, [location, trigger, map]);

  return null;
}

export function FlyToShop({
  target,
  trigger,
  onArrived,
}: {
  target: { lat: number; lng: number } | null;
  trigger: number;
  onArrived: () => void;
}) {
  const map = useMap();
  const lastTriggerRef = useRef(0);
  const onArrivedRef = useRef(onArrived);

  useEffect(() => {
    onArrivedRef.current = onArrived;
  }, [onArrived]);

  useEffect(() => {
    if (!target || trigger === 0 || trigger === lastTriggerRef.current) return;
    lastTriggerRef.current = trigger;
    map.flyTo([target.lat, target.lng], 17, { duration: 1.2 });
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      map.off("moveend", onEnd);
      onArrivedRef.current();
    };
    const onEnd = () => finish();
    map.on("moveend", onEnd);
    // Safety fallback in case moveend doesn't fire.
    const t = window.setTimeout(finish, 1800);
    return () => {
      map.off("moveend", onEnd);
      window.clearTimeout(t);
    };
  }, [target, trigger, map]);

  return null;
}

export function MapController({ onReady }: { onReady: (map: L.Map) => void }) {
  const map = useMap();
  const isEnforcingRef = React.useRef(false);
  const hasCalledOnReady = React.useRef(false);

  useEffect(() => {
    if (!hasCalledOnReady.current) {
      onReady(map);
      hasCalledOnReady.current = true;
    }

    map.setMaxBounds(israelBounds);

    const currentCenter = map.getCenter();
    if (!israelBounds.contains(currentCenter)) {
      map.setView([31.5, 34.75], 8);
    }

    const enforceBounds = () => {
      if (isEnforcingRef.current) return;

      const center = map.getCenter();
      if (!israelBounds.contains(center)) {
        isEnforcingRef.current = true;
        map.off('moveend', enforceBounds);

        const newCenter = israelBounds.getCenter();
        map.setView(newCenter, map.getZoom(), { animate: false });

        setTimeout(() => {
          map.on('moveend', enforceBounds);
          isEnforcingRef.current = false;
        }, 100);
      }
    };

    map.on('moveend', enforceBounds);

    return () => {
      map.off('moveend', enforceBounds);
    };
  }, [map, onReady]);

  return null;
}
