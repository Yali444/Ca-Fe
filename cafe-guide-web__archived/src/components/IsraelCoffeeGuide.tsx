"use client";

import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Coffee,
  Leaf,
  Heart,
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
import { useMode } from "@/contexts/ModeContext";
import { usePlaceData } from "@/hooks/usePlaceData";
import { getModeColors } from "@/lib/theme-utils";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import { useTheme } from "next-themes";
import { CasualDecorations, SnowParticles } from "@/components/ChristmasDecorations";
import { OpeningHoursDisplay } from "@/components/OpeningHoursDisplay";
import { supabase } from "@/supabaseClient";
import { isPlaceOpen, parseOpeningHoursString } from "@/lib/formatters";
import { SkeletonMapLoader, SkeletonCard } from "@/components/SkeletonLoader";
import { ShopCardSkeleton } from "@/components/ShopCardSkeleton";

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
  // Type property: 'coffee' or 'matcha'
  type?: 'coffee' | 'matcha';
}

// Map Place (unified type) to CoffeeShop format for the component
const mapPlaceToCoffeeShop = (place: Place): CoffeeShop => {
  const location = place.city || "";

  return {
    id: place.id,
    name: place.name,
    location: location,
    address: place.address || null,
    lat: place.latitude ?? 32.0809, // Default to Tel Aviv center if no coords
    lng: place.longitude ?? 34.7806,
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
    type: 'type' in place ? (place.type as 'coffee' | 'matcha') : undefined,
  };
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

// Define Israel bounds to restrict map view - very tight bounds for Israel only
const israelBounds = L.latLngBounds(
  [30.0, 34.5], // Southwest corner (south, west) - very tight bounds
  [33.2, 35.6]  // Northeast corner (north, east) - very tight bounds
);

const MAIN_AREAS = [
  "תל אביב וגוש דן",
  "ירושלים והסביבה",
  "השרון",
  "השפלה",
  "הדרום והנגב",
  "חיפה והצפון",
] as const;

type MainArea = typeof MAIN_AREAS[number];

// Define area groupings - cities that belong to the same geographical area
const AREA_MAPPINGS: Record<string, MainArea> = {
  // Tel Aviv metropolitan area (Gush Dan)
  "תל אביב": "תל אביב וגוש דן",
  "תל אביב - יפו": "תל אביב וגוש דן",
  "תל אביב-יפו": "תל אביב וגוש דן",
  "גבעתיים": "תל אביב וגוש דן",
  "רמת גן": "תל אביב וגוש דן",
  // Jerusalem and surroundings
  "ירושלים": "ירושלים והסביבה",
  // Sharon and coastal area (Pardes Hanna, Zikhron, Ramat HaSharon, Beit Yehoshua)
  "רמת השרון": "השרון",
  "בית יהושע": "השרון",
  "פרדס חנה-כרכור": "השרון",
  "זיכרון יעקב": "השרון",
  // Shfela
  "רחובות": "השפלה",
  "ראשון לציון": "השפלה",
  "אשדוד": "השפלה",
  "נס ציונה": "השפלה",
  // South & Negev
  "באר שבע": "הדרום והנגב",
  "ערד": "הדרום והנגב",
  // Haifa and North (merged)
  "חיפה": "חיפה והצפון",
  "קיבוץ יגור": "חיפה והצפון",
  "קיבוץ מורן": "חיפה והצפון",
  "קיבוץ מחניים": "חיפה והצפון",
  "שריגים": "חיפה והצפון",
};

const MAIN_AREA_SET = new Set<MainArea>(MAIN_AREAS);

// Get area name for a city (returns a grouped name; defaults to "אחר" if not mapped)
const getAreaForCity = (city: string | null): MainArea | "אחר" => {
  if (!city) return "אחר";
  return AREA_MAPPINGS[city] || "אחר";
};

const DAY_KEYS: Array<keyof OpeningHours> = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const DAY_LABELS = ["היום", "מחר", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

const parseRangeMinutes = (range: string): { open: number; close: number } | null => {
  const match = range.match(/(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})/);
  if (!match) return null;

  const open = Number.parseInt(match[1], 10) * 60 + Number.parseInt(match[2], 10);
  const close = Number.parseInt(match[3], 10) * 60 + Number.parseInt(match[4], 10);
  return { open, close };
};

const formatMinutesToClock = (minutes: number): string => {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60)
    .toString()
    .padStart(2, "0");
  const m = (normalized % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
};

const getLiveOpeningStatus = (hours: string | OpeningHours | undefined): { label: string; tone: "open" | "soon" | "closed" } | null => {
  if (!hours) return null;

  const parsed = typeof hours === "string" ? parseOpeningHoursString(hours) : hours;
  if (!parsed) return null;

  const now = new Date();
  const dayIndex = now.getDay();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const todayRange = parsed[DAY_KEYS[dayIndex]];
  const todayParsed = todayRange ? parseRangeMinutes(todayRange) : null;

  if (todayParsed) {
    const closeAdjusted = todayParsed.close <= todayParsed.open ? todayParsed.close + 1440 : todayParsed.close;
    const nowAdjusted = nowMinutes < todayParsed.open && closeAdjusted > 1440 ? nowMinutes + 1440 : nowMinutes;
    const isOpenNow = nowAdjusted >= todayParsed.open && nowAdjusted <= closeAdjusted;

    if (isOpenNow) {
      const minutesToClose = closeAdjusted - nowAdjusted;
      if (minutesToClose <= 45) {
        return { label: `נסגר בעוד ${Math.max(1, minutesToClose)} דק׳`, tone: "soon" };
      }
      return { label: `פתוח עכשיו · עד ${formatMinutesToClock(closeAdjusted)}`, tone: "open" };
    }

    if (nowMinutes < todayParsed.open) {
      return { label: `נפתח היום ב-${formatMinutesToClock(todayParsed.open)}`, tone: "closed" };
    }
  }

  for (let offset = 1; offset <= 7; offset += 1) {
    const targetDay = (dayIndex + offset) % 7;
    const dayRange = parsed[DAY_KEYS[targetDay]];
    if (!dayRange) continue;
    const parsedRange = parseRangeMinutes(dayRange);
    if (!parsedRange) continue;
    const label = offset === 1 ? DAY_LABELS[1] : DAY_LABELS[targetDay] || "בהמשך השבוע";
    return { label: `נפתח ${label} ב-${formatMinutesToClock(parsedRange.open)}`, tone: "closed" };
  }

  return { label: "סגור כרגע", tone: "closed" };
};

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
  const clusterGroupRef = React.useRef<L.MarkerClusterGroup | null>(null);

  React.useEffect(() => {
    if (!clusterGroupRef.current) {
      clusterGroupRef.current = L.markerClusterGroup({
        maxClusterRadius: 50, // Pixels
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
      map.addLayer(clusterGroupRef.current);
    }

    return () => {
      if (clusterGroupRef.current) {
        map.removeLayer(clusterGroupRef.current);
        clusterGroupRef.current.clearLayers();
        clusterGroupRef.current = null;
      }
    };
  }, [map]);

  return (
    <MarkerClusterGroupContext.Provider value={clusterGroupRef.current}>
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

// Component to automatically fit map bounds to show all markers
function FitBounds({ shops, enabled }: { shops: CoffeeShop[]; enabled: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (!enabled || shops.length === 0) return;

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

    // Add padding to bounds
    map.fitBounds(constrainedBounds, {
      padding: [50, 50],
      maxZoom: 19,
    });
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
  appMode: "coffee" | "matcha";
  colors: ReturnType<typeof getModeColors>;
  favorites: string[];
  userNotes: Record<string, string>;
  onSelectShop: (shop: CoffeeShop) => void;
  onToggleFavorite: (shopId: string) => void;
  onUpdateNotes: (shopId: string, notes: string) => void;
  index?: number; // Optional index for priority prop (first 6 items get priority)
}

const ShopCard = React.memo(function ShopCard({
  shop,
  appMode,
  colors,
  favorites,
  userNotes,
  onSelectShop,
  onToggleFavorite,
  onUpdateNotes,
  index,
}: ShopCardProps) {
  // Theme helper: check if this is a matcha place
  const isMatcha = shop.type === 'matcha';
  const liveOpeningStatus = useMemo(() => getLiveOpeningStatus(shop.hours), [shop.hours]);
  
  // Keep eager image loading minimal for faster first interaction on mobile
  const shouldPrioritize = index !== undefined && index < 2;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group interactive-card overflow-hidden rounded-2xl shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${
        isMatcha
          ? "border border-emerald-200 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-900/40"
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
        {/* Sells Beans Badge */}
        {shop.sellsBeans && (
          <div className="absolute right-4 top-4 bg-amber-500 text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg backdrop-blur-sm bg-opacity-90">
            מוכרים פולים
          </div>
        )}
        <div className="absolute bottom-0 right-0 left-0 px-3 pb-3">
          <div className="bg-white dark:bg-zinc-900 rounded-xl px-4 py-2.5 backdrop-blur-sm border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col gap-1.5">
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
                    ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-400/60 hover:shadow-emerald-400/80"
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

        <div className="mt-4">
          <textarea
            placeholder="הוסף הערות שלך..."
            value={userNotes[shop.id] || ""}
            onClick={(e) => e.stopPropagation()}
            onChange={(event) => onUpdateNotes(shop.id, event.target.value)}
            className="glass-input h-16 w-full resize-none rounded-xl p-3 text-sm text-[#0C4A6E] dark:text-slate-200 outline-none transition-all"
          />
        </div>
      </div>
    </motion.div>
  );
});

ShopCard.displayName = "ShopCard";

export default function IsraelCoffeeGuide() {
  const { appMode } = useMode();
  const { theme, systemTheme } = useTheme();
  const colors = getModeColors(appMode);
  
  // Load both coffee and matcha places for unified view
  const { places: coffeePlaces, loading: coffeeLoading, error: coffeeError } = usePlaceData("coffee");
  const { places: matchaPlaces, loading: matchaLoading, error: matchaError } = usePlaceData("matcha");
  
  // Combine all places and deduplicate by name + city
  // If a place appears in both datasets, prioritize based on actual content:
  // - If matcha version has NO brewMethods, use matcha version (it's truly matcha-only)
  // - Otherwise, use coffee version (it has both or is coffee-only)
  const places = useMemo(() => {
    const seen = new Map<string, Place>();
    
    // First, collect all places by key
    const coffeeMap = new Map<string, Place>();
    coffeePlaces.forEach(place => {
      const key = `${place.name}-${place.city || ''}`;
      coffeeMap.set(key, place);
    });
    
    const matchaMap = new Map<string, Place>();
    matchaPlaces.forEach(place => {
      const key = `${place.name}-${place.city || ''}`;
      matchaMap.set(key, place);
    });
    
    // Process all unique keys
    const allKeys = new Set([...coffeeMap.keys(), ...matchaMap.keys()]);
    
    allKeys.forEach(key => {
      const coffeePlace = coffeeMap.get(key);
      const matchaPlace = matchaMap.get(key);
      
      if (coffeePlace && matchaPlace) {
        // Both exist - check if it's in the matcha-only list
        // If it's matcha-only, use matcha version (cafes.json has incorrect brewMethods)
        // Otherwise, use coffee version (serves both or is coffee-only)
        if (isMatchaOnlyPlace(coffeePlace.name, coffeePlace.city)) {
          // Matcha-only place - use matcha version (without brewMethods)
          // Ensure type is set to 'matcha'
          seen.set(key, { ...matchaPlace, type: 'matcha' });
        } else {
          // Serves both or is coffee-only - use coffee version
          // Preserve type from coffeePlace (could be 'coffee' or 'matcha' if explicitly set)
          seen.set(key, { ...coffeePlace, type: coffeePlace.type || 'coffee' });
        }
      } else if (coffeePlace) {
        // Only in coffee data - ensure type is set
        seen.set(key, { ...coffeePlace, type: coffeePlace.type || 'coffee' });
      } else if (matchaPlace) {
        // Only in matcha data - ensure type is set to matcha
        seen.set(key, { ...matchaPlace, type: 'matcha' });
      }
    });
    
    return Array.from(seen.values());
  }, [coffeePlaces, matchaPlaces]);
  
  const csvLoading = coffeeLoading || matchaLoading;
  const csvError = coffeeError || matchaError;
  
  // Use ref to track previous places and prevent unnecessary re-renders
  const prevPlacesRef = useRef<Place[]>([]);
  const stablePlaces = useMemo(() => {
    // Only update if places actually changed (by reference or length)
    if (places.length !== prevPlacesRef.current.length || 
        places.length === 0 ||
        places[0]?.id !== prevPlacesRef.current[0]?.id) {
      prevPlacesRef.current = places;
      return places;
    }
    return prevPlacesRef.current;
  }, [places]);
  
  // Convert places to CoffeeShop format and filter by coordinates
  const coffeeShops: CoffeeShop[] = useMemo(() => {
    if (stablePlaces.length === 0) return [];
    
    try {
      return stablePlaces
        .filter((place) => place.latitude != null && place.longitude != null)
        .map(mapPlaceToCoffeeShop);
    } catch (err) {
      console.error("Error processing places:", err);
      return [];
    }
  }, [stablePlaces]);

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
  
  // Initialize favorites from localStorage when mode changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(`${appMode}Favorites`);
    setFavorites(saved ? JSON.parse(saved) : []);
  }, [appMode]);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [activeView, setActiveView] = useState<"map" | "shops">("shops");
  const [addressQuery, setAddressQuery] = useState("");
  const [recentAddresses, setRecentAddresses] = useState<string[]>([]);
  const [lastSearchedAddress, setLastSearchedAddress] = useState("");
  const [addressSearchError, setAddressSearchError] = useState<string | null>(null);
  const [addressLocation, setAddressLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [flyToAddressKey, setFlyToAddressKey] = useState(0);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>("idle");
  const [gpsMessage, setGpsMessage] = useState<string | null>(null);
  const [flyToUserKey, setFlyToUserKey] = useState(0);
  const [selectedBrewMethods, setSelectedBrewMethods] = useState<string[]>([]);
  const [roasteriesFilter, setRoasteriesFilter] = useState(false);
  const [sellsBeansFilter, setSellsBeansFilter] = useState(false);
  const [showClosedPlaces, setShowClosedPlaces] = useState(true);
  const [showOpenNowOnly, setShowOpenNowOnly] = useState(false);
  const [userNotes, setUserNotes] = useState<Record<string, string>>({});
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [shopsToDisplay, setShopsToDisplay] = useState(12);
  const [gridColumns, setGridColumns] = useState<1 | 2>(1);
  const [selectedRegionFilter, setSelectedRegionFilter] = useState<MainArea | null>(null);
  const [isMobileSafari, setIsMobileSafari] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  
  // Initialize notes from localStorage when mode changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(`${appMode}Notes`);
    setUserNotes(saved ? JSON.parse(saved) : {});
  }, [appMode]);

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
  
  // Reset review loading marker when mode changes so we fetch once per mode
  useEffect(() => {
    setReviewsLoaded(false);
  }, [appMode]);

  // Initialize reviews from Supabase and place data when mode or shops change
  useEffect(() => {
    if (typeof window === "undefined" || !detailOpen || reviewsLoaded) return;
    
    let cancelled = false;
    const fetchReviews = async () => {
      // Initialize from shop reviews first
      const initial: Record<string, Review[]> = {};
      coffeeShops.forEach((shop) => {
        initial[shop.id] = shop.reviews || [];
      });

      // Create a mapping from numeric ID to string ID for matching reviews
      const numericToStringId: Record<number, string> = {};
      coffeeShops.forEach((shop) => {
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
          if (!shopId) {
            console.log('Review cafe_id not matched to any shop:', review.cafe_id);
            return;
          }
          
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
  }, [appMode, detailOpen, reviewsLoaded]);
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

  const disableVisualFX = reduceMotion || isMobileSafari;

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
    localStorage.setItem(`${appMode}Favorites`, JSON.stringify(favorites));
  }, [favorites, appMode]);

  const toggleFavorite = useCallback((shopId: string) => {
    setFavorites((prev) => {
      if (prev.includes(shopId)) {
        return prev.filter((id) => id !== shopId);
      }
      return [...prev, shopId];
    });
  }, []);

  const cycleGridColumns = useCallback(() => {
    setGridColumns((prev) => {
      return prev === 2 ? 1 : 2;
    });
  }, []);

  useEffect(() => {
    localStorage.setItem(`${appMode}Notes`, JSON.stringify(userNotes));
  }, [userNotes, appMode]);
  
  // Reset selection and re-fit bounds when mode changes
  useEffect(() => {
    setSelectedShop(null);
    setDetailOpen(false);
    setFitBoundsEnabled(true);
  }, [appMode]);

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

  // Handle address search with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (addressQuery.trim()) {
        geocodeAddress(addressQuery);
      }
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [addressQuery]);

  // Handle Enter key press to fly to address location
  const handleAddressKeyDown = async (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (addressQuery.trim()) {
        const location = await geocodeAddress(addressQuery);
        if (location) {
          setLastSearchedAddress(addressQuery);
          addRecentAddress(addressQuery);
          setAddressQuery("");
          setFlyToAddressKey(prev => prev + 1);
          setActiveView("map");
          setMobileSearchOpen(false);
          if (window.innerWidth < 768) {
            setSidebarOpen(false);
          }
        }
      }
    }
  };

  const handleMobileAddressSearch = async () => {
    if (!addressQuery.trim()) return;
    const location = await geocodeAddress(addressQuery);
    if (location) {
      setLastSearchedAddress(addressQuery);
      addRecentAddress(addressQuery);
      setAddressQuery("");
      setFlyToAddressKey(prev => prev + 1);
      setActiveView("map");
      setMobileSearchOpen(false);
      setSidebarOpen(false);
    }
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

  const handleUpdateNotes = useCallback((shopId: string, notes: string) => {
    setUserNotes((prev) => ({ ...prev, [shopId]: notes }));
  }, []);

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
  };

  const toggleRoasteriesFilter = () => {
    setRoasteriesFilter((prev) => !prev);
  };

  const toggleSellsBeansFilter = () => {
    setSellsBeansFilter((prev) => !prev);
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
      
      // Filter by roasteries: show all cafes by default, only filter when roasteriesFilter is enabled
      // When roasteriesFilter is enabled, show only cafes where sellsBeans === true
      const matchesRoasteries = roasteriesFilter ? shop.sellsBeans === true : true;
      
      // Filter by sells beans: show all cafes by default, only filter when sellsBeansFilter is enabled
      // When sellsBeansFilter is enabled, show only cafes where sellsBeans === true
      const matchesSellsBeans = sellsBeansFilter ? shop.sellsBeans === true : true;
      
      // Exclude roastery-only places from cafe list (they should only appear in roasteries list)
      const matchesRoasteryOnlyFilter = !shop.roasteryOnly;
      
      // Filter by closed places: if showClosedPlaces is false, only show open places
      const matchesClosedFilter = showClosedPlaces || isPlaceOpen(shop.hours);
      
      // Filter by "Open Now": if showOpenNowOnly is true, only show places that are currently open
      const matchesOpenNow = showOpenNowOnly ? isPlaceOpen(shop.hours) : true;
      
      // Filter by region if selected
      const matchesRegion = selectedRegionFilter === null || getAreaForCity(shop.location) === selectedRegionFilter;
      
      return matchesBrew && matchesRoasteries && matchesSellsBeans && matchesRoasteryOnlyFilter && matchesClosedFilter && matchesOpenNow && matchesRegion;
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
  }, [coffeeShops, userLocation, selectedBrewMethods, roasteriesFilter, sellsBeansFilter, appMode, showClosedPlaces, showOpenNowOnly, selectedRegionFilter]);

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
      const matchesRoasteries = roasteriesFilter ? shop.sellsBeans === true : true;
      const matchesSellsBeans = sellsBeansFilter ? shop.sellsBeans === true : true;
      // Exclude roastery-only places from cafe list
      const isRoasteryOnly = 'roasteryOnly' in shop && (shop as any).roasteryOnly === true;
      const matchesRoasteryOnlyFilter = !isRoasteryOnly;
      const matchesClosedFilter = showClosedPlaces || isPlaceOpen(shop.hours);
      const matchesOpenNow = showOpenNowOnly ? isPlaceOpen(shop.hours) : true;
      return matchesBrew && matchesRoasteries && matchesSellsBeans && matchesRoasteryOnlyFilter && matchesClosedFilter && matchesOpenNow;
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
  }, [coffeeShops, selectedBrewMethods, roasteriesFilter, sellsBeansFilter, showClosedPlaces, showOpenNowOnly, userLocation]);

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
  }, [selectedBrewMethods, roasteriesFilter, sellsBeansFilter, showClosedPlaces, showOpenNowOnly, userLocation, appMode, selectedRegionFilter]);

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
    console.log('Submitting review to Supabase:', insertData, 'Original ID:', selectedShop.id);

    // Save to Supabase
    const { data, error } = await supabase
      .from('Cafe Reviews')
      .insert([insertData])
      .select()
      .single();

    console.log('Supabase insert result:', { data, error });

    if (error) {
      console.error('Error saving review:', error);
      alert('שגיאה בשמירת הביקורת: ' + error.message);
      return;
    }

    if (!data) {
      console.warn('No data returned from insert - RLS might be blocking inserts');
      // Still add locally for better UX, but warn about potential issue
    }

    const newReview: Review = {
      id: data?.id?.toString() || `${selectedShop.id}-${Date.now()}`,
      author: reviewDraft.name.trim(),
      rating: reviewDraft.rating,
      text: reviewDraft.text.trim(),
      source: "Ca Fe community",
      date: new Date().toISOString().slice(0, 10),
    };

    console.log('Review added locally:', newReview);
    setReviewsMap((prev) => {
      const existing = prev[selectedShop.id] || [];
      return { ...prev, [selectedShop.id]: [newReview, ...existing] };
    });
    setReviewDraft({ name: "", text: "", rating: 5 });
  };

  // Don't render heavy components until mounted (prevents SSR/hydration issues)
  if (!mounted) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gradient-to-br from-[#E0F2FE] via-[#F0F9FF] to-[#DBEAFE] dark:bg-[#0B1120]">
        <div className="text-center space-y-4">
          <SkeletonMapLoader />
        </div>
      </div>
    );
  }

  // On mobile Safari, also wait for data to load before rendering main UI
  // This prevents rendering too many components at once
  if (isMobileSafari && csvLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gradient-to-br from-[#E0F2FE] via-[#F0F9FF] to-[#DBEAFE] dark:bg-[#0B1120]">
        <div className="text-center space-y-4">
          <SkeletonMapLoader />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gradient-to-br from-[#E0F2FE] via-[#F0F9FF] to-[#DBEAFE] dark:bg-[#0B1120] antialiased">
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
        className="fixed right-6 top-6 z-[10000] rounded-lg p-3 md:hidden"
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
          className="flex items-center justify-between border-b p-5"
          style={{
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            backgroundColor: "rgba(255, 255, 255, 0.7)",
            borderBottom: "1px solid rgba(0, 0, 0, 0.05)",
          }}
        >
          <div className="flex items-center">
            <img 
              src="/images/Ca Fe Logo.png" 
              alt="Ca Fe Logo" 
              className="h-12 w-auto object-contain"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:block">
              <LiquidButton
                onClick={toggleSellsBeansFilter}
                size="sm"
                className={`rounded-full px-3 py-1 text-xs font-medium transition-all duration-200 dark:border dark:border-white/20 transform -rotate-3 hover:rotate-0 ${
                  sellsBeansFilter
                    ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md"
                    : "text-[#64748B] dark:text-slate-50 dark:bg-slate-800/80"
                }`}
              >
                נתקעת בלי פולים?
              </LiquidButton>
            </div>
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
                  placeholder="חפש לפי כתובת... (Enter לחיפוש)"
                  value={addressQuery}
                  onChange={(event) => {
                    setAddressQuery(event.target.value);
                    if (addressSearchError) setAddressSearchError(null);
                  }}
                  onKeyDown={handleAddressKeyDown}
                  className="w-full rounded-md border border-[#BAE6FD] dark:border-slate-700 bg-[#E0F2FE] dark:bg-slate-800 py-1.5 md:py-2 pr-8 md:pr-10 pl-3 md:pl-4 text-xs md:text-sm text-[#0C4A6E] dark:text-slate-200 placeholder:text-[#075985] dark:placeholder:text-slate-500 outline-none ring-[#38BDF8]/40 dark:ring-blue-400/40 transition-all duration-200 focus:border-transparent focus:ring-2"
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
                נמצאו {filteredShops.length} מקומות {showClosedPlaces ? "" : "פתוחים "}בסביבה
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

              <div className="mt-6 mb-3 px-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#64748B] dark:text-slate-100">
                  מסננים
                </h3>
              </div>

              <div className="space-y-4 px-3">
                {/* Show brew methods filter (applies to coffee places) */}
                <div>
                  <div className="flex flex-wrap gap-2">
                    {brewMethods.map((method) => (
                      <LiquidButton
                        key={method}
                        type="button"
                        onClick={() => toggleBrewMethod(method)}
                        size="sm"
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-all duration-200 dark:border dark:border-white/20 ${
                          selectedBrewMethods.includes(method)
                            ? `bg-gradient-to-r ${colors.primary.gradient} ${colors.primary.gradientDark} text-white shadow-md`
                            : "text-[#64748B] dark:text-slate-50 dark:bg-slate-800/80"
                        }`}
                      >
                        {method}
                      </LiquidButton>
                    ))}
                  </div>
                </div>
              </div>
        </nav>

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
                {(csvLoading || !isBrowser || !mapReady) ? (
                  <SkeletonMapLoader />
                ) : csvError ? (
                  <div className="flex h-full flex-col items-center justify-center gap-4 text-red-600 dark:text-red-400 p-8">
                    <p className="text-lg font-semibold">שגיאה בטעינת הנתונים</p>
                    <p className="text-sm">{csvError}</p>
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
                    <FlyToUserLocation location={userLocation} trigger={flyToUserKey} />
                    {filteredShops.length > 0 && !addressLocation && !userLocation && (
                      <FitBounds shops={filteredShops} enabled={fitBoundsEnabled} />
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
                              {addressQuery}
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
                    {/* Clustered markers for shops */}
                    <MarkerClusterGroup>
                      {filteredShops.map((shop) => {
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
                {/* Blur overlay when detail panel is open */}
                {detailOpen && !disableVisualFX && (
                  <div 
                    className="absolute inset-0 z-[1000] pointer-events-none"
                    style={{
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      backgroundColor: 'rgba(0, 0, 0, 0.1)',
                    }}
                  />
                )}
              </div>
            </AuroraBackground>
          </div>
        )}

        {/* Full detail panel - shown when detailOpen is true (works in both map and shops view) */}
        <AnimatePresence>
          {selectedShop && detailOpen && (() => {
            const isDetailMatcha = selectedShop.type === 'matcha';
            return (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.95 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  onClick={(e) => e.stopPropagation()}
                  className={`fixed bottom-6 left-1/2 z-[9999] ${isMobile ? 'mx-0 w-full' : 'mx-4 w-full max-w-xl'} max-h-[90vh] -translate-x-1/2 overflow-y-auto rounded-3xl border-2 shadow-2xl ${
                    isDetailMatcha
                      ? "border-emerald-200 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                      : "border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                  }`}
                  style={{ 
                    zIndex: 9999, 
                    fontFamily: 'var(--font-aran), var(--font-timeburner), sans-serif',
                    top: 'auto',
                    bottom: '24px',
                  }}
                >
                <div className="relative h-48">
                  <img
                    src={selectedShop.image}
                    alt={selectedShop.name}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute left-4 top-4 flex gap-2">
                    <LiquidButton
                      type="button"
                      onClick={() => toggleFavorite(selectedShop.id)}
                      size="icon"
                      className={`rounded-full p-2.5 backdrop-blur-sm shadow-lg ${
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
                      onClick={() => {
                        // Close detail panel without zooming - just remove blur
                        setDetailOpen(false);
                      }}
                      size="icon"
                      className={`rounded-full p-2.5 backdrop-blur-sm shadow-lg ${
                        isDetailMatcha
                          ? "bg-[#0071E3]/90 border border-[#0071E3]/50"
                          : "bg-blue-500/90 border border-blue-400/50"
                      }`}
                    >
                      <X className="h-5 w-5 text-white" />
                    </LiquidButton>
                  </div>
                </div>
                <div className="space-y-4 p-6" style={{ fontFamily: 'var(--font-aran), var(--font-timeburner), sans-serif' }}>
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
                            : `bg-gradient-to-r ${colors.primary.gradient} ${colors.primary.gradientDark} ${colors.primary.shadow} ${colors.primary.hoverShadow}`
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
                      <h4 className={`mb-2 text-xs font-semibold uppercase transition-colors duration-300 ${colors.primary.text}`} style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
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
                          <h4 className={`mb-2 text-xs font-semibold uppercase transition-colors duration-300 ${colors.primary.text}`} style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                            מקור המאצ'ה
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
                          <h4 className={`mb-2 text-xs font-semibold uppercase transition-colors duration-300 ${colors.primary.text}`} style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
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
                      className={`w-full rounded-xl bg-gradient-to-r ${colors.primary.gradient} ${colors.primary.gradientDark} py-3 text-white shadow-lg ${colors.primary.shadow} transition-all hover:shadow-xl ${colors.primary.hoverShadow} hover:scale-[1.02]`}
                      style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                    >
                      שמור ביקורת
                    </LiquidButton>
                  </form>
                </div>
              </motion.div>
            );
          })()}
        </AnimatePresence>

        {activeView === "shops" && (
          <AuroraBackground className="h-full w-full">
            <div className="h-full flex flex-col p-0 md:p-8 max-w-full">
            <div className="flex-1 relative overflow-y-auto overflow-x-hidden overscroll-y-contain scroll-smooth">
              <div className={`w-full max-w-full px-0 md:px-4 pb-28 md:pb-12 snap-y snap-proximity md:snap-none scroll-pb-32 ${isMobile ? 'pt-12' : 'pt-4'} md:pt-6`}>
                {/* Loading state - show skeleton loaders */}
                {csvLoading ? (
                  <div className={`grid ${gridColsClass} gap-6 md:grid-cols-2 lg:grid-cols-3 w-full`}>
                    {Array.from({ length: 9 }).map((_, index) => (
                      <ShopCardSkeleton key={index} appMode={appMode} />
                    ))}
                  </div>
                ) : (
                  <>
                    {/* Region Filter Chips - only show when not searching by address/user location */}
                    {!addressLocation && !userLocation && availableRegions.length > 0 && (
                      <div
                        className="mb-6 overflow-x-auto px-3 md:px-0"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        dir="rtl"
                      >
                        <div className="flex w-max snap-x snap-proximity justify-start gap-3 pb-2 pr-3 after:block after:w-16 after:flex-shrink-0 after:content-[''] md:pr-0 after:md:w-0">
                          <LiquidButton
                            type="button"
                            onClick={() => setSelectedRegionFilter(null)}
                            size="sm"
                            className={`shrink-0 snap-start whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 dark:border dark:border-white/20 ${
                              selectedRegionFilter === null
                                ? `bg-gradient-to-r ${colors.primary.gradient} ${colors.primary.gradientDark} text-white shadow-md`
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
                              onClick={() => setSelectedRegionFilter(area)}
                              size="sm"
                              className={`shrink-0 snap-start whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 dark:border dark:border-white/20 ${
                                selectedRegionFilter === area
                                  ? `bg-gradient-to-r ${colors.primary.gradient} ${colors.primary.gradientDark} text-white shadow-md`
                                  : "text-[#64748B] dark:text-slate-50 dark:bg-slate-800/80"
                              }`}
                              style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                            >
                              {area} ({count})
                            </LiquidButton>
                          ))}
                          {/* Sells Beans Filter - visible in all screen sizes */}
                          <LiquidButton
                            type="button"
                            onClick={toggleSellsBeansFilter}
                            size="sm"
                            className={`shrink-0 snap-start whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 dark:border dark:border-white/20 transform -rotate-3 hover:rotate-0 ${
                              sellsBeansFilter
                                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md"
                                : "text-[#64748B] dark:text-slate-50 dark:bg-slate-800/80"
                            }`}
                            style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                          >
                            נתקעת בלי פולים?
                          </LiquidButton>
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
                        </div>
                        {/* Shops Grid */}
                        <div className={`grid ${gridColsClass} gap-6 md:grid-cols-2 lg:grid-cols-3 w-full`}>
                          {shops.map((shop, index) => (
                            <div key={shop.id} className="snap-start">
                              <ShopCard
                                shop={shop}
                                appMode={appMode}
                                colors={colors}
                                favorites={favorites}
                                userNotes={userNotes}
                                onSelectShop={handleSelectShopFromShopsView}
                                onToggleFavorite={toggleFavorite}
                                onUpdateNotes={handleUpdateNotes}
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
                            appMode === "coffee"
                              ? `bg-gradient-to-r ${colors.primary.gradient} ${colors.primary.gradientDark} text-white shadow-md hover:shadow-lg`
                              : "bg-gradient-to-r from-[#0071E3] to-[#005BB5] text-white shadow-md hover:shadow-lg"
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
                            className={`text-xl font-bold transition-colors duration-300 ${
                              appMode === "coffee"
                                ? "text-[#0C4A6E] dark:text-blue-200"
                                : "text-emerald-800 dark:text-emerald-200"
                            }`}
                            style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                          >
                            📍 בתי קפה קרובים אליך
                          </h2>
                          <span 
                            className={`rounded-full px-3 py-1 text-sm font-medium ${
                              appMode === "coffee"
                                ? "bg-[#DBEAFE] dark:bg-slate-800 text-[#0284C7] dark:text-blue-300"
                                : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                            }`}
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
                              appMode={appMode}
                              colors={colors}
                              favorites={favorites}
                              userNotes={userNotes}
                              onSelectShop={handleSelectShopFromShopsView}
                              onToggleFavorite={toggleFavorite}
                              onUpdateNotes={handleUpdateNotes}
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
                            appMode === "coffee"
                              ? `bg-gradient-to-r ${colors.primary.gradient} ${colors.primary.gradientDark} text-white shadow-md hover:shadow-lg`
                              : "bg-gradient-to-r from-[#0071E3] to-[#005BB5] text-white shadow-md hover:shadow-lg"
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
                )}
                <div className="h-[400px]" />
              </div>
            </div>
          </div>
          </AuroraBackground>
        )}

      </div>

      <div className="fixed inset-x-0 bottom-0 z-[9997] md:hidden">
        <div className="mx-auto w-full max-w-xl px-4 pb-4">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md px-3 py-2 shadow-xl">
            <button
              type="button"
              onClick={() => setMobileSearchOpen(true)}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[#0C4A6E] dark:text-slate-100 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors"
              style={{ fontFamily: 'var(--font-aran), sans-serif' }}
            >
              <Search className="h-4 w-4" />
              <span>חיפוש</span>
            </button>

            <button
              type="button"
              onClick={() => setShowOpenNowOnly(!showOpenNowOnly)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
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
              className={`flex flex-none items-center justify-center rounded-xl p-2.5 text-sm font-medium transition-colors ${
                gpsStatus === "locating"
                  ? 'bg-blue-500/90 text-white'
                  : 'text-[#0C4A6E] dark:text-slate-100 hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
              }`}
              style={{ fontFamily: 'var(--font-aran), sans-serif' }}
            >
              <Locate className={`h-4 w-4 ${gpsStatus === "locating" ? 'animate-spin' : ''}`} />
              <span className="sr-only">קרוב אליי</span>
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
              className={`flex flex-none items-center justify-center rounded-xl p-2.5 text-sm font-medium transition-colors ${
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
                    placeholder="חפש לפי כתובת..."
                    value={addressQuery}
                    onChange={(event) => {
                      setAddressQuery(event.target.value);
                      if (addressSearchError) setAddressSearchError(null);
                    }}
                    onKeyDown={handleAddressKeyDown}
                    className="w-full rounded-xl border border-[#BAE6FD] dark:border-slate-700 bg-[#E0F2FE] dark:bg-slate-800 py-3 pr-10 pl-3 text-sm text-[#0C4A6E] dark:text-slate-200 placeholder:text-[#075985] dark:placeholder:text-slate-500 outline-none ring-[#38BDF8]/40 dark:ring-blue-400/40 transition-all duration-200 focus:border-transparent focus:ring-2"
                  />
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
            <img
              src={selectedShop.image}
              alt={selectedShop.name}
              className="h-full w-full aspect-square object-cover transition-transform group-hover:scale-110"
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
                  className={`flex items-center gap-1 rounded-xl bg-gradient-to-r ${colors.primary.gradient} ${colors.primary.gradientDark} px-2.5 py-1 text-xs font-medium text-white shadow-md ${colors.primary.shadow} transition-all hover:shadow-lg ${colors.primary.hoverShadow} hover:scale-[1.05] opacity-100`}
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

