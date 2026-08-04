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
import { OfflineIndicator, OfflineBanner } from "@/components/ui/OfflineIndicator";

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
  
  // Register service worker on mount (once only — registerServiceWorker is a
  // new function reference each render so must NOT be in the dep array)
  useEffect(() => {
    registerServiceWorker();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Load all places (unified approach - no mode separation)
  const { places: allPlaces, loading: placesLoading, error } = usePlaceData();
  
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

  const {
    selectedShopReviews,
    reviewsLoading,
    reviewsError,
    retryReviews,
    reviewDraft,
    setReviewDraft,
    handleReviewSubmit,
    submitError,
  } = useReviews(detailOpen, selectedShop);

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
      // Don't strip a deep-link param before the catalogue has loaded: the
      // auto-open effect above needs it to find the shared cafe, and it can
      // only run once `coffeeShops` is populated. Stripping first made shared
      // ?cafe= links (and a refresh with the panel open) land on a bare map.
      if (coffeeShops.length === 0) return;
      if (cafeHistoryPushedRef.current) {
        cafeHistoryPushedRef.current = false;
        window.history.back(); // pops our pushed entry, stripping ?cafe=
      } else {
        url.searchParams.delete("cafe");
        window.history.replaceState({}, "", url);
      }
    }
  }, [detailOpen, selectedShop, coffeeShops]);

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

    const applyLayout = () => {
      const desktop = isDesktop();
      setIsMobile(!desktop);

      if (desktop) {
        setSidebarOpen(true);
        // Auto-switch to map on desktop (but not on initial mobile load)
        if (!isMobileSafari) {
          setActiveView("map");
        }
      } else {
        setSidebarOpen(false);
        // On mobile, keep current view - don't force shops anymore
      }
    };

    // `resize` fires continuously while a window is dragged (and on every
    // mobile URL-bar show/hide). Coalescing to one animation frame means the
    // layout state is recomputed once per frame at most instead of once per
    // event, and it reads innerWidth at a point where layout is already
    // settled rather than forcing a reflow mid-drag.
    let frame = 0;
    const handleResize = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        applyLayout();
      });
    };

    applyLayout();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (frame) window.cancelAnimationFrame(frame);
    };
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
    // datasetId (the raw cafes.json id) is what /cafe/<id> is prerendered
    // under; shop.id is the client-side slug-hash and has no page of its own.
    const url = buildShareUrl(shop.datasetId ?? shop.id);
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

  // "קרוב אליי" reads as on whenever a location is actually in effect — not
  // only during the brief GPS lookup — so the bar shows at a glance that the
  // list is currently sorted by distance. Pressing it again clears that, which
  // makes it a real toggle like "פתוח עכשיו" sitting beside it (previously the
  // only way to undo it was the "נקה מיקום" link up in the list header).
  const isLocating = gpsStatus === "locating";
  const nearMeOn = isLocating || userLocation !== null;
  const handleNearMe = useCallback(() => {
    if (userLocation && !isLocating) {
      setUserLocation(null);
      return;
    }
    handleGetUserLocation();
  }, [userLocation, isLocating, setUserLocation, handleGetUserLocation]);

  useEffect(() => {
    setReviewDraft({ name: "", text: "", rating: 5 });
  }, [selectedShop, setReviewDraft]);

  // Update bubble position when map moves or zooms
  // Note: Removed continuous bubble position updates to prevent jumping
// Bubble position is now only updated when a cafe is selected

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

  // Shared autocomplete dropdown for the unified search (desktop + mobile).
  //
  // Built with useMemo rather than called as `renderSearchDropdown()` during
  // render: the result is passed down as a prop, so rebuilding the element tree
  // on every render handed Sidebar a new child on each keystroke, filter toggle
  // and resize, making it impossible to memoize.
  const searchDropdown = useMemo(() => {
    if (!searchFocused || !addressQuery.trim()) return null;
    const addressRowIndex = catalogMatches.length;
    return (
      <div
        className="absolute z-[10050] mt-1 w-full overflow-hidden rounded-xl border border-black/5 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-2xl"
        // keep focus on the input so blur doesn't close the list before the click handler runs
        onMouseDown={(e) => e.preventDefault()}
      >
        <div id="cafe-search-listbox" role="listbox" aria-label="תוצאות חיפוש" className="max-h-72 overflow-y-auto py-1">
          {catalogMatches.map((shop, idx) => {
            const subtitle = [shop.location, shop.address]
              .filter((v) => v && v.trim())
              .join(" · ");
            const active = idx === searchHighlightIndex;
            return (
              <button
                key={shop.id}
                type="button"
                role="option"
                id={`search-option-${idx}`}
                aria-selected={active}
                onClick={() => handleSelectSearchResult(shop)}
                onMouseEnter={() => setSearchHighlightIndex(idx)}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-right transition-colors ${
                  active
                    ? "bg-black/5 dark:bg-white/10"
                    : "hover:bg-black/[0.03] dark:hover:bg-white/5"
                }`}
              >
                <Icon
                  name={shop.type === "matcha" ? "Leaf" : "Coffee"}
                  className={`h-4 w-4 flex-shrink-0 ${
                    shop.type === "matcha"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-muted-foreground"
                  }`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {shop.name}
                  </span>
                  {subtitle && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {subtitle}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            role="option"
            id={`search-option-${addressRowIndex}`}
            aria-selected={addressRowIndex === searchHighlightIndex}
            onClick={() => runAddressSearch()}
            onMouseEnter={() => setSearchHighlightIndex(addressRowIndex)}
            className={`flex w-full items-center gap-2.5 border-t border-slate-100 px-3 py-2 text-right transition-colors dark:border-slate-800 ${
              addressRowIndex === searchHighlightIndex
                ? "bg-black/5 dark:bg-white/10"
                : "hover:bg-black/[0.03] dark:hover:bg-white/5"
            }`}
          >
            <Icon name="Search" className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate text-sm text-foreground">
              חפש כתובת:{" "}
              <span className="font-medium">&quot;{addressQuery.trim()}&quot;</span>
            </span>
          </button>
        </div>
      </div>
    );
  }, [
    searchFocused,
    addressQuery,
    catalogMatches,
    searchHighlightIndex,
    handleSelectSearchResult,
    setSearchHighlightIndex,
    runAddressSearch,
  ]);

  // aria-activedescendant target for the combobox inputs (Sidebar + mobile overlay).
  const searchActiveDescendant =
    searchDropdown != null && searchHighlightIndex >= 0
      ? `search-option-${searchHighlightIndex}`
      : undefined;

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

  // Every filter *except* region, hidden and online-only, applied once.
  //
  // The visible list and the region-chip counts need the same seven
  // predicates, and each used to evaluate them independently over the whole
  // catalogue — including `isPlaceOpen`, which parses opening hours per shop.
  // Sharing one pass halves that work and, more importantly, removes the
  // duplicated copy of the logic that had already drifted between the two.
  const shopsMatchingNonRegionFilters = useMemo(() => {
    return coffeeShops.filter((shop) => {
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

      return matchesBrew && matchesSellsBeans && matchesFavorites && matchesRoasteryOnlyFilter && matchesOpenNow && matchesShabbat && matchesMatchaFilter;
    });
  }, [coffeeShops, selectedBrewMethods, sellsBeansFilter, favoritesFilter, favorites, showOpenNowOnly, openShabbatFilter, noMatchaFilter, onlineOnlyFilter]);

  // Calculate filtered shops - must be before useEffect that uses it
  const filteredShops = useMemo(() => {
    let shops = shopsMatchingNonRegionFilters.filter((shop) => {
      const isWorkshops = shop.type === 'workshops';

      // Filter by online-only: show online-only roasteries and workshops places
      const matchesOnlineOnly = onlineOnlyFilter ? (shop.isOnlineOnly === true || isWorkshops) : true;

      // Filter by region — online-only places have no physical region so they always pass
      const matchesRegion = selectedRegionFilter === null || shop.isOnlineOnly === true || getAreaForCity(shop.location) === selectedRegionFilter;

      // Filter out hidden places
      const matchesHidden = !shop.hidden;

      return matchesOnlineOnly && matchesRegion && matchesHidden;
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
  }, [shopsMatchingNonRegionFilters, userLocation, onlineOnlyFilter, selectedRegionFilter]);

  // Physical shops only — for map rendering (online-only places have no location)
  const mapShops = useMemo(() => filteredShops.filter(s => !s.isOnlineOnly), [filteredShops]);

  // Get available regions from filtered shops (before region filter is applied, but after other filters)
  // We need to recalculate without region filter to show all available regions
  const availableRegions = useMemo<{ area: MainArea; count: number }[]>(() => {
    if (userLocation) return []; // Don't show region filters when using user location

    const regionMap = new Map<MainArea, number>();
    shopsMatchingNonRegionFilters.forEach((shop) => {
      const area = getAreaForCity(shop.location);
      if (area === "אחר") return;
      if (!MAIN_AREA_SET.has(area)) return; // Only include main grouped regions
      regionMap.set(area, (regionMap.get(area) || 0) + 1);
    });

    return Array.from(regionMap.entries())
      .map(([area, count]) => ({ area, count }))
      .sort((a, b) => b.count - a.count); // Sort by count descending
  }, [shopsMatchingNonRegionFilters, userLocation]);

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
  }, [
    selectedBrewMethods,
    sellsBeansFilter,
    showOpenNowOnly,
    userLocation,
    selectedRegionFilter,
    favoritesFilter,
    openShabbatFilter,
    noMatchaFilter,
    onlineOnlyFilter,
  ]);

  // Don't auto-close detail panel when shop changes - let user control it

  const isBrowser = typeof window !== "undefined";
  // Show the skeleton only for as long as the catalogue is actually loading
  // (previously this was a flat 100ms/1200ms setTimeout unrelated to whether
  // data — or even the component's own JS chunk — was ready; on mobile
  // Safari that held the skeleton up to ~1.1s after the real data had
  // already finished loading).
  if (placesLoading) {
    return <AppSkeleton />;
  }

  return (
    <MotionConfig reducedMotion="user">
    <div className="flex h-dvh w-screen overflow-hidden bg-surface dark:bg-[#0B1120] antialiased">
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
        searchDropdown={searchDropdown}
        searchActiveDescendant={searchActiveDescendant}
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
      <main
        id="main"
        className={`relative flex-1 min-w-0 overflow-x-hidden overflow-y-auto transition-[margin,max-width] duration-300 ${
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
          <div className="h-full w-full animate-fade-in">
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
          </div>
        )}

        {/* Full detail panel - shown when detailOpen is true (works in both map and shops view) */}
        <DetailPanel
          selectedShop={selectedShop}
          detailOpen={detailOpen}
          isMobile={isMobile}
          shareMessage={shareMessage}
          favorites={favorites}
          reviews={selectedShopReviews}
          reviewsLoading={reviewsLoading}
          reviewsError={reviewsError}
          onRetryReviews={retryReviews}
          reviewDraft={reviewDraft}
          setReviewDraft={setReviewDraft}
          onClose={closeDetail}
          onToggleFavorite={toggleFavorite}
          onShare={handleShare}
          onReviewSubmit={handleReviewSubmit}
          submitError={submitError}
        />

        {activeView === "shops" && (
          <div className="h-full w-full animate-fade-in">
            <ShopsView
              error={error}
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
          </div>
        )}

      {/* About Me Page */}
      {activeView === "about" && (
        <div className="h-full w-full animate-fade-in">
          <AboutView />
        </div>
      )}

    </main>

      <nav aria-label="פעולות מהירות" className="fixed inset-x-0 bottom-0 z-[9997]">
        <div
          className="mx-auto w-full max-w-4xl px-4"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <div className="flex items-center justify-center gap-1.5 rounded-full border border-black/5 dark:border-white/10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl px-2.5 py-2 shadow-lg md:max-w-lg md:mx-auto">
            {/* Search is icon-only: the magnifier is unambiguous, and dropping
                its label frees the width that the two discovery actions below
                need to keep theirs. */}
            <button
              type="button"
              aria-label="חיפוש"
              onClick={() => setMobileSearchOpen(true)}
              className="flex flex-none items-center justify-center rounded-xl p-2.5 min-h-[44px] text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <Icon name="Search" className="h-4 w-4" />
              <span className="sr-only">חיפוש</span>
            </button>

            {/* ── The primary discovery pair ──
                "פתוח עכשיו" and "קרוב אליי" are the two filters people reach
                for first, so they keep their labels and carry a standing tonal
                fill — they read as the bar's main actions even when off, rather
                than sitting at the same weight as the icon-only utilities. */}
            <button
              type="button"
              aria-pressed={showOpenNowOnly}
              onClick={toggleShowOpenNowFilter}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 min-h-[44px] text-sm font-semibold transition-colors whitespace-nowrap ${
                showOpenNowOnly
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'bg-green-600/10 text-green-800 hover:bg-green-600/20 dark:bg-green-500/15 dark:text-green-300 dark:hover:bg-green-500/25'
              }`}
              style={{ fontFamily: 'var(--font-aran), sans-serif' }}
            >
              <Icon name="Clock" className="h-4 w-4" />
              <span>פתוח עכשיו</span>
            </button>

            <button
              type="button"
              aria-pressed={nearMeOn}
              aria-label={nearMeOn && !isLocating ? "נקה מיקום" : "קרוב אליי"}
              onClick={handleNearMe}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 min-h-[44px] text-sm font-semibold transition-colors whitespace-nowrap ${
                nearMeOn
                  ? 'bg-brand text-white shadow-sm'
                  : 'bg-brand/10 text-brand hover:bg-brand/20 dark:bg-brand/20 dark:text-blue-300 dark:hover:bg-brand/30'
              }`}
              style={{ fontFamily: 'var(--font-aran), sans-serif' }}
            >
              <Icon name="Locate" className={`h-4 w-4 ${isLocating ? 'animate-spin' : ''}`} />
              <span>קרוב אליי</span>
            </button>

            <button
              type="button"
              aria-label="מסננים"
              onClick={() => setMobileFiltersOpen(true)}
              className={`lg:hidden relative flex flex-none items-center justify-center rounded-xl p-2.5 min-h-[44px] text-sm font-medium transition-colors ${
                activeFilterCount > 0
                  ? 'bg-brand text-white'
                  : 'text-foreground hover:bg-black/5 dark:hover:bg-white/10'
              }`}
              style={{ fontFamily: 'var(--font-aran), sans-serif' }}
            >
              <Icon name="SlidersHorizontal" className="h-4 w-4" />
              <span className="sr-only">מסננים</span>
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -left-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
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
              className={`lg:hidden flex flex-none items-center justify-center rounded-xl p-2.5 min-h-[44px] text-sm font-medium transition-colors ${
                activeView === "map"
                  ? 'bg-brand text-white hover:bg-brand-strong'
                  : 'text-foreground hover:bg-black/5 dark:hover:bg-white/10'
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

          </div>
          {gpsMessage && gpsStatus !== "idle" && (
            <div role="status" aria-live="polite" className={`mt-2 flex items-center justify-between gap-2 rounded-xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-zinc-900/80 px-3 py-2 text-xs text-foreground backdrop-blur-2xl transition-opacity duration-300 ${gpsMessageFading ? 'opacity-0' : 'opacity-100'}`}>
              <span style={{ fontFamily: 'var(--font-aran), sans-serif' }}>{gpsMessage}</span>
              {(gpsStatus === "denied" || gpsStatus === "unavailable" || gpsStatus === "timeout" || gpsStatus === "error") && (
                <button
                  type="button"
                  onClick={handleGetUserLocation}
                  className="rounded-lg bg-brand px-2.5 py-1 text-white"
                  style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                >
                  נסה שוב
                </button>
              )}
            </div>
          )}
        </div>
      </nav>

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
          searchDropdown={searchDropdown}
          searchActiveDescendant={searchActiveDescendant}
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
          gridColumns={gridColumns}
          onSetGridColumns={setGridColumns}
          showGridControl={activeView === "shops"}
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

