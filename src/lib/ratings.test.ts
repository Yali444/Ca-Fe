import { describe, it, expect, vi } from "vitest";

// Inject a known ratings snapshot. The key is the numeric cafe_id derived from
// generatePlaceId("Test Cafe", "Tel Aviv") -> getNumericId(...) = 1104612
// (both hashes are frozen contracts, snapshot-tested in their own suites).
vi.mock("../../public/data/ratings.json", () => ({
  default: {
    "1104612": { count: 3, average: 4.7 },
    "42": { count: 10, average: 4.2 },
    // A defensive zero-count entry that lookups must treat as "no rating".
    "999": { count: 0, average: 0 },
  },
}));

import {
  getRatingByNumericId,
  getRatingForPlaceId,
  getRatingForMeta,
} from "./ratings";
import { generatePlaceId } from "./place-id";

describe("ratings lookup", () => {
  it("resolves by numeric cafe_id", () => {
    expect(getRatingByNumericId(42)).toEqual({ count: 10, average: 4.2 });
  });

  it("returns null for an unknown id", () => {
    expect(getRatingByNumericId(123456789)).toBeNull();
  });

  it("treats a zero-count entry as no rating", () => {
    expect(getRatingByNumericId(999)).toBeNull();
  });

  it("maps a placeId to its rating (client path)", () => {
    const placeId = generatePlaceId("Test Cafe", "Tel Aviv");
    expect(getRatingForPlaceId(placeId)).toEqual({ count: 3, average: 4.7 });
  });

  it("maps name + city to its rating (server/SEO path)", () => {
    expect(getRatingForMeta("Test Cafe", "Tel Aviv")).toEqual({
      count: 3,
      average: 4.7,
    });
  });

  it("client and server paths agree for the same cafe", () => {
    const name = "Test Cafe";
    const city = "Tel Aviv";
    expect(getRatingForMeta(name, city)).toEqual(
      getRatingForPlaceId(generatePlaceId(name, city)),
    );
  });

  it("returns null for a cafe with no reviews", () => {
    expect(getRatingForMeta("No Reviews Here", "Nowhere")).toBeNull();
  });
});
