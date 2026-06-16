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
    expect(buildSearchFromFilters(initialFilterState, "area")).toBe("");
  });

  it("writes only the active, non-default values", () => {
    const filters: FilterState = {
      ...initialFilterState,
      sellsBeansFilter: true,
      showOpenNowOnly: true,
      selectedBrewMethods: [aBrew],
    };
    const qs = buildSearchFromFilters(filters, "name");
    const params = new URLSearchParams(qs);
    expect(params.get("beans")).toBe("1");
    expect(params.get("open")).toBe("1");
    expect(params.get("brew")).toBe(aBrew);
    expect(params.get("sort")).toBe("name");
    expect(params.get("fav")).toBeNull();
  });

  it("omits the sort param for the default 'area' sort", () => {
    expect(new URLSearchParams(buildSearchFromFilters(initialFilterState, "area")).has("sort")).toBe(
      false,
    );
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
    const qs = buildSearchFromFilters(filters, "openNow");
    const parsed = parseFiltersFromSearch(qs);
    expect(parsed.filters.favoritesFilter).toBe(true);
    expect(parsed.filters.openShabbatFilter).toBe(true);
    expect(parsed.filters.selectedBrewMethods).toEqual([aBrew]);
    expect(parsed.filters.selectedRegionFilter).toBe("תל אביב וגוש דן");
    expect(parsed.sortBy).toBe("openNow");
  });

  it("ignores unknown brew methods, regions, and sort values", () => {
    const parsed = parseFiltersFromSearch("brew=notamethod&region=Atlantis&sort=bogus");
    expect(parsed.filters.selectedBrewMethods).toBeUndefined();
    expect(parsed.filters.selectedRegionFilter).toBeUndefined();
    expect(parsed.sortBy).toBeNull();
  });

  it("treats only '1' as a truthy boolean flag", () => {
    expect(parseFiltersFromSearch("beans=1").filters.sellsBeansFilter).toBe(true);
    expect(parseFiltersFromSearch("beans=0").filters.sellsBeansFilter).toBeUndefined();
    expect(parseFiltersFromSearch("beans=true").filters.sellsBeansFilter).toBeUndefined();
  });
});

describe("hasFilterParams", () => {
  it("is false for an empty parse and true when anything is set", () => {
    expect(hasFilterParams(parseFiltersFromSearch(""))).toBe(false);
    expect(hasFilterParams(parseFiltersFromSearch("fav=1"))).toBe(true);
    expect(hasFilterParams(parseFiltersFromSearch("sort=name"))).toBe(true);
  });
});
