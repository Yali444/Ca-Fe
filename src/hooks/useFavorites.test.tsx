// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";

import { useFavorites } from "./useFavorites";

/** Records every value written to the "favorites" key, in order. */
function trackWrites(): string[] {
  const writes: string[] = [];
  const original = Storage.prototype.setItem;
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
    this: Storage,
    key: string,
    value: string,
  ) {
    if (key === "favorites") writes.push(value);
    return original.call(this, key, value);
  });
  return writes;
}

describe("useFavorites", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe("hydration", () => {
    it("restores the persisted list on mount", () => {
      localStorage.setItem("favorites", JSON.stringify(["shop-a", "shop-b"]));

      const { result } = renderHook(() => useFavorites());

      expect(result.current.favorites).toEqual(["shop-a", "shop-b"]);
    });

    // Regression: the persist effect used to run on mount against the seeded
    // `[]`, writing it over the stored list before hydration replaced it. It
    // recovered on the next render, so it never showed up in normal use — but
    // a teardown inside that window wiped the user's saved cafes for good.
    it("never writes an empty list over stored favourites while hydrating", () => {
      localStorage.setItem("favorites", JSON.stringify(["shop-a", "shop-b"]));
      const writes = trackWrites();

      renderHook(() => useFavorites());

      expect(writes).not.toContain("[]");
      expect(localStorage.getItem("favorites")).toBe(JSON.stringify(["shop-a", "shop-b"]));
    });

    it("keeps stored favourites intact when unmounted immediately after mount", () => {
      localStorage.setItem("favorites", JSON.stringify(["shop-a"]));

      const { unmount } = renderHook(() => useFavorites());
      unmount();

      expect(localStorage.getItem("favorites")).toBe(JSON.stringify(["shop-a"]));
    });

    it("starts empty when nothing is stored", () => {
      const { result } = renderHook(() => useFavorites());

      expect(result.current.favorites).toEqual([]);
    });

    it("falls back to an empty list when the stored value is corrupt", () => {
      localStorage.setItem("favorites", "{not json");

      const { result } = renderHook(() => useFavorites());

      expect(result.current.favorites).toEqual([]);
    });

    it("ignores a stored value that is not an array", () => {
      localStorage.setItem("favorites", JSON.stringify({ shopA: true }));

      const { result } = renderHook(() => useFavorites());

      expect(result.current.favorites).toEqual([]);
    });

    it("drops non-string entries from a stored list", () => {
      localStorage.setItem("favorites", JSON.stringify(["shop-a", 42, null, "shop-b"]));

      const { result } = renderHook(() => useFavorites());

      expect(result.current.favorites).toEqual(["shop-a", "shop-b"]);
    });
  });

  describe("toggleFavorite", () => {
    it("adds a shop that is not yet favourited", () => {
      const { result } = renderHook(() => useFavorites());

      act(() => result.current.toggleFavorite("shop-a"));

      expect(result.current.favorites).toEqual(["shop-a"]);
    });

    it("removes a shop that is already favourited", () => {
      localStorage.setItem("favorites", JSON.stringify(["shop-a", "shop-b"]));
      const { result } = renderHook(() => useFavorites());

      act(() => result.current.toggleFavorite("shop-a"));

      expect(result.current.favorites).toEqual(["shop-b"]);
    });

    it("persists the new list to localStorage", () => {
      const { result } = renderHook(() => useFavorites());

      act(() => result.current.toggleFavorite("shop-a"));

      expect(localStorage.getItem("favorites")).toBe(JSON.stringify(["shop-a"]));
    });

    it("round-trips through storage into a freshly mounted hook", () => {
      const first = renderHook(() => useFavorites());
      act(() => first.result.current.toggleFavorite("shop-a"));
      first.unmount();

      const second = renderHook(() => useFavorites());

      expect(second.result.current.favorites).toEqual(["shop-a"]);
    });
  });

  describe("when storage is unavailable", () => {
    it("still exposes favourites for the visit when writes throw", () => {
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new DOMException("QuotaExceededError");
      });

      const { result } = renderHook(() => useFavorites());
      act(() => result.current.toggleFavorite("shop-a"));

      expect(result.current.favorites).toEqual(["shop-a"]);
    });

    it("mounts with an empty list when reads throw", () => {
      vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new DOMException("SecurityError");
      });

      const { result } = renderHook(() => useFavorites());

      expect(result.current.favorites).toEqual([]);
    });
  });
});
