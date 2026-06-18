import { describe, expect, it } from "vitest";
import {
  buildSearchFromFilters,
  hasFilterParams,
  parseFiltersFromSearch,
} from "./filter-url";
import { initialFilterState, type FilterState } from "@/hooks/useFilters";
import { BREW_METHODS } from "@/lib/brew-methods";

const aBrew = BREW_METHODS[0];

describe("buildSearchFromFilters", () => {
  it("is empty for the default state", () => {
    expect(buildSearchFromFilters(initialFilterState)).toBe("");
  });

  it("writes only the active, non-default values", () => {
    const filters: FilterState = {
      ...initialFilterState,
      sellsBeansFilter: true,
      showOpenNowOnly: true,
      selectedBrewMethods: [aBrew],
    };
    const qs = buildSearchFromFilters(filters);
    const params = new URLSearchParams(qs);
    expect(params.get("beans")).toBe("1");
    expect(params.get("open")).toBe("1");
    expect(params.get("brew")).toBe(aBrew);
    expect(params.get("fav")).toBeNull();
  });
});

describe("parseFiltersFromSearch", () => {
  it("round-trips an active filter set", () => {
    const filters: FilterState = {
      ...initialFilterState,
      favoritesFilter: true,
      openShabbatFilter: true,
      selectedBrewMethods: [aBrew],
      selectedRegionFilter: "תל אביב וגוש דן",
    };
    const qs = buildSearchFromFilters(filters);
    const parsed = parseFiltersFromSearch(qs);
    expect(parsed.filters.favoritesFilter).toBe(true);
    expect(parsed.filters.openShabbatFilter).toBe(true);
    expect(parsed.filters.selectedBrewMethods).toEqual([aBrew]);
    expect(parsed.filters.selectedRegionFilter).toBe("תל אביב וגוש דן");
  });

  it("ignores unknown brew methods and regions", () => {
    const parsed = parseFiltersFromSearch("brew=notamethod&region=Atlantis");
    expect(parsed.filters.selectedBrewMethods).toBeUndefined();
    expect(parsed.filters.selectedRegionFilter).toBeUndefined();
  });

  it("treats only '1' as a truthy boolean flag", () => {
    expect(parseFiltersFromSearch("beans=1").filters.sellsBeansFilter).toBe(true);
    expect(parseFiltersFromSearch("beans=0").filters.sellsBeansFilter).toBeUndefined();
    expect(parseFiltersFromSearch("beans=true").filters.sellsBeansFilter).toBeUndefined();
  });
});

describe("hasFilterParams", () => {
  it("is false for an empty parse and true when a filter is set", () => {
    expect(hasFilterParams(parseFiltersFromSearch(""))).toBe(false);
    expect(hasFilterParams(parseFiltersFromSearch("fav=1"))).toBe(true);
    expect(hasFilterParams(parseFiltersFromSearch("region=תל אביב וגוש דן"))).toBe(true);
  });
});
