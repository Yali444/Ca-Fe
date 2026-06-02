import { useEffect, useMemo, useState } from "react";
import type { CoffeeShop } from "@/lib/coffee-shop";
import { normalizeSearchText, scoreCafeMatch } from "@/lib/search";
import { useRecentAddresses } from "@/hooks/useRecentAddresses";

interface LatLng {
  lat: number;
  lng: number;
}

interface UseAddressSearchOptions {
  /** Network status; geocoding is blocked while offline. */
  isOnline: boolean;
  /** Full (unfiltered) catalog used for live name/city/address matches. */
  coffeeShops: CoffeeShop[];
  /** Called when a catalog match is chosen (fly the map to that shop). */
  onSelectShop: (shop: CoffeeShop) => void;
  /**
   * Called after a free-text address is successfully geocoded. The caller is
   * responsible for the map/view side effects (fly to location, switch to the
   * map view, close mobile panels) — those aren't part of search state.
   */
  onAddressResolved: (location: LatLng) => void;
}

/**
 * Owns the unified search box state: the query, focus/keyboard-highlight,
 * geocoding (via /api/geocode), recent addresses, the resolved address
 * location and the live catalog matches. Returns the state plus handlers for
 * the input (keyboard nav, mobile search button, clear/restore). The dropdown
 * itself is rendered by the caller, which reads `catalogMatches` /
 * `searchHighlightIndex` from here.
 */
export function useAddressSearch({
  isOnline,
  coffeeShops,
  onSelectShop,
  onAddressResolved,
}: UseAddressSearchOptions) {
  const [addressQuery, setAddressQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchHighlightIndex, setSearchHighlightIndex] = useState(-1);
  const [lastSearchedAddress, setLastSearchedAddress] = useState("");
  const [addressSearchError, setAddressSearchError] = useState<string | null>(null);
  const [addressLocation, setAddressLocation] = useState<LatLng | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const { recentAddresses, addRecentAddress } = useRecentAddresses();

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

  // Geocode address using the /api/geocode proxy (OpenStreetMap Nominatim).
  const geocodeAddress = async (address: string): Promise<LatLng | null> => {
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

      const data = (await response.json()) as { result?: LatLng | null };

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

  // Geocode the typed text as a street address and notify the caller to fly there.
  const runAddressSearch = async () => {
    if (!addressQuery.trim()) return;
    const location = await geocodeAddress(addressQuery);
    if (location) {
      setLastSearchedAddress(addressQuery);
      addRecentAddress(addressQuery);
      setAddressQuery("");
      setSearchFocused(false);
      setSearchHighlightIndex(-1);
      onAddressResolved(location);
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
          onSelectShop(catalogMatches[searchHighlightIndex]);
        } else {
          await runAddressSearch();
        }
        return;
      }

      // No explicit selection: catalog-first — jump to the best cafe match if any.
      if (catalogMatches.length > 0) {
        onSelectShop(catalogMatches[0]);
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
      onSelectShop(catalogMatches[0]);
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

  return {
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
  };
}
