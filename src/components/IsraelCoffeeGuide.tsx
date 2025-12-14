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
  Popup,
  useMap,
  useMapEvents,
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
import { DiscussionEmbed } from "disqus-react";
import { PlaceDetailsModal } from "@/components/PlaceDetailsModal";
import { isPlaceOpen } from "@/lib/formatters";

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
      maxZoom: 18,
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
function FlyToLocation({ location, flyKey, zoom = 14 }: { location: { lat: number; lng: number } | null; flyKey: number; zoom?: number }) {
  const map = useMap();
  const previousFlyKeyRef = React.useRef<number>(-1);

  useEffect(() => {
    if (!location || flyKey === previousFlyKeyRef.current) return;

    // Fly to location with animation
    map.flyTo([location.lat, location.lng], zoom, {
      animate: true,
      duration: 1.5,
    });
    
    previousFlyKeyRef.current = flyKey;
  }, [map, location, flyKey, zoom]);

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

// Create red pinpoint marker for searched address location
const createAddressMarker = () => {
  return L.divIcon({
    className: 'address-location-marker',
    html: `
      <div style="
        position: relative;
        width: 30px;
        height: 42px;
      ">
        <svg width="30" height="42" viewBox="0 0 30 42" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 0C6.716 0 0 6.716 0 15C0 26.25 15 42 15 42C15 42 30 26.25 30 15C30 6.716 23.284 0 15 0Z" fill="#EF4444"/>
          <circle cx="15" cy="15" r="7" fill="white"/>
          <circle cx="15" cy="15" r="4" fill="#EF4444"/>
        </svg>
      </div>
    `,
    iconSize: [30, 42],
    iconAnchor: [15, 42],
    popupAnchor: [0, -42],
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
// Uses two layers: a low-res backdrop layer that loads fast and a main layer for detail
function ThemeTileLayer() {
  const { theme, systemTheme } = useTheme();
  // Use systemTheme as fallback, default to light if theme is not loaded yet
  const currentTheme = theme === "system" ? systemTheme : theme || "light";
  const tileUrl = currentTheme === "dark" 
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  return (
    <>
      {/* Backdrop layer: low-resolution tiles that cover large areas quickly.
          Uses maxNativeZoom to cap tile fetches at zoom 8, then upscales.
          This ensures when zooming out, there's always something rendered. */}
      <TileLayer
        key={`backdrop-${currentTheme}`}
        url={tileUrl}
        subdomains="abcd"
        maxNativeZoom={8}
        maxZoom={18}
        minZoom={5}
        zIndex={1}
        opacity={1}
        keepBuffer={6}
        className="tile-layer-gpu"
      />
      {/* Main layer: full-resolution tiles for detail when zoomed in */}
      <TileLayer
        key={`main-${currentTheme}`}
        url={tileUrl}
        subdomains="abcd"
        maxZoom={18}
        minNativeZoom={9}
        zIndex={2}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        keepBuffer={3}
        updateWhenZooming={false}
        className="tile-layer-gpu"
      />
    </>
  );
}

// Component to close all popups when selectedPlace changes to null
function ClosePopupsOnModalClose({ selectedPlace }: { selectedPlace: Place | null }) {
  const map = useMap();

  React.useEffect(() => {
    if (selectedPlace === null) {
      // Close all popups when modal is closed
      map.closePopup();
    }
  }, [selectedPlace, map]);

  return null;
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
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
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
  const [addressQuery, setAddressQuery] = useState("");
  const [addressLocation, setAddressLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [flyToAddressKey, setFlyToAddressKey] = useState(0);
  const [selectedBrewMethods, setSelectedBrewMethods] = useState<string[]>([]);
  const [showClosedPlaces, setShowClosedPlaces] = useState(true);
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

  const handleSelectShop = (shop: CoffeeShop, event?: React.MouseEvent | MouseEvent, fromListView: boolean = false) => {
    // Find the corresponding Place from the places array
    const place = places.find((p) => p.id === shop.id);
    if (place) {
      setSelectedPlace(place);
    }
    
    // No longer switch to map view or show bubble - just open modal
    setFitBoundsEnabled(false); // Disable FitBounds when selecting a shop
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

  // Geocode address using OpenStreetMap Nominatim API
  const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
    if (!address.trim()) {
      setAddressLocation(null);
      return null;
    }

    setIsGeocoding(true);
    try {
      // Use Nominatim API (free, no API key needed)
      // Add "Israel" to help with geocoding accuracy
      const searchQuery = `${address}, Israel`;
      const encodedQuery = encodeURIComponent(searchQuery);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&limit=1&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'Ca Fe Coffee Guide App' // Required by Nominatim
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
      alert('לא ניתן למצוא את הכתובת. אנא נסה כתובת אחרת.');
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
    }, 800); // Wait 800ms after user stops typing

    return () => clearTimeout(timeoutId);
  }, [addressQuery]);

  // Handle Enter key press to fly to address location
  const handleAddressKeyDown = async (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (addressQuery.trim()) {
        const location = await geocodeAddress(addressQuery);
        if (location) {
          // Trigger fly-to by incrementing the key
          setFlyToAddressKey(prev => prev + 1);
          // Switch to map view if not already
          setActiveView("map");
        }
      }
    }
  };

  // Calculate filtered shops - must be before useEffect that uses it
  const filteredShops = useMemo(() => {
    let shops = coffeeShops.filter((shop) => {
      // Find the corresponding Place to check if it's open
      const place = places.find((p) => p.id === shop.id);
      const isOpen = place ? isPlaceOpen(place.openingHours) : true;
      
      // Filter out closed places unless showClosedPlaces is enabled
      if (!showClosedPlaces && !isOpen) {
        return false;
      }
      
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
      
      return matchesBrew;
    });

    // Sort by distance from address location if available, otherwise from user location
    const sortLocation = addressLocation || userLocation;
    if (sortLocation) {
      shops = [...shops].sort((a, b) => {
        const distanceA = calculateDistance(sortLocation.lat, sortLocation.lng, a.lat, a.lng);
        const distanceB = calculateDistance(sortLocation.lat, sortLocation.lng, b.lat, b.lng);
        return distanceA - distanceB;
      });
    }

    return shops;
  }, [coffeeShops, addressLocation, selectedBrewMethods, appMode, userLocation, places, showClosedPlaces]);

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
      <div
        className={`fixed right-0 top-0 z-40 h-full transition-all duration-300 ease-in-out md:static ${
          sidebarOpen 
            ? "translate-x-0" 
            : "translate-x-full md:translate-x-0"
        } ${sidebarCollapsed ? "w-16 md:w-20" : "w-[280px] sm:w-[300px] md:w-80"}`}
      >
        <div className="h-full w-full overflow-hidden">
          <AuroraBackground
            className="h-full w-full flex flex-col overflow-hidden"
            showRadialGradient={false}
          >
        <motion.div className="flex h-full w-full flex-col overflow-hidden">
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

        {/* Address Search */}
        {!sidebarCollapsed && (
          <div className="px-3 md:px-4 py-2 md:py-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <MapPin className="pointer-events-none absolute right-2 md:right-3 top-1/2 h-3.5 md:h-4 w-3.5 md:w-4 -translate-y-1/2 text-[#075985] dark:text-slate-400" />
                {isGeocoding && (
                  <div className="absolute right-8 md:right-10 top-1/2 -translate-y-1/2">
                    <div className="h-3 w-3 border-2 border-[#075985] dark:border-slate-400 border-t-transparent rounded-full animate-spin" />
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
          {/* Search Results List - shown when address is searched */}
          {!sidebarCollapsed && addressLocation && filteredShops.length > 0 && (
            <div className="mb-4">
              <h3 className="text-xs md:text-sm font-semibold text-[#0C4A6E] dark:text-slate-200 mb-3">
                תוצאות חיפוש
              </h3>
              <div className="space-y-2">
                {filteredShops.map((shop) => {
                  const place = places.find((p) => p.id === shop.id);
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
                      <p className="text-[10px] md:text-xs text-[#64748B] dark:text-slate-400 mb-2">
                        {shop.location}
                      </p>
                      {place && (
                        <div className="flex items-center gap-2">
                          {isPlaceOpen(place.openingHours) ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] md:text-[10px] font-semibold bg-green-500 text-white">
                              פתוח
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[9px] md:text-[10px] font-semibold bg-gray-500 text-white">
                              סגור
                            </span>
                          )}
                          {place.openingHours && (
                            <span className="text-[9px] md:text-[10px] text-[#64748B] dark:text-slate-400">
                              {place.openingHours.split(',')[0]}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Navigation - shown when no address search or when address search has no results */}
          {(!addressLocation || filteredShops.length === 0) && (
            <>
              <div className="space-y-1">
                <LiquidButton
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveView("map");
                    // Close sidebar on mobile when navigating
                    if (window.innerWidth < 768) {
                      setSidebarOpen(false);
                    }
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
                    // Close sidebar on mobile when navigating
                    if (window.innerWidth < 768) {
                      setSidebarOpen(false);
                    }
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
            </>
          )}
        </nav>

        {/* Favorites Section & Suggest Button */}
        {!sidebarCollapsed && (
          <div className="bg-[#E0F2FE] dark:bg-slate-900 border-t border-[#BAE6FD] dark:border-slate-800 p-3 md:p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs md:text-sm font-medium text-[#0C4A6E] dark:text-slate-200">
                מועדפים
              </span>
              <span className="text-[10px] md:text-xs text-[#64748B] dark:text-slate-400">
                {favorites.length} שמורים
              </span>
            </div>
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
        </div>
      </div>

      {/* Suggest Modal */}
      <SuggestModal
        isOpen={isSuggestModalOpen}
        onClose={() => setIsSuggestModalOpen(false)}
      />

      {/* Main Content */}
      <div className="relative flex-1 overflow-auto">
        {/* Circular bubble - shown when shop is selected but detail panel is closed */}
        <AnimatePresence>
          {activeView === "map" && selectedShop && !detailOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="pointer-events-auto absolute inset-0 z-[9999] flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col items-center gap-2">
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
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
                      minZoom={5}
                      maxZoom={18}
                      maxBounds={israelBounds}
                      maxBoundsViscosity={1.0}
                      className="h-full w-full"
                      scrollWheelZoom={true}
                      key="main-map"
                      style={{ 
                        // Background color matching CartoDB basemap to avoid white flash
                        backgroundColor: theme === 'dark' ? '#1d1f21' : '#f2efe9'
                      }}
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
                      {addressLocation && (
                        <>
                          <FlyToLocation location={addressLocation} flyKey={flyToAddressKey} zoom={16} />
                          <Marker
                            position={[addressLocation.lat, addressLocation.lng]}
                            icon={createAddressMarker()}
                          >
                            <Popup>
                              <div className="p-2">
                                <h3 className="font-bold text-sm mb-1">כתובת חיפוש</h3>
                                <p className="text-xs text-slate-600">{addressQuery}</p>
                              </div>
                            </Popup>
                          </Marker>
                        </>
                      )}
                      <ClosePopupsOnModalClose selectedPlace={selectedPlace} />
                      {filteredShops.map((shop) => {
                        // In coffee mode, Canopy is the only roastery, all others are cafes
                        // In matcha mode, all places use matcha marker
                        const isRoastery = appMode === "coffee" && shop.id === "canopy-jerusalem";
                        const markerIcon = isRoastery ? roasteryMarker : cafeMarker;
                        const place = places.find((p) => p.id === shop.id);
                        const isOpen = place ? isPlaceOpen(place.openingHours) : true;
                        
                        return (
                          <Marker
                            key={shop.id}
                            position={[shop.lat, shop.lng]}
                            icon={markerIcon}
                            opacity={isOpen ? 1 : 0.7}
                            eventHandlers={{
                              click: (e) => {
                                // Get the original browser event from Leaflet
                                const originalEvent = e.originalEvent as MouseEvent;
                                handleSelectShop(shop, originalEvent);
                                // Close the popup when opening the modal
                                const marker = e.target;
                                if (marker && typeof marker.closePopup === 'function') {
                                  marker.closePopup();
                                }
                              },
                            }}
                          >
                            <Popup autoClose={false} closeOnClick={false}>
                              <div className="p-2 min-w-[120px]">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <h3 className="font-bold text-sm">{shop.name}</h3>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${
                                      isOpen
                                        ? "bg-green-500 text-white"
                                        : "bg-gray-600 text-white"
                                    }`}
                                  >
                                    {isOpen ? "פתוח" : "סגור"}
                                  </span>
                                </div>
                                {place?.city && (
                                  <p className="text-xs text-slate-600">{place.city}</p>
                                )}
                              </div>
                            </Popup>
                          </Marker>
                        );
                      })}
                    </MapContainer>
                    {/* Floating GPS Button - Enhanced Visibility */}
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[1000]">
                      <div className="relative">
                        {/* Pulsing ring animation */}
                        {!isLoadingLocation && (
                          <div className="absolute inset-0 rounded-full bg-[#0284C7] dark:bg-blue-500 animate-ping opacity-20" style={{ animationDuration: '2s' }} />
                        )}
                        {/* Outer glow ring */}
                        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#0284C7] to-[#38BDF8] dark:from-blue-500 dark:to-blue-400 opacity-30 blur-md" />
                        <LiquidButton
                          type="button"
                          onClick={handleGeolocation}
                          size="icon"
                          disabled={isLoadingLocation}
                          className={`relative rounded-full p-4 bg-gradient-to-br from-[#0284C7] to-[#0EA5E9] dark:from-blue-600 dark:to-blue-500 shadow-2xl border-2 border-white dark:border-slate-200 hover:scale-110 active:scale-95 transition-all duration-200 ${
                            isLoadingLocation ? "opacity-70 cursor-not-allowed" : "hover:shadow-[0_0_20px_rgba(2,132,199,0.6)]"
                          }`}
                          title="מצא את המיקום שלי"
                        >
                          {isLoadingLocation ? (
                            <div className="h-6 w-6 border-[3px] border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Crosshair className="h-6 w-6 text-white drop-shadow-lg" strokeWidth={2.5} />
                          )}
                        </LiquidButton>
                      </div>
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

                  {/* Disqus Comments Section */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className={`text-xs md:text-sm font-semibold ${colors.primary.text} dark:text-slate-200`} style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                        💬 ביקורות והמלצות
                      </h4>
                    </div>
                    <div className="rounded-xl overflow-hidden">
                      <DiscussionEmbed
                        shortname="ca-fe-israel"
                        config={{
                          url: typeof window !== 'undefined' ? window.location.href : '',
                          identifier: selectedShop.id,
                          title: selectedShop.name,
                          language: 'he',
                        }}
                      />
                    </div>
                  </div>
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
                          onClick={() => handleSelectShop(shop, undefined, true)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") handleSelectShop(shop, undefined, true);
                          }}
                        >
                  <div className="relative h-40 sm:h-48 md:h-56">
                    {(() => {
                      const place = places.find((p) => p.id === shop.id);
                      const isOpen = place ? isPlaceOpen(place.openingHours) : true;
                      return (
                        <>
                          <img
                            src={shop.image}
                            alt={shop.name}
                            className={`h-full w-full object-cover transition-all duration-300 ${
                              !isOpen ? "grayscale opacity-70" : ""
                            }`}
                          />
                          {/* Status Badge */}
                          <div className="absolute top-2 right-2">
                            <span
                              className={`px-2 py-1 rounded-full text-[10px] font-semibold shadow-lg ${
                                isOpen
                                  ? "bg-green-500 text-white"
                                  : "bg-gray-600 text-white"
                              }`}
                              style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                            >
                              {isOpen ? "פתוח" : "סגור"}
                            </span>
                          </div>
                        </>
                      );
                    })()}
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

      {/* Place Details Modal */}
      <PlaceDetailsModal
        place={selectedPlace}
        isOpen={selectedPlace !== null}
        onClose={() => setSelectedPlace(null)}
      />
    </div>
  );
}


