"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { MotionConfig } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import {
  type CoffeeShop,
  mapPlaceToCoffeeShop,
} from "@/lib/coffee-shop";
import { usePlaceData } from "@/hooks/usePlaceData";
import { AboutView } from "@/components/AboutView";
import { DetailPanel } from "@/components/DetailPanel";
import { Sidebar } from "@/components/Sidebar";
import { ShopsView } from "@/components/ShopsView";
import { MobileSearchOverlay } from "@/components/MobileSearchOverlay";
import { MobileFilterSheet } from "@/components/MobileFilterSheet";
import { SelectionBubble } from "@/components/SelectionBubble";
import { CasualDecorations, SnowParticles } from "@/components/ChristmasDecorations";
import { isPlaceOpen } from "@/lib/formatters";
import { hasHoursOnWeekday } from "@/lib/opening-hours";
import {
  MAIN_AREA_SET,
  getAreaForCity,
  groupShopsByArea,
  type MainArea,
} from "@/lib/israel-areas";
import { calculateDistance } from "@/lib/geo";
import { buildShareUrl } from "@/lib/share";
import {
  parseFiltersFromSearch,
  buildSearchFromFilters,
  hasFilterParams,
} from "@/lib/filter-url";
import { suggestMissingPlace } from "@/lib/report";
import { AppSkeleton, SkeletonMapLoader } from "@/components/SkeletonLoader";
import { useOfflineSupport } from "@/hooks/useOfflineSupport";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useIsMobileSafari } from "@/hooks/useIsMobileSafari";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useAddressSearch } from "@/hooks/useAddressSearch";
import { useFavorites } from "@/hooks/useFavorites";
import { useReviews } from "@/hooks/useReviews";
import { useFilters } from "@/hooks/useFilters";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useMapLifecycle } from "@/hooks/useMapLifecycle";
import { useMapSelection } from "@/hooks/useMapSelection";
import { useSpecialDay } from "@/hooks/useSpecialDay";
import { OfflineIndicator, OfflineBanner } from "@/components/ui/OfflineIndicator";
import { SpecialDayBanner } from "@/components/SpecialDayBanner";

// Lazy-load the map (and the heavy Leaflet + markercluster bundle it pulls in)
// only when the map view is actually shown. The default landing view is the
// shops list, so most first paints — especially on mobile — no longer pay for
// the map chunk up front. ssr:false because Leaflet is browser-only anyway.
const MapView = dynamic(
  () => import("@/components/MapView").then((m) => m.MapView),
  { ssr: false, loading: () => <SkeletonMapLoader /> }
);

export default function IsraelCoffeeGuide() {
  // Offline support
  const { registerServiceWorker } = useOfflineSupport();
  const { notice: specialDayNotice } = useSpecialDay();
  
  // Register service worker on mount (once only — registerServiceWorker is a
  // new function reference each render so must NOT be in the dep array)
  useEffect(() => {
    registerServiceWorker();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Load all places (unified approach - no mode separation)
  const { places: allPlaces, error } = usePlaceData();
  
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

  const { favorites, toggleFavorite } = useFavorites();
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const shareMessageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const [activeView, setActiveView] = useState<"map" | "shops" | "about">(() => {
    // Restore the last view on mobile so returning PWA users keep their context.
    // Desktop intentionally defaults to the map (the resize effect enforces it).
    if (typeof window === "undefined" || window.innerWidth >= 1024) return "shops";
    const saved = window.localStorage.getItem("cafe-active-view");
    return saved === "map" || saved === "shops" || saved === "about" ? saved : "shops";
  });
  const [flyToAddressKey, setFlyToAddressKey] = useState(0);
  const { filters, actions: filterActions } = useFilters();
  const {
    selectedBrewMethods,
    sellsBeansFilter,
    favoritesFilter,
    showOpenNowOnly,
    openShabbatFilter,
    noMatchaFilter,
    onlineOnlyFilter,
    selectedRegionFilter,
  } = filters;
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const { prefersReducedMotion } = useReducedMotion();

  // Total active filters — drives the map badge, the mobile filter button badge
  // and the filter sheet header.
  const activeFilterCount =
    selectedBrewMethods.length +
    [
      sellsBeansFilter,
      favoritesFilter,
      showOpenNowOnly,
      openShabbatFilter,
      noMatchaFilter,
      onlineOnlyFilter,
      selectedRegionFilter !== null,
    ].filter(Boolean).length;
  const [shopsToDisplay, setShopsToDisplay] = useState(12);
  const [gridColumns, setGridColumns] = useState<1 | 2>(1);
  const isMobileSafari = useIsMobileSafari();
  const isOnline = useOnlineStatus();

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

  const [mounted, setMounted] = useState(false);

  // Leaflet map DOM lifecycle: instance handle, mount gate, tile invalidation.
  const { setMapInstance, mapReady } = useMapLifecycle({
    activeView,
    isMobileSafari,
    sidebarCollapsed,
    sidebarOpen,
  });

  // Map selection: active shop, its preview card, and fly-to navigation.
  const activateMap = useCallback(() => setActiveView("map"), []);
  const {
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
  } = useMapSelection({ onActivateMap: activateMap });

  const { selectedShopReviews, reviewDraft, setReviewDraft, handleReviewSubmit } =
    useReviews(coffeeShops, detailOpen, selectedShop);

  // Clear any transient share message when the selected shop changes.
  useEffect(() => {
    if (shareMessageTimeoutRef.current) {
      clearTimeout(shareMessageTimeoutRef.current);
      shareMessageTimeoutRef.current = null;
    }
    setShareMessage(null);
  }, [selectedShop]);

  // Auto-open shared cafe via ?cafe=
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const cafeId = params.get("cafe");
    if (!cafeId) return;
    const found = coffeeShops.find((shop) => shop.id === cafeId);
    if (found) {
      selectShop(found, true);
      setActiveView("map");
    }
  }, [coffeeShops, selectShop]);

  // ── Shareable filter state in the URL ──────────────────────────────────
  // Hydrate once from the query string (a shared link wins over saved filters),
  // then mirror the active filters + sort back into the URL so any filtered
  // view can be copied and shared. Managed keys are replaced while other params
  // (e.g. ?cafe=) are preserved.
  const urlSyncReadyRef = useRef(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const parsed = parseFiltersFromSearch(window.location.search);
    if (hasFilterParams(parsed)) {
      filterActions.hydrate(parsed.filters);
    }
    urlSyncReadyRef.current = true;
    // Run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!urlSyncReadyRef.current || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    ["beans", "fav", "open", "shabbat", "nomatcha", "online", "brew", "region", "sort"].forEach(
      (key) => params.delete(key),
    );
    const mine = new URLSearchParams(buildSearchFromFilters(filters));
    mine.forEach((value, key) => params.set(key, value));
    const qs = params.toString();
    window.history.replaceState(
      window.history.state,
      "",
      qs ? `?${qs}` : window.location.pathname,
    );
  }, [filters]);

  // Keep the URL in sync with the open cafe so the detail panel is shareable,
  // survives a refresh, and — most importantly on mobile — closes on Back
  // instead of leaving the site. We push a history entry when the panel opens
  // and pop it when it's dismissed from the UI.
  const cafeHistoryPushedRef = useRef(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const currentParam = url.searchParams.get("cafe");

    if (detailOpen && selectedShop) {
      if (currentParam === selectedShop.id) return;
      url.searchParams.set("cafe", selectedShop.id);
      if (!cafeHistoryPushedRef.current && !currentParam) {
        // Normal browse → add a back-able entry.
        window.history.pushState({ cafeDetail: true }, "", url);
        cafeHistoryPushedRef.current = true;
      } else {
        // Arrived via a shared ?cafe= link, or switching shops while open.
        window.history.replaceState({ cafeDetail: true }, "", url);
      }
    } else if (currentParam) {
      if (cafeHistoryPushedRef.current) {
        cafeHistoryPushedRef.current = false;
        window.history.back(); // pops our pushed entry, stripping ?cafe=
      } else {
        url.searchParams.delete("cafe");
        window.history.replaceState({}, "", url);
      }
    }
  }, [detailOpen, selectedShop]);

  // Hardware/browser Back closes the panel rather than navigating away.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPopState = () => {
      cafeHistoryPushedRef.current = false;
      if (detailOpen) closeDetail();
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [detailOpen, closeDetail]);

  // Persist the active view so returning mobile users land where they left off
  // (the initial value is restored lazily in useState above).
  useEffect(() => {
    try {
      window.localStorage.setItem("cafe-active-view", activeView);
    } catch {
      // Storage blocked/full — non-fatal.
    }
  }, [activeView]);

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
    // Re-bind when isMobileSafari resolves so the handler never reads a stale value.
  }, [isMobileSafari]);

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

  useEffect(() => {
    setReviewDraft({ name: "", text: "", rating: 5 });
  }, [selectedShop, setReviewDraft]);

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
                  name={shop.type === "matcha" ? "Leaf" : "Coffee"}
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
            <Icon name="Search" className="h-4 w-4 flex-shrink-0 text-[#64748B] dark:text-slate-400" />
            <span className="min-w-0 flex-1 truncate text-sm text-[#0C4A6E] dark:text-slate-200">
              חפש כתובת:{" "}
              <span className="font-medium">&quot;{addressQuery.trim()}&quot;</span>
            </span>
          </button>
        </div>
      </div>
    );
  };

  const handleSelectShopFromShopsView = useCallback(
    (shop: CoffeeShop) => selectShop(shop, true),
    [selectShop]
  );

  // Pick a cafe from the unified search: clear the search box, close any mobile
  // panels, then fly the map to it (selection completes on fly-to arrival).
  const handleSelectSearchResult = useCallback((shop: CoffeeShop) => {
    setAddressQuery("");
    setSearchFocused(false);
    setSearchHighlightIndex(-1);
    setAddressSearchError(null);
    setMobileSearchOpen(false);
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
    flyToShop(shop);
  }, [setAddressQuery, setSearchFocused, setSearchHighlightIndex, setAddressSearchError, flyToShop]);

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

  const toggleOpenShabbatFilter = () => {
    filterActions.toggleOpenShabbat();
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

      // Filter by "Open on Shabbat" (Saturday) — handy for weekend planning
      const matchesShabbat = openShabbatFilter ? hasHoursOnWeekday(shop.hours, 'saturday') : true;

      // Filter by matcha exclusion
      const matchesMatchaFilter = noMatchaFilter ? shop.type !== 'matcha' : true;

      // Filter by online-only: show online-only roasteries and workshops places
      const matchesOnlineOnly = onlineOnlyFilter ? (shop.isOnlineOnly === true || isWorkshops) : true;

      // Filter by region — online-only places have no physical region so they always pass
      const matchesRegion = selectedRegionFilter === null || shop.isOnlineOnly === true || getAreaForCity(shop.location) === selectedRegionFilter;

      // Filter out hidden places
      const matchesHidden = !shop.hidden;

      return matchesBrew && matchesSellsBeans && matchesFavorites && matchesRoasteryOnlyFilter && matchesOpenNow && matchesShabbat && matchesMatchaFilter && matchesRegion && matchesHidden && matchesOnlineOnly;
    });

    // Sort order:
    //  • When a GPS location is known, distance always wins (most useful).
    //  • Otherwise sort by name; the view re-groups it by region.
    const byName = (a: CoffeeShop, b: CoffeeShop) =>
      (a.name || '').localeCompare(b.name || '', 'he');
    const sortLocation = userLocation;
    if (sortLocation) {
      shops = [...shops].sort((a, b) => {
        const distanceA = calculateDistance(sortLocation.lat, sortLocation.lng, a.lat, a.lng);
        const distanceB = calculateDistance(sortLocation.lat, sortLocation.lng, b.lat, b.lng);
        return distanceA - distanceB;
      });
    } else {
      shops = [...shops].sort(byName);
    }

    return shops;
  }, [coffeeShops, userLocation, selectedBrewMethods, sellsBeansFilter, favoritesFilter, favorites, showOpenNowOnly, openShabbatFilter, noMatchaFilter, onlineOnlyFilter, selectedRegionFilter]);

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
      const matchesShabbat = openShabbatFilter ? hasHoursOnWeekday(shop.hours, 'saturday') : true;
      const matchesMatchaFilter = noMatchaFilter ? shop.type !== 'matcha' : true;
      return matchesBrew && matchesSellsBeans && matchesFavorites && matchesRoasteryOnlyFilter && matchesOpenNow && matchesShabbat && matchesMatchaFilter;
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
  }, [coffeeShops, selectedBrewMethods, sellsBeansFilter, favoritesFilter, favorites, showOpenNowOnly, openShabbatFilter, noMatchaFilter, onlineOnlyFilter, userLocation]);

  // Group shops by area for display in shops view (when no address/user
  // location search is active). An active GPS location shows a flat,
  // distance-sorted list instead.
  const groupedShops = useMemo(() => {
    if (userLocation) {
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
    <MotionConfig reducedMotion="user">
    <div className="flex h-screen w-screen overflow-hidden bg-gradient-to-br from-[#E0F2FE] via-[#F0F9FF] to-[#DBEAFE] dark:bg-[#0B1120] antialiased">
      {/* Special-day notice (holidays / memorial days): advisory only, never
          changes open/closed status. Suppressed on the map view where the
          fixed top banner would overlap the full-bleed tiles. */}
      {activeView !== "map" && <SpecialDayBanner notice={specialDayNotice} />}

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
      {/* Floating decorations in the background. Skipped on the map view: the
          map is full-bleed, so the fixed z-[1] emoji/particle layer would float
          on top of the tiles (distracting) and burn GPU on animations no one can
          enjoy behind a map. Kept on the shops/about views where they're seen. */}
      {(() => {
        // Only disable if user explicitly prefers reduced motion, not just because it's mobile
        const prefersReducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        return activeView !== "map" && !prefersReducedMotion && (
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
            clearSelection();
          }
        }}
        onCloseSidebar={() => setSidebarOpen(false)}
        onToggleCollapsed={() => setSidebarCollapsed((c) => !c)}
        menuButtonHidden={detailOpen || mobileSearchOpen}
        activeView={activeView}
        onNavigate={(view) => {
          setActiveView(view);
          clearSelection();
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
        openShabbatFilter={openShabbatFilter}
        showOpenNowOnly={showOpenNowOnly}
        selectedBrewMethods={selectedBrewMethods}
        favoritesCount={favorites.length}
        onToggleFavoritesFilter={toggleFavoritesFilter}
        onToggleSellsBeansFilter={toggleSellsBeansFilter}
        onToggleNoMatchaFilter={toggleNoMatchaFilter}
        onToggleOnlineOnlyFilter={toggleOnlineOnlyFilter}
        onToggleOpenShabbatFilter={toggleOpenShabbatFilter}
        onToggleOpenNowFilter={toggleShowOpenNowFilter}
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
            activeFilterCount={activeFilterCount}
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
            onCloseDetail={clearSelection}
            onMapReady={setMapInstance}
            onClearAddressSearch={clearAddressSearch}
            onSelectShop={(shop) => selectShop(shop)}
            onFlyToShopArrived={resolveFlyToShop}
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
          onClose={closeDetail}
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
            favoritesActive={favoritesFilter}
            hasActiveFilters={
              selectedBrewMethods.length > 0 ||
              sellsBeansFilter ||
              favoritesFilter ||
              showOpenNowOnly ||
              openShabbatFilter ||
              noMatchaFilter ||
              onlineOnlyFilter ||
              selectedRegionFilter !== null
            }
            favorites={favorites}
            shopsToDisplay={shopsToDisplay}
            gridColsClass={gridColsClass}
            onClearAddressSearch={clearAddressSearch}
            onSelectRegion={(area) => {
              filterActions.setRegion(area);
              setFitBoundsEnabled(false); // Disable fitBounds to prevent zoom reset when toggling filter
            }}
            onSelectShop={handleSelectShopFromShopsView}
            onToggleFavorite={toggleFavorite}
            onShowMore={() => setShopsToDisplay((prev) => prev + 12)}
            onClearUserLocation={() => setUserLocation(null)}
            onClearAllFilters={() => {
              filterActions.reset();
              setFitBoundsEnabled(false);
            }}
          />
        )}

      {/* About Me Page */}
      {activeView === "about" && <AboutView />}

    </div>

      <div className="fixed inset-x-0 bottom-0 z-[9997]">
        <div
          className="mx-auto w-full max-w-4xl px-4"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <div className="flex items-center justify-center gap-1 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md px-3 py-2 shadow-xl md:max-w-lg md:mx-auto">
            <button
              type="button"
              onClick={() => setMobileSearchOpen(true)}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl px-2 py-2 min-h-[44px] text-sm font-medium text-[#0C4A6E] dark:text-slate-100 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors"
              style={{ fontFamily: 'var(--font-aran), sans-serif' }}
            >
              <Icon name="Search" className="h-4 w-4" />
              <span>חיפוש</span>
            </button>

            <button
              type="button"
              onClick={toggleShowOpenNowFilter}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-2 py-2 min-h-[44px] text-sm font-medium transition-colors ${
                showOpenNowOnly
                  ? 'bg-green-500/90 text-white'
                  : 'text-[#0C4A6E] dark:text-slate-100 hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
              }`}
              style={{ fontFamily: 'var(--font-aran), sans-serif' }}
            >
              <Icon name="Clock" className="h-4 w-4" />
              <span>פתוח</span>
            </button>

            <button
              type="button"
              aria-label="קרוב אליי"
              onClick={handleGetUserLocation}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-2 py-2 min-h-[44px] text-sm font-medium transition-colors whitespace-nowrap ${
                gpsStatus === "locating"
                  ? 'bg-blue-500/90 text-white'
                  : 'text-[#0C4A6E] dark:text-slate-100 hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
              }`}
              style={{ fontFamily: 'var(--font-aran), sans-serif' }}
            >
              <Icon name="Locate" className={`h-4 w-4 ${gpsStatus === "locating" ? 'animate-spin' : ''}`} />
              <span>קרוב אליי</span>
            </button>

            <button
              type="button"
              aria-label="מסננים"
              onClick={() => setMobileFiltersOpen(true)}
              className={`md:hidden relative flex flex-none items-center justify-center rounded-xl p-2.5 min-h-[44px] text-sm font-medium transition-colors ${
                activeFilterCount > 0
                  ? 'bg-blue-500/90 text-white'
                  : 'text-[#0C4A6E] dark:text-slate-100 hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
              }`}
              style={{ fontFamily: 'var(--font-aran), sans-serif' }}
            >
              <Icon name="SlidersHorizontal" className="h-4 w-4" />
              <span className="sr-only">מסננים</span>
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -left-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <button
              type="button"
              aria-label={activeView === "map" ? "רשימת בתי קפה" : "מפה"}
              onClick={() => {
                const targetView = activeView === "map" ? "shops" : "map";
                setActiveView(targetView);
                clearSelection();
              }}
              className={`md:hidden flex flex-none items-center justify-center rounded-xl p-2.5 min-h-[44px] text-sm font-medium transition-colors ${
                activeView === "map"
                  ? 'bg-blue-500/90 text-white hover:bg-blue-600'
                  : 'text-[#0C4A6E] dark:text-slate-100 hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
              }`}
              style={{ fontFamily: 'var(--font-aran), sans-serif' }}
            >
              {activeView === "map" ? (
                <Icon name="List" className="h-4 w-4" />
              ) : (
                <Icon name="MapPin" className="h-4 w-4" />
              )}
              <span className="sr-only">{activeView === "map" ? "רשימת בתי קפה" : "מפה"}</span>
            </button>

            {activeView === "shops" && (
              <button
                type="button"
                aria-label="שינוי פריסת רשת"
                onClick={cycleGridColumns}
                className="flex flex-none items-center justify-center rounded-xl p-2.5 min-h-[44px] text-sm font-medium transition-colors bg-blue-500/90 text-white"
                style={{ fontFamily: 'var(--font-aran), sans-serif' }}
              >
                <Icon name="LayoutGrid" className="h-4 w-4" />
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

      {mobileFiltersOpen && (
        <MobileFilterSheet
          onClose={() => setMobileFiltersOpen(false)}
          selectedBrewMethods={selectedBrewMethods}
          sellsBeansFilter={sellsBeansFilter}
          favoritesFilter={favoritesFilter}
          noMatchaFilter={noMatchaFilter}
          onlineOnlyFilter={onlineOnlyFilter}
          showOpenNowOnly={showOpenNowOnly}
          openShabbatFilter={openShabbatFilter}
          favoritesCount={favorites.length}
          activeFilterCount={activeFilterCount}
          resultCount={filteredShops.length}
          onToggleBrewMethod={toggleBrewMethod}
          onToggleSellsBeans={toggleSellsBeansFilter}
          onToggleFavorites={toggleFavoritesFilter}
          onToggleNoMatcha={toggleNoMatchaFilter}
          onToggleOnlineOnly={toggleOnlineOnlyFilter}
          onToggleOpenNow={toggleShowOpenNowFilter}
          onToggleOpenShabbat={toggleOpenShabbatFilter}
          onClearAll={() => {
            filterActions.reset();
            setFitBoundsEnabled(false);
          }}
        />
      )}

      {/* Circular bubble - shown when shop is selected but detail panel is closed */}
      <SelectionBubble
        visible={activeView === "map" && !detailOpen}
        selectedShop={selectedShop}
        sidebarOpen={sidebarOpen}
        onOpenDetail={openDetail}
        onClose={clearSelection}
      />
    </div>
    </MotionConfig>
  );
}

