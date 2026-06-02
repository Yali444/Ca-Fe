import { describe, it, expect } from "vitest";
import { filterReducer, initialFilterState, type FilterState } from "./useFilters";

describe("filterReducer", () => {
  it("toggles brew methods on and off, preserving others", () => {
    const withV60 = filterReducer(initialFilterState, { type: "TOGGLE_BREW_METHOD", method: "v60" });
    expect(withV60.selectedBrewMethods).toEqual(["v60"]);

    const withTwo = filterReducer(withV60, { type: "TOGGLE_BREW_METHOD", method: "espresso" });
    expect(withTwo.selectedBrewMethods).toEqual(["v60", "espresso"]);

    const removedV60 = filterReducer(withTwo, { type: "TOGGLE_BREW_METHOD", method: "v60" });
    expect(removedV60.selectedBrewMethods).toEqual(["espresso"]);
  });

  it.each([
    ["TOGGLE_SELLS_BEANS", "sellsBeansFilter"],
    ["TOGGLE_FAVORITES", "favoritesFilter"],
    ["TOGGLE_OPEN_NOW", "showOpenNowOnly"],
    ["TOGGLE_NO_MATCHA", "noMatchaFilter"],
  ] as const)("%s flips %s", (type, key) => {
    const on = filterReducer(initialFilterState, { type });
    expect(on[key as keyof FilterState]).toBe(true);
    const off = filterReducer(on, { type });
    expect(off[key as keyof FilterState]).toBe(false);
  });

  it("sets and clears the region filter", () => {
    const set = filterReducer(initialFilterState, { type: "SET_REGION", area: "השרון" });
    expect(set.selectedRegionFilter).toBe("השרון");
    const cleared = filterReducer(set, { type: "SET_REGION", area: null });
    expect(cleared.selectedRegionFilter).toBeNull();
  });

  it("clears the region filter when online-only is enabled", () => {
    const withRegion: FilterState = { ...initialFilterState, selectedRegionFilter: "חיפה והצפון" };
    const enabled = filterReducer(withRegion, { type: "TOGGLE_ONLINE_ONLY" });
    expect(enabled.onlineOnlyFilter).toBe(true);
    expect(enabled.selectedRegionFilter).toBeNull();
  });

  it("does not touch the region filter when online-only is disabled", () => {
    const enabled = filterReducer(initialFilterState, { type: "TOGGLE_ONLINE_ONLY" });
    const withRegionWhileOnline: FilterState = { ...enabled, selectedRegionFilter: "הדרום והנגב" };
    const disabled = filterReducer(withRegionWhileOnline, { type: "TOGGLE_ONLINE_ONLY" });
    expect(disabled.onlineOnlyFilter).toBe(false);
    expect(disabled.selectedRegionFilter).toBe("הדרום והנגב");
  });

  it("returns the same reference for unknown actions", () => {
    // @ts-expect-error exercising the default branch with an invalid action
    const result = filterReducer(initialFilterState, { type: "NOPE" });
    expect(result).toBe(initialFilterState);
  });
});
