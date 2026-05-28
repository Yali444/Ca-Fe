"use client";

import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Coffee,
  Leaf,
  Heart,
  Share2,
  Search,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  Navigation,
  Locate,
  Flame,
  ShoppingBag,
  LayoutGrid,
  List,
  Instagram,
  Package,
  Plus,
  Globe,
  User,
} from "lucide-react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import { createLayerComponent } from "@react-leaflet/core";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import L from "leaflet";
import "leaflet.markercluster";
import type { Review } from "@/types/roastery";
import type { Place, OpeningHours } from "@/types/place";
import { isMatchaOnlyPlace } from "@/data/matcha-only-places";
import { usePlaceData } from "@/hooks/usePlaceData";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import { useTheme } from "next-themes";
import { CasualDecorations, SnowParticles } from "@/components/ChristmasDecorations";
import { OpeningHoursDisplay } from "@/components/OpeningHoursDisplay";
import { supabase } from "@/supabaseClient";
import { isPlaceOpen, parseOpeningHoursString } from "@/lib/formatters";
import {
  formatMinutesToClock,
  getLiveOpeningStatus,
  parseRangeMinutes,
} from "@/lib/opening-hours";
import {
  MAIN_AREAS,
  MAIN_AREA_SET,
  getAreaForCity,
  type MainArea,
} from "@/lib/israel-areas";
import { SkeletonMapLoader, SkeletonCard, AppSkeleton } from "@/components/SkeletonLoader";
import { ShopCardSkeleton } from "@/components/ShopCardSkeleton";
import { getBlurPlaceholder } from "@/lib/image-utils";
import { useOfflineSupport } from "@/hooks/useOfflineSupport";
import { OfflineIndicator, OfflineBanner } from "@/components/ui/OfflineIndicator";

// Helper function to extract numeric ID for database storage
// cafe-1 → 1, matcha-xxx-yyy-abc123 → hash as number
const getNumericId = (id: string): number => {
  // Try to extract number from cafe-N format
  const cafeMatch = id.match(/^cafe-(\d+)$/);
  if (cafeMatch) {
    return parseInt(cafeMatch[1], 10);
  }
  
  // For matcha or other string IDs, create a consistent numeric hash
  // Use a large offset (1000000) to avoid collision with cafe IDs
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return 1000000 + Math.abs(hash % 1000000);
};

// Static color schemes
const blueColors = {
  primary: {
    text: "text-[#0071E3] dark:text-blue-300",
    textLight: "text-[#0071E3] dark:text-blue-200",
    gradient: "from-[#0071E3] to-[#005BB5]",
    gradientDark: "dark:from-[#3B9BFF] dark:to-[#0071E3]",
    shadow: "shadow-[#0071E3]/30",
    hoverShadow: "hover:shadow-[#0071E3]/40",
  }
};

const greenColors = {
  primary: {
    text: "text-emerald-600 dark:text-emerald-300",
    textLight: "text-emerald-700 dark:text-emerald-200",
    gradient: "from-emerald-500 to-emerald-600",
    gradientDark: "dark:from-emerald-400 dark:to-emerald-500",
    shadow: "shadow-emerald-500/30",
    hoverShadow: "hover:shadow-emerald-500/40",
  }
};

// Helper function to detect if text contains Latin/English characters
const hasLatinCharacters = (text: string): boolean => {
  return /[A-Za-z]/.test(text);
};

// Helper function to get font family based on text content
const getFontFamily = (text: string): string => {
  if (hasLatinCharacters(text)) {
    return 'var(--font-inter), "Inter", "Arial", "Helvetica", sans-serif';
  }
  return 'var(--font-aran), sans-serif';
};

// Create custom marker icon with white circular background
const createCustomIcon = (iconUrl: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: white;
        border-radius: 50%;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 3px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      ">
        <img 
          src="${iconUrl}" 
          alt="marker" 
          style="
            width: 24px;
            height: 24px;
            display: block;
          "
        />
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
  });
};

// Create custom marker icon for cafes (Coffee Glass) - Blue
const createCafeMarker = () => {
  return createCustomIcon('/images/Coffee Glass Blue.svg');
};

// Create custom marker icon for matcha (Leaf/Tea) - Green
const createMatchaMarker = () => {
  return createCustomIcon('/images/Matcha Leaf Green.svg');
};

// Create custom marker icon for roasteries (Coffee Beans)
const createRoasteryMarker = () => {
  return createCustomIcon('/images/Coffee Beans Blue.svg');
};

interface CoffeeShop {
  id: string;
  name: string;
  location: string;
  address: string | null;
  lat: number;
  lng: number;
  image: string;
  specialty: string;
  description: string;
  brewMethods?: string[];
  vibeTags: string[];
  instagram?: string;
  website?: string;
  hours?: string | OpeningHours;
  reviews: Review[];
  // Matcha-specific fields
  matchaOrigin?: string;
  milkOptions?: string;
  // Roaster/Beans flags
  isRoaster?: boolean;
  sellsBeans?: boolean;
  roasteryOnly?: boolean;
  isOnlineOnly?: boolean;
  // Type property: 'coffee', 'matcha', or 'workshops'
  type?: 'coffee' | 'matcha' | 'workshops';
  // Hidden property to exclude from display
  hidden?: boolean;
}

// Map Place (unified type) to CoffeeShop format for the component
const mapPlaceToCoffeeShop = (place: Place): CoffeeShop => {
  const location = place.city || "";

  return {
    id: place.id,
    name: place.name,
    location: location,
    address: place.address || null,
    // Coordinates are guaranteed by the upstream filter in coffeeShops; fallback is unreachable.
    lat: place.latitude ?? 0,
    lng: place.longitude ?? 0,
    image:
      place.heroImage ||
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&auto=format&fit=crop",
    specialty: "",
    description: place.description,
    brewMethods: place.brewMethods,
    vibeTags: place.vibeTags || [],
    hours: place.openingHours || undefined,
    instagram: place.instagramHandle || undefined,
    website: place.website || undefined,
    reviews: place.reviews || [],
    matchaOrigin: place.matchaOrigin,
    milkOptions: place.milkOptions,
    isRoaster: place.isRoaster,
    sellsBeans: place.sellsBeans,
    roasteryOnly: place.roasteryOnly,
    isOnlineOnly: place.isOnlineOnly,
    type: 'type' in place ? (place.type as 'coffee' | 'matcha' | 'workshops') : undefined,
    hidden: place.hidden,
  };
};

// Normalize text for fuzzy search: strip Hebrew niqqud, geresh/quotes, lowercase, collapse whitespace.
const normalizeSearchText = (s: string | null | undefined): string =>
  (s || "")
    .toLowerCase()
    .replace(/[֑-ׇ]/g, "") // Hebrew niqqud / cantillation
    .replace(/['"׳״`’]/g, "") // geresh, gershayim, quotes
    .replace(/\s+/g, " ")
    .trim();

// Score a cafe against a normalized query. Higher = better match. 0 = no match.
const scoreCafeMatch = (
  shop: { name: string; location: string; address: string | null },
  q: string
): number => {
  if (!q) return 0;
  const name = normalizeSearchText(shop.name);
  const city = normalizeSearchText(shop.location);
  const address = normalizeSearchText(shop.address);

  if (name === q) return 100;
  if (name.startsWith(q)) return 85;
  if (name.split(" ").some((w) => w.startsWith(q))) return 70;
  if (name.includes(q)) return 55;
  if (city.startsWith(q)) return 35;
  if (city.includes(q)) return 25;
  if (address.includes(q)) return 18;
  return 0;
};

// Calculate center point from all places (geographic center of all locations)
const calculateMapCenter = (shops: CoffeeShop[]): [number, number] => {
  if (shops.length === 0) return [31.7683, 35.2137]; // Default to Jerusalem

  const avgLat =
    shops.reduce((sum, shop) => sum + shop.lat, 0) / shops.length;
  const avgLng =
    shops.reduce((sum, shop) => sum + shop.lng, 0) / shops.length;

  return [avgLat, avgLng];
};

// Define Israel bounds to restrict map view - expanded bounds for better zoom in peripheral areas
const israelBounds = L.latLngBounds(
  [29.0, 34.0], // Southwest corner (south, west) - expanded bounds
  [33.5, 36.0]  // Northeast corner (north, east) - expanded bounds
);

// Group shops by area and sort by count (most cafes first)
const groupShopsByArea = (shops: CoffeeShop[]): { area: string; shops: CoffeeShop[] }[] => {
  const areaMap = new Map<string, CoffeeShop[]>();
  
  shops.forEach(shop => {
    const area = getAreaForCity(shop.location);
    const existing = areaMap.get(area) || [];
    existing.push(shop);
    areaMap.set(area, existing);
  });
  
  // Convert to array, sort shops within each group alphabetically, then sort groups by count (descending)
  return Array.from(areaMap.entries())
    .map(([area, shops]) => ({
      area,
      shops: shops.sort((a, b) => {
        const nameA = a.name || '';
        const nameB = b.name || '';
        return nameA.localeCompare(nameB, 'he');
      })
    }))
    .sort((a, b) => b.shops.length - a.shops.length);
};

const brewMethods = [
  "אספרסו",
  "פילטר",
  "קולד ברו",
];

// Define the order for brew methods
const brewMethodOrder = ["אספרסו", "פילטר", "קולד ברו"];

// Filter brew methods to only show the 3 main methods and sort them in the correct order
const filterBrewMethods = (methods: string[]): string[] => {
  const filtered = methods.filter(method => 
    method === "פילטר" || 
    method === "אספרסו" || 
    method === "קולד ברו" ||
    method === "V60" || // V60 is considered פילטר
    method === "חליטה קרה" // חליטה קרה is considered קולד ברו
  ).map(method => {
    // Normalize: V60 -> פילטר, חליטה קרה -> קולד ברו
    if (method === "V60") return "פילטר";
    if (method === "חליטה קרה") return "קולד ברו";
    return method;
  }).filter((method, index, arr) => arr.indexOf(method) === index); // Remove duplicates
  
  // Sort by the defined order
  return filtered.sort((a, b) => {
    const indexA = brewMethodOrder.indexOf(a);
    const indexB = brewMethodOrder.indexOf(b);
    return indexA - indexB;
  });
};

// MarkerClusterGroup component for clustering markers
// This component manages the cluster group and provides context for markers
const MarkerClusterGroupContext = React.createContext<L.MarkerClusterGroup | null>(null);

function MarkerClusterGroup({ children }: { children: React.ReactNode }) {
  const map = useMap();
  // Held in state (not a ref) so children re-render once the group is ready
  // and the context Provider value below stays a stable, React-tracked value
  // rather than a mutable ref read during render.
  const [clusterGroup, setClusterGroup] = React.useState<L.MarkerClusterGroup | null>(null);

  React.useEffect(() => {
    let group: L.MarkerClusterGroup | null = null;
    if (!clusterGroup) {
      group = L.markerClusterGroup({
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
    }

    return () => {
      if (group) {
        map.removeLayer(group);
        group.clearLayers();
        setClusterGroup(null);
      }
    };
  }, [map, clusterGroup]);

  return (
    <MarkerClusterGroupContext.Provider value={clusterGroup}>
      {children}
    </MarkerClusterGroupContext.Provider>
  );
}

// ClusteredMarker component that adds markers to the cluster group
function ClusteredMarker({ position, icon, eventHandlers }: { 
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
function FitBounds({ shops, enabled }: { shops: CoffeeShop[]; enabled: boolean }) {
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

type GpsStatus = "idle" | "locating" | "success" | "denied" | "unavailable" | "timeout" | "error" | "unsupported";

const createAddressMarker = () => createCustomIcon('/images/Map Pin Blue.svg');
const createUserLocationMarker = () => createCustomIcon('/images/Map Pin Light Blue.svg');
const REPORT_EMAIL = process.env.NEXT_PUBLIC_REPORT_EMAIL || "yalioz77@gmail.com";

const openGoogleMaps = (lat: number, lng: number) => {
  window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank', 'noopener,noreferrer');
};

const reportPlaceIssue = (shop: CoffeeShop) => {
  const subject = `דיווח על טעות - ${shop.name}`;
  const body = [
    "שלום,",
    `מצאתי טעות בפרטים של בית הקפה: ${shop.name}`,
    "",
    "פירוט הטעות:",
    "[הזן כאן את הטעות שנמצאה]",
    "",
    "הצעה לתיקון:",
    "[הזן כאן את המידע הנכון]",
    "",
    "תודה.",
  ].join("\n");

  window.open(
    `mailto:${encodeURIComponent(REPORT_EMAIL)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
    "_self"
  );
};

const suggestMissingPlace = () => {
  const subject = "הצעת מקום חדש ל-Ca Fe";
  window.open(
    `mailto:${encodeURIComponent(REPORT_EMAIL)}?subject=${encodeURIComponent(subject)}`,
    "_blank"
  );
};

const buildShareUrl = (shopId: string) => {
  if (typeof window === "undefined") return "";
  const base = process.env.NEXT_PUBLIC_BASE_URL || window.location.href;
  const url = new URL(base);
  url.searchParams.set("cafe", shopId);
  return url.toString();
};

function ThemeTileLayer() {
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
    />
  );
}

function FlyToAddress({ location, trigger }: { location: { lat: number; lng: number } | null; trigger: number }) {
  const map = useMap();
  const lastTriggerRef = useRef(0);

  useEffect(() => {
    if (!location || trigger === 0 || trigger === lastTriggerRef.current) return;
    lastTriggerRef.current = trigger;
    map.flyTo([location.lat, location.lng], 16, { duration: 1.2 });
  }, [location, trigger, map]);

  return null;
}

function FlyToUserLocation({ location, trigger }: { location: { lat: number; lng: number } | null; trigger: number }) {
  const map = useMap();
  const lastTriggerRef = useRef(0);

  useEffect(() => {
    if (!location || trigger === 0 || trigger === lastTriggerRef.current) return;
    lastTriggerRef.current = trigger;
    map.flyTo([location.lat, location.lng], 15, { duration: 1.1 });
  }, [location, trigger, map]);

  return null;
}

function FlyToShop({
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

function MapController({ onReady }: { onReady: (map: L.Map) => void }) {
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

// ShopCard component for displaying individual cafe cards
interface ShopCardProps {
  shop: CoffeeShop;
  favorites: string[];
  onSelectShop: (shop: CoffeeShop) => void;
  onToggleFavorite: (shopId: string) => void;
  index?: number; // Optional index for priority prop (first 6 items get priority)
}

const ShopCard = React.memo(function ShopCard({
  shop,
  favorites,
  onSelectShop,
  onToggleFavorite,
  index,
}: ShopCardProps) {
  // Theme helper: check if this is a matcha place
  const isMatcha = shop.type === 'matcha';
  const colors = isMatcha ? greenColors : blueColors;
  const liveOpeningStatus = useMemo(() => getLiveOpeningStatus(shop.hours), [shop.hours]);
  
  // Keep eager image loading minimal for faster first interaction on mobile
  const shouldPrioritize = index !== undefined && index < 2;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group interactive-card overflow-hidden rounded-2xl shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${
        isMatcha
          ? "border-2 border-emerald-400 dark:border-emerald-400 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/60 dark:to-emerald-800/40"
          : "border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
      } flex flex-col h-full`}
      role="button"
      tabIndex={0}
      onClick={() => onSelectShop(shop)}
      onKeyDown={(event) => {
        if (event.key === "Enter") onSelectShop(shop);
      }}
    >
      <div className="relative h-56 mx-1 mt-1 overflow-hidden rounded-xl">
        <Image
          src={shop.image}
          alt={shop.name}
          fill
          className="object-cover"
          sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
          priority={shouldPrioritize}
          loading={shouldPrioritize ? "eager" : "lazy"}
          blurDataURL={getBlurPlaceholder(shop.image)}
          placeholder="blur"
        />
        <LiquidButton
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleFavorite(shop.id);
          }}
          size="icon"
          className="absolute left-4 top-4 rounded-full p-2.5"
        >
          <Heart
            className={`h-5 w-5 transition-all ${
              favorites.includes(shop.id)
                ? "fill-[#0071E3] text-[#0071E3]"
                : "text-white"
            }`}
          />
        </LiquidButton>
        {/* Matcha Badge */}
        {isMatcha && (
          <div className="absolute right-4 top-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg backdrop-blur-sm border border-emerald-400/50">
            מאצ&apos;ה 🍃
          </div>
        )}
        {/* Sells Beans Badge */}
        {shop.sellsBeans && !isMatcha && (
          <div className="absolute right-4 top-4 bg-amber-500 text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg backdrop-blur-sm bg-opacity-90">
            מוכרים פולים
          </div>
        )}
        <div className="absolute bottom-0 right-0 left-0 px-3 pb-3">
          <div className={`rounded-xl px-4 py-2.5 backdrop-blur-sm border shadow-sm flex flex-col gap-1.5 ${
              isMatcha
                ? "bg-emerald-100/90 dark:bg-emerald-800/90 border-emerald-300 dark:border-emerald-500"
                : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800"
            }`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 space-y-1">
                <h3
                  className={`text-lg font-bold leading-tight transition-colors duration-300 ${
                    isMatcha
                      ? "text-emerald-800 dark:text-emerald-400"
                      : "text-[#0C4A6E] dark:text-blue-200"
                  }`}
                  style={{ fontFamily: getFontFamily(shop.name) }}
                >
                  <span className="flex items-center gap-2">
                    <span className="block truncate">{shop.name}</span>
                    {shop.sellsBeans && (
                      <span className="flex-shrink-0" title="מוכרים פולים">
                        🛍️
                      </span>
                    )}
                  </span>
                </h3>
                <p
                  className="text-xs text-[#64748B] dark:text-slate-400 flex items-center gap-1.5 flex-wrap"
                  style={{ fontFamily: "var(--font-aran), sans-serif" }}
                >
                  {shop.location}
                  {shop.isRoaster && (
                    <span title="בית קלייה">
                      <Flame
                        className="h-3.5 w-3.5 text-orange-500 dark:text-orange-400"
                      />
                    </span>
                  )}
                  {shop.sellsBeans && (
                    <span title="מכירת פולים">
                      <ShoppingBag
                        className="h-3.5 w-3.5 text-amber-700 dark:text-amber-500"
                      />
                    </span>
                  )}
                  {shop.isRoaster && (
                    <span className="bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                      קולים במקום
                    </span>
                  )}
                </p>
              </div>
              <LiquidButton
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openGoogleMaps(shop.lat, shop.lng);
                }}
                size="sm"
                className={`flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-medium text-white shadow-md transition-all hover:shadow-lg hover:scale-[1.05] opacity-100 shrink-0 ${
                  isMatcha
                    ? `bg-gradient-to-r ${colors.primary.gradient} ${colors.primary.gradientDark} ${colors.primary.shadow} ${colors.primary.hoverShadow}`
                    : `bg-gradient-to-r ${colors.primary.gradient} ${colors.primary.gradientDark} ${colors.primary.shadow} ${colors.primary.hoverShadow}`
                }`}
                title="פתח ב-Google Maps"
                style={{ fontFamily: "var(--font-aran), sans-serif" }}
              >
                <Navigation className="h-3 w-3" />
                <span>נווט</span>
              </LiquidButton>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3 flex-1 min-h-[220px]">
        {liveOpeningStatus && (
          <div className="mb-3">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${
                liveOpeningStatus.tone === "open"
                  ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200"
                  : liveOpeningStatus.tone === "soon"
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                    : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200"
              }`}
              style={{ fontFamily: "var(--font-aran), sans-serif" }}
            >
              {liveOpeningStatus.label}
            </span>
          </div>
        )}
        <p className="text-sm leading-relaxed text-[#64748B] dark:text-slate-400 line-clamp-3">
          {shop.description}
        </p>

        {/* Coffee Mode: Show brew methods */}
        {"brewMethods" in shop &&
          shop.brewMethods &&
          Array.isArray(shop.brewMethods) &&
          filterBrewMethods(shop.brewMethods).length > 0 && (
            <div className="mb-4">
              <h4
                className={`mb-2 text-xs font-semibold uppercase transition-colors duration-300 ${colors.primary.text}`}
                style={{ fontFamily: "var(--font-aran), sans-serif" }}
              >
                שיטות חליטה
              </h4>
              <div className="flex flex-wrap gap-1">
                {filterBrewMethods(shop.brewMethods).map((method) => (
                  <span
                    key={method}
                    className={`rounded-full border px-2 py-1 text-xs transition-colors duration-300 ${
                      isMatcha
                        ? "border-emerald-300 bg-emerald-100 dark:border-emerald-600 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-400"
                        : "border-slate-200 bg-slate-50 dark:border-zinc-800 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400"
                    }`}
                    style={{ fontFamily: "var(--font-aran), sans-serif" }}
                  >
                    {method}
                  </span>
                ))}
              </div>
            </div>
          )}

        {/* Matcha Mode: Show matcha origin badge */}
        {"matchaOrigin" in shop && shop.matchaOrigin && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              <span
                className="rounded-full border border-emerald-300 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-900/60 px-3 py-1 text-xs font-medium text-emerald-800 dark:text-emerald-300"
                style={{ fontFamily: "var(--font-aran), sans-serif" }}
              >
                {shop.matchaOrigin}
              </span>
            </div>
          </div>
        )}

        {/* Matcha Mode: Show milk options */}
        {"milkOptions" in shop && shop.milkOptions && (
          <div className="mb-4">
            <h4
              className={`mb-2 text-xs font-semibold uppercase transition-colors duration-300 ${colors.primary.text}`}
              style={{ fontFamily: "var(--font-aran), sans-serif" }}
            >
              אפשרויות חלב
            </h4>
            <div className="flex flex-wrap gap-1">
              {shop.milkOptions.split(",").map((option) => (
                <span
                  key={option.trim()}
                  className="rounded-full border border-emerald-200 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-900/30 px-2 py-1 text-xs text-emerald-700 dark:text-emerald-400"
                  style={{ fontFamily: "var(--font-aran), sans-serif" }}
                >
                  {option.trim()}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Opening Hours - unified display (handles both structured and string formats) */}
        {shop.hours && (
          <OpeningHoursDisplay openingHours={shop.hours} className="mb-4" />
        )}
      </div>
    </motion.div>
  );
});

ShopCard.displayName = "ShopCard";

export default function IsraelCoffeeGuide() {
  const { theme, systemTheme } = useTheme();
  
  // Offline support
  const { 
    isOnline: isOnlineStatus, 
    isOfflineMode, 
    registerServiceWorker, 
    getCachedCafeData, 
    cacheCafeData 
  } = useOfflineSupport();
  
  // Register service worker on mount (once only — registerServiceWorker is a
  // new function reference each render so must NOT be in the dep array)
  useEffect(() => {
    registerServiceWorker();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Load all places (unified approach - no mode separation)
  const { places: allPlaces, loading, error } = usePlaceData();
  
  // Transform all places to CoffeeShop format
  const coffeeShops = useMemo(() => {
    return allPlaces
      .filter((place) => {
        // Online-only places don't need coords, they're rendered in lists only
        if (place.isOnlineOnly) return true;
        // Physical places need valid (non-null, non-zero) coordinates
        return place.latitude != null && place.longitude != null && (place.latitude !== 0 || place.longitude !== 0);
      })
      .map(mapPlaceToCoffeeShop);
  }, [allPlaces]);

  // Auto-open shared cafe via ?cafe=
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const cafeId = params.get("cafe");
    if (!cafeId) return;
    const found = coffeeShops.find((shop) => shop.id === cafeId);
    if (found) {
      setSelectedShop(found);
      setDetailOpen(true);
      setActiveView("map");
    }
  }, [coffeeShops]);

  // Calculate map center based on current dataset
  const mapCenter = useMemo(() => {
    return calculateMapCenter(coffeeShops);
  }, [coffeeShops]);

  // Create markers - coffee (brown/blue) and matcha (green)
  const cafeMarker = useMemo(() => createCafeMarker(), []);
  const matchaMarker = useMemo(() => createMatchaMarker(), []);
  const roasteryMarker = useMemo(() => createRoasteryMarker(), []);

  const [selectedShop, setSelectedShop] = useState<CoffeeShop | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const shareMessageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Initialize favorites from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("favorites");
    setFavorites(saved ? JSON.parse(saved) : []);
  }, []);

  useEffect(() => {
    if (shareMessageTimeoutRef.current) {
      clearTimeout(shareMessageTimeoutRef.current);
      shareMessageTimeoutRef.current = null;
    }
    setShareMessage(null);
  }, [selectedShop]);

  useEffect(() => {
    return () => {
      if (shareMessageTimeoutRef.current) {
        clearTimeout(shareMessageTimeoutRef.current);
        shareMessageTimeoutRef.current = null;
      }
    };
  }, []);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [activeView, setActiveView] = useState<"map" | "shops" | "about">("shops");
  const [addressQuery, setAddressQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchHighlightIndex, setSearchHighlightIndex] = useState(-1);
  const [recentAddresses, setRecentAddresses] = useState<string[]>([]);
  const [lastSearchedAddress, setLastSearchedAddress] = useState("");
  const [addressSearchError, setAddressSearchError] = useState<string | null>(null);
  const [addressLocation, setAddressLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [flyToAddressKey, setFlyToAddressKey] = useState(0);
  const [flyToShopTarget, setFlyToShopTarget] = useState<{ lat: number; lng: number } | null>(null);
  const [flyToShopKey, setFlyToShopKey] = useState(0);
  const pendingSearchShopRef = useRef<CoffeeShop | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>("idle");
  const [gpsMessage, setGpsMessage] = useState<string | null>(null);
  const [flyToUserKey, setFlyToUserKey] = useState(0);
  const [selectedBrewMethods, setSelectedBrewMethods] = useState<string[]>([]);
  const [sellsBeansFilter, setSellsBeansFilter] = useState(false);
  const [favoritesFilter, setFavoritesFilter] = useState(false);
  const [showOpenNowOnly, setShowOpenNowOnly] = useState(false);
  const [noMatchaFilter, setNoMatchaFilter] = useState(false);
  const [onlineOnlyFilter, setOnlineOnlyFilter] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [shopsToDisplay, setShopsToDisplay] = useState(12);
  const [gridColumns, setGridColumns] = useState<1 | 2>(1);
  const [selectedRegionFilter, setSelectedRegionFilter] = useState<MainArea | null>(null);
  const [isMobileSafari, setIsMobileSafari] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const viewSwitchTriggeredByOnlineOnlyFilter = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("recentAddressSearches");
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as string[];
      if (Array.isArray(parsed)) {
        setRecentAddresses(parsed.slice(0, 5));
      }
    } catch {
      setRecentAddresses([]);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("recentAddressSearches", JSON.stringify(recentAddresses.slice(0, 5)));
  }, [recentAddresses]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateNetwork = () => setIsOnline(window.navigator.onLine);
    updateNetwork();
    window.addEventListener("online", updateNetwork);
    window.addEventListener("offline", updateNetwork);
    return () => {
      window.removeEventListener("online", updateNetwork);
      window.removeEventListener("offline", updateNetwork);
    };
  }, []);

  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [fitBoundsEnabled, setFitBoundsEnabled] = useState(true);
  const [bubblePosition, setBubblePosition] = useState<{ x: number; y: number } | null>(null);
  const [previousZoom, setPreviousZoom] = useState<number>(8);
  const [reviewsMap, setReviewsMap] = useState<Record<string, Review[]>>({});
  const [reviewsLoaded, setReviewsLoaded] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mounted, setMounted] = useState(false);
  const invalidateSizeRef = useRef(false);
  const lastInvalidateRef = useRef(0);
  const [gpsMessageFading, setGpsMessageFading] = useState(false);

  useEffect(() => {
    if (gpsStatus !== "success") return;

    setGpsMessageFading(false);

    const fadeTimer = setTimeout(() => {
      setGpsMessageFading(true);
    }, 2200);

    const hideTimer = setTimeout(() => {
      setGpsStatus("idle");
      setGpsMessage(null);
      setGpsMessageFading(false);
    }, 2600);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
      setGpsMessageFading(false);
    };
  }, [gpsStatus]);
  
  // Initialize reviews from Supabase and place data when mode or shops change
  useEffect(() => {
    if (typeof window === "undefined" || !detailOpen || reviewsLoaded) return;
    
    let cancelled = false;
    const fetchReviews = async () => {
      // Initialize from shop reviews first
      const initial: Record<string, Review[]> = {};
      coffeeShops.forEach((shop: CoffeeShop) => {
        initial[shop.id] = shop.reviews || [];
      });

      // Create a mapping from numeric ID to string ID for matching reviews
      const numericToStringId: Record<number, string> = {};
      coffeeShops.forEach((shop: CoffeeShop) => {
        const numericId = getNumericId(shop.id);
        numericToStringId[numericId] = shop.id;
      });

      // Fetch reviews from Supabase
      const { data, error } = await supabase
        .from('Cafe Reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && Array.isArray(data)) {
        // Merge Supabase reviews with initial reviews
        (data as Array<{ id: number | null; cafe_id: number | null; שם: string | null; דירוג: number | null; הערה: string | null; created_at: string | null }>).forEach((review) => {
          // Skip reviews with missing required fields
          if (review.cafe_id == null || review.id == null) return;
          
          // Find the matching shop ID using our mapping
          const shopId = numericToStringId[review.cafe_id];
          if (!shopId) return;
          
          const formattedReview: Review = {
            id: review.id.toString(),
            author: review.שם || 'אנונימי',
            rating: review.דירוג || 5,
            text: review.הערה || '',
            source: "Ca Fe community",
            date: review.created_at ? new Date(review.created_at).toISOString().slice(0, 10) : null,
          };
          
          if (!initial[shopId]) {
            initial[shopId] = [];
          }
          // Add if not already exists (check by id)
          if (!initial[shopId].some(r => r.id === formattedReview.id)) {
            initial[shopId].unshift(formattedReview);
          }
        });
      }

      if (!cancelled) {
        setReviewsMap(initial);
        setReviewsLoaded(true);
      }
    };

    fetchReviews();
    
    return () => {
      cancelled = true;
    };
  }, [detailOpen, reviewsLoaded]);
  const [reviewDraft, setReviewDraft] = useState<{
    name: string;
    text: string;
    rating: number;
  }>({
    name: "",
    text: "",
    rating: 5,
  });

  useEffect(() => {
    // Handle sidebar open/close based on screen size
    // Map view is now enabled on mobile Safari after performance fixes
    const isDesktop = () => window.innerWidth >= 1024;

    const handleResize = () => {
      const desktop = isDesktop();
      setIsMobile(!desktop);
      
      if (desktop) {
        setSidebarOpen(true);
        // Auto-switch to map on desktop (but not on initial mobile load)
        if (window.innerWidth >= 1024 && !isMobileSafari) {
          setActiveView("map");
        }
      } else {
        setSidebarOpen(false);
        // On mobile, keep current view - don't force shops anymore
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Prevent body scrolling when sidebar is open on mobile
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    if (sidebarOpen && window.innerWidth < 1024) {
      // Lock body scroll
      document.body.style.overflow = "hidden";
    } else {
      // Restore body scroll
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  // Handle Escape key to close sidebar
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && sidebarOpen && window.innerWidth < 1024) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [sidebarOpen]);

  // Respect reduced motion preference or small screens to trim transitions
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setPrefersReducedMotion(mq.matches);
      setReduceMotion(mq.matches || window.innerWidth < 768);
    };
    update();
    mq.addEventListener("change", update);
    window.addEventListener("resize", update);
    return () => {
      mq.removeEventListener("change", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  // Detect iOS Safari which is more likely to crash on heavy animated layers
  useEffect(() => {
    if (typeof window === "undefined") return;
    const ua = navigator.userAgent || "";
    const isIOS =
      /iP(hone|od|ad)/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isSafari =
      /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|OPiOS/.test(ua);
    setIsMobileSafari(isIOS && isSafari);
  }, []);

  // Ensure component is mounted before rendering heavy components
  // Add delay on mobile Safari to let browser stabilize
  useEffect(() => {
    if (mounted) return; // Prevent re-running
    
    if (isMobileSafari) {
      // Much longer delay on mobile Safari to prevent crashes
      // Component already delayed in page.tsx, but add extra safety here
      const timer = setTimeout(() => {
        setMounted(true);
      }, 1200);
      return () => clearTimeout(timer);
    } else {
      // Small delay even on desktop to prevent hydration issues
      const timer = setTimeout(() => {
        setMounted(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isMobileSafari, mounted]);

  // Map is now enabled on mobile Safari after data/performance fixes
  // No need to force shops view anymore


  const gridColsClass = useMemo(() => {
    switch (gridColumns) {
      case 1:
        return "grid-cols-1";
      case 2:
      default:
        return "grid-cols-2";
    }
  }, [gridColumns]);

  // Delay map rendering on mobile Safari to prevent crashes
  useEffect(() => {
    if (activeView !== "map") {
      setMapReady(false);
      return;
    }

    // Don't re-trigger if already ready
    if (mapReady) return;

    if (isMobileSafari) {
      // Longer delay on mobile Safari
      const timer = setTimeout(() => {
        setMapReady(true);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      // Short delay on desktop
      const timer = setTimeout(() => {
        setMapReady(true);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [activeView, isMobileSafari]);

  // Invalidate map size when sidebar collapses/expands to load tiles for new visible area
  useEffect(() => {
    if (!mapInstance || activeView !== "map" || invalidateSizeRef.current) return;

    // Prevent multiple simultaneous invalidations
    const now = Date.now();
    if (now - lastInvalidateRef.current < 500) return;
    lastInvalidateRef.current = now;
    invalidateSizeRef.current = true;

    // Small delay to allow CSS transition to complete
    const timeout = setTimeout(() => {
      const container = mapInstance.getContainer?.();
      // Only invalidate when the container still exists in the DOM
      if (
        container &&
        document.contains(container) &&
        typeof mapInstance.invalidateSize === "function"
      ) {
        try {
          mapInstance.invalidateSize();
        } catch (err) {
          console.error("Error invalidating map size:", err);
        }
      }
      invalidateSizeRef.current = false;
    }, 350); // Slightly longer than the 300ms transition

    return () => {
      clearTimeout(timeout);
      invalidateSizeRef.current = false;
    };
  }, [sidebarCollapsed, sidebarOpen, activeView]);

  // Ensure map is remeasured when returning to map view (only once)
  useEffect(() => {
    if (!mapInstance || activeView !== "map" || invalidateSizeRef.current) return;

    const now = Date.now();
    if (now - lastInvalidateRef.current < 500) return;
    lastInvalidateRef.current = now;
    invalidateSizeRef.current = true;

    requestAnimationFrame(() => {
      const container = mapInstance.getContainer?.();
      if (
        container &&
        document.contains(container) &&
        typeof mapInstance.invalidateSize === "function"
      ) {
        try {
          mapInstance.invalidateSize();
        } catch (err) {
          console.error("Error invalidating map size:", err);
        }
      }
      invalidateSizeRef.current = false;
    });
  }, [activeView]);

  useEffect(() => {
    localStorage.setItem("favorites", JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = useCallback((shopId: string) => {
    setFavorites((prev) => {
      if (prev.includes(shopId)) {
        return prev.filter((id) => id !== shopId);
      }
      return [...prev, shopId];
    });
  }, []);

  const handleShare = useCallback(async (shop: CoffeeShop) => {
    const url = buildShareUrl(shop.id);
    const title = shop.name;
    const text = `הנה בית קפה מומלץ: ${shop.name} (${shop.location || ""})`;

    const showMessage = (message: string) => {
      setShareMessage(message);
      if (shareMessageTimeoutRef.current) {
        clearTimeout(shareMessageTimeoutRef.current);
      }
      shareMessageTimeoutRef.current = setTimeout(() => {
        setShareMessage(null);
        shareMessageTimeoutRef.current = null;
      }, 2500);
    };

    const tryCopy = async () => {
      if (!url) throw new Error("missing share url");
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const tempInput = document.createElement("textarea");
        tempInput.value = url;
        tempInput.style.position = "fixed";
        tempInput.style.opacity = "0";
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand("copy");
        document.body.removeChild(tempInput);
      }
    };

    // Detect if mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (navigator.share && isMobile) {
      try {
        await navigator.share({ title, text, url });
        showMessage("קישור שותף בהצלחה");
        return;
      } catch (error: unknown) {
        if (error instanceof Error && error.name === "AbortError") return;
        console.error("Web Share failed", error);
        // fall through to copy on mobile if share fails
      }
    }

    // On desktop or if share fails, use clipboard
    try {
      await tryCopy();
      showMessage("קישור הועתק ללוח");
    } catch (error) {
      console.error("Copy failed", error);
      // Final fallback: prompt user to copy manually (works even without clipboard permissions)
      if (url) {
        const confirmed = window.prompt("העתק ידנית את הקישור:", url);
        if (confirmed !== null) {
          showMessage("העתק ידנית בוצע");
          return;
        }
      }
      showMessage("לא הצלחנו לשתף – נסו שוב");
    }
  }, []);

  const cycleGridColumns = useCallback(() => {
    setGridColumns((prev) => {
      return prev === 2 ? 1 : 2;
    });
  }, []);

  // Reset selection and re-fit bounds
  useEffect(() => {
    setSelectedShop(null);
    setDetailOpen(false);
    setFitBoundsEnabled(true);
  }, []);

  useEffect(() => {
    setReviewDraft({ name: "", text: "", rating: 5 });
  }, [selectedShop]);

  // Update bubble position when map moves or zooms
  // Note: Removed continuous bubble position updates to prevent jumping
// Bubble position is now only updated when a cafe is selected

  // Geocode address using OpenStreetMap Nominatim API
  const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
    if (!address.trim()) return null;

    if (!isOnline) {
      setAddressSearchError("אין חיבור לאינטרנט כרגע");
      return null;
    }

    setIsGeocoding(true);
    setAddressSearchError(null);

    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(address)}`);

      if (!response.ok) {
        throw new Error('Geocoding failed');
      }

      const data = (await response.json()) as { result?: { lat: number; lng: number } | null };

      if (data?.result) {
        const location = data.result;
        setAddressLocation(location);
        setIsGeocoding(false);
        return location;
      }

      setAddressLocation(null);
      setAddressSearchError("לא נמצאה כתובת");
      setIsGeocoding(false);
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      setAddressLocation(null);
      setAddressSearchError("שגיאה בחיפוש כתובת");
      setIsGeocoding(false);
      return null;
    }
  };

  // Live catalog matches for the unified search (cafe name / city / address).
  // Searches the full catalog (not filtered) so a name search always finds the place.
  const catalogMatches = useMemo(() => {
    const q = normalizeSearchText(addressQuery);
    if (q.length < 2) return [] as CoffeeShop[];
    return coffeeShops
      .filter((s) => !(s as { hidden?: boolean }).hidden)
      .map((s) => ({ s, score: scoreCafeMatch(s, q) }))
      .filter((x) => x.score > 0)
      .sort((a, b) =>
        b.score !== a.score ? b.score - a.score : a.s.name.length - b.s.name.length
      )
      .slice(0, 8)
      .map((x) => x.s);
  }, [addressQuery, coffeeShops]);

  // Reset keyboard highlight whenever the query changes.
  useEffect(() => {
    setSearchHighlightIndex(-1);
  }, [addressQuery]);

  // Handle Enter key press to fly to address location
  // Geocode the typed text as a street address and fly there (the address fallback).
  const runAddressSearch = async () => {
    if (!addressQuery.trim()) return;
    const location = await geocodeAddress(addressQuery);
    if (location) {
      setLastSearchedAddress(addressQuery);
      addRecentAddress(addressQuery);
      setAddressQuery("");
      setSearchFocused(false);
      setSearchHighlightIndex(-1);
      setFlyToAddressKey((prev) => prev + 1);
      setActiveView("map");
      setMobileSearchOpen(false);
      if (typeof window !== "undefined" && window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    }
  };

  const handleAddressKeyDown = async (event: React.KeyboardEvent<HTMLInputElement>) => {
    // results = catalog matches followed by the "search as address" row (index === catalogMatches.length)
    const optionCount = catalogMatches.length + 1;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (optionCount > 0) setSearchHighlightIndex((i) => (i + 1) % optionCount);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (optionCount > 0) setSearchHighlightIndex((i) => (i <= 0 ? optionCount - 1 : i - 1));
      return;
    }
    if (event.key === 'Escape') {
      setSearchFocused(false);
      setSearchHighlightIndex(-1);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (!addressQuery.trim()) return;

      // Explicit keyboard selection
      if (searchHighlightIndex >= 0) {
        if (searchHighlightIndex < catalogMatches.length) {
          handleSelectSearchResult(catalogMatches[searchHighlightIndex]);
        } else {
          await runAddressSearch();
        }
        return;
      }

      // No explicit selection: catalog-first — jump to the best cafe match if any.
      if (catalogMatches.length > 0) {
        handleSelectSearchResult(catalogMatches[0]);
        return;
      }

      // Otherwise treat it as an address.
      await runAddressSearch();
    }
  };

  const handleMobileAddressSearch = async () => {
    if (!addressQuery.trim()) return;
    // Catalog-first: a name match wins over geocoding.
    if (catalogMatches.length > 0) {
      handleSelectSearchResult(catalogMatches[0]);
      return;
    }
    await runAddressSearch();
  };

  const clearAddressSearch = () => {
    setAddressQuery("");
    setAddressLocation(null);
    setIsGeocoding(false);
    setAddressSearchError(null);
  };

  const restoreLastSearchedAddress = () => {
    if (!lastSearchedAddress.trim()) return;
    setAddressQuery(lastSearchedAddress);
    setAddressLocation(null);
    setAddressSearchError(null);
  };

  // Shared autocomplete dropdown for the unified search (desktop + mobile).
  const renderSearchDropdown = () => {
    if (!searchFocused || !addressQuery.trim()) return null;
    const addressRowIndex = catalogMatches.length;
    return (
      <div
        className="absolute z-[10050] mt-1 w-full overflow-hidden rounded-xl border border-[#BAE6FD] dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl"
        // keep focus on the input so blur doesn't close the list before the click handler runs
        onMouseDown={(e) => e.preventDefault()}
      >
        <div className="max-h-72 overflow-y-auto py-1">
          {catalogMatches.map((shop, idx) => {
            const Icon = shop.type === "matcha" ? Leaf : Coffee;
            const subtitle = [shop.location, shop.address]
              .filter((v) => v && v.trim())
              .join(" · ");
            const active = idx === searchHighlightIndex;
            return (
              <button
                key={shop.id}
                type="button"
                onClick={() => handleSelectSearchResult(shop)}
                onMouseEnter={() => setSearchHighlightIndex(idx)}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-right transition-colors ${
                  active
                    ? "bg-[#E0F2FE] dark:bg-slate-800"
                    : "hover:bg-[#F0F9FF] dark:hover:bg-slate-800/60"
                }`}
              >
                <Icon
                  className={`h-4 w-4 flex-shrink-0 ${
                    shop.type === "matcha"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-[#075985] dark:text-sky-400"
                  }`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-[#0C4A6E] dark:text-slate-100">
                    {shop.name}
                  </span>
                  {subtitle && (
                    <span className="block truncate text-[11px] text-[#64748B] dark:text-slate-400">
                      {subtitle}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => runAddressSearch()}
            onMouseEnter={() => setSearchHighlightIndex(addressRowIndex)}
            className={`flex w-full items-center gap-2.5 border-t border-slate-100 px-3 py-2 text-right transition-colors dark:border-slate-800 ${
              addressRowIndex === searchHighlightIndex
                ? "bg-[#E0F2FE] dark:bg-slate-800"
                : "hover:bg-[#F0F9FF] dark:hover:bg-slate-800/60"
            }`}
          >
            <Search className="h-4 w-4 flex-shrink-0 text-[#64748B] dark:text-slate-400" />
            <span className="min-w-0 flex-1 truncate text-sm text-[#0C4A6E] dark:text-slate-200">
              חפש כתובת:{" "}
              <span className="font-medium">&quot;{addressQuery.trim()}&quot;</span>
            </span>
          </button>
        </div>
      </div>
    );
  };

  const addRecentAddress = useCallback((query: string) => {
    const normalized = query.trim();
    if (!normalized) return;
    setRecentAddresses((prev) => [normalized, ...prev.filter((item) => item !== normalized)].slice(0, 5));
  }, []);

  // Get user's current location (one-time fetch, no continuous watching)
  const handleGetUserLocation = () => {
    if (!isOnline) {
      setGpsStatus("error");
      setGpsMessage("אין חיבור לאינטרנט כרגע");
      return;
    }

    if (!navigator.geolocation) {
      setGpsStatus("unsupported");
      setGpsMessage("הדפדפן לא תומך בשירותי מיקום");
      return;
    }

    // If location is already set, clear it (toggle off)
    if (userLocation) {
      setUserLocation(null);
      setIsLocating(false);
      setGpsStatus("idle");
      setGpsMessage(null);
      return;
    }

    setIsLocating(true);
    setGpsStatus("locating");
    setGpsMessage("מאתרים את המיקום שלך...");
    
    // Get current position once (no continuous watching)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(location);
        setFlyToUserKey(prev => prev + 1); // Trigger fly-to only once
        setIsLocating(false);
        setGpsStatus("success");
        setGpsMessage("המיקום עודכן בהצלחה");
      },
      (error) => {
        // Log error details properly
        console.error('Geolocation error:', {
          code: error.code,
          message: error.message,
          PERMISSION_DENIED: error.PERMISSION_DENIED,
          POSITION_UNAVAILABLE: error.POSITION_UNAVAILABLE,
          TIMEOUT: error.TIMEOUT,
        });
        setIsLocating(false);
        // Check error code correctly (PERMISSION_DENIED = 1)
        if (error.code === 1 || error.code === error.PERMISSION_DENIED) {
          setGpsStatus("denied");
          setGpsMessage("אין הרשאת מיקום. אפשרו הרשאה בדפדפן ונסו שוב");
        } else if (error.code === 2 || error.code === error.POSITION_UNAVAILABLE) {
          setGpsStatus("unavailable");
          setGpsMessage("המיקום לא זמין כרגע");
        } else if (error.code === 3 || error.code === error.TIMEOUT) {
          setGpsStatus("timeout");
          setGpsMessage("פג זמן החיפוש. ודאו שהמיקום פעיל ונסו שוב");
        } else {
          setGpsStatus("error");
          setGpsMessage("לא הצלחנו למצוא את המיקום שלך");
        }
      },
      {
        enableHighAccuracy: false, // Use faster network-based location
        timeout: 20000, // 20 seconds timeout
        maximumAge: 60000, // Accept cached location up to 1 minute old for faster response
      }
    );
  };

  // Calculate distance between two coordinates
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLng = (lng2 - lng1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };


  const handleSelectShop = useCallback((shop: CoffeeShop, event?: React.MouseEvent | MouseEvent, fromShopsView?: boolean) => {
    setSelectedShop(shop);
    
    // If selecting from shops view, open detail panel directly without switching to map
    if (fromShopsView) {
      setDetailOpen(true);
      return;
    }
    
    setDetailOpen(false); // Show bubble first, not the full panel
    setActiveView("map");
    setFitBoundsEnabled(false); // Disable FitBounds when selecting a shop
    
    // Smooth hover to shop without changing zoom level
    if (mapInstance) {
      const currentZoom = mapInstance.getZoom();
      mapInstance.panTo([shop.lat, shop.lng]);
      
      // Update bubble position after short pan animation
      setTimeout(() => {
        if (mapInstance) {
          const point = mapInstance.latLngToContainerPoint([shop.lat, shop.lng]);
          const mapContainer = mapInstance.getContainer();
          const mapRect = mapContainer.getBoundingClientRect();
          setBubblePosition({
            x: mapRect.left + point.x,
            y: mapRect.top + point.y - 20, // Offset above the marker
          });
        }
      }, 300); // Short wait for fast pan animation
    } else if (typeof window !== "undefined") {
      // Fallback to center if no map instance
      setBubblePosition({ 
        x: window.innerWidth / 2, 
        y: window.innerHeight / 2 
      });
    }
  }, [mapInstance]);

  const handleSelectShopFromShopsView = useCallback((shop: CoffeeShop) => {
    handleSelectShop(shop, undefined, true);
  }, [handleSelectShop]);

  // Pick a cafe from the unified search: fly the map to it (zoom past the
  // declustering threshold so the individual marker is always visible), then
  // open its info bubble.
  const handleSelectSearchResult = useCallback((shop: CoffeeShop) => {
    setAddressQuery("");
    setSearchFocused(false);
    setSearchHighlightIndex(-1);
    setAddressSearchError(null);
    setActiveView("map");
    setMobileSearchOpen(false);
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
    setFitBoundsEnabled(false);
    // Use the in-map trigger component (proven reliable, same as address fly-to).
    pendingSearchShopRef.current = shop;
    setFlyToShopTarget({ lat: shop.lat, lng: shop.lng });
    setFlyToShopKey((k) => k + 1);
  }, []);

  const handleOpenDetailPanel = () => {
    setDetailOpen(true);
    // No zoom - just open the detail panel
  };

  const toggleBrewMethod = (method: string) => {
    setSelectedBrewMethods((prev) =>
      prev.includes(method)
        ? prev.filter((m) => m !== method)
        : [...prev, method]
    );
    setFitBoundsEnabled(false); // Disable fitBounds to prevent zoom reset when toggling filter
  };

  const toggleNoMatchaFilter = () => {
    setNoMatchaFilter((prev) => !prev);
    setFitBoundsEnabled(false);
  };

  const toggleOnlineOnlyFilter = () => {
    const newValue = !onlineOnlyFilter;
    setOnlineOnlyFilter(newValue);
    setFitBoundsEnabled(false);
    if (newValue) {
      // Online-only places have no physical region, so clear region filter to avoid empty results
      setSelectedRegionFilter(null);
      // Auto-switch to shops view since online-only places don't have physical locations
      setActiveView("shops");
    }
  };

  const toggleSellsBeansFilter = () => {
    setSellsBeansFilter((prev) => !prev);
    setFitBoundsEnabled(false); // Disable fitBounds to prevent zoom reset when toggling filter
  };

  const toggleFavoritesFilter = () => {
    setFavoritesFilter((prev) => !prev);
    setFitBoundsEnabled(false); // Disable fitBounds to prevent zoom reset when toggling filter
  };

  // Calculate filtered shops - must be before useEffect that uses it
  const filteredShops = useMemo(() => {
    let shops = coffeeShops.filter((shop) => {
      // Filter by brew methods only for coffee places (those with brewMethods)
      const shopBrewMethods = 'brewMethods' in shop ? shop.brewMethods : undefined;
      const isCoffeePlace = shopBrewMethods && Array.isArray(shopBrewMethods) && shopBrewMethods.length > 0;
      
      // If no brew methods selected, show all places
      // If brew methods selected, only apply filter to coffee places
      const matchesBrew =
        selectedBrewMethods.length === 0 ||
        !isCoffeePlace ||
        selectedBrewMethods.some((method) => {
          if (method === "פילטר") {
            return shopBrewMethods.includes("פילטר") || shopBrewMethods.includes("V60");
          }
          if (method === "קולד ברו") {
            return shopBrewMethods.includes("קולד ברו") || shopBrewMethods.includes("חליטה קרה");
          }
          return shopBrewMethods.includes(method);
        });
      
      // Filter by sells beans
      const matchesSellsBeans = sellsBeansFilter ? shop.sellsBeans === true : true;

      // Filter by favorites
      const matchesFavorites = favoritesFilter ? favorites.includes(shop.id) : true;

      // Exclude roastery-only places from the list unless online-only filter is active
      // (online-only filter is specifically designed to surface those places + workshops)
      const isWorkshops = shop.type === 'workshops';
      const matchesRoasteryOnlyFilter = onlineOnlyFilter ? (shop.roasteryOnly === true || shop.isOnlineOnly === true || isWorkshops) : !shop.roasteryOnly;

      // Filter by "Open Now"
      const matchesOpenNow = showOpenNowOnly ? (isWorkshops || isPlaceOpen(shop.hours)) : true;

      // Filter by matcha exclusion
      const matchesMatchaFilter = noMatchaFilter ? shop.type !== 'matcha' : true;

      // Filter by online-only: show online-only roasteries and workshops places
      const matchesOnlineOnly = onlineOnlyFilter ? (shop.isOnlineOnly === true || isWorkshops) : true;

      // Filter by region — online-only places have no physical region so they always pass
      const matchesRegion = selectedRegionFilter === null || shop.isOnlineOnly === true || getAreaForCity(shop.location) === selectedRegionFilter;

      // Filter out hidden places
      const matchesHidden = !shop.hidden;

      return matchesBrew && matchesSellsBeans && matchesFavorites && matchesRoasteryOnlyFilter && matchesOpenNow && matchesMatchaFilter && matchesRegion && matchesHidden && matchesOnlineOnly;
    });

    // Sort by distance from user location if available
    // Otherwise, sort alphabetically by name (A-Z)
    const sortLocation = userLocation;
    if (sortLocation) {
      shops = [...shops].sort((a, b) => {
        const distanceA = calculateDistance(sortLocation.lat, sortLocation.lng, a.lat, a.lng);
        const distanceB = calculateDistance(sortLocation.lat, sortLocation.lng, b.lat, b.lng);
        return distanceA - distanceB;
      });
    } else {
      // Sort alphabetically by name (A-Z) using Hebrew locale for proper sorting
      shops = [...shops].sort((a, b) => {
        // Handle edge cases where name might be undefined or empty
        const nameA = a.name || '';
        const nameB = b.name || '';
        return nameA.localeCompare(nameB, 'he');
      });
    }

    return shops;
  }, [coffeeShops, userLocation, selectedBrewMethods, sellsBeansFilter, favoritesFilter, favorites, showOpenNowOnly, noMatchaFilter, onlineOnlyFilter, selectedRegionFilter]);

  // Physical shops only — for map rendering (online-only places have no location)
  const mapShops = useMemo(() => filteredShops.filter(s => !s.isOnlineOnly), [filteredShops]);

  // Get available regions from filtered shops (before region filter is applied, but after other filters)
  // We need to recalculate without region filter to show all available regions
  const availableRegions = useMemo<{ area: MainArea; count: number }[]>(() => {
    if (userLocation) return []; // Don't show region filters when using user location
    
    // Calculate shops with all filters except region filter
    const shopsWithoutRegionFilter = coffeeShops.filter((shop) => {
      const shopBrewMethods = 'brewMethods' in shop ? shop.brewMethods : undefined;
      const isCoffeePlace = shopBrewMethods && Array.isArray(shopBrewMethods) && shopBrewMethods.length > 0;
      const matchesBrew =
        selectedBrewMethods.length === 0 ||
        !isCoffeePlace ||
        selectedBrewMethods.some((method) => {
          if (method === "פילטר") {
            return shopBrewMethods?.includes("פילטר") || shopBrewMethods?.includes("V60");
          }
          if (method === "קולד ברו") {
            return shopBrewMethods?.includes("קולד ברו") || shopBrewMethods?.includes("חליטה קרה");
          }
          return shopBrewMethods?.includes(method);
        });
      const matchesSellsBeans = sellsBeansFilter ? shop.sellsBeans === true : true;
      const matchesFavorites = favoritesFilter ? favorites.includes(shop.id) : true;
      const isRoasteryOnly = shop.roasteryOnly === true;
      const isWorkshops = shop.type === 'workshops';
      const matchesRoasteryOnlyFilter = onlineOnlyFilter ? (isRoasteryOnly || shop.isOnlineOnly === true || isWorkshops) : !isRoasteryOnly;
      const matchesOpenNow = showOpenNowOnly ? (isWorkshops || isPlaceOpen(shop.hours)) : true;
      const matchesMatchaFilter = noMatchaFilter ? shop.type !== 'matcha' : true;
      return matchesBrew && matchesSellsBeans && matchesFavorites && matchesRoasteryOnlyFilter && matchesOpenNow && matchesMatchaFilter;
    });
    
    const regionMap = new Map<MainArea, number>();
    shopsWithoutRegionFilter.forEach((shop) => {
      const area = getAreaForCity(shop.location);
      if (area === "אחר") return;
      if (!MAIN_AREA_SET.has(area)) return; // Only include main grouped regions
      regionMap.set(area, (regionMap.get(area) || 0) + 1);
    });
    
    return Array.from(regionMap.entries())
      .map(([area, count]) => ({ area, count }))
      .sort((a, b) => b.count - a.count); // Sort by count descending
  }, [coffeeShops, selectedBrewMethods, sellsBeansFilter, favoritesFilter, favorites, showOpenNowOnly, noMatchaFilter, onlineOnlyFilter, userLocation]);

  // Group shops by area for display in shops view (when no address/user location search)
  const groupedShops = useMemo(() => {
    if (userLocation) {
      // When using user location, don't group - show sorted by distance
      return null;
    }
    return groupShopsByArea(filteredShops);
  }, [filteredShops, userLocation]);

  // Paginated versions: slice filtered shops and grouped shops based on shopsToDisplay
  const paginatedFilteredShops = useMemo(() => {
    return filteredShops.slice(0, shopsToDisplay);
  }, [filteredShops, shopsToDisplay]);

  const paginatedGroupedShops = useMemo(() => {
    if (!groupedShops) return null;
    
    // Flatten all shops from all groups, slice, then re-group
    const allShops = groupedShops.flatMap(({ shops }) => shops);
    const slicedShops = allShops.slice(0, shopsToDisplay);
    
    // Re-group the sliced shops
    return groupShopsByArea(slicedShops);
  }, [groupedShops, shopsToDisplay]);

  const groupedAreaTotalCounts = useMemo(() => {
    if (!groupedShops) return new Map<string, number>();
    return new Map(groupedShops.map(({ area, shops }) => [area, shops.length]));
  }, [groupedShops]);

  // Reset pagination when filters change
  useEffect(() => {
    setShopsToDisplay(12);
  }, [selectedBrewMethods, sellsBeansFilter, showOpenNowOnly, userLocation, selectedRegionFilter]);

  // Don't auto-close detail panel when shop changes - let user control it

  const isBrowser = typeof window !== "undefined";
  const selectedShopReviews = selectedShop
    ? reviewsMap[selectedShop.id] || []
    : [];

  const handleReviewSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedShop || !reviewDraft.name.trim() || !reviewDraft.text.trim()) return;

    const numericId = getNumericId(selectedShop.id);
    const insertData = {
      cafe_id: numericId,
      שם: reviewDraft.name.trim(),
      דירוג: reviewDraft.rating,
      הערה: reviewDraft.text.trim(),
    };
    // Save to Supabase
    const { data, error } = await supabase
      .from('Cafe Reviews')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('Error saving review:', error);
      alert('שגיאה בשמירת הביקורת: ' + error.message);
      return;
    }

    const newReview: Review = {
      id: data?.id?.toString() || `${selectedShop.id}-${Date.now()}`,
      author: reviewDraft.name.trim(),
      rating: reviewDraft.rating,
      text: reviewDraft.text.trim(),
      source: "Ca Fe community",
      date: new Date().toISOString().slice(0, 10),
    };
    setReviewsMap((prev) => {
      const existing = prev[selectedShop.id] || [];
      return { ...prev, [selectedShop.id]: [newReview, ...existing] };
    });
    setReviewDraft({ name: "", text: "", rating: 5 });
  };

  // Don't render heavy components until mounted (prevents SSR/hydration issues)
  if (!mounted) {
    return <AppSkeleton />;
  }

  // Remove mobile Safari loading delay - render immediately

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gradient-to-br from-[#E0F2FE] via-[#F0F9FF] to-[#DBEAFE] dark:bg-[#0B1120] antialiased">
      {/* Offline banner for mobile */}
      <OfflineBanner />
      
      {/* Offline indicator */}
      <OfflineIndicator />
      
      {!isOnline && (
        <div className="fixed inset-x-0 top-0 z-[10001] mx-auto w-full max-w-3xl px-4 pt-2">
          <div className="rounded-xl border border-amber-300/80 bg-amber-100/95 px-3 py-2 text-center text-xs text-amber-900 shadow-md dark:border-amber-700/60 dark:bg-amber-900/70 dark:text-amber-100">
            אין חיבור לאינטרנט כרגע — מוצגים הנתונים האחרונים שנטענו
          </div>
        </div>
      )}
      {/* Christmas Decorations - Floating elements in background */}
      {(() => {
        // Only disable if user explicitly prefers reduced motion, not just because it's mobile
        const prefersReducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        return !prefersReducedMotion && (
          <>
            <CasualDecorations />
            <SnowParticles />
          </>
        );
      })()}
      
      {/* Mobile Menu Button */}
      <LiquidButton
        onClick={() => {
          const nextOpen = !sidebarOpen;
          setSidebarOpen(nextOpen);
          if (nextOpen) {
            setDetailOpen(false);
            setSelectedShop(null);
            setBubblePosition(null);
          }
        }}
        size="icon"
        className="fixed right-6 top-4 z-[10000] rounded-lg p-3 md:hidden"
      >
        {sidebarOpen ? (
          <X className="h-5 w-5 text-[#0284C7]" />
        ) : (
          <Menu className="h-5 w-5 text-[#0284C7]" />
        )}
      </LiquidButton>

      {/* Mobile Overlay - Semi-transparent backdrop */}
      <div
        className={`fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm transition-opacity duration-300 ease-in-out md:hidden ${
          sidebarOpen 
            ? "opacity-100 visible pointer-events-auto" 
            : "opacity-0 invisible pointer-events-none"
        }`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden={!sidebarOpen}
      />

      {/* Sidebar - Always rendered, uses CSS classes for show/hide, floats above map */}
      <motion.div
        className={`fixed right-0 top-0 z-[9999] h-screen ${
          sidebarCollapsed ? "w-10" : "w-80"
        } ${sidebarCollapsed ? "bg-gradient-to-b from-white/95 via-white/90 to-white/95 dark:from-slate-900/95 dark:via-slate-900/90 dark:to-slate-900/95 backdrop-blur-md" : "bg-zinc-50 dark:bg-[#1a1a1a]"}`}
        initial={false}
        animate={{ x: isMobile && !sidebarOpen ? "100%" : "0%" }}
        transition={
          prefersReducedMotion
            ? { duration: 0 }
            : { type: "spring", stiffness: 360, damping: 34, mass: 0.9 }
        }
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          height: "100vh",
          boxShadow: sidebarCollapsed ? "0 0 10px rgba(0, 0, 0, 0.1)" : "0 0 20px rgba(0, 0, 0, 0.3)",
        }}
      >
        {sidebarCollapsed ? (
          <div className="flex h-full w-full flex-col border-l border-white/30 dark:border-slate-700/30">
            {/* Minimal collapsed header */}
            <div className="flex items-center justify-center p-2 pt-4 pb-2">
              <LiquidButton
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                size="icon"
                className="hidden md:flex rounded-lg p-1.5 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 shadow-sm hover:bg-white dark:hover:bg-slate-800 hover:shadow-md transition-all"
              >
                <ChevronLeft className="h-4 w-4 text-slate-600 dark:text-slate-300" />
              </LiquidButton>
            </div>
            {/* Minimal navigation */}
            <nav className="flex-1 flex flex-col items-center gap-3 pt-2 px-1">
              <LiquidButton
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveView("map");
                  setDetailOpen(false);
                  setSelectedShop(null);
                  setBubblePosition(null);
                  if (window.innerWidth < 768) {
                    setSidebarOpen(false);
                  }
                }}
                className={`flex items-center justify-center w-9 h-9 p-0 rounded-lg transition-all duration-200 ${
                  activeView === "map"
                    ? "opacity-100 text-[#0C4A6E] dark:text-blue-400 bg-blue-50/80 dark:bg-blue-900/30 backdrop-blur-sm border border-blue-200/50 dark:border-blue-700/50 shadow-sm"
                    : "opacity-70 text-slate-500 dark:text-slate-400 hover:opacity-100 hover:bg-slate-100/50 dark:hover:bg-slate-800/50"
                }`}
              >
                <MapPin className="h-4 w-4" />
              </LiquidButton>

              <LiquidButton
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveView("shops");
                  setDetailOpen(false);
                  setSelectedShop(null);
                  setBubblePosition(null);
                  if (window.innerWidth < 768) {
                    setSidebarOpen(false);
                  }
                }}
                className={`flex items-center justify-center w-9 h-9 p-0 rounded-lg transition-all duration-200 ${
                  activeView === "shops"
                    ? "opacity-100 text-[#0C4A6E] dark:text-blue-400 bg-blue-50/80 dark:bg-blue-900/30 backdrop-blur-sm border border-blue-200/50 dark:border-blue-700/50 shadow-sm"
                    : "opacity-70 text-slate-500 dark:text-slate-400 hover:opacity-100 hover:bg-slate-100/50 dark:hover:bg-slate-800/50"
                }`}
              >
                <Coffee className="h-4 w-4" />
              </LiquidButton>

              {/* About button pinned to bottom */}
              <LiquidButton
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveView("about");
                  setDetailOpen(false);
                  setSelectedShop(null);
                  setBubblePosition(null);
                  if (window.innerWidth < 768) {
                    setSidebarOpen(false);
                  }
                }}
                title="עליי"
                className={`mt-auto flex items-center justify-center w-9 h-9 p-0 rounded-lg transition-all duration-200 ${
                  activeView === "about"
                    ? "opacity-100 text-[#0C4A6E] dark:text-blue-400 bg-blue-50/80 dark:bg-blue-900/30 backdrop-blur-sm border border-blue-200/50 dark:border-blue-700/50 shadow-sm"
                    : "opacity-70 text-slate-500 dark:text-slate-400 hover:opacity-100 hover:bg-slate-100/50 dark:hover:bg-slate-800/50"
                }`}
              >
                <User className="h-4 w-4" />
              </LiquidButton>
            </nav>
          </div>
        ) : (
          <AuroraBackground
            className="flex h-full flex-col bg-zinc-50 dark:bg-[#1a1a1a]"
            showRadialGradient={false}
          >
            <div className="flex h-full w-full flex-col">
        {/* Header */}
        <div
          className="flex items-center justify-between border-b p-5 pr-16 md:pr-5 backdrop-blur-xl bg-white/70 dark:bg-zinc-900/70"
          style={{
            borderBottom: "1px solid rgba(0, 0, 0, 0.05)",
          }}
        >
          <div className="flex items-center">
            <Image
              src="/images/ca_fe_logo.png"
              alt="Ca Fe Logo"
              width={120}
              height={48}
              className="h-12 w-auto object-contain"
              priority
            />
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LiquidButton
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              size="icon"
              className="hidden md:flex dark:bg-slate-800/80 dark:border dark:border-white/20 rounded-xl p-1.5"
            >
              <ChevronRight className="h-4 w-4 text-[#64748B] dark:text-white" />
            </LiquidButton>
          </div>
        </div>


        {/* Address Search */}
        {!sidebarCollapsed && (
          <div className="px-3 md:px-4 py-2 md:py-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <MapPin className="pointer-events-none absolute right-2 md:right-3 top-1/2 h-3.5 md:h-4 w-3.5 md:w-4 -translate-y-1/2 text-[#075985] dark:text-slate-400" />
                {isGeocoding && (
                  <div className="absolute right-8 md:right-10 top-1/2 -translate-y-1/2">
                    <div className="skeleton h-3 w-3 rounded-full" />
                  </div>
                )}
                <input
                  type="text"
                  placeholder="חפש בית קפה או כתובת..."
                  value={addressQuery}
                  onChange={(event) => {
                    setAddressQuery(event.target.value);
                    if (addressSearchError) setAddressSearchError(null);
                  }}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => window.setTimeout(() => setSearchFocused(false), 150)}
                  onKeyDown={handleAddressKeyDown}
                  className="w-full rounded-md border border-[#BAE6FD] dark:border-slate-700 bg-[#E0F2FE] dark:bg-slate-800 py-1.5 md:py-2 pr-8 md:pr-10 pl-3 md:pl-4 text-base md:text-sm text-[#0C4A6E] dark:text-slate-200 placeholder:text-[#075985] dark:placeholder:text-slate-500 outline-none ring-[#38BDF8]/40 dark:ring-blue-400/40 transition-all duration-200 focus:border-transparent focus:ring-2"
                />
                {(addressQuery.trim() || addressLocation) && (
                  <button
                    type="button"
                    onClick={clearAddressSearch}
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#64748B] hover:text-[#0C4A6E] dark:text-slate-400 dark:hover:text-slate-200"
                    title="נקה חיפוש"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                {renderSearchDropdown()}
              </div>
            </div>
            {addressSearchError && (
              <div className="mt-2 text-[10px] md:text-xs text-red-600 dark:text-red-300" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                {addressSearchError}
              </div>
            )}
            {!addressQuery.trim() && recentAddresses.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {recentAddresses.slice(0, 4).map((recent) => (
                  <button
                    key={recent}
                    type="button"
                    onClick={() => {
                      setAddressQuery(recent);
                      setAddressSearchError(null);
                    }}
                    className="rounded-full border border-slate-200 bg-white/80 px-2.5 py-1 text-[10px] text-slate-600 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200"
                    style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                  >
                    {recent}
                  </button>
                ))}
              </div>
            )}
            {addressLocation && !addressQuery.trim() && lastSearchedAddress.trim() && (
              <button
                type="button"
                onClick={restoreLastSearchedAddress}
                className="mt-2 text-[10px] md:text-xs text-[#64748B] hover:text-[#0C4A6E] dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                style={{ fontFamily: 'var(--font-aran), sans-serif' }}
              >
                כתובת שגויה?
              </button>
            )}
            {addressLocation && (
              <div className="mt-2 text-[10px] md:text-xs text-[#075985] dark:text-blue-300">
                נמצאו {filteredShops.length} מקומות בסביבה
              </div>
            )}
          </div>
        )}

        {/* Navigation and Search Results */}
        <nav className="flex-1 overflow-y-auto px-2 md:px-3 py-2">
          <div className="space-y-1">
                <LiquidButton
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setActiveView("map");
                      // Close any open popup/detail panel when switching views
                      setDetailOpen(false);
                      setSelectedShop(null);
                      setBubblePosition(null);
                      // Close sidebar on mobile after navigation
                      if (window.innerWidth < 768) {
                        setSidebarOpen(false);
                      }
                    }}
                    className={`flex items-center transition-all duration-200 relative z-20 dark:bg-slate-800/80 dark:border dark:border-white/20 w-full gap-3 rounded-xl px-4 py-3 text-sm font-medium ${
                      activeView === "map"
                        ? "opacity-100 text-[#0C4A6E] dark:text-white"
                        : "opacity-70 text-[#64748B] dark:text-slate-50"
                    }`}
                  >
                    <MapPin className="h-5 w-5" />
                    <span>מפה</span>
                  </LiquidButton>

                <LiquidButton
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveView("shops");
                    // Close any open popup/detail panel when switching views
                    setDetailOpen(false);
                    setSelectedShop(null);
                    setBubblePosition(null);
                    // Close sidebar on mobile after navigation
                    if (window.innerWidth < 768) {
                      setSidebarOpen(false);
                    }
                  }}
                  className={`flex items-center transition-all duration-200 relative z-20 dark:bg-slate-800/80 dark:border dark:border-white/20 w-full gap-3 rounded-xl px-4 py-3 text-sm font-medium ${
                    activeView === "shops"
                      ? "opacity-100 text-[#0C4A6E] dark:text-white"
                      : "opacity-70 text-[#64748B] dark:text-slate-50"
                  }`}
                >
                  <Coffee className="h-5 w-5" />
                  <span>רשימת מקומות</span>
                </LiquidButton>
              </div>

              {/* Add Missing Place Button */}
              <div className="mt-3 px-3">
                <LiquidButton
                  type="button"
                  onClick={suggestMissingPlace}
                  size="sm"
                  className="w-full items-center justify-center gap-2 bg-[#0071E3] px-3 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-[#0062c4] rounded-xl"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>הוספת מקום חסר</span>
                </LiquidButton>
              </div>

              <div className="mt-6 mb-3 px-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#64748B] dark:text-slate-100">
                  מסננים
                </h3>
              </div>

              <div className="space-y-2 px-3">
                {/* ── Main filters — all full-width, icon always first (RTL: right side) ── */}
                {[
                  {
                    onClick: toggleFavoritesFilter,
                    active: favoritesFilter,
                    activeClass: `bg-gradient-to-r ${blueColors.primary.gradient} ${blueColors.primary.gradientDark} text-white shadow-md`,
                    icon: <Heart className={`h-3.5 w-3.5 shrink-0 ${favoritesFilter ? 'fill-white' : ''}`} />,
                    label: 'מועדפים',
                    badge: favorites.length > 0 ? favorites.length : null,
                  },
                  {
                    onClick: toggleSellsBeansFilter,
                    active: sellsBeansFilter,
                    activeClass: `bg-gradient-to-r ${blueColors.primary.gradient} ${blueColors.primary.gradientDark} text-white shadow-md`,
                    icon: <Package className="h-3.5 w-3.5 shrink-0" />,
                    label: 'מוכרים פולים',
                    badge: null,
                  },
                  {
                    onClick: toggleNoMatchaFilter,
                    active: noMatchaFilter,
                    activeClass: 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md',
                    icon: <span className="text-sm leading-none shrink-0">🍃</span>,
                    label: "ללא מאצ'ה",
                    badge: null,
                  },
                  {
                    onClick: toggleOnlineOnlyFilter,
                    active: onlineOnlyFilter,
                    activeClass: 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md',
                    icon: <span className="text-sm leading-none shrink-0">📦</span>,
                    label: 'חנות אינטרנטית',
                    badge: null,
                  },
                ].map(({ onClick, active, activeClass, icon, label, badge }) => (
                  <LiquidButton
                    key={label}
                    type="button"
                    onClick={onClick}
                    size="sm"
                    className={`w-full flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 dark:border dark:border-white/20 ${
                      active ? activeClass : 'text-[#64748B] dark:text-slate-50 dark:bg-slate-800/80'
                    }`}
                  >
                    {icon}
                    <span>{label}</span>
                    {badge !== null && (
                      <span className="mr-auto rounded-full bg-white/20 px-1.5 py-0.5 text-xs">
                        {badge}
                      </span>
                    )}
                  </LiquidButton>
                ))}

                {/* ── Brew methods — equal-width chips in a row ── */}
                <div className="pt-3 border-t border-slate-200/60 dark:border-slate-700/50">
                  <p className="mb-2 text-xs text-[#64748B] dark:text-slate-400">שיטת הכנה</p>
                  <div className="flex gap-2">
                    {brewMethods.map((method) => (
                      <LiquidButton
                        key={method}
                        type="button"
                        onClick={() => toggleBrewMethod(method)}
                        size="sm"
                        className={`flex-1 rounded-full px-2 py-2 text-xs font-medium text-center transition-all duration-200 dark:border dark:border-white/20 ${
                          selectedBrewMethods.includes(method)
                            ? `bg-gradient-to-r ${blueColors.primary.gradient} ${blueColors.primary.gradientDark} text-white shadow-md`
                            : 'text-[#64748B] dark:text-slate-50 dark:bg-slate-800/80'
                        }`}
                      >
                        {method}
                      </LiquidButton>
                    ))}
                  </div>
                </div>
              </div>
        </nav>

          {/* About button — above Favorites */}
          <div className="border-t border-[#BAE6FD] dark:border-slate-800 p-3">
            <LiquidButton
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActiveView("about");
                setDetailOpen(false);
                setSelectedShop(null);
                setBubblePosition(null);
                if (window.innerWidth < 768) {
                  setSidebarOpen(false);
                }
              }}
              className={`flex items-center transition-all duration-200 relative z-20 w-full gap-3 rounded-xl px-4 py-3 text-sm font-medium ${
                activeView === "about"
                  ? "opacity-100 text-[#0C4A6E] dark:text-white dark:bg-slate-800/80 dark:border dark:border-white/20"
                  : "opacity-70 text-[#64748B] dark:text-slate-50 dark:bg-slate-800/80 dark:border dark:border-white/20"
              }`}
            >
              <User className="h-5 w-5" />
              <span>עליי</span>
            </LiquidButton>
          </div>

          {/* Favorites Section */}
          <div className="bg-[#E0F2FE] dark:bg-slate-900 border-t border-[#BAE6FD] dark:border-slate-800 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-[#0C4A6E] dark:text-slate-200">
                מועדפים
              </span>
              <span className="text-xs text-[#64748B] dark:text-slate-400">
                {favorites.length} שמורים
              </span>
            </div>
          </div>

          </div>
        </AuroraBackground>
        )}
      </motion.div>

      {/* Main Content */}
      <div 
        className={`relative flex-1 min-w-0 overflow-x-hidden overflow-y-auto transition-all duration-300 ${
          isMobile 
            ? 'w-full' // On mobile, sidebar overlays, so no margin needed, use full width
            : sidebarCollapsed 
              ? 'mr-10' // 40px for collapsed sidebar
              : 'mr-80'  // 320px for expanded sidebar
        }`}
        style={{
          width: isMobile ? '100%' : undefined,
          maxWidth: isMobile 
            ? '100%' 
            : sidebarCollapsed 
              ? 'calc(100% - 2.5rem)' // 100% - 40px
              : 'calc(100% - 20rem)' // 100% - 320px
        }}
      >
        {activeView === "map" && (
          <div className="relative h-full w-full">
            <AuroraBackground className="h-full w-full p-0">
              <div
                className="relative h-full w-full"
                onClick={(e) => {
                  // Only close if clicking directly on the map background, not on popups or cards
                  if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('leaflet-container')) {
                    setDetailOpen(false);
                    setSelectedShop(null);
                  }
                }}
              >
                {/* Active filter indicator overlay */}
                {(() => {
                  const activeCount = [
                    selectedBrewMethods.length > 0,
                    sellsBeansFilter,
                    favoritesFilter,
                    showOpenNowOnly,
                    noMatchaFilter,
                    onlineOnlyFilter,
                    selectedRegionFilter !== null,
                  ].filter(Boolean).length;
                  return activeCount > 0 ? (
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
                      <div className="flex items-center gap-1.5 rounded-full bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-slate-200 dark:border-zinc-700 px-3 py-1.5 shadow-lg text-xs font-medium text-[#0C4A6E] dark:text-blue-300">
                        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-white text-[10px] font-bold">{activeCount}</span>
                        <span style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                          {activeCount === 1 ? 'מסנן פעיל' : 'מסננים פעילים'} · {mapShops.length} מקומות במפה
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
                      <div className="flex items-center gap-1.5 rounded-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-slate-200 dark:border-zinc-700 px-3 py-1.5 shadow text-xs text-slate-500 dark:text-slate-400">
                        <span style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                          {mapShops.length} מקומות
                        </span>
                      </div>
                    </div>
                  );
                })()}
                {/* Address clear chip — visible on map view when sidebar is closed on mobile */}
                {addressLocation && !userLocation && lastSearchedAddress && (
                  <div className="absolute top-12 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2 rounded-full bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-sky-200 dark:border-sky-800 px-3 py-1.5 shadow-lg">
                    <span className="text-xs text-[#0C4A6E] dark:text-blue-200 whitespace-nowrap" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                      📍 {lastSearchedAddress}
                    </span>
                    <button
                      type="button"
                      onClick={clearAddressSearch}
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
                    maxBoundsViscosity={1.0}
                    className="h-full w-full theme-map-container"
                    scrollWheelZoom={true}
                    key="main-map"
                  >
                    <MapController onReady={setMapInstance} />
                    <ThemeTileLayer />
                    <FlyToAddress location={addressLocation} trigger={flyToAddressKey} />
                    <FlyToShop
                      target={flyToShopTarget}
                      trigger={flyToShopKey}
                      onArrived={() => {
                        const s = pendingSearchShopRef.current;
                        if (s) {
                          pendingSearchShopRef.current = null;
                          handleSelectShop(s);
                        }
                      }}
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
                        // Determine marker icon based on type property
                        // Check the type property: 'matcha' = green, 'coffee' = brown/blue
                        const isRoastery = shop.id === "canopy-jerusalem";
                        
                        let markerIcon;
                        if (isRoastery) {
                          markerIcon = roasteryMarker;
                        } else if (shop.type === 'matcha') {
                          markerIcon = matchaMarker; // Green icon for matcha
                        } else {
                          markerIcon = cafeMarker; // Brown/blue icon for coffee
                        }
                        
                        return (
                          <ClusteredMarker
                            key={shop.id}
                            position={[shop.lat, shop.lng]}
                            icon={markerIcon}
                            eventHandlers={{
                              click: (e) => {
                                // Get the original browser event from Leaflet
                                const originalEvent = e.originalEvent as MouseEvent;
                                handleSelectShop(shop, originalEvent);
                              },
                            }}
                          />
                        );
                      })}
                    </MarkerClusterGroup>
                  </MapContainer>
                )}
              </div>
            </AuroraBackground>
          </div>
        )}

        {/* Full detail panel - shown when detailOpen is true (works in both map and shops view) */}
        {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {selectedShop && detailOpen && (() => {
            const isDetailMatcha = selectedShop.type === 'matcha';
            return (
              <>
                {/* Full-screen backdrop with blur */}
                <motion.div
                  key="detail-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                  onClick={() => setDetailOpen(false)}
                  className="fixed inset-0 z-[9998] backdrop-blur-xl backdrop-saturate-[1.2] bg-black/30"
                  style={{ WebkitBackdropFilter: 'blur(24px) saturate(1.2)' }}
                />
                <motion.div
                  key="detail-panel"
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.95 }}
                  transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                  onClick={(e) => e.stopPropagation()}
                  className={`fixed left-1/2 top-1/2 z-[9999] ${isMobile ? 'w-[calc(100%-32px)] max-w-lg' : 'w-[calc(100%-32px)] max-w-xl'} -translate-x-1/2 -translate-y-1/2 max-h-[85vh] overflow-y-auto overscroll-contain rounded-3xl border-2 shadow-2xl ${
                    isDetailMatcha
                      ? "border-emerald-200 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-950"
                      : "border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                  }`}
                  style={{
                    fontFamily: 'var(--font-aran), var(--font-timeburner), sans-serif',
                    touchAction: 'pan-y',
                    ...(isMobile && {
                      paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
                    }),
                  }}
                >
                <div className="relative">
                  <div className="relative h-48 overflow-hidden rounded-t-3xl">
                    <Image
                      src={selectedShop.image}
                      alt={selectedShop.name}
                      fill
                      className="object-cover pointer-events-none"
                      sizes="(min-width: 1024px) 420px, 100vw"
                      priority
                    />
                  </div>
                  {/* Action buttons — outside overflow-hidden, top-left of hero */}
                  <div className="absolute top-3 left-4 flex gap-2 z-10">
                    <LiquidButton
                      type="button"
                      onClick={() => toggleFavorite(selectedShop.id)}
                      size="icon"
                      className={`rounded-full p-2.5 backdrop-blur-sm shadow-lg transition-transform hover:scale-105 ${
                        isDetailMatcha
                          ? "bg-[#0071E3]/90 border border-[#0071E3]/50"
                          : "bg-blue-500/90 border border-blue-400/50"
                      }`}
                    >
                      <Heart
                        className={`h-5 w-5 transition-all ${
                          favorites.includes(selectedShop.id)
                            ? "fill-white text-white"
                            : "text-white"
                        }`}
                      />
                    </LiquidButton>
                    <LiquidButton
                      type="button"
                      onClick={() => handleShare(selectedShop)}
                      size="icon"
                      className={`rounded-full p-2.5 backdrop-blur-sm shadow-lg transition-transform hover:scale-105 ${
                        isDetailMatcha
                          ? "bg-[#0071E3]/90 border border-[#0071E3]/50"
                          : "bg-blue-500/90 border border-blue-400/50"
                      }`}
                      title="שתף בית קפה"
                    >
                      <Share2 className="h-5 w-5 text-white" />
                    </LiquidButton>
                    {selectedShop.instagram && (
                      <LiquidButton
                        type="button"
                        onClick={() => {
                          const instagramUrl = `https://instagram.com/${selectedShop.instagram?.replace('@', '')}`;
                          window.open(instagramUrl, '_blank');
                        }}
                        size="icon"
                        className={`rounded-full p-2.5 backdrop-blur-sm shadow-lg transition-transform hover:scale-105 ${
                          isDetailMatcha
                            ? "bg-[#0071E3]/90 border border-[#0071E3]/50"
                            : "bg-blue-500/90 border border-blue-400/50"
                        }`}
                        title="פתח אינסטגרם"
                      >
                        <Instagram className="h-5 w-5 text-white" />
                      </LiquidButton>
                    )}
                    {selectedShop.website && (
                      <LiquidButton
                        type="button"
                        onClick={() => {
                          if (selectedShop.website) {
                            window.open(selectedShop.website, '_blank');
                          }
                        }}
                        size="icon"
                        className={`rounded-full p-2.5 backdrop-blur-sm shadow-lg transition-transform hover:scale-105 ${
                          isDetailMatcha
                            ? "bg-[#0071E3]/90 border border-[#0071E3]/50"
                            : "bg-blue-500/90 border border-blue-400/50"
                        }`}
                        title="פתח אתר"
                      >
                        <Globe className="h-5 w-5 text-white" />
                      </LiquidButton>
                    )}
                  </div>
                  {/* Close button — top-right */}
                  <div className="absolute top-3 right-4 z-10">
                    <LiquidButton
                      type="button"
                      onClick={() => setDetailOpen(false)}
                      size="icon"
                      className="rounded-full p-2.5 backdrop-blur-sm shadow-lg transition-transform hover:scale-105 bg-red-500/90 border border-red-400/50"
                      title="סגור"
                    >
                      <X className="h-5 w-5 text-white" />
                    </LiquidButton>
                  </div>
                </div>
                
                {/* Scrollable content area */}
                <div className="p-6 space-y-6" style={{ fontFamily: 'var(--font-aran), var(--font-timeburner), sans-serif' }}>
                  {shareMessage && (
                    <div className={`text-center text-xs font-medium rounded-full px-3 py-2 inline-flex items-center justify-center shadow-sm ${
                      isDetailMatcha
                        ? "bg-emerald-100/90 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-700"
                        : "bg-blue-50/90 text-blue-800 border border-blue-200 dark:bg-slate-800/70 dark:text-slate-100 dark:border-slate-700"
                    }`}>
                      {shareMessage}
                    </div>
                  )}
                  <div>
                    <h3 className={`text-2xl font-bold transition-colors duration-300 ${
                      isDetailMatcha
                        ? "text-emerald-800 dark:text-emerald-400"
                        : "text-slate-900 dark:text-slate-100"
                    }`} style={{ fontFamily: getFontFamily(selectedShop.name) }}>
                      {selectedShop.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <p className={`text-sm ${
                        isDetailMatcha
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-slate-600 dark:text-zinc-400"
                      }`} style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                        {selectedShop.location}
                      </p>
                      <LiquidButton
                        type="button"
                        onClick={() => openGoogleMaps(selectedShop.lat, selectedShop.lng)}
                        size="sm"
                        className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-medium text-white shadow-lg transition-all hover:shadow-xl hover:scale-[1.02] opacity-100 ${
                          isDetailMatcha
                            ? "bg-[#0071E3] hover:bg-[#005BB5] shadow-[#0071E3]/50 hover:shadow-[#0071E3]/75"
                            : `bg-gradient-to-r ${blueColors.primary.gradient} ${blueColors.primary.gradientDark} ${blueColors.primary.shadow} ${blueColors.primary.hoverShadow}`
                        }`}
                        title="פתח ב-Google Maps"
                        style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                      >
                        <Navigation className="h-3 w-3" />
                        <span>נווט</span>
                      </LiquidButton>
                      <LiquidButton
                        type="button"
                        onClick={() => reportPlaceIssue(selectedShop)}
                        size="sm"
                        className="rounded-xl bg-[#0071E3] px-3 py-1.5 text-xs text-white shadow-sm transition-colors hover:bg-[#0062c4]"
                        style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                      >
                        דווח טעות
                      </LiquidButton>
                    </div>
                    {selectedShop.address && (
                      <p className={`text-xs mt-1 ${
                        isDetailMatcha
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-slate-600 dark:text-zinc-400"
                      }`} style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                        {selectedShop.address}
                      </p>
                    )}
                  </div>

                  <p className={`text-sm leading-relaxed ${
                    isDetailMatcha
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-slate-600 dark:text-zinc-400"
                  }`} style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                    {selectedShop.description}
                  </p>

                  {/* Opening Hours - unified display (handles both structured and string formats) */}
                  {selectedShop.hours && (
                    <OpeningHoursDisplay openingHours={selectedShop.hours} className="mb-4" />
                  )}

                  {/* Coffee Mode: Show brew methods - type-safe check */}
                  {'brewMethods' in selectedShop && selectedShop.brewMethods && Array.isArray(selectedShop.brewMethods) && filterBrewMethods(selectedShop.brewMethods).length > 0 && (
                    <div>
                      <h4 className={`mb-2 text-xs font-semibold uppercase transition-colors duration-300 ${blueColors.primary.text}`} style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                        שיטות חליטה מועדפות
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {filterBrewMethods(selectedShop.brewMethods).map((method) => (
                          <span
                            key={method}
                            className={`rounded-full border px-3 py-1 text-xs transition-colors duration-300 ${
                              isDetailMatcha
                                ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                                : "border-slate-200 bg-slate-50 dark:border-zinc-800 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400"
                            }`}
                            style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                          >
                            {method}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Matcha Mode: Show matcha origin and milk options - type-safe checks */}
                  {('matchaOrigin' in selectedShop || 'milkOptions' in selectedShop) && (
                    <div className="space-y-4">
                      {'matchaOrigin' in selectedShop && selectedShop.matchaOrigin && (
                        <div>
                          <h4 className={`mb-2 text-xs font-semibold uppercase transition-colors duration-300 ${blueColors.primary.text}`} style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                            מקור המאצ&apos;ה
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            <span
                              className="rounded-full border border-emerald-300 bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-900/50 px-4 py-1.5 text-sm font-medium text-emerald-800 dark:text-emerald-200"
                              style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                            >
                              {selectedShop.matchaOrigin}
                            </span>
                          </div>
                        </div>
                      )}
                      {'milkOptions' in selectedShop && selectedShop.milkOptions && (
                        <div>
                          <h4 className={`mb-2 text-xs font-semibold uppercase transition-colors duration-300 ${blueColors.primary.text}`} style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                            אפשרויות חלב
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {selectedShop.milkOptions.split(",").map((option) => (
                              <span
                                key={option.trim()}
                                className="rounded-full border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/30 px-3 py-1 text-xs text-emerald-700 dark:text-emerald-300"
                                style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                              >
                                {option.trim()}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedShop.vibeTags.length > 0 && (
                    <div>
                      <h4 className="mb-2 text-xs font-semibold uppercase text-[#075985] dark:text-blue-300" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                        אווירה
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedShop.vibeTags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-[#fff] dark:bg-slate-800 px-3 py-1 text-xs text-[#075985] dark:text-blue-300"
                            style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-[#0C4A6E] dark:text-slate-200" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                        ביקורות מהשטח
                      </h4>
                      <span className="text-xs text-[#64748B] dark:text-slate-400" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                        {selectedShopReviews.length} ביקורות
                      </span>
                    </div>
                    <div className="glass max-h-40 space-y-3 overflow-y-auto rounded-xl p-3">
                      {selectedShopReviews.length === 0 ? (
                        <p className="text-sm text-[#64748B] dark:text-slate-400" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                          עדיין אין ביקורות. היו הראשונים לשתף חוויית קפה.
                        </p>
                      ) : (
                        selectedShopReviews.map((review) => (
                          <div
                            key={review.id}
                            className="glass-button rounded-xl p-3 text-sm text-[#0C4A6E] dark:text-slate-200"
                            style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                                {review.author}
                              </span>
                              <span className="text-xs text-[#64748B] dark:text-slate-400" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                                ⭐ {review.rating}/5
                              </span>
                            </div>
                            <p className="mt-2 text-[#64748B] dark:text-slate-400" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>{review.text}</p>
                            {review.source && (
                              <span className="mt-2 block text-xs text-[#38BDF8]" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                                {review.source}
                              </span>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <form
                    className="glass space-y-3 rounded-2xl border border-dashed border-white/30 p-4"
                    onSubmit={handleReviewSubmit}
                    style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                  >
                    <h4 className="text-sm font-semibold text-[#0C4A6E] dark:text-slate-200" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                      השאירו ביקורת משלכם
                    </h4>
                    <div>
                      <label className="mb-1 block text-xs text-[#64748B] dark:text-slate-400" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                        שם פרטי
                      </label>
                      <input
                        type="text"
                        className="glass-input w-full rounded-xl px-4 py-2.5 text-sm text-[#0C4A6E] dark:text-slate-200 outline-none transition-all"
                        style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                        value={reviewDraft.name}
                        onChange={(event) =>
                          setReviewDraft((prev) => ({
                            ...prev,
                            name: event.target.value,
                          }))
                        }
                        placeholder="איך נציג אותך?"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-[#64748B] dark:text-slate-400" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                        דירוג
                      </label>
                      <select
                        className="w-full rounded-lg border border-[#BAE6FD] dark:border-slate-700 bg-white/80 dark:bg-slate-800 px-3 py-2 text-sm text-[#0C4A6E] dark:text-slate-200 focus:border-[#38BDF8] dark:focus:border-blue-400 focus:outline-none"
                        style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                        value={reviewDraft.rating}
                        onChange={(event) =>
                          setReviewDraft((prev) => ({
                            ...prev,
                            rating: Number(event.target.value),
                          }))
                        }
                      >
                        {[5, 4, 3, 2, 1].map((value) => (
                          <option key={value} value={value}>
                            {value} ⭐
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-[#64748B] dark:text-slate-400" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                        טקסט חופשי
                      </label>
                      <textarea
                        className="glass-input h-20 w-full rounded-xl px-4 py-2.5 text-sm text-[#0C4A6E] dark:text-slate-200 outline-none transition-all resize-none"
                        style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                        value={reviewDraft.text}
                        onChange={(event) =>
                          setReviewDraft((prev) => ({
                            ...prev,
                            text: event.target.value,
                          }))
                        }
                        placeholder="מה אהבתם בקפה, בשירות או באווירה?"
                      />
                    </div>
                    <LiquidButton
                      type="submit"
                      size="lg"
                      className={`w-full rounded-xl bg-gradient-to-r ${blueColors.primary.gradient} ${blueColors.primary.gradientDark} py-3 text-white shadow-lg ${blueColors.primary.shadow} transition-all hover:shadow-xl ${blueColors.primary.hoverShadow} hover:scale-[1.02]`}
                      style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                    >
                      שמור ביקורת
                    </LiquidButton>
                  </form>
                </div>
              </motion.div>
              </>
            );
          })()}
        </AnimatePresence>,
        document.body
        )}

        {activeView === "shops" && (
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
                            onClick={clearAddressSearch}
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
                        <div className="flex w-max snap-x snap-proximity justify-start gap-3 pb-1 pr-14 md:pr-3 after:block after:w-0 after:flex-shrink-0 after:content-[''] after:md:w-16">
                          <LiquidButton
                            type="button"
                            onClick={() => {
                              setSelectedRegionFilter(null);
                              setFitBoundsEnabled(false); // Disable fitBounds to prevent zoom reset when toggling filter
                            }}
                            size="sm"
                            className={`shrink-0 snap-start whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 dark:border dark:border-white/20 ${
                              selectedRegionFilter === null
                                ? `bg-gradient-to-r ${blueColors.primary.gradient} ${blueColors.primary.gradientDark} text-white shadow-md`
                                : "text-[#64748B] dark:text-slate-50 dark:bg-slate-800/80"
                            }`}
                            style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                          >
                            הכל ({availableRegions.reduce((sum, r) => sum + r.count, 0)})
                          </LiquidButton>
                          {availableRegions.map(({ area, count }) => (
                            <LiquidButton
                              key={area}
                              type="button"
                              onClick={() => {
                                setSelectedRegionFilter(area);
                                setFitBoundsEnabled(false); // Disable fitBounds to prevent zoom reset when toggling filter
                              }}
                              size="sm"
                              className={`shrink-0 snap-start whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 dark:border dark:border-white/20 ${
                                selectedRegionFilter === area
                                  ? `bg-gradient-to-r ${blueColors.primary.gradient} ${blueColors.primary.gradientDark} text-white shadow-md`
                                  : "text-[#64748B] dark:text-slate-50 dark:bg-slate-800/80"
                              }`}
                              style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                            >
                              {area} ({count})
                            </LiquidButton>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Grouped by area when no address search */}
                    {paginatedGroupedShops && paginatedGroupedShops.length > 0 ? (
                      <div className="space-y-8">
                        {paginatedGroupedShops.map(({ area, shops }) => (
                          <div key={area} className="snap-start">
                            {/* Area Header */}
                            <div className="mb-4 flex items-center gap-3 flex-wrap">
                              <h2
                                className="text-xl font-bold text-[#0C4A6E] dark:text-blue-200 transition-colors duration-300"
                                style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                              >
                                {area}
                              </h2>
                              <span
                                className="rounded-full bg-[#DBEAFE] dark:bg-slate-800 px-3 py-1 text-sm font-medium text-[#0284C7] dark:text-blue-300"
                                style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                              >
                                {groupedAreaTotalCounts.get(area) ?? shops.length} מקומות
                              </span>
                              <button
                                type="button"
                                onClick={toggleOnlineOnlyFilter}
                                title="חנות אינטרנטית"
                                aria-pressed={onlineOnlyFilter}
                                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-colors duration-200 shadow-sm ${
                                  onlineOnlyFilter
                                    ? "bg-[#0284C7] text-white hover:bg-[#0369A1]"
                                    : "bg-[#DBEAFE] text-[#0284C7] hover:bg-[#BFDBFE] dark:bg-slate-800 dark:text-blue-300 dark:hover:bg-slate-700"
                                }`}
                                style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                              >
                                <span>אונליין בלבד</span>
                                <span aria-hidden>📦</span>
                              </button>
                            </div>
                            {/* Shops Grid */}
                            <div className={`grid ${gridColsClass} gap-6 md:grid-cols-2 lg:grid-cols-3 w-full`}>
                              {shops.map((shop, index) => (
                                <div key={shop.id} className="snap-start">
                                  <ShopCard
                                    shop={shop}
                                    favorites={favorites}
                                    onSelectShop={handleSelectShopFromShopsView}
                                    onToggleFavorite={toggleFavorite}
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
                              onClick={() => setShopsToDisplay(prev => prev + 12)}
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
                                className="rounded-full px-3 py-1 text-sm font-medium bg-[#DBEAFE] dark:bg-slate-800 text-[#0284C7] dark:text-blue-300"
                                style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                              >
                                {filteredShops.length} מקומות
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setUserLocation(null)}
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
                                  onSelectShop={handleSelectShopFromShopsView}
                                  onToggleFavorite={toggleFavorite}
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
                              onClick={() => setShopsToDisplay(prev => prev + 12)}
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
      )}

      {/* About Me Page */}
      {activeView === "about" && (
        <AuroraBackground className="h-full w-full overflow-y-auto">
          <div className="flex min-h-full items-start justify-center px-4 pt-6 pb-32 md:py-12" dir="rtl">
            <div className="w-full max-w-2xl">
              {/* Profile card */}
              <div className="rounded-3xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-slate-200/60 dark:border-zinc-700/60 shadow-2xl p-5 md:p-8 mb-6" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                {/* Avatar + name */}
                <div className="flex flex-col items-center gap-4 mb-8">
                  {/* Profile photo — replace /images/profile.jpg with the uploaded filename */}
                  <div className="relative w-24 h-24 rounded-full overflow-hidden shadow-lg bg-slate-200 dark:bg-slate-700">
                    <Image
                      src="/images/profile.jpeg"
                      alt="יהלי עוז"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="text-center">
                    <h1 className="text-2xl font-bold text-[#0C4A6E] dark:text-white mb-1">
                      יהלי עוז
                    </h1>
                  </div>
                </div>

                {/* Bio */}
                <div className="mb-8">
                  <h2 className="text-lg font-semibold text-[#0C4A6E] dark:text-sky-300 mb-3">
                    קצת עליי
                  </h2>
                  <p className="text-base leading-relaxed text-[#334155] dark:text-slate-300">
                    היי, אני יהלי. Ca-Fe נולדה מתוך חוסר — לא היה מקום אחד שמאגד את בתי הקפה הספשלטי בישראל, אז בניתי אחד. תהנו מהאתר, ו-Stay caffeinated ☕
                  </p>
                </div>

                {/* Divider */}
                <hr className="border-slate-200/60 dark:border-zinc-700/60 mb-8" />

                {/* Contact */}
                <div>
                  <h2 className="text-lg font-semibold text-[#0C4A6E] dark:text-sky-300 mb-4">
                    צור קשר
                  </h2>
                  <div className="flex flex-col gap-3">
                    {/* Instagram */}
                    <a
                      href="https://instagram.com/whoisyali"
                      target="_blank"
                      rel="noopener noreferrer"
                      dir="rtl"
                      className="flex items-center gap-3 rounded-2xl border border-slate-200/60 dark:border-zinc-700/60 bg-white/60 dark:bg-zinc-800/60 px-5 py-3.5 text-sm font-medium text-[#0C4A6E] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-700/60 transition-all duration-200 hover:shadow-md group"
                    >
                      <Instagram className="h-5 w-5 text-pink-500 group-hover:scale-110 transition-transform shrink-0" />
                      <span>@whoisyali באינסטגרם</span>
                    </a>

                    {/* Facebook */}
                    <a
                      href="https://www.facebook.com/yali.oz"
                      target="_blank"
                      rel="noopener noreferrer"
                      dir="rtl"
                      className="flex items-center gap-3 rounded-2xl border border-slate-200/60 dark:border-zinc-700/60 bg-white/60 dark:bg-zinc-800/60 px-5 py-3.5 text-sm font-medium text-[#0C4A6E] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-700/60 transition-all duration-200 hover:shadow-md group"
                    >
                      <svg className="h-5 w-5 text-blue-600 group-hover:scale-110 transition-transform shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.887v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
                      </svg>
                      <span>yali.oz בפייסבוק</span>
                    </a>

                    {/* Email */}
                    <a
                      href="mailto:yalioz77@gmail.com"
                      dir="rtl"
                      className="flex items-center gap-3 rounded-2xl border border-slate-200/60 dark:border-zinc-700/60 bg-white/60 dark:bg-zinc-800/60 px-5 py-3.5 text-sm font-medium text-[#0C4A6E] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-700/60 transition-all duration-200 hover:shadow-md group"
                    >
                      <Globe className="h-5 w-5 text-blue-500 group-hover:scale-110 transition-transform shrink-0" />
                      <span>yalioz77@gmail.com</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Footer note */}
              <p className="text-center text-xs text-[#94A3B8] dark:text-slate-500 pb-4">
                נבנה עם ❤️ וקפה מדויק · Ca-Fe {new Date().getFullYear()}
              </p>
            </div>
          </div>
        </AuroraBackground>
      )}

    </div>

      <div className="fixed inset-x-0 bottom-0 z-[9997]">
        <div className="mx-auto w-full max-w-4xl px-4 pb-4">
          <div className="flex items-center justify-center gap-1 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md px-3 py-2 shadow-xl md:max-w-lg md:mx-auto">
            <button
              type="button"
              onClick={() => setMobileSearchOpen(true)}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl px-2 py-2 text-sm font-medium text-[#0C4A6E] dark:text-slate-100 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors"
              style={{ fontFamily: 'var(--font-aran), sans-serif' }}
            >
              <Search className="h-4 w-4" />
              <span>חיפוש</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowOpenNowOnly(!showOpenNowOnly);
                setFitBoundsEnabled(false); // Disable fitBounds to prevent zoom reset when toggling filter
              }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-2 py-2 text-sm font-medium transition-colors ${
                showOpenNowOnly
                  ? 'bg-green-500/90 text-white'
                  : 'text-[#0C4A6E] dark:text-slate-100 hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
              }`}
              style={{ fontFamily: 'var(--font-aran), sans-serif' }}
            >
              <Clock className="h-4 w-4" />
              <span>פתוח</span>
            </button>

            <button
              type="button"
              aria-label="קרוב אליי"
              onClick={handleGetUserLocation}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-2 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                gpsStatus === "locating"
                  ? 'bg-blue-500/90 text-white'
                  : 'text-[#0C4A6E] dark:text-slate-100 hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
              }`}
              style={{ fontFamily: 'var(--font-aran), sans-serif' }}
            >
              <Locate className={`h-4 w-4 ${gpsStatus === "locating" ? 'animate-spin' : ''}`} />
              <span>קרוב אליי</span>
            </button>

            <button
              type="button"
              aria-label={activeView === "map" ? "רשימת בתי קפה" : "מפה"}
              onClick={() => {
                const targetView = activeView === "map" ? "shops" : "map";
                setActiveView(targetView);
                setDetailOpen(false);
                setSelectedShop(null);
                setBubblePosition(null);
              }}
              className={`md:hidden flex flex-none items-center justify-center rounded-xl p-2.5 text-sm font-medium transition-colors ${
                activeView === "map"
                  ? 'bg-blue-500/90 text-white hover:bg-blue-600'
                  : 'text-[#0C4A6E] dark:text-slate-100 hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
              }`}
              style={{ fontFamily: 'var(--font-aran), sans-serif' }}
            >
              {activeView === "map" ? (
                <List className="h-4 w-4" />
              ) : (
                <MapPin className="h-4 w-4" />
              )}
              <span className="sr-only">{activeView === "map" ? "רשימת בתי קפה" : "מפה"}</span>
            </button>

            {activeView === "shops" && (
              <button
                type="button"
                aria-label="שינוי פריסת רשת"
                onClick={cycleGridColumns}
                className="flex flex-none items-center justify-center rounded-xl p-2.5 text-sm font-medium transition-colors bg-blue-500/90 text-white"
                style={{ fontFamily: 'var(--font-aran), sans-serif' }}
              >
                <LayoutGrid className="h-4 w-4" />
                <span className="sr-only">שינוי פריסת רשת</span>
              </button>
            )}
          </div>
          {gpsMessage && gpsStatus !== "idle" && (
            <div className={`mt-2 flex items-center justify-between gap-2 rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white/85 dark:bg-slate-900/85 px-3 py-2 text-xs text-[#0C4A6E] dark:text-slate-200 backdrop-blur-md transition-opacity duration-300 ${gpsMessageFading ? 'opacity-0' : 'opacity-100'}`}>
              <span style={{ fontFamily: 'var(--font-aran), sans-serif' }}>{gpsMessage}</span>
              {(gpsStatus === "denied" || gpsStatus === "unavailable" || gpsStatus === "timeout" || gpsStatus === "error") && (
                <button
                  type="button"
                  onClick={handleGetUserLocation}
                  className="rounded-lg bg-sky-500/90 px-2.5 py-1 text-white"
                  style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                >
                  נסה שוב
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {mobileSearchOpen && (
        <div className="fixed inset-0 z-[9998] md:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileSearchOpen(false)}
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
                    onChange={(event) => {
                      setAddressQuery(event.target.value);
                      if (addressSearchError) setAddressSearchError(null);
                    }}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => window.setTimeout(() => setSearchFocused(false), 150)}
                    onKeyDown={handleAddressKeyDown}
                    className="w-full rounded-xl border border-[#BAE6FD] dark:border-slate-700 bg-[#E0F2FE] dark:bg-slate-800 py-3 pr-10 pl-3 text-base text-[#0C4A6E] dark:text-slate-200 placeholder:text-[#075985] dark:placeholder:text-slate-500 outline-none ring-[#38BDF8]/40 dark:ring-blue-400/40 transition-all duration-200 focus:border-transparent focus:ring-2"
                  />
                  {renderSearchDropdown()}
                </div>
                <button
                  type="button"
                  onClick={handleMobileAddressSearch}
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
                      onClick={() => {
                        setAddressQuery(recent);
                        setAddressSearchError(null);
                      }}
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
                  onClick={() => setMobileSearchOpen(false)}
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
      )}

      {/* Circular bubble - shown when shop is selected but detail panel is closed */}
      <AnimatePresence>
        {activeView === "map" && selectedShop && !detailOpen && bubblePosition && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={`pointer-events-auto fixed flex flex-col items-center gap-2 ${sidebarOpen ? 'z-[35]' : 'z-[9999]'}`}
            style={{ 
              zIndex: sidebarOpen ? 35 : 9999,
              left: `${bubblePosition.x}px`,
              top: `${bubblePosition.y}px`,
              transform: 'translate(-50%, -100%)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
          <button
            type="button"
            onClick={handleOpenDetailPanel}
            className="focus:outline-none group relative h-24 w-24 overflow-hidden rounded-full"
          >
            <Image
              src={selectedShop.image}
              alt={selectedShop.name}
              fill
              className="object-cover transition-transform group-hover:scale-110"
              sizes="96px"
            />
            <div className="absolute inset-0 rounded-full bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
          </button>
          <div className="glass-card flex flex-col items-center gap-2 rounded-3xl px-6 py-3 shadow-2xl">
            <button
              type="button"
              onClick={handleOpenDetailPanel}
              className="text-sm font-bold text-[#0C4A6E] dark:text-slate-200 transition-colors hover:text-[#38BDF8] dark:hover:text-blue-400 cursor-pointer"
              style={{ fontFamily: getFontFamily(selectedShop.name) }}
            >
              {selectedShop.name}
            </button>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[#64748B] dark:text-slate-400" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                  {selectedShop.location}
                </span>
                <LiquidButton
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openGoogleMaps(selectedShop.lat, selectedShop.lng);
                  }}
                  size="sm"
                  className={`flex items-center gap-1 rounded-xl bg-gradient-to-r ${blueColors.primary.gradient} ${blueColors.primary.gradientDark} px-2.5 py-1 text-xs font-medium text-white shadow-md ${blueColors.primary.shadow} transition-all hover:shadow-lg ${blueColors.primary.hoverShadow} hover:scale-[1.05] opacity-100`}
                  title="פתח ב-Google Maps"
                  style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                >
                  <Navigation className="h-3 w-3" />
                  <span>נווט</span>
                </LiquidButton>
              </div>
              {selectedShop.address && (
                <span className="text-xs text-[#64748B] dark:text-slate-400" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                  {selectedShop.address}
                </span>
              )}
            </div>
          </div>
          <LiquidButton
            type="button"
            onClick={() => {
              // Don't zoom out - just close the bubble and keep current zoom level
              setDetailOpen(false);
              setSelectedShop(null);
              setBubblePosition(null);
              // Don't re-enable fitBounds to prevent auto-zoom
            }}
            size="icon"
            className="rounded-full p-1.5 text-[#64748B]"
          >
            <X className="h-4 w-4" />
          </LiquidButton>
        </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

