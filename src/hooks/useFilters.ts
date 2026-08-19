import { useEffect, useReducer } from "react";
import type { MainArea } from "@/lib/israel-areas";

/**
 * Key an earlier version used to persist filters across visits. Filters are
 * deliberately per-visit now (see `useFilters`), so the only thing left to do
 * with it is delete it once for people who still carry a saved value.
 */
const LEGACY_STORAGE_KEY = "cafe-filters";

/**
 * The complete set of shop filters applied across the map and shops views.
 * Kept as one object (rather than seven separate useState values) so the
 * transitions live in a single, testable reducer.
 */
export interface FilterState {
  /** Selected brew-method tags; empty means "any". */
  selectedBrewMethods: string[];
  /** Only shops that sell beans. */
  sellsBeansFilter: boolean;
  /** Only favourited shops. */
  favoritesFilter: boolean;
  /** Only shops currently open. */
  showOpenNowOnly: boolean;
  /** Only shops open on Saturday (Shabbat). */
  openShabbatFilter: boolean;
  /** Exclude matcha-only places. */
  noMatchaFilter: boolean;
  /** Only online-only roasteries/workshops (no physical location). */
  onlineOnlyFilter: boolean;
  /** Restrict to a single geographic area, or null for all areas. */
  selectedRegionFilter: MainArea | null;
}

export const initialFilterState: FilterState = {
  selectedBrewMethods: [],
  sellsBeansFilter: false,
  favoritesFilter: false,
  showOpenNowOnly: false,
  openShabbatFilter: false,
  noMatchaFilter: false,
  onlineOnlyFilter: false,
  selectedRegionFilter: null,
};

export type FilterAction =
  | { type: "TOGGLE_BREW_METHOD"; method: string }
  | { type: "TOGGLE_SELLS_BEANS" }
  | { type: "TOGGLE_FAVORITES" }
  | { type: "TOGGLE_OPEN_NOW" }
  | { type: "TOGGLE_OPEN_SHABBAT" }
  | { type: "TOGGLE_NO_MATCHA" }
  | { type: "TOGGLE_ONLINE_ONLY" }
  | { type: "SET_REGION"; area: MainArea | null }
  | { type: "HYDRATE"; payload: Partial<FilterState> }
  | { type: "RESET" };

export function filterReducer(state: FilterState, action: FilterAction): FilterState {
  switch (action.type) {
    case "TOGGLE_BREW_METHOD":
      return {
        ...state,
        selectedBrewMethods: state.selectedBrewMethods.includes(action.method)
          ? state.selectedBrewMethods.filter((m) => m !== action.method)
          : [...state.selectedBrewMethods, action.method],
      };
    case "TOGGLE_SELLS_BEANS":
      return { ...state, sellsBeansFilter: !state.sellsBeansFilter };
    case "TOGGLE_FAVORITES":
      return { ...state, favoritesFilter: !state.favoritesFilter };
    case "TOGGLE_OPEN_NOW":
      return { ...state, showOpenNowOnly: !state.showOpenNowOnly };
    case "TOGGLE_OPEN_SHABBAT":
      return { ...state, openShabbatFilter: !state.openShabbatFilter };
    case "TOGGLE_NO_MATCHA":
      return { ...state, noMatchaFilter: !state.noMatchaFilter };
    case "TOGGLE_ONLINE_ONLY": {
      const onlineOnlyFilter = !state.onlineOnlyFilter;
      return {
        ...state,
        onlineOnlyFilter,
        // Online-only places have no physical region, so clear any region
        // filter when enabling it to avoid impossible (empty) results.
        selectedRegionFilter: onlineOnlyFilter ? null : state.selectedRegionFilter,
      };
    }
    case "SET_REGION":
      return { ...state, selectedRegionFilter: action.area };
    case "HYDRATE":
      // Merge an externally-sourced partial (e.g. a shared URL) over current
      // state. Used once on mount so deep-linked filters land on the defaults.
      return { ...state, ...action.payload };
    case "RESET":
      return initialFilterState;
    default:
      return state;
  }
}

/**
 * Owns all shop-filter state via a reducer and exposes the current `filters`
 * plus named action dispatchers. Side effects that aren't part of filter state
 * (map fitBounds, view switching) are intentionally left to the caller.
 *
 * Filters are intentionally NOT persisted: every visit starts from a clean
 * slate. Remembering them across days meant people came back to a list quietly
 * narrowed by a choice they had long forgotten making (e.g. "פתוח עכשיו" from
 * last week) and read it as missing cafes. Sharing a filtered view still works
 * — the caller mirrors filters into the query string and hydrates from it.
 */
export function useFilters() {
  const [filters, dispatch] = useReducer(filterReducer, initialFilterState);

  // One-time cleanup: drop the value the old persisting version left behind so
  // it doesn't linger in storage for returning users.
  useEffect(() => {
    try {
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      // Storage blocked (private mode etc.) — nothing to clean up then.
    }
  }, []);

  return {
    filters,
    actions: {
      toggleBrewMethod: (method: string) => dispatch({ type: "TOGGLE_BREW_METHOD", method }),
      toggleSellsBeans: () => dispatch({ type: "TOGGLE_SELLS_BEANS" }),
      toggleFavorites: () => dispatch({ type: "TOGGLE_FAVORITES" }),
      toggleOpenNow: () => dispatch({ type: "TOGGLE_OPEN_NOW" }),
      toggleOpenShabbat: () => dispatch({ type: "TOGGLE_OPEN_SHABBAT" }),
      toggleNoMatcha: () => dispatch({ type: "TOGGLE_NO_MATCHA" }),
      toggleOnlineOnly: () => dispatch({ type: "TOGGLE_ONLINE_ONLY" }),
      setRegion: (area: MainArea | null) => dispatch({ type: "SET_REGION", area }),
      hydrate: (payload: Partial<FilterState>) => dispatch({ type: "HYDRATE", payload }),
      reset: () => dispatch({ type: "RESET" }),
    },
  };
}
