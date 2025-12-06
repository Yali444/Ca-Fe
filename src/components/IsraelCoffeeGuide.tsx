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
  Instagram,
  Crosshair,
} from "lucide-react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import type { Review } from "@/types/roastery";
import type { Place } from "@/types/place";
import { useMode } from "@/contexts/ModeContext";
import { usePlaceData } from "@/hooks/usePlaceData";
import { getModeColors } from "@/lib/theme-utils";
import { instagramUrl } from "@/lib/formatters";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ModeSwitch } from "@/components/ui/mode-switch";
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import { useTheme } from "next-themes";
import { createMatchaMarker as createMatchaMarkerFromMapIcons, createRoasteryMarker as createRoasteryMarkerFromMapIcons } from "@/components/map/MapIcons";
import { SuggestModal } from "@/components/SuggestModal";

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
// Uses the matcha leaf icon similar to Coffee Glass icon style
const createMatchaMarker = () => {
  return createCustomIcon('/images/Matcha Leaf Green.svg');
};

// Create custom marker icon for roasteries (Coffee Beans)
const createRoasteryMarker = () => {
  return createRoasteryMarkerFromMapIcons();
};

interface CoffeeShop {
  id: string;
  name: string;
  location: string;
  lat: number;
  lng: number;
  image: string;
  specialty: string;
  description: string;
  brewMethods?: string[];
  vibeTags: string[];
  instagram?: string;
  website?: string;
  hours?: string;
  reviews: Review[];
  // Matcha-specific fields
  matchaOrigin?: string;
  milkOptions?: string | string[];
}

// Map Place (unified type) to CoffeeShop format for the component
const mapPlaceToCoffeeShop = (place: Place): CoffeeShop => {
  const location = place.city || "";

  return {
    id: place.id,
    name: place.name,
    location: location,
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
      maxZoom: 11,
    });
  }, [map, shops, enabled]);

  return null;
}

function MapController({ onReady }: { onReady: (map: L.Map) => void }) {
  const map = useMap();
  const isEnforcingRef = React.useRef(false);

  useEffect(() => {
    onReady(map);
    
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
    };
  }, [map, onReady]);

  return null;
}

// Component to fly map to a specific location
function FlyToLocation({ location, flyKey }: { location: { lat: number; lng: number } | null; flyKey: number }) {
  const map = useMap();
  const previousFlyKeyRef = React.useRef<number>(-1);

  useEffect(() => {
    if (!location || flyKey === previousFlyKeyRef.current) return;

    // Fly to user location with animation
    map.flyTo([location.lat, location.lng], 14, {
      animate: true,
      duration: 1.5,
    });
    
    previousFlyKeyRef.current = flyKey;
  }, [map, location, flyKey]);

  return null;
}

// Create blue dot marker for user location
const createUserLocationMarker = () => {
  return L.divIcon({
    className: 'user-location-marker',
    html: `
      <div style="
        position: relative;
        width: 20px;
        height: 20px;
      ">
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 20px;
          height: 20px;
          background-color: #3B82F6;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        "></div>
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 8px;
          height: 8px;
          background-color: white;
          border-radius: 50%;
        "></div>
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
  });
};

// Calculate distance between two coordinates using Haversine formula (in kilometers)
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // Earth's radius in kilometers
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

// Dynamic TileLayer component that switches based on theme
function ThemeTileLayer() {
  const { theme, systemTheme } = useTheme();
  // Use systemTheme as fallback, default to light if theme is not loaded yet
  const currentTheme = theme === "system" ? systemTheme : theme || "light";
  const tileUrl = currentTheme === "dark" 
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  return (
    <TileLayer
      key={currentTheme} // Force re-render when theme changes
      url={tileUrl}
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    />
  );
}

// Function to open Google Maps with coordinates
const openGoogleMaps = (lat: number, lng: number) => {
  const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  window.open(url, "_blank", "noopener,noreferrer");
};

export default function IsraelCoffeeGuide() {
  const { appMode } = useMode();
  const { theme } = useTheme();
  const colors = getModeColors(appMode);
  
  // Load Place data based on mode (from TypeScript files)
  const { places, loading: csvLoading, error: csvError } = usePlaceData(appMode);
  
  // Convert places to CoffeeShop format and filter by coordinates
  const coffeeShops: CoffeeShop[] = useMemo(() => {
    return places
      .filter((place) => place.latitude != null && place.longitude != null)
      .map(mapPlaceToCoffeeShop);
  }, [places]);

  // Calculate map center based on current dataset
  const mapCenter = useMemo(() => {
    return calculateMapCenter(coffeeShops);
  }, [coffeeShops]);

  // Create markers based on mode
  const cafeMarker = useMemo(() => {
    return appMode === "coffee" ? createCafeMarker() : createMatchaMarker();
  }, [appMode]);

  const roasteryMarker = useMemo(() => {
    return createRoasteryMarker();
  }, []);

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
  const [activeView, setActiveView] = useState<"map" | "shops">("map");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBrewMethods, setSelectedBrewMethods] = useState<string[]>([]);
  const [userNotes, setUserNotes] = useState<Record<string, string>>({});
  
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
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [flyToLocationKey, setFlyToLocationKey] = useState(0);
  const [isSuggestModalOpen, setIsSuggestModalOpen] = useState(false);
  
  // Initialize reviews from localStorage and place data when mode or shops change
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(`${appMode}Reviews`);
    if (saved) {
      setReviewsMap(JSON.parse(saved));
    } else {
      // Initialize from shop reviews
      const initial: Record<string, Review[]> = {};
      coffeeShops.forEach((shop) => {
        initial[shop.id] = shop.reviews || [];
      });
      setReviewsMap(initial);
    }
  }, [appMode, coffeeShops]);
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
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    localStorage.setItem(`${appMode}Favorites`, JSON.stringify(favorites));
  }, [favorites, appMode]);

  useEffect(() => {
    localStorage.setItem(`${appMode}Notes`, JSON.stringify(userNotes));
  }, [userNotes, appMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(`${appMode}Reviews`, JSON.stringify(reviewsMap));
  }, [reviewsMap, appMode]);
  
  // Reset selection and re-fit bounds when mode changes
  useEffect(() => {
    setSelectedShop(null);
    setDetailOpen(false);
    setFitBoundsEnabled(true);
  }, [appMode]);

  useEffect(() => {
    setReviewDraft({ name: "", text: "", rating: 5 });
  }, [selectedShop]);

  const toggleFavorite = (shopId: string) => {
    setFavorites((prev) =>
      prev.includes(shopId)
        ? prev.filter((id) => id !== shopId)
        : [...prev, shopId]
    );
  };

  // Handle geolocation request
  const handleGeolocation = () => {
    if (!navigator.geolocation) {
      alert("הדפדפן שלך לא תומך במיקום גיאוגרפי");
      return;
    }

    setIsLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const userLoc = { lat: latitude, lng: longitude };
        setUserLocation(userLoc);
        setIsLoadingLocation(false);
        // Trigger fly-to by incrementing the key
        setFlyToLocationKey(prev => prev + 1);
      },
      (error) => {
        setIsLoadingLocation(false);
        let message = "לא ניתן לקבל את המיקום שלך";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = "גישה למיקום נדחתה. אנא אפשר גישה למיקום בדפדפן.";
            break;
          case error.POSITION_UNAVAILABLE:
            message = "מידע על המיקום לא זמין.";
            break;
          case error.TIMEOUT:
            message = "בקשת המיקום פגה זמן.";
            break;
        }
        alert(message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleSelectShop = (shop: CoffeeShop, event?: React.MouseEvent | MouseEvent) => {
    setSelectedShop(shop);
    setDetailOpen(false); // Show bubble first, not the full panel
    setActiveView("map");
    setFitBoundsEnabled(false); // Disable FitBounds when selecting a shop
    
    // Store the click position for bubble placement
    if (event) {
      setBubblePosition({ x: event.clientX, y: event.clientY });
    } else if (typeof window !== "undefined") {
      // Fallback to center if no event provided
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

  // Calculate filtered shops - must be before useEffect that uses it
  const filteredShops = useMemo(() => {
    let shops = coffeeShops.filter((shop) => {
      const matchesSearch =
        shop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        shop.location.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Only filter by brew methods in coffee mode - type-safe check
      const matchesBrew =
        appMode === "matcha" ||
        selectedBrewMethods.length === 0 ||
        ('brewMethods' in shop && shop.brewMethods && Array.isArray(shop.brewMethods) && (() => {
          const brewMethods = shop.brewMethods as string[];
          return selectedBrewMethods.some((method) => {
            // Match the selected method with shop's brew methods
            // "פילטר" matches "פילטר" or "V60" (V60 is a type of filter)
            if (method === "פילטר") {
              return brewMethods.includes("פילטר") || brewMethods.includes("V60");
            }
            // "קולד ברו" matches "קולד ברו" or "חליטה קרה" (same thing)
            if (method === "קולד ברו") {
              return brewMethods.includes("קולד ברו") || brewMethods.includes("חליטה קרה");
            }
            // Direct match for "אספרסו"
            return brewMethods.includes(method);
          });
        })());
      
      return matchesSearch && matchesBrew;
    });

    // Sort by distance from user location if available
    if (userLocation) {
      shops = [...shops].sort((a, b) => {
        const distanceA = calculateDistance(userLocation.lat, userLocation.lng, a.lat, a.lng);
        const distanceB = calculateDistance(userLocation.lat, userLocation.lng, b.lat, b.lng);
        return distanceA - distanceB;
      });
    }

    return shops;
  }, [coffeeShops, searchQuery, selectedBrewMethods, appMode, userLocation]);

  // Don't auto-close detail panel when shop changes - let user control it

  const isBrowser = typeof window !== "undefined";
  const selectedShopReviews = selectedShop
    ? reviewsMap[selectedShop.id] || []
    : [];

  const handleReviewSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedShop || !reviewDraft.name.trim() || !reviewDraft.text.trim()) return;

    const newReview: Review = {
      id: `${selectedShop.id}-${Date.now()}`,
      author: reviewDraft.name.trim(),
      rating: reviewDraft.rating,
      text: reviewDraft.text.trim(),
      source: "Google Maps + Ca Fe community",
      date: new Date().toISOString().slice(0, 10),
    };

    setReviewsMap((prev) => {
      const existing = prev[selectedShop.id] || [];
      return { ...prev, [selectedShop.id]: [newReview, ...existing] };
    });
    setReviewDraft({ name: "", text: "", rating: 5 });
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gradient-to-br from-[#E0F2FE] via-[#F0F9FF] to-[#DBEAFE] dark:bg-[#0B1120] antialiased">
      {/* Mobile Menu Button */}
      <LiquidButton
        onClick={() => setSidebarOpen(!sidebarOpen)}
        size="icon"
        className="fixed right-4 top-4 z-50 rounded-lg p-2.5 md:hidden bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm shadow-lg border border-[#BAE6FD] dark:border-slate-700"
      >
        {sidebarOpen ? (
          <X className="h-5 w-5 text-[#0284C7] dark:text-blue-400" />
        ) : (
          <Menu className="h-5 w-5 text-[#0284C7] dark:text-blue-400" />
        )}
      </LiquidButton>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-md md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <AuroraBackground
        className={`fixed right-0 top-0 z-40 flex h-full flex-col transition-all duration-300 ease-in-out md:static ${
          sidebarOpen ? "translate-x-0" : "translate-x-full"
        } ${sidebarCollapsed ? "w-16 md:w-20" : "w-[280px] sm:w-[300px] md:w-80"}`}
        showRadialGradient={false}
      >
        <motion.div className="flex h-full w-full flex-col">
        {/* Header */}
        <div className="glass flex items-center justify-between border-b border-white/20 dark:border-slate-700 dark:bg-slate-900 p-3 md:p-5">
          {!sidebarCollapsed && (
            <div className="flex items-center">
              <img 
                src="/images/Ca Fe Logo.png" 
                alt="Ca Fe Logo" 
                className="h-10 md:h-12 w-auto object-contain"
              />
            </div>
          )}

          {sidebarCollapsed && (
            <div className="mx-auto flex items-center justify-center">
              <img 
                src="/images/Ca Fe Logo.png" 
                alt="Ca Fe Logo" 
                className="h-8 md:h-10 w-auto object-contain"
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            {!sidebarCollapsed && <ModeSwitch />}
            <ThemeToggle />
            <LiquidButton
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              size="icon"
              className="hidden rounded-xl p-1.5 md:flex dark:bg-slate-800/80 dark:border dark:border-white/20"
            >
              {sidebarCollapsed ? (
                <ChevronLeft className="h-4 w-4 text-[#64748B] dark:text-white" />
              ) : (
                <ChevronRight className="h-4 w-4 text-[#64748B] dark:text-white" />
              )}
            </LiquidButton>
          </div>
        </div>

        {/* Search */}
        {!sidebarCollapsed && (
          <div className="px-3 md:px-4 py-2 md:py-3">
            <div className="relative">
              <Search className="pointer-events-none absolute right-2 md:right-3 top-1/2 h-3.5 md:h-4 w-3.5 md:w-4 -translate-y-1/2 text-[#075985] dark:text-slate-400" />
              <input
                type="text"
                placeholder={appMode === "coffee" ? "חפש בתי קפה..." : "חפש בתי מאצ'ה..."}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full rounded-md border border-[#BAE6FD] dark:border-slate-700 bg-[#E0F2FE] dark:bg-slate-800 py-1.5 md:py-2 pr-8 md:pr-10 pl-3 md:pl-4 text-xs md:text-sm text-[#0C4A6E] dark:text-slate-200 placeholder:text-[#075985] dark:placeholder:text-slate-500 outline-none ring-[#38BDF8]/40 dark:ring-blue-400/40 transition-all duration-200 focus:border-transparent focus:ring-2"
              />
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 md:px-3 py-2">
          <div className="space-y-1">
            <LiquidButton
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActiveView("map");
              }}
              className={`flex w-full items-center gap-2 md:gap-3 rounded-xl px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-medium transition-all duration-200 relative z-20 dark:bg-slate-800/80 dark:border dark:border-white/20 ${
                activeView === "map"
                  ? "opacity-100 text-[#0C4A6E] dark:text-white"
                  : "opacity-70 text-[#64748B] dark:text-slate-50"
              } ${sidebarCollapsed ? "justify-center" : ""}`}
            >
              <MapPin className="h-4 w-4 md:h-5 md:w-5" />
              {!sidebarCollapsed && <span>{appMode === "coffee" ? "מפת בתי קפה" : "מפת בתי מאצ'ה"}</span>}
            </LiquidButton>

            <LiquidButton
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActiveView("shops");
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 relative z-20 dark:bg-slate-800/80 dark:border dark:border-white/20 ${
                activeView === "shops"
                  ? "opacity-100 text-[#0C4A6E] dark:text-white"
                  : "opacity-70 text-[#64748B] dark:text-slate-50"
              } ${sidebarCollapsed ? "justify-center" : ""}`}
            >
              {appMode === "coffee" ? (
                <Coffee className="h-5 w-5" />
              ) : (
                <Leaf className="h-5 w-5" />
              )}
              {!sidebarCollapsed && <span>{appMode === "coffee" ? "רשימת בתי קפה" : "רשימת בתי מאצ'ה"}</span>}
            </LiquidButton>
          </div>

          {!sidebarCollapsed && (
            <>
              <div className="mt-4 md:mt-6 mb-2 md:mb-3 px-2 md:px-3">
                <h3 className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-[#64748B] dark:text-slate-100">
                  מסננים
                </h3>
              </div>

              <div className="space-y-3 md:space-y-4 px-2 md:px-3">
                {/* Only show brew methods filter in Coffee mode */}
                {appMode === "coffee" && (
                  <div>
                    <h4 className={`mb-2 text-xs md:text-sm font-medium transition-colors duration-300 ${colors.primary.text}`}>
                      שיטות חליטה
                    </h4>
                    <div className="flex flex-wrap gap-1.5 md:gap-2">
                      {brewMethods.map((method) => (
                        <LiquidButton
                          key={method}
                          type="button"
                          onClick={() => toggleBrewMethod(method)}
                          size="sm"
                          className={`rounded-full px-2 md:px-3 py-0.5 md:py-1 text-[10px] md:text-xs font-medium transition-all duration-200 dark:border dark:border-white/20 ${
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
                )}
              </div>
            </>
          )}
        </nav>

        {/* Favorites Section */}
        {!sidebarCollapsed && (
          <div className="bg-[#E0F2FE] dark:bg-slate-900 border-t border-[#BAE6FD] dark:border-slate-800 p-3 md:p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs md:text-sm font-medium text-[#0C4A6E] dark:text-slate-200">
                מועדפים
              </span>
              <span className="text-[10px] md:text-xs text-[#64748B] dark:text-slate-400">
                {favorites.length} שמורים
              </span>
            </div>
          </div>
        )}

        {/* Suggest a Place Button */}
        {!sidebarCollapsed && (
          <div className="mt-auto pt-3 pb-3 px-3 md:px-4 border-t border-[#BAE6FD] dark:border-slate-800">
            <LiquidButton
              type="button"
              onClick={() => setIsSuggestModalOpen(true)}
              variant="ghost"
              className={`w-full text-xs md:text-sm font-medium transition-all duration-200 ${
                appMode === "matcha"
                  ? "text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                  : "text-[#075985] dark:text-blue-300 hover:bg-[#DBEAFE] dark:hover:bg-blue-900/20"
              }`}
              style={{ fontFamily: 'var(--font-aran), sans-serif' }}
            >
              <span>💡 הצע מקום</span>
            </LiquidButton>
          </div>
        )}
        </motion.div>
      </AuroraBackground>

      {/* Suggest Modal */}
      <SuggestModal
        isOpen={isSuggestModalOpen}
        onClose={() => setIsSuggestModalOpen(false)}
      />

      {/* Main Content */}
      <div className="relative flex-1 overflow-auto">
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
                {(csvLoading || !isBrowser) ? (
                  <div className="flex h-full items-center justify-center text-[#64748B] dark:text-slate-400">
                    {csvLoading ? "טוען נתונים..." : "Loading map…"}
                  </div>
                ) : csvError ? (
                  <div className="flex h-full flex-col items-center justify-center gap-4 text-red-600 dark:text-red-400 p-8">
                    <p className="text-lg font-semibold">שגיאה בטעינת הנתונים</p>
                    <p className="text-sm">{csvError}</p>
                  </div>
                ) : (
                  <>
                    <MapContainer
                      center={[31.5, 34.75]}
                      zoom={8}
                      minZoom={7}
                      maxZoom={12}
                      maxBounds={israelBounds}
                      maxBoundsViscosity={1.0}
                      className="h-full w-full"
                      scrollWheelZoom={true}
                      key="main-map"
                    >
                      <MapController onReady={setMapInstance} />
                      <ThemeTileLayer />
                      {filteredShops.length > 0 && (
                        <FitBounds shops={filteredShops} enabled={fitBoundsEnabled} />
                      )}
                      {userLocation && (
                        <>
                          <FlyToLocation location={userLocation} flyKey={flyToLocationKey} />
                          <Marker
                            position={[userLocation.lat, userLocation.lng]}
                            icon={createUserLocationMarker()}
                          >
                            <Popup>
                              <div className="p-2">
                                <h3 className="font-bold text-sm mb-1">אתה כאן</h3>
                                <p className="text-xs text-slate-600">המיקום שלך</p>
                              </div>
                            </Popup>
                          </Marker>
                        </>
                      )}
                      {filteredShops.map((shop) => {
                        // In coffee mode, Canopy is the only roastery, all others are cafes
                        // In matcha mode, all places use matcha marker
                        const isRoastery = appMode === "coffee" && shop.id === "canopy-jerusalem";
                        const markerIcon = isRoastery ? roasteryMarker : cafeMarker;
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
                    {/* Floating GPS Button */}
                    <div className="absolute bottom-4 left-4 z-[1000]">
                      <LiquidButton
                        type="button"
                        onClick={handleGeolocation}
                        size="icon"
                        disabled={isLoadingLocation}
                        className={`rounded-full p-3 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm shadow-lg border border-[#BAE6FD] dark:border-slate-700 hover:scale-105 transition-transform ${
                          isLoadingLocation ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                        title="מצא את המיקום שלי"
                      >
                        {isLoadingLocation ? (
                          <div className="h-5 w-5 border-2 border-[#38BDF8] border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Crosshair className="h-5 w-5 text-[#0284C7] dark:text-blue-400" />
                        )}
                      </LiquidButton>
                    </div>
                  </>
                )}
                {/* Blur overlay when detail panel is open */}
                {detailOpen && (
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

        {/* Full detail panel - shown when detailOpen is true */}
        <AnimatePresence>
          {activeView === "map" && selectedShop && detailOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.95 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  onClick={(e) => e.stopPropagation()}
                  className="fixed bottom-0 left-0 right-0 z-[9999] mx-0 w-full max-h-[90vh] overflow-y-auto rounded-t-3xl border-t-2 border-l-0 border-r-0 border-b-0 border-[#BAE6FD] dark:border-slate-700 bg-[#F0F9FF] dark:bg-slate-900 shadow-2xl md:bottom-6 md:left-1/2 md:right-auto md:mx-4 md:max-w-xl md:-translate-x-1/2 md:rounded-3xl md:border-2"
                  style={{ 
                    zIndex: 9999, 
                    fontFamily: 'var(--font-aran), var(--font-timeburner), sans-serif',
                  }}
                >
                <div className="relative h-40 md:h-48">
                  <img
                    src={selectedShop.image}
                    alt={selectedShop.name}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute left-3 md:left-4 top-3 md:top-4 flex gap-2">
                    <LiquidButton
                      type="button"
                      onClick={() => toggleFavorite(selectedShop.id)}
                      size="icon"
                      className="rounded-full p-2 md:p-2.5"
                    >
                      <Heart
                        className={`h-4 w-4 md:h-5 md:w-5 transition-all ${
                          favorites.includes(selectedShop.id)
                            ? "fill-[#38BDF8] text-[#38BDF8]"
                            : "text-[#64748B]"
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
                      className="rounded-full p-2 md:p-2.5"
                    >
                      <X className="h-4 w-4 md:h-5 md:w-5 text-[#64748B]" />
                    </LiquidButton>
                  </div>
                </div>
                <div className="space-y-3 md:space-y-4 p-4 md:p-6" style={{ fontFamily: 'var(--font-aran), var(--font-timeburner), sans-serif' }}>
                  <div>
                    <h3 className={`text-xl md:text-2xl font-bold transition-colors duration-300 ${colors.primary.textLight} dark:text-slate-200`} style={{ fontFamily: getFontFamily(selectedShop.name) }}>
                      {selectedShop.name}
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs md:text-sm text-[#64748B] dark:text-slate-400 flex-shrink-0" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                        {selectedShop.location}
                      </p>
                      <div className="flex items-center gap-1.5 md:gap-2">
                        <LiquidButton
                          type="button"
                          onClick={() => openGoogleMaps(selectedShop.lat, selectedShop.lng)}
                          size="icon"
                          className={`rounded-lg md:rounded-xl bg-gradient-to-r ${colors.primary.gradient} ${colors.primary.gradientDark} p-1.5 md:p-2 text-white shadow-lg ${colors.primary.shadow} transition-all hover:shadow-xl ${colors.primary.hoverShadow} hover:scale-[1.05]`}
                          title="פתח ב-Google Maps"
                        >
                          <Navigation className="h-3 w-3 md:h-4 md:w-4" />
                        </LiquidButton>
                        {selectedShop.instagram && instagramUrl(selectedShop.instagram) && (
                          <LiquidButton
                            type="button"
                            onClick={() => window.open(instagramUrl(selectedShop.instagram) || '', '_blank', 'noopener,noreferrer')}
                            size="icon"
                            className="rounded-lg md:rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 p-1.5 md:p-2 text-white shadow-lg transition-all hover:shadow-xl hover:scale-[1.05]"
                            title="פתח באינסטגרם"
                          >
                            <Instagram className="h-3 w-3 md:h-4 md:w-4" />
                          </LiquidButton>
                        )}
                      </div>
                    </div>
                  </div>

                  <p className="text-xs md:text-sm text-[#64748B] dark:text-slate-400 leading-relaxed" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                    {selectedShop.description}
                  </p>

                  {/* Coffee Mode: Show brew methods - type-safe check */}
                  {'brewMethods' in selectedShop && selectedShop.brewMethods && Array.isArray(selectedShop.brewMethods) && filterBrewMethods(selectedShop.brewMethods).length > 0 && (
                    <div>
                      <h4 className={`mb-2 text-xs font-semibold uppercase transition-colors duration-300 ${colors.primary.text}`} style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                        שיטות חליטה מועדפות
                      </h4>
                      <div className="flex flex-wrap gap-1.5 md:gap-2">
                        {filterBrewMethods(selectedShop.brewMethods as string[]).map((method) => (
                          <span
                            key={method}
                            className={`rounded-full border px-2 md:px-3 py-0.5 md:py-1 text-[10px] md:text-xs transition-colors duration-300 ${
                              appMode === "coffee"
                                ? "border-[#BAE6FD] bg-[#DBEAFE] dark:border-slate-700 dark:bg-slate-800 text-[#64748B] dark:text-slate-300"
                                : "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                            }`}
                            style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                          >
                            {method}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedShop.vibeTags && Array.isArray(selectedShop.vibeTags) && selectedShop.vibeTags.length > 0 && (
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
                      <h4 className="text-xs md:text-sm font-semibold text-[#0C4A6E] dark:text-slate-200" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                        ביקורות מהשטח
                      </h4>
                      <span className="text-[10px] md:text-xs text-[#64748B] dark:text-slate-400" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                        {selectedShopReviews.length} ביקורות
                      </span>
                    </div>
                    <div className="glass max-h-32 md:max-h-40 space-y-2 md:space-y-3 overflow-y-auto rounded-xl p-2 md:p-3">
                      {selectedShopReviews.length === 0 ? (
                        <p className="text-xs md:text-sm text-[#64748B] dark:text-slate-400" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                          עדיין אין ביקורות. היו הראשונים לשתף חוויית קפה.
                        </p>
                      ) : (
                        selectedShopReviews.map((review) => (
                          <div
                            key={review.id}
                            className="glass-button rounded-xl p-2 md:p-3 text-xs md:text-sm text-[#0C4A6E] dark:text-slate-200"
                            style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                          >
                            <div className="flex items-center justify-between flex-wrap gap-1">
                              <span className="font-semibold text-[10px] md:text-xs" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                                {review.author}
                              </span>
                              <span className="text-[10px] md:text-xs text-[#64748B] dark:text-slate-400" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                                ⭐ {review.rating}/5
                              </span>
                            </div>
                            <p className="mt-1 md:mt-2 text-[10px] md:text-xs text-[#64748B] dark:text-slate-400" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>{review.text}</p>
                            {review.source && (
                              <span className="mt-1 md:mt-2 block text-[10px] md:text-xs text-[#38BDF8]" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                                {review.source}
                              </span>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <form
                    className="glass space-y-2 md:space-y-3 rounded-2xl border border-dashed border-white/30 p-3 md:p-4"
                    onSubmit={handleReviewSubmit}
                    style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                  >
                    <h4 className="text-xs md:text-sm font-semibold text-[#0C4A6E] dark:text-slate-200" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                      השאירו ביקורת משלכם
                    </h4>
                    <div>
                      <label className="mb-1 block text-[10px] md:text-xs text-[#64748B] dark:text-slate-400" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                        שם פרטי
                      </label>
                      <input
                        type="text"
                        className="glass-input w-full rounded-xl px-3 md:px-4 py-2 md:py-2.5 text-xs md:text-sm text-[#0C4A6E] dark:text-slate-200 outline-none transition-all"
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
                      <label className="mb-1 block text-[10px] md:text-xs text-[#64748B] dark:text-slate-400" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                        דירוג
                      </label>
                      <select
                        className="w-full rounded-lg border border-[#BAE6FD] dark:border-slate-700 bg-white/80 dark:bg-slate-800 px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm text-[#0C4A6E] dark:text-slate-200 focus:border-[#38BDF8] dark:focus:border-blue-400 focus:outline-none"
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
                      <label className="mb-1 block text-[10px] md:text-xs text-[#64748B] dark:text-slate-400" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                        טקסט חופשי
                      </label>
                      <textarea
                        className="glass-input h-16 md:h-20 w-full rounded-xl px-3 md:px-4 py-2 md:py-2.5 text-xs md:text-sm text-[#0C4A6E] dark:text-slate-200 outline-none transition-all resize-none"
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
          )}
        </AnimatePresence>

        {activeView === "shops" && (
          <AuroraBackground className="h-full w-full">
            <div className="h-full flex flex-col p-4 md:p-6 lg:p-8">
            <h1 
              className="mb-2 text-2xl sm:text-3xl md:text-4xl font-bold text-[#0C4A6E] dark:text-slate-200"
              style={{ fontFamily: 'var(--font-aran), sans-serif' }}
            >
              {appMode === "coffee" ? "בתי קפה ספשלטי" : "בתי מאצ'ה"}
            </h1>
            <p 
              className="mb-4 md:mb-8 text-sm md:text-base text-[#075985] dark:text-blue-300"
              style={{ fontFamily: 'var(--font-aran), sans-serif' }}
            >
              {appMode === "coffee" 
                ? "גלה את בתי הקפה הספשלטי הטובים ביותר בישראל"
                : "גלה את המקומות הטובים ביותר למאצ'ה בישראל"
              }
            </p>

            <div className="flex-1 relative overflow-y-auto">
              <div className="px-2 sm:px-4 md:px-6 pb-12">
                <div className="grid grid-cols-1 gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filteredShops.map((shop) => (
                    <div
                      key={shop.id}
                    >
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="group overflow-hidden rounded-2xl border border-[#BAE6FD] dark:border-slate-800 bg-[#F0F9FF] dark:bg-slate-900 shadow-lg transition-all duration-300 hover:shadow-xl"
                          role="button"
                          tabIndex={0}
                          onClick={() => handleSelectShop(shop)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") handleSelectShop(shop);
                          }}
                        >
                  <div className="relative h-40 sm:h-48 md:h-56">
                    <img
                      src={shop.image}
                      alt={shop.name}
                      className="h-full w-full object-cover"
                    />
                    <LiquidButton
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleFavorite(shop.id);
                      }}
                      size="icon"
                      className="absolute left-3 md:left-4 top-3 md:top-4 rounded-full p-2 md:p-2.5"
                    >
                      <Heart
                        className={`h-4 w-4 md:h-5 md:w-5 transition-all ${
                          favorites.includes(shop.id)
                            ? "fill-[#38BDF8] text-[#38BDF8]"
                            : "text-white"
                        }`}
                      />
                    </LiquidButton>
                    <div className="absolute bottom-0 right-0">
                      {/* White background bar that stretches from right edge and ends after navigate button */}
                      <div 
                        className="bg-white dark:bg-slate-900 rounded-t-lg rounded-l-lg px-2 py-1.5 md:px-3 md:py-2 lg:px-4 lg:py-2.5 backdrop-blur-sm border-t border-l border-slate-200 dark:border-slate-700"
                      >
                        <div className="flex items-center gap-1.5 md:gap-2 lg:gap-3 flex-wrap">
                          <h3 
                            className={`text-sm md:text-base lg:text-lg font-bold flex-shrink-0 transition-colors duration-300 ${
                              appMode === "coffee"
                                ? "text-[#0C4A6E] dark:text-blue-200"
                                : "text-emerald-800 dark:text-emerald-200"
                            }`}
                            style={{ fontFamily: getFontFamily(shop.name) }}
                          >
                            {shop.name}
                          </h3>
                          <p 
                            className="text-[10px] md:text-xs lg:text-sm text-[#64748B] dark:text-slate-400 flex-shrink-0"
                            style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                          >
                            {shop.location}
                          </p>
                          <div className="flex-shrink-0 flex items-center gap-1">
                            <LiquidButton
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openGoogleMaps(shop.lat, shop.lng);
                              }}
                              size="icon"
                              className={`rounded-lg md:rounded-xl bg-gradient-to-r ${colors.primary.gradient} ${colors.primary.gradientDark} p-1 md:p-1.5 text-white shadow-md ${colors.primary.shadow} transition-all hover:shadow-lg ${colors.primary.hoverShadow} hover:scale-[1.05]`}
                              title="פתח ב-Google Maps"
                            >
                              <Navigation className="h-2.5 w-2.5 md:h-3 md:w-3" />
                            </LiquidButton>
                            {shop.instagram && instagramUrl(shop.instagram) && (
                              <LiquidButton
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(instagramUrl(shop.instagram) || '', '_blank', 'noopener,noreferrer');
                                }}
                                size="icon"
                                className="rounded-lg md:rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 p-1 md:p-1.5 text-white shadow-md transition-all hover:shadow-lg hover:scale-[1.05]"
                                title="פתח באינסטגרם"
                              >
                                <Instagram className="h-2.5 w-2.5 md:h-3 md:w-3" />
                              </LiquidButton>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 md:p-5">

                    <p className="mb-3 md:mb-4 text-xs md:text-sm text-[#64748B] dark:text-slate-400 line-clamp-3 md:line-clamp-none">
                      {shop.description}
                    </p>

                    {/* Coffee Mode: Show brew methods - type-safe check */}
                    {'brewMethods' in shop && shop.brewMethods && Array.isArray(shop.brewMethods) && filterBrewMethods(shop.brewMethods).length > 0 && (
                      <div className="mb-4">
                        <h4 
                          className={`mb-2 text-xs font-semibold uppercase transition-colors duration-300 ${colors.primary.text}`}
                          style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                        >
                          שיטות חליטה
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {filterBrewMethods(shop.brewMethods as string[]).map((method) => (
                            <span
                              key={method}
                              className={`rounded-full border px-2 py-1 text-xs transition-colors duration-300 ${
                                appMode === "coffee"
                                  ? "border-[#BAE6FD] bg-[#DBEAFE] dark:border-slate-700 dark:bg-slate-800 text-[#64748B] dark:text-slate-300"
                                  : "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                              }`}
                              style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                            >
                              {method}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-1 md:space-y-2 text-[10px] md:text-xs text-[#075985] dark:text-blue-300">
                      {shop.hours && (
                        <div className="flex items-center gap-1.5 md:gap-2">
                          <Clock className="h-2.5 w-2.5 md:h-3 md:w-3 flex-shrink-0" />
                          <span style={{ fontFamily: 'var(--font-aran), sans-serif' }}>{shop.hours}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 md:mt-4">
                      <textarea
                        placeholder="הוסף הערות שלך..."
                        value={userNotes[shop.id] || ""}
                        onChange={(event) =>
                          setUserNotes({
                            ...userNotes,
                            [shop.id]: event.target.value,
                          })
                        }
                        className="glass-input h-12 md:h-16 w-full resize-none rounded-xl p-2 md:p-3 text-xs md:text-sm text-[#0C4A6E] dark:text-slate-200 outline-none transition-all"
                      />
                    </div>
                  </div>
                        </motion.div>
                    </div>
                  ))}
                </div>
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
            className="pointer-events-auto fixed z-[9999] flex flex-col items-center gap-2"
            style={{ 
              zIndex: 9999,
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
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[#64748B] dark:text-slate-400" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                {selectedShop.location}
              </span>
              <div className="flex items-center gap-1.5">
                <LiquidButton
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openGoogleMaps(selectedShop.lat, selectedShop.lng);
                  }}
                  size="icon"
                  className={`rounded-xl bg-gradient-to-r ${colors.primary.gradient} ${colors.primary.gradientDark} p-1.5 text-white shadow-md ${colors.primary.shadow} transition-all hover:shadow-lg ${colors.primary.hoverShadow} hover:scale-[1.05]`}
                  title="פתח ב-Google Maps"
                >
                  <Navigation className="h-3 w-3" />
                </LiquidButton>
                {selectedShop.instagram && instagramUrl(selectedShop.instagram) && (
                  <LiquidButton
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(instagramUrl(selectedShop.instagram) || '', '_blank', 'noopener,noreferrer');
                    }}
                    size="icon"
                    className="rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 p-1.5 text-white shadow-md transition-all hover:shadow-lg hover:scale-[1.05]"
                    title="פתח באינסטגרם"
                  >
                    <Instagram className="h-3 w-3" />
                  </LiquidButton>
                )}
              </div>
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


