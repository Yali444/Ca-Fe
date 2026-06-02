"use client";

import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from "react";
import {
  MapPin,
  Coffee,
  Leaf,
  Search,
  Clock,
  Locate,
  LayoutGrid,
  List,
} from "lucide-react";
import type L from "leaflet";
import {
  type CoffeeShop,
  mapPlaceToCoffeeShop,
} from "@/lib/coffee-shop";
import { isMatchaOnlyPlace } from "@/data/matcha-only-places";
import { usePlaceData } from "@/hooks/usePlaceData";
import { useTheme } from "next-themes";
import { AboutView } from "@/components/AboutView";
import { DetailPanel } from "@/components/DetailPanel";
import { MapView } from "@/components/MapView";
import { Sidebar } from "@/components/Sidebar";
import { ShopsView } from "@/components/ShopsView";
import { MobileSearchOverlay } from "@/components/MobileSearchOverlay";
import { SelectionBubble } from "@/components/SelectionBubble";
import { CasualDecorations, SnowParticles } from "@/components/ChristmasDecorations";
import { isPlaceOpen } from "@/lib/formatters";
import {
  parseRangeMinutes,
} from "@/lib/opening-hours";
import {
  MAIN_AREAS,
  MAIN_AREA_SET,
  getAreaForCity,
  groupShopsByArea,
  type MainArea,
} from "@/lib/israel-areas";
import { calculateDistance, calculateMapCenter } from "@/lib/geo";
import { buildShareUrl } from "@/lib/share";
import { suggestMissingPlace } from "@/lib/report";
import { SkeletonCard, AppSkeleton } from "@/components/SkeletonLoader";
import { ShopCardSkeleton } from "@/components/ShopCardSkeleton";
import { useOfflineSupport } from "@/hooks/useOfflineSupport";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useIsMobileSafari } from "@/hooks/useIsMobileSafari";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useAddressSearch } from "@/hooks/useAddressSearch";
import { useFavorites } from "@/hooks/useFavorites";
import { useReviews } from "@/hooks/useReviews";
import { useFilters } from "@/hooks/useFilters";
import { useGeolocation } from "@/hooks/useGeolocation";
import { OfflineIndicator, OfflineBanner } from "@/components/ui/OfflineIndicator";
import {
  createCafeMarker,
  createMatchaMarker,
  createRoasteryMarker,
} from "@/components/map/map-icons";

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
  const { favorites, toggleFavorite } = useFavorites();
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const shareMessageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const [flyToAddressKey, setFlyToAddressKey] = useState(0);
  const [flyToShopTarget, setFlyToShopTarget] = useState<{ lat: number; lng: number } | null>(null);
  const [flyToShopKey, setFlyToShopKey] = useState(0);
  const pendingSearchShopRef = useRef<CoffeeShop | null>(null);
  const { filters, actions: filterActions } = useFilters();
  const {
    selectedBrewMethods,
    sellsBeansFilter,
    favoritesFilter,
    showOpenNowOnly,
    noMatchaFilter,
    onlineOnlyFilter,
    selectedRegionFilter,
  } = filters;
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const { reduceMotion, prefersReducedMotion } = useReducedMotion();
  const [shopsToDisplay, setShopsToDisplay] = useState(12);
  const [gridColumns, setGridColumns] = useState<1 | 2>(1);
  const isMobileSafari = useIsMobileSafari();
  const isOnline = useOnlineStatus();
  const viewSwitchTriggeredByOnlineOnlyFilter = useRef(false);

  // Unified search box state + geocoding. Map/view side effects (fly, switch
  // view, close panels) are wired back via the two callbacks below.
  const {
    addressQuery,
    setAddressQuery,
    searchFocused,
    setSearchFocused,
    searchHighlightIndex,
    setSearchHighlightIndex,
    lastSearchedAddress,
    addressSearchError,
    setAddressSearchError,
    addressLocation,
    isGeocoding,
    recentAddresses,
    catalogMatches,
    runAddressSearch,
    handleAddressKeyDown,
    handleMobileAddressSearch,
    clearAddressSearch,
    restoreLastSearchedAddress,
  } = useAddressSearch({
    isOnline,
    coffeeShops,
    onSelectShop: (shop) => handleSelectSearchResult(shop),
    onAddressResolved: () => {
      setFlyToAddressKey((prev) => prev + 1);
      setActiveView("map");
      setMobileSearchOpen(false);
      if (typeof window !== "undefined" && window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    },
  });

  // "Locate me" GPS state + handler (fly-to key is consumed by the map).
  const {
    userLocation,
    setUserLocation,
    gpsStatus,
    gpsMessage,
    gpsMessageFading,
    flyToUserKey,
    handleGetUserLocation,
  } = useGeolocation({ isOnline });

  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [fitBoundsEnabled, setFitBoundsEnabled] = useState(true);
  const [bubblePosition, setBubblePosition] = useState<{ x: number; y: number } | null>(null);
  const [previousZoom, setPreviousZoom] = useState<number>(8);
  const { selectedShopReviews, reviewDraft, setReviewDraft, handleReviewSubmit } =
    useReviews(coffeeShops, detailOpen, selectedShop);
  const [mapReady, setMapReady] = useState(false);
  const [mounted, setMounted] = useState(false);
  const invalidateSizeRef = useRef(false);
  const lastInvalidateRef = useRef(0);

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

  // Mobile Safari needs a brief delay before mounting the map to avoid a
  // documented crash on tab switches. Everywhere else we mount immediately.
  useEffect(() => {
    if (activeView !== "map") {
      setMapReady(false);
      return;
    }

    // Don't re-trigger if already ready
    if (mapReady) return;

    if (!isMobileSafari) {
      // Desktop / non-Safari mobile: no artificial delay — map renders
      // as soon as the tab opens.
      setMapReady(true);
      return;
    }

    // Mobile Safari only: 1s delay to prevent the documented crash.
    const timer = setTimeout(() => {
      setMapReady(true);
    }, 1000);
    return () => clearTimeout(timer);
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
    // The setAddress* setters come from useAddressSearch but are stable useState
    // dispatchers, so listing them keeps exhaustive-deps satisfied without churn.
  }, [setAddressQuery, setSearchFocused, setSearchHighlightIndex, setAddressSearchError]);

  const handleOpenDetailPanel = () => {
    setDetailOpen(true);
    // No zoom - just open the detail panel
  };

  // Filter toggles wrap the reducer actions with the map/view side effects that
  // aren't part of filter state (disabling fitBounds so the map keeps its zoom).
  const toggleBrewMethod = (method: string) => {
    filterActions.toggleBrewMethod(method);
    setFitBoundsEnabled(false);
  };

  const toggleNoMatchaFilter = () => {
    filterActions.toggleNoMatcha();
    setFitBoundsEnabled(false);
  };

  const toggleOnlineOnlyFilter = () => {
    const newValue = !onlineOnlyFilter;
    filterActions.toggleOnlineOnly(); // also clears region filter when enabling
    setFitBoundsEnabled(false);
    if (newValue) {
      // Auto-switch to shops view since online-only places have no map location
      setActiveView("shops");
    }
  };

  const toggleSellsBeansFilter = () => {
    filterActions.toggleSellsBeans();
    setFitBoundsEnabled(false);
  };

  const toggleFavoritesFilter = () => {
    filterActions.toggleFavorites();
    setFitBoundsEnabled(false);
  };

  const toggleShowOpenNowFilter = () => {
    filterActions.toggleOpenNow();
    setFitBoundsEnabled(false);
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
      

      <Sidebar
        sidebarOpen={sidebarOpen}
        sidebarCollapsed={sidebarCollapsed}
        isMobile={isMobile}
        prefersReducedMotion={prefersReducedMotion}
        onToggleOpen={() => {
          const nextOpen = !sidebarOpen;
          setSidebarOpen(nextOpen);
          if (nextOpen) {
            setDetailOpen(false);
            setSelectedShop(null);
            setBubblePosition(null);
          }
        }}
        onCloseSidebar={() => setSidebarOpen(false)}
        onToggleCollapsed={() => setSidebarCollapsed((c) => !c)}
        activeView={activeView}
        onNavigate={(view) => {
          setActiveView(view);
          setDetailOpen(false);
          setSelectedShop(null);
          setBubblePosition(null);
          if (window.innerWidth < 768) {
            setSidebarOpen(false);
          }
        }}
        addressQuery={addressQuery}
        onAddressQueryChange={(value) => {
          setAddressQuery(value);
          if (addressSearchError) setAddressSearchError(null);
        }}
        isGeocoding={isGeocoding}
        addressSearchError={addressSearchError}
        onSearchFocus={() => setSearchFocused(true)}
        onSearchBlur={() => window.setTimeout(() => setSearchFocused(false), 150)}
        onAddressKeyDown={handleAddressKeyDown}
        addressLocation={addressLocation}
        lastSearchedAddress={lastSearchedAddress}
        recentAddresses={recentAddresses}
        onRecentClick={(recent) => {
          setAddressQuery(recent);
          setAddressSearchError(null);
        }}
        onClearAddressSearch={clearAddressSearch}
        onRestoreLastAddress={restoreLastSearchedAddress}
        searchDropdown={renderSearchDropdown()}
        nearbyCount={filteredShops.length}
        favoritesFilter={favoritesFilter}
        sellsBeansFilter={sellsBeansFilter}
        noMatchaFilter={noMatchaFilter}
        onlineOnlyFilter={onlineOnlyFilter}
        selectedBrewMethods={selectedBrewMethods}
        favoritesCount={favorites.length}
        onToggleFavoritesFilter={toggleFavoritesFilter}
        onToggleSellsBeansFilter={toggleSellsBeansFilter}
        onToggleNoMatchaFilter={toggleNoMatchaFilter}
        onToggleOnlineOnlyFilter={toggleOnlineOnlyFilter}
        onToggleBrewMethod={toggleBrewMethod}
        onSuggestMissingPlace={suggestMissingPlace}
      />

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
          <MapView
            activeFilterCount={[
              selectedBrewMethods.length > 0,
              sellsBeansFilter,
              favoritesFilter,
              showOpenNowOnly,
              noMatchaFilter,
              onlineOnlyFilter,
              selectedRegionFilter !== null,
            ].filter(Boolean).length}
            mapShops={mapShops}
            addressLocation={addressLocation}
            userLocation={userLocation}
            lastSearchedAddress={lastSearchedAddress}
            addressQuery={addressQuery}
            isBrowser={isBrowser}
            mapReady={mapReady}
            error={error}
            flyToAddressKey={flyToAddressKey}
            flyToShopTarget={flyToShopTarget}
            flyToShopKey={flyToShopKey}
            flyToUserKey={flyToUserKey}
            fitBoundsEnabled={fitBoundsEnabled}
            cafeMarker={cafeMarker}
            matchaMarker={matchaMarker}
            roasteryMarker={roasteryMarker}
            onCloseDetail={() => {
              setDetailOpen(false);
              setSelectedShop(null);
            }}
            onMapReady={setMapInstance}
            onClearAddressSearch={clearAddressSearch}
            onSelectShop={handleSelectShop}
            onFlyToShopArrived={() => {
              const s = pendingSearchShopRef.current;
              if (s) {
                pendingSearchShopRef.current = null;
                handleSelectShop(s);
              }
            }}
          />
        )}

        {/* Full detail panel - shown when detailOpen is true (works in both map and shops view) */}
        <DetailPanel
          selectedShop={selectedShop}
          detailOpen={detailOpen}
          isMobile={isMobile}
          shareMessage={shareMessage}
          favorites={favorites}
          reviews={selectedShopReviews}
          reviewDraft={reviewDraft}
          setReviewDraft={setReviewDraft}
          onClose={() => setDetailOpen(false)}
          onToggleFavorite={toggleFavorite}
          onShare={handleShare}
          onReviewSubmit={handleReviewSubmit}
        />

        {activeView === "shops" && (
          <ShopsView
            filteredShops={filteredShops}
            paginatedFilteredShops={paginatedFilteredShops}
            paginatedGroupedShops={paginatedGroupedShops}
            groupedAreaTotalCounts={groupedAreaTotalCounts}
            availableRegions={availableRegions}
            addressLocation={addressLocation}
            userLocation={userLocation}
            lastSearchedAddress={lastSearchedAddress}
            addressQuery={addressQuery}
            selectedRegionFilter={selectedRegionFilter}
            onlineOnlyFilter={onlineOnlyFilter}
            favorites={favorites}
            shopsToDisplay={shopsToDisplay}
            gridColsClass={gridColsClass}
            onClearAddressSearch={clearAddressSearch}
            onSelectRegion={(area) => {
              filterActions.setRegion(area);
              setFitBoundsEnabled(false); // Disable fitBounds to prevent zoom reset when toggling filter
            }}
            onToggleOnlineOnly={toggleOnlineOnlyFilter}
            onSelectShop={handleSelectShopFromShopsView}
            onToggleFavorite={toggleFavorite}
            onShowMore={() => setShopsToDisplay((prev) => prev + 12)}
            onClearUserLocation={() => setUserLocation(null)}
          />
        )}

      {/* About Me Page */}
      {activeView === "about" && <AboutView />}

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
              onClick={toggleShowOpenNowFilter}
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
        <MobileSearchOverlay
          onClose={() => setMobileSearchOpen(false)}
          addressQuery={addressQuery}
          onAddressQueryChange={(value) => {
            setAddressQuery(value);
            if (addressSearchError) setAddressSearchError(null);
          }}
          onSearchFocus={() => setSearchFocused(true)}
          onSearchBlur={() => window.setTimeout(() => setSearchFocused(false), 150)}
          onAddressKeyDown={handleAddressKeyDown}
          searchDropdown={renderSearchDropdown()}
          onSearch={handleMobileAddressSearch}
          isGeocoding={isGeocoding}
          addressSearchError={addressSearchError}
          recentAddresses={recentAddresses}
          onRecentClick={(recent) => {
            setAddressQuery(recent);
            setAddressSearchError(null);
          }}
        />
      )}

      {/* Circular bubble - shown when shop is selected but detail panel is closed */}
      <SelectionBubble
        visible={activeView === "map" && !detailOpen}
        selectedShop={selectedShop}
        bubblePosition={bubblePosition}
        sidebarOpen={sidebarOpen}
        onOpenDetail={handleOpenDetailPanel}
        onClose={() => {
          // Don't zoom out - just close the bubble and keep current zoom level
          setDetailOpen(false);
          setSelectedShop(null);
          setBubblePosition(null);
          // Don't re-enable fitBounds to prevent auto-zoom
        }}
      />
    </div>
  );
}

