import { useEffect, useReducer } from "react";
import type { MainArea } from "@/lib/israel-areas";

const STORAGE_KEY = "cafe-filters";

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
  /**
   * Only shops confirmed to serve gluten-free options. Hidden from the UI
   * until enough shops carry the data — see `isGlutenFreeFilterAvailable`.
   */
  glutenFreeFilter: boolean;
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
  glutenFreeFilter: false,
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
  | { type: "TOGGLE_GLUTEN_FREE" }
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
    case "TOGGLE_GLUTEN_FREE":
      return { ...state, glutenFreeFilter: !state.glutenFreeFilter };
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
      // state. Used once on mount so deep-linked filters win over saved ones.
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
 */
// Lazy reducer initializer: seed from localStorage so saved filters are present
// on the very first render. Safe against SSR/StrictMode here because the filter
// UI only renders after mount (behind AppSkeleton), so it never hits the
// server-rendered HTML — and reading at init avoids the effect-ordering races
// (and StrictMode double-invoke) that an effect-based "hydrate" would suffer.
function loadFilters(): FilterState {
  if (typeof window === "undefined") return initialFilterState;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<FilterState>;
      return { ...initialFilterState, ...parsed };
    }
  } catch {
    // Corrupt/blocked storage — fall back to defaults.
  }
  return initialFilterState;
}

export function useFilters() {
  const [filters, dispatch] = useReducer(filterReducer, undefined, loadFilters);

  // Persist on every change. On mount this writes back the just-loaded value,
  // which is a harmless no-op.
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch {
      // Storage may be full or blocked (private mode) — not fatal.
    }
  }, [filters]);

  return {
    filters,
    actions: {
      toggleBrewMethod: (method: string) => dispatch({ type: "TOGGLE_BREW_METHOD", method }),
      toggleSellsBeans: () => dispatch({ type: "TOGGLE_SELLS_BEANS" }),
      toggleGlutenFree: () => dispatch({ type: "TOGGLE_GLUTEN_FREE" }),
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
