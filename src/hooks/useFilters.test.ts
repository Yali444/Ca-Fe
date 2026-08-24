// @vitest-environment jsdom
import { afterEach, describe, it, expect } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { filterReducer, initialFilterState, useFilters, type FilterState } from "./useFilters";

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

describe("useFilters persistence", () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("starts from the defaults even when an old saved value exists", () => {
    window.localStorage.setItem(
      "cafe-filters",
      JSON.stringify({ showOpenNowOnly: true, sellsBeansFilter: true }),
    );

    const { result } = renderHook(() => useFilters());

    expect(result.current.filters).toEqual(initialFilterState);
    // The stale value is cleaned up rather than left sitting in storage.
    expect(window.localStorage.getItem("cafe-filters")).toBeNull();
  });

  it("does not write filters to storage when they change", () => {
    const { result } = renderHook(() => useFilters());

    act(() => result.current.actions.toggleOpenNow());

    expect(result.current.filters.showOpenNowOnly).toBe(true);
    expect(window.localStorage.getItem("cafe-filters")).toBeNull();
  });
});

// The reducer is covered above; these cover the wiring between the named
// dispatchers and the action types. A copy-paste slip here — toggleNoMatcha
// dispatching TOGGLE_ONLINE_ONLY, say — passes the type checker and every
// reducer test, and breaks two filters in the UI.
describe("useFilters action dispatchers", () => {
  afterEach(cleanup);

  const BOOLEAN_KEYS = [
    "sellsBeansFilter",
    "favoritesFilter",
    "showOpenNowOnly",
    "openShabbatFilter",
    "noMatchaFilter",
    "onlineOnlyFilter",
  ] as const;

  it.each([
    ["toggleSellsBeans", "sellsBeansFilter"],
    ["toggleFavorites", "favoritesFilter"],
    ["toggleOpenNow", "showOpenNowOnly"],
    ["toggleOpenShabbat", "openShabbatFilter"],
    ["toggleNoMatcha", "noMatchaFilter"],
    ["toggleOnlineOnly", "onlineOnlyFilter"],
  ] as const)("%s flips %s and leaves every other filter alone", (action, key) => {
    const { result } = renderHook(() => useFilters());

    act(() => (result.current.actions[action] as () => void)());

    expect(result.current.filters[key]).toBe(true);
    for (const other of BOOLEAN_KEYS) {
      if (other === key) continue;
      expect(result.current.filters[other]).toBe(false);
    }
    expect(result.current.filters.selectedBrewMethods).toEqual([]);
  });

  it("toggleBrewMethod adds then removes the method it was given", () => {
    const { result } = renderHook(() => useFilters());

    act(() => result.current.actions.toggleBrewMethod("קולד ברו"));
    expect(result.current.filters.selectedBrewMethods).toEqual(["קולד ברו"]);

    act(() => result.current.actions.toggleBrewMethod("קולד ברו"));
    expect(result.current.filters.selectedBrewMethods).toEqual([]);
  });

  it("setRegion stores the area it was given, and null clears it", () => {
    const { result } = renderHook(() => useFilters());

    act(() => result.current.actions.setRegion("השרון"));
    expect(result.current.filters.selectedRegionFilter).toBe("השרון");

    act(() => result.current.actions.setRegion(null));
    expect(result.current.filters.selectedRegionFilter).toBeNull();
  });

  it("hydrate merges a partial over the defaults without clearing the rest", () => {
    const { result } = renderHook(() => useFilters());

    act(() => result.current.actions.hydrate({ sellsBeansFilter: true, selectedBrewMethods: ["V60"] }));

    expect(result.current.filters.sellsBeansFilter).toBe(true);
    expect(result.current.filters.selectedBrewMethods).toEqual(["V60"]);
    expect(result.current.filters.favoritesFilter).toBe(false);
  });

  it("reset returns every filter to its default", () => {
    const { result } = renderHook(() => useFilters());

    act(() => {
      result.current.actions.toggleSellsBeans();
      result.current.actions.toggleFavorites();
      result.current.actions.setRegion("חיפה והצפון");
      result.current.actions.toggleBrewMethod("V60");
    });
    expect(result.current.filters.sellsBeansFilter).toBe(true);

    act(() => result.current.actions.reset());

    expect(result.current.filters).toEqual(initialFilterState);
  });

  it("toggleOnlineOnly clears an active region, matching the reducer's rule", () => {
    const { result } = renderHook(() => useFilters());

    act(() => result.current.actions.setRegion("הדרום והנגב"));
    act(() => result.current.actions.toggleOnlineOnly());

    expect(result.current.filters.onlineOnlyFilter).toBe(true);
    expect(result.current.filters.selectedRegionFilter).toBeNull();
  });
});
