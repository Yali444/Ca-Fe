"use client";

import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from "react";
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
} from "lucide-react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
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
import { ChristmasDecorations, SnowParticles } from "@/components/ChristmasDecorations";
import { OpeningHoursDisplay } from "@/components/OpeningHoursDisplay";
import { supabase } from "@/supabaseClient";
import { isPlaceOpen } from "@/lib/formatters";
import { SkeletonMapLoader, SkeletonCard } from "@/components/SkeletonLoader";

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
    return 'var(--font-timeburner), "TimeBurner", "Arial", "Helvetica", sans-serif';
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

// Define area groupings - cities that belong to the same geographical area
const AREA_MAPPINGS: Record<string, string> = {
  // Tel Aviv metropolitan area (Gush Dan)
  "תל אביב": "תל אביב וגוש דן",
  "תל אביב - יפו": "תל אביב וגוש דן",
  "תל אביב-יפו": "תל אביב וגוש דן",
  "גבעתיים": "תל אביב וגוש דן",
  "רמת גן": "תל אביב וגוש דן",
  // Jerusalem
  "ירושלים": "ירושלים",
  // Rishon LeZion (standalone)
  "ראשון לציון": "ראשון לציון",
  // Haifa area
  "חיפה": "חיפה והקריות",
  "קיבוץ יגור": "חיפה והקריות",
  // Sharon and coastal area (Pardes Hanna, Zikhron, Ramat HaSharon, Beit Yehoshua)
  "רמת השרון": "השרון",
  "בית יהושע": "השרון",
  "פרדס חנה-כרכור": "השרון",
  "זיכרון יעקב": "השרון",
  // South
  "באר שבע": "הדרום",
  "ערד": "הדרום",
  "אשדוד": "הדרום",
  // North
  "קיבוץ מורן": "הצפון",
  "קיבוץ מחניים": "הצפון",
  "שריגים": "הצפון",
};

// Get area name for a city (returns city name if no mapping exists)
const getAreaForCity = (city: string | null): string => {
  if (!city) return "אחר";
  return AREA_MAPPINGS[city] || city;
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

function MapController({ onReady }: { onReady: (map: L.Map) => void }) {
  const map = useMap();
  const isEnforcingRef = React.useRef(false);
  const hasCalledOnReady = React.useRef(false);

  useEffect(() => {
    // Only call onReady once per map instance
    if (!hasCalledOnReady.current) {
      onReady(map);
      hasCalledOnReady.current = true;
    }
    
    // Force map to stay within Israel bounds immediately
    map.setMaxBounds(israelBounds);
    
    // Ensure initial view is within bounds
    const currentCenter = map.getCenter();
    if (!israelBounds.contains(currentCenter)) {
      map.setView([31.5, 34.75], 8); // Center of Israel
    }
    
    // Listen for move events and force bounds
    const enforceBounds = () => {
      // Prevent infinite recursion by checking if we're already enforcing
      if (isEnforcingRef.current) {
        return;
      }
      
      const center = map.getCenter();
      if (!israelBounds.contains(center)) {
        isEnforcingRef.current = true;
        
        // Temporarily remove the event listener to prevent recursion
        map.off('moveend', enforceBounds);
        
        const newCenter = israelBounds.getCenter();
        map.setView(newCenter, map.getZoom(), { animate: false });
        
        // Re-add the event listener after the view change completes
        setTimeout(() => {
          map.on('moveend', enforceBounds);
          isEnforcingRef.current = false;
        }, 50);
      }
    };
    
    map.on('moveend', enforceBounds);
    
    return () => {
      map.off('moveend', enforceBounds);
      hasCalledOnReady.current = false;
    };
  }, [map]);

  return null;
}

// Component to fly to address location when searched
function FlyToAddress({ location, trigger }: { location: { lat: number; lng: number } | null; trigger: number }) {
  const map = useMap();
  
  useEffect(() => {
    if (location && trigger > 0) {
      map.flyTo([location.lat, location.lng], 15, {
        duration: 1.5,
      });
    }
  }, [map, location, trigger]);
  
  return null;
}

// Component to fly to user's current location
function FlyToUserLocation({ location, trigger }: { location: { lat: number; lng: number } | null; trigger: number }) {
  const map = useMap();
  const lastTriggerRef = React.useRef(0);
  
  useEffect(() => {
    // Only fly when trigger actually changes (not on every location update)
    if (location && trigger > 0 && trigger !== lastTriggerRef.current) {
      lastTriggerRef.current = trigger;
      map.flyTo([location.lat, location.lng], 15, {
        duration: 1.5,
      });
    }
  }, [map, location, trigger]);
  
  return null;
}

// Create custom marker for address search result (red pin)
const createAddressMarker = () => {
  return L.divIcon({
    className: 'address-marker',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background: #EF4444;
        border: 3px solid white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      ">
        <div style="
          width: 10px;
          height: 10px;
          background: white;
          border-radius: 50%;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        "></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

// Create marker for user's current location (blue dot)
const createUserLocationMarker = () => {
  return L.divIcon({
    className: 'user-location-marker',
    html: `
      <div style="
        width: 20px;
        height: 20px;
        background: #3B82F6;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(59, 130, 246, 0.5);
      "></div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
  });
};

// High-quality TileLayer component with smooth crossfade transition
function ThemeTileLayer() {
  const { theme, systemTheme } = useTheme();
  const [currentTheme, setCurrentTheme] = React.useState<string>("light");
  
  // Use systemTheme as fallback, default to light if theme is not loaded yet
  const targetTheme: string = theme === "system" ? (systemTheme || "light") : (theme || "light");
  
  const lightTileUrl = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
  const darkTileUrl = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
  
  // Smooth theme transition - update immediately for instant response
  React.useEffect(() => {
    if (currentTheme !== targetTheme) {
      // Use requestAnimationFrame for smooth transition
      const rafId = requestAnimationFrame(() => {
        setCurrentTheme(targetTheme);
      });
      return () => cancelAnimationFrame(rafId);
    }
  }, [targetTheme, currentTheme]);
  
  const isDark = currentTheme === "dark";
  
  // Always render both layers for smooth crossfade
  // Opacity transitions smoothly between them
  const lightOpacity = isDark ? 0 : 1;
  const darkOpacity = isDark ? 1 : 0;

  return (
    <>
      <TileLayer
        key="light-tiles-permanent"
        url={lightTileUrl}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        opacity={lightOpacity}
        className="theme-tile-layer-smooth"
        zIndex={100}
        updateWhenZooming={false}
        updateWhenIdle={true}
      />
      <TileLayer
        key="dark-tiles-permanent"
        url={darkTileUrl}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        opacity={darkOpacity}
        className="theme-tile-layer-smooth"
        zIndex={101}
        updateWhenZooming={false}
        updateWhenIdle={true}
      />
    </>
  );
}

// Function to open Google Maps with coordinates
const openGoogleMaps = (lat: number, lng: number) => {
  const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  window.open(url, "_blank", "noopener,noreferrer");
};

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
}

function ShopCard({
  shop,
  appMode,
  colors,
  favorites,
  userNotes,
  onSelectShop,
  onToggleFavorite,
  onUpdateNotes,
}: ShopCardProps) {
  // Theme helper: check if this is a matcha place
  const isMatcha = shop.type === 'matcha';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group interactive-card overflow-hidden rounded-2xl shadow-lg transition-all duration-300 hover:shadow-xl ${
        isMatcha
          ? "border border-emerald-200 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
          : "border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
      }`}
      role="button"
      tabIndex={0}
      onClick={() => onSelectShop(shop)}
      onKeyDown={(event) => {
        if (event.key === "Enter") onSelectShop(shop);
      }}
    >
      <div className="relative h-56">
        <img
          src={shop.image}
          alt={shop.name}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
          sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
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
                ? "fill-[#38BDF8] text-[#38BDF8]"
                : "text-white"
            }`}
          />
        </LiquidButton>
        <div className="absolute bottom-0 right-0">
          <div className="bg-white dark:bg-zinc-900 rounded-t-lg rounded-l-lg px-4 py-2.5 backdrop-blur-sm border-t border-l border-slate-200 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <h3
                className={`text-lg font-bold flex-shrink-0 transition-colors duration-300 ${
                  isMatcha
                    ? "text-emerald-800 dark:text-emerald-400"
                    : "text-[#0C4A6E] dark:text-blue-200"
                }`}
                style={{ fontFamily: getFontFamily(shop.name) }}
              >
                {shop.name}
              </h3>
              <p
                className="text-sm text-[#64748B] dark:text-slate-400 flex-shrink-0 flex items-center gap-1.5"
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
              </p>
              <div className="flex-shrink-0">
                <LiquidButton
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openGoogleMaps(shop.lat, shop.lng);
                  }}
                  size="sm"
                  className={`flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-medium text-white shadow-md transition-all hover:shadow-lg hover:scale-[1.05] opacity-100 ${
                    isMatcha
                      ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/50 hover:shadow-emerald-500/75"
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
      </div>

      <div className="p-5">
        <p className="mb-4 text-sm text-[#64748B] dark:text-slate-400">
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
                        ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
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
                className="rounded-full border border-emerald-300 bg-emerald-100 dark:border-emerald-500 dark:bg-emerald-900/50 px-3 py-1 text-xs font-medium text-emerald-800 dark:text-emerald-400"
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
}

export default function IsraelCoffeeGuide() {
  const { appMode } = useMode();
  const { theme } = useTheme();
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
  const [addressLocation, setAddressLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [flyToAddressKey, setFlyToAddressKey] = useState(0);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [flyToUserKey, setFlyToUserKey] = useState(0);
  const [selectedBrewMethods, setSelectedBrewMethods] = useState<string[]>([]);
  const [roasteriesFilter, setRoasteriesFilter] = useState(false);
  const [showClosedPlaces, setShowClosedPlaces] = useState(true);
  const [userNotes, setUserNotes] = useState<Record<string, string>>({});
  const [reduceMotion, setReduceMotion] = useState(false);
  const [isMobileSafari, setIsMobileSafari] = useState(() => {
    if (typeof navigator === "undefined") return false;
    const ua = navigator.userAgent || "";
    const isIOS =
      /iP(hone|od|ad)/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isSafari =
      /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|OPiOS/.test(ua);
    return isIOS && isSafari;
  });
  
  // Initialize notes from localStorage when mode changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(`${appMode}Notes`);
    setUserNotes(saved ? JSON.parse(saved) : {});
  }, [appMode]);

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
  useEffect(() => {
    if (!mapInstance || !selectedShop) return;

    const updateBubblePosition = () => {
      const point = mapInstance.latLngToContainerPoint([selectedShop.lat, selectedShop.lng]);
      const mapContainer = mapInstance.getContainer();
      const mapRect = mapContainer.getBoundingClientRect();
      setBubblePosition({
        x: mapRect.left + point.x,
        y: mapRect.top + point.y - 20,
      });
    };

    mapInstance.on('move', updateBubblePosition);
    mapInstance.on('zoom', updateBubblePosition);
    mapInstance.on('moveend', updateBubblePosition);

    return () => {
      mapInstance.off('move', updateBubblePosition);
      mapInstance.off('zoom', updateBubblePosition);
      mapInstance.off('moveend', updateBubblePosition);
    };
  }, [mapInstance, selectedShop]);

  // Geocode address using OpenStreetMap Nominatim API
  const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
    if (!address.trim()) {
      setAddressLocation(null);
      return null;
    }

    setIsGeocoding(true);
    try {
      const searchQuery = `${address}, Israel`;
      const encodedQuery = encodeURIComponent(searchQuery);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&limit=1&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'Ca Fe Coffee Guide App'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Geocoding failed');
      }

      const data = await response.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        const location = {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
        };
        setAddressLocation(location);
        setIsGeocoding(false);
        return location;
      } else {
        setAddressLocation(null);
        setIsGeocoding(false);
        return null;
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      setAddressLocation(null);
      setIsGeocoding(false);
      return null;
    }
  };

  // Handle address search with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (addressQuery.trim()) {
        geocodeAddress(addressQuery);
      } else {
        setAddressLocation(null);
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
          setFlyToAddressKey(prev => prev + 1);
          setActiveView("map");
        }
      }
    }
  };

  // Get user's current location (one-time fetch, no continuous watching)
  const handleGetUserLocation = () => {
    if (!navigator.geolocation) {
      alert('הדפדפן שלך לא תומך במיקום');
      return;
    }

    // If location is already set, clear it (toggle off)
    if (userLocation) {
      setUserLocation(null);
      setIsLocating(false);
      return;
    }

    setIsLocating(true);
    
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
          alert('נא לאפשר גישה למיקום בדפדפן');
        } else if (error.code === 2 || error.code === error.POSITION_UNAVAILABLE) {
          alert('מיקום לא זמין כרגע');
        } else if (error.code === 3 || error.code === error.TIMEOUT) {
          alert('פג תוקף החיפוש. נסה שוב או ודא שהמיקום מופעל במכשיר');
        } else {
          alert('לא הצלחנו למצוא את המיקום שלך');
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

  const toggleFavorite = (shopId: string) => {
    setFavorites((prev) =>
      prev.includes(shopId)
        ? prev.filter((id) => id !== shopId)
        : [...prev, shopId]
    );
  };

  const handleSelectShop = (shop: CoffeeShop, event?: React.MouseEvent | MouseEvent, fromShopsView?: boolean) => {
    setSelectedShop(shop);
    
    // If selecting from shops view, open detail panel directly without switching to map
    if (fromShopsView) {
      setDetailOpen(true);
      return;
    }
    
    setDetailOpen(false); // Show bubble first, not the full panel
    setActiveView("map");
    setFitBoundsEnabled(false); // Disable FitBounds when selecting a shop
    
    // Fly to the shop location and zoom in
    if (mapInstance) {
      mapInstance.flyTo([shop.lat, shop.lng], 16, {
        animate: true,
        duration: 1.0,
      });
      
      // Update bubble position after map animation completes
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
      }, 1100); // Wait for fly animation to complete
    } else if (typeof window !== "undefined") {
      // Fallback to center if no map instance
      setBubblePosition({ 
        x: window.innerWidth / 2, 
        y: window.innerHeight / 2 
      });
    }
  };

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
      
      // Filter by closed places: if showClosedPlaces is false, only show open places
      const matchesClosedFilter = showClosedPlaces || isPlaceOpen(shop.hours);
      
      return matchesBrew && matchesRoasteries && matchesClosedFilter;
    });

    // Sort by distance from address location or user location if available
    // Otherwise, sort alphabetically by name (A-Z)
    const sortLocation = addressLocation || userLocation;
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
  }, [coffeeShops, addressLocation, userLocation, selectedBrewMethods, roasteriesFilter, appMode, showClosedPlaces]);

  // Group shops by area for display in shops view (when no address/user location search)
  const groupedShops = useMemo(() => {
    if (addressLocation || userLocation) {
      // When searching by address or using user location, don't group - show sorted by distance
      return null;
    }
    return groupShopsByArea(filteredShops);
  }, [filteredShops, addressLocation, userLocation]);

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
      {/* Christmas Decorations - Floating elements in background */}
      {(() => {
        // Only disable if user explicitly prefers reduced motion, not just because it's mobile
        const prefersReducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        return !prefersReducedMotion && (
          <>
            <ChristmasDecorations />
            <SnowParticles />
          </>
        );
      })()}
      
      {/* Mobile Menu Button */}
      <LiquidButton
        onClick={() => setSidebarOpen(!sidebarOpen)}
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
      <div
        className={`fixed right-0 top-0 z-[9999] h-screen ${
          sidebarCollapsed ? "w-10" : "w-80"
        } ${sidebarCollapsed ? "bg-gradient-to-b from-white/95 via-white/90 to-white/95 dark:from-slate-900/95 dark:via-slate-900/90 dark:to-slate-900/95 backdrop-blur-md" : "bg-zinc-50 dark:bg-[#1a1a1a]"}`}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          height: "100vh",
          transform: isMobile && !sidebarOpen ? "translateX(100%)" : "translateX(0)",
          transition: reduceMotion ? "none" : "transform 0.3s ease-in-out",
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
        <div className="glass flex items-center border-b border-white/20 dark:border-slate-700 dark:bg-slate-900 justify-between p-5">
          <div className="flex items-center">
            <img 
              src="/images/Ca Fe Logo.png" 
              alt="Ca Fe Logo" 
              className="h-12 w-auto object-contain"
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
                  placeholder="חפש לפי כתובת... (Enter לחיפוש)"
                  value={addressQuery}
                  onChange={(event) => setAddressQuery(event.target.value)}
                  onKeyDown={handleAddressKeyDown}
                  className="w-full rounded-md border border-[#BAE6FD] dark:border-slate-700 bg-[#E0F2FE] dark:bg-slate-800 py-1.5 md:py-2 pr-8 md:pr-10 pl-3 md:pl-4 text-xs md:text-sm text-[#0C4A6E] dark:text-slate-200 placeholder:text-[#075985] dark:placeholder:text-slate-500 outline-none ring-[#38BDF8]/40 dark:ring-blue-400/40 transition-all duration-200 focus:border-transparent focus:ring-2"
                />
              </div>
              {/* Show closed toggle - only appears after address search */}
              {addressLocation && (
                <button
                  type="button"
                  onClick={() => setShowClosedPlaces(!showClosedPlaces)}
                  className={`flex-shrink-0 rounded-md px-2 py-1.5 md:py-2 text-[10px] md:text-xs font-medium transition-all duration-200 border ${
                    showClosedPlaces
                      ? `bg-gradient-to-r ${colors.primary.gradient} ${colors.primary.gradientDark} text-white border-transparent shadow-md`
                      : "bg-[#E0F2FE] dark:bg-slate-800 text-[#64748B] dark:text-slate-300 border-[#BAE6FD] dark:border-slate-700 hover:bg-[#DBEAFE] dark:hover:bg-slate-700"
                  }`}
                  title={showClosedPlaces ? "הסתר סגורים" : "הצג סגורים"}
                >
                  {showClosedPlaces ? "הסתר סגורים" : "הצג סגורים"}
                </button>
              )}
            </div>
            {addressLocation && (
              <div className="mt-2 text-[10px] md:text-xs text-[#075985] dark:text-blue-300">
                נמצאו {filteredShops.length} מקומות {showClosedPlaces ? "" : "פתוחים "}בסביבה
              </div>
            )}
          </div>
        )}

        {/* Navigation and Search Results */}
        <nav className="flex-1 overflow-y-auto px-2 md:px-3 py-2">
          {/* Search Results List - shown only when address is searched (NOT for user location - that goes to shops page) */}
          {addressLocation && filteredShops.length > 0 && (
            <div className="mb-4">
              <h3 className="text-xs md:text-sm font-semibold text-[#0C4A6E] dark:text-slate-200 mb-3 flex items-center gap-2">
                <span>תוצאות חיפוש</span>
                <span className="text-lg">✨</span>
              </h3>
              <div className="space-y-2">
                {filteredShops.map((shop) => {
                  const distance = addressLocation 
                    ? calculateDistance(addressLocation.lat, addressLocation.lng, shop.lat, shop.lng)
                    : 0;
                  const distanceText = distance < 1 
                    ? `${Math.round(distance * 1000)} מ'`
                    : `${distance.toFixed(1)} ק"מ`;
                  
                  return (
                    <div
                      key={shop.id}
                      onClick={() => handleSelectShop(shop)}
                      className="cursor-pointer rounded-lg border border-[#BAE6FD] dark:border-slate-700 bg-[#F0F9FF] dark:bg-slate-800/50 p-3 hover:bg-[#DBEAFE] dark:hover:bg-slate-800 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 
                          className="text-xs md:text-sm font-semibold text-[#0C4A6E] dark:text-slate-200 flex-1"
                          style={{ fontFamily: getFontFamily(shop.name) }}
                        >
                          {shop.name}
                        </h4>
                        <span className="text-[10px] md:text-xs text-[#075985] dark:text-blue-300 whitespace-nowrap">
                          {distanceText}
                        </span>
                      </div>
                      <p className="text-[10px] md:text-xs text-[#64748B] dark:text-slate-400">
                        {shop.location}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Navigation - shown when no address search or when search has no results (user location goes to shops page, not sidebar) */}
          {(!addressLocation || filteredShops.length === 0) && (
            <>
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

              <>
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
                        {/* Roasteries Filter */}
                        <LiquidButton
                          type="button"
                          onClick={toggleRoasteriesFilter}
                          size="sm"
                          className={`rounded-full px-3 py-1 text-xs font-medium transition-all duration-200 dark:border dark:border-white/20 ${
                            roasteriesFilter
                              ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md"
                              : "text-[#64748B] dark:text-slate-50 dark:bg-slate-800/80"
                          }`}
                        >
                          בתי קלייה
                        </LiquidButton>
                  </div>
                </div>
                </div>
              </>
            </>
          )}
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
      </div>

      {/* Main Content */}
      <div 
        className={`relative flex-1 min-w-0 overflow-x-hidden overflow-y-auto transition-all duration-300 ${
          isMobile 
            ? '' // On mobile, sidebar overlays, so no margin needed
            : sidebarCollapsed 
              ? 'mr-10' // 40px for collapsed sidebar
              : 'mr-80'  // 320px for expanded sidebar
        }`}
        style={{
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
                    {addressLocation && (
                      <Marker
                        position={[addressLocation.lat, addressLocation.lng]}
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
                    )}
                    {/* User location marker */}
                    {userLocation && (
                      <Marker
                        position={[userLocation.lat, userLocation.lng]}
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
                    )}
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
                        <Marker
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
                {/* My Location Button */}
                {!detailOpen && (
                  <button
                    type="button"
                    onClick={handleGetUserLocation}
                    disabled={isLocating}
                    className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-[500] p-3 rounded-full shadow-lg hover:shadow-xl transition-all ${
                      userLocation 
                        ? 'bg-blue-500/80 backdrop-blur-md border border-blue-400/50 shadow-blue-500/30' 
                        : 'bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50'
                    }`}
                    title={userLocation ? 'נקה מיקום' : 'המיקום שלי'}
                  >
                    <Locate className={`h-5 w-5 ${userLocation ? 'text-white' : 'text-blue-500'} ${isLocating ? 'animate-pulse' : ''}`} />
                  </button>
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
                  className={`fixed bottom-6 left-1/2 z-[9999] mx-4 w-full max-w-xl max-h-[90vh] -translate-x-1/2 overflow-y-auto rounded-3xl border-2 shadow-2xl ${
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
                          ? "bg-emerald-600/90 border border-emerald-500/50"
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
                          ? "bg-emerald-600/90 border border-emerald-500/50"
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
                            ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/50 hover:shadow-emerald-500/75"
                            : `bg-gradient-to-r ${colors.primary.gradient} ${colors.primary.gradientDark} ${colors.primary.shadow} ${colors.primary.hoverShadow}`
                        }`}
                        title="פתח ב-Google Maps"
                        style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                      >
                        <Navigation className="h-3 w-3" />
                        <span>נווט</span>
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
            <div className="h-full flex flex-col p-6 md:p-8 max-w-full">
            <div className="flex-1 relative overflow-y-auto overflow-x-hidden">
              {/* My Location Button */}
              {!detailOpen && (
                <button
                  type="button"
                  onClick={handleGetUserLocation}
                  disabled={isLocating}
                  className={`absolute top-4 right-4 md:top-6 md:right-6 z-[500] p-3 md:p-3.5 rounded-full shadow-lg hover:shadow-xl transition-all ${
                    userLocation 
                      ? 'bg-blue-500/80 backdrop-blur-md border border-blue-400/50 shadow-blue-500/30' 
                      : 'bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50'
                  }`}
                  title={userLocation ? 'נקה מיקום' : 'המיקום שלי'}
                >
                  <Locate className={`h-5 w-5 md:h-5 md:w-5 ${userLocation ? 'text-white' : 'text-blue-500'} ${isLocating ? 'animate-pulse' : ''}`} />
                </button>
              )}
              <div className="w-full max-w-full px-2 md:px-4 pb-12 pt-20 md:pt-0">
                {/* Grouped by area when no address search */}
                {groupedShops && groupedShops.length > 0 ? (
                  <div className="space-y-8">
                    {groupedShops.map(({ area, shops }) => (
                      <div key={area}>
                        {/* Area Header */}
                        <div className="mb-4 flex items-center gap-3 flex-wrap">
                          <h2 
                            className={`text-xl font-bold transition-colors duration-300 ${
                              appMode === "coffee"
                                ? "text-[#0C4A6E] dark:text-blue-200"
                                : "text-emerald-800 dark:text-emerald-200"
                            }`}
                            style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                          >
                            {area}
                          </h2>
                          <span 
                            className={`rounded-full px-3 py-1 text-sm font-medium ${
                              appMode === "coffee"
                                ? "bg-[#DBEAFE] dark:bg-slate-800 text-[#0284C7] dark:text-blue-300"
                                : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                            }`}
                            style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                          >
                            {shops.length} מקומות
                          </span>
                        </div>
                        {/* Shops Grid */}
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 w-full">
                          {shops.map((shop) => (
                            <ShopCard
                              key={shop.id}
                              shop={shop}
                              appMode={appMode}
                              colors={colors}
                              favorites={favorites}
                              userNotes={userNotes}
                              onSelectShop={(shop) => handleSelectShop(shop, undefined, true)}
                              onToggleFavorite={toggleFavorite}
                              onUpdateNotes={(shopId, notes) => setUserNotes({ ...userNotes, [shopId]: notes })}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
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
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 w-full">
                      {filteredShops.map((shop) => {
                        const sortLocation = addressLocation || userLocation;
                        const distance = sortLocation 
                          ? calculateDistance(sortLocation.lat, sortLocation.lng, shop.lat, shop.lng)
                          : null;
                        
                        return (
                          <div key={shop.id} className="relative">
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
                              onSelectShop={(shop) => handleSelectShop(shop, undefined, true)}
                              onToggleFavorite={toggleFavorite}
                              onUpdateNotes={(shopId, notes) => setUserNotes({ ...userNotes, [shopId]: notes })}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="h-[400px]" />
              </div>
            </div>
          </div>
          </AuroraBackground>
        )}

      </div>

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

