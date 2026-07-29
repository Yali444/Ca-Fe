import { BREW_METHODS } from "@/lib/brew-methods";
import { MAIN_AREA_SET, type MainArea } from "@/lib/israel-areas";
import type { FilterState } from "@/hooks/useFilters";

/**
 * Two-way mapping between the active shop filters and the URL query string, so
 * a filtered view can be shared via a link and restored on load.
 *
 * Only non-default values are written, keeping the default view's URL clean.
 * Parsing validates every value against the known sets (brew methods, regions)
 * so a hand-edited or stale link can never inject bad state.
 */

const BREW_SET = new Set<string>(BREW_METHODS);

const BOOL_KEYS = {
  beans: "sellsBeansFilter",
  gf: "glutenFreeFilter",
  fav: "favoritesFilter",
  open: "showOpenNowOnly",
  shabbat: "openShabbatFilter",
  nomatcha: "noMatchaFilter",
  online: "onlineOnlyFilter",
} as const satisfies Record<string, keyof FilterState>;

/**
 * Every query-string key this module owns. Exported so the URL-sync effect can
 * clear exactly these before writing the current state, instead of keeping its
 * own copy of the list that silently strands a param whenever one is added.
 */
export const MANAGED_FILTER_PARAMS: readonly string[] = [
  ...Object.keys(BOOL_KEYS),
  "brew",
  "region",
];

export interface ParsedFilterUrl {
  filters: Partial<FilterState>;
}

/** Parse a `location.search` string into a partial filter state. */
export const parseFiltersFromSearch = (search: string): ParsedFilterUrl => {
  const params = new URLSearchParams(search);
  const filters: Partial<FilterState> = {};

  for (const [key, field] of Object.entries(BOOL_KEYS)) {
    if (params.get(key) === "1") filters[field] = true;
  }

  const brew = params.get("brew");
  if (brew) {
    const methods = brew.split(",").filter((m) => BREW_SET.has(m));
    if (methods.length > 0) filters.selectedBrewMethods = methods;
  }

  const region = params.get("region");
  if (region && MAIN_AREA_SET.has(region as MainArea)) {
    filters.selectedRegionFilter = region as MainArea;
  }

  return { filters };
};

/** Build a query string (no leading "?") from the active filters. */
export const buildSearchFromFilters = (filters: FilterState): string => {
  const params = new URLSearchParams();

  for (const [key, field] of Object.entries(BOOL_KEYS)) {
    if (filters[field]) params.set(key, "1");
  }
  if (filters.selectedBrewMethods.length > 0) {
    params.set("brew", filters.selectedBrewMethods.join(","));
  }
  if (filters.selectedRegionFilter) {
    params.set("region", filters.selectedRegionFilter);
  }

  return params.toString();
};

/** True when a parsed URL carries at least one filter. */
export const hasFilterParams = (parsed: ParsedFilterUrl): boolean =>
  Object.keys(parsed.filters).length > 0;
