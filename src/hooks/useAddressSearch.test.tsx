// @vitest-environment jsdom
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { useAddressSearch } from "./useAddressSearch";
import type { CoffeeShop } from "@/lib/coffee-shop";

const makeShop = (over: Partial<CoffeeShop>): CoffeeShop => ({
  id: "id",
  name: "Cafe",
  location: "Tel Aviv",
  address: "1 St",
  lat: 0,
  lng: 0,
  image: "/x.jpg",
  specialty: "",
  description: "",
  vibeTags: [],
  reviews: [],
  ...over,
});

const shops: CoffeeShop[] = [
  makeShop({ id: "a", name: "Cafe Levinsky", location: "Tel Aviv", address: "10 Levinsky" }),
  makeShop({ id: "b", name: "Black Coffee", location: "Haifa", address: "5 Herzl" }),
  makeShop({ id: "h", name: "Hidden Cafe", hidden: true }),
];

interface SetupOpts {
  isOnline?: boolean;
}

function setup({ isOnline = true }: SetupOpts = {}) {
  const onSelectShop = vi.fn();
  const onAddressResolved = vi.fn();
  const view = renderHook(() =>
    useAddressSearch({ isOnline, coffeeShops: shops, onSelectShop, onAddressResolved })
  );
  return { ...view, onSelectShop, onAddressResolved };
}

const keyEvent = (key: string) =>
  ({ key, preventDefault: () => {} }) as unknown as ReactKeyboardEvent<HTMLInputElement>;

const mockGeocode = (result: { lat: number; lng: number } | null) =>
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, json: async () => ({ result }) })
  );

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useAddressSearch — catalog matches", () => {
  it("returns no matches for queries shorter than 2 chars", () => {
    const { result } = setup();
    act(() => result.current.setAddressQuery("c"));
    expect(result.current.catalogMatches).toEqual([]);
  });

  it("matches cafes by name and excludes hidden ones", () => {
    const { result } = setup();
    act(() => result.current.setAddressQuery("cafe"));
    const names = result.current.catalogMatches.map((s) => s.name);
    expect(names).toContain("Cafe Levinsky");
    expect(names).not.toContain("Hidden Cafe");
  });
});

describe("useAddressSearch — search submission", () => {
  it("selects the best catalog match on mobile search (catalog-first)", async () => {
    const { result, onSelectShop, onAddressResolved } = setup();
    act(() => result.current.setAddressQuery("levinsky"));
    await act(async () => {
      await result.current.handleMobileAddressSearch();
    });
    expect(onSelectShop).toHaveBeenCalledWith(expect.objectContaining({ id: "a" }));
    expect(onAddressResolved).not.toHaveBeenCalled();
  });

  it("geocodes as an address when there is no catalog match", async () => {
    mockGeocode({ lat: 1, lng: 2 });
    const { result, onAddressResolved } = setup();
    act(() => result.current.setAddressQuery("zzz nowhere blvd"));
    await act(async () => {
      await result.current.handleMobileAddressSearch();
    });
    expect(onAddressResolved).toHaveBeenCalledWith({ lat: 1, lng: 2 });
    expect(result.current.addressLocation).toEqual({ lat: 1, lng: 2 });
    expect(result.current.lastSearchedAddress).toBe("zzz nowhere blvd");
    expect(result.current.addressQuery).toBe("");
    expect(result.current.recentAddresses).toContain("zzz nowhere blvd");
  });

  it("sets an offline error and does not resolve while offline", async () => {
    const { result, onAddressResolved } = setup({ isOnline: false });
    act(() => result.current.setAddressQuery("somewhere"));
    await act(async () => {
      await result.current.runAddressSearch();
    });
    expect(result.current.addressSearchError).toContain("אינטרנט");
    expect(onAddressResolved).not.toHaveBeenCalled();
  });

  it("sets a not-found error when geocoding returns no result", async () => {
    mockGeocode(null);
    const { result, onAddressResolved } = setup();
    act(() => result.current.setAddressQuery("nowhere zzz"));
    await act(async () => {
      await result.current.runAddressSearch();
    });
    expect(result.current.addressSearchError).toBe("לא נמצאה כתובת");
    expect(onAddressResolved).not.toHaveBeenCalled();
  });
});

describe("useAddressSearch — keyboard navigation", () => {
  it("ArrowDown moves the highlight to the first option", async () => {
    const { result } = setup();
    act(() => result.current.setAddressQuery("cafe"));
    await act(async () => {
      await result.current.handleAddressKeyDown(keyEvent("ArrowDown"));
    });
    expect(result.current.searchHighlightIndex).toBe(0);
  });

  it("Enter with no explicit highlight selects the best catalog match", async () => {
    const { result, onSelectShop } = setup();
    act(() => result.current.setAddressQuery("cafe"));
    await act(async () => {
      await result.current.handleAddressKeyDown(keyEvent("Enter"));
    });
    expect(onSelectShop).toHaveBeenCalledTimes(1);
  });

  it("Escape unfocuses and clears the highlight", async () => {
    const { result } = setup();
    act(() => result.current.setSearchFocused(true));
    await act(async () => {
      await result.current.handleAddressKeyDown(keyEvent("Escape"));
    });
    expect(result.current.searchFocused).toBe(false);
    expect(result.current.searchHighlightIndex).toBe(-1);
  });
});

describe("useAddressSearch — clear and restore", () => {
  it("clears the search box", () => {
    const { result } = setup();
    act(() => result.current.setAddressQuery("abc"));
    act(() => result.current.clearAddressSearch());
    expect(result.current.addressQuery).toBe("");
    expect(result.current.addressLocation).toBeNull();
  });

  it("restores the last searched address", async () => {
    mockGeocode({ lat: 1, lng: 2 });
    const { result } = setup();
    act(() => result.current.setAddressQuery("dizengoff 100"));
    await act(async () => {
      await result.current.runAddressSearch();
    });
    expect(result.current.addressQuery).toBe("");
    act(() => result.current.restoreLastSearchedAddress());
    expect(result.current.addressQuery).toBe("dizengoff 100");
  });
});
