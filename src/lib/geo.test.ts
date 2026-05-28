import { describe, expect, it } from "vitest";
import {
  DEFAULT_MAP_CENTER,
  calculateDistance,
  calculateMapCenter,
} from "./geo";

describe("calculateDistance", () => {
  it("returns 0 for the same point", () => {
    expect(calculateDistance(32.0853, 34.7818, 32.0853, 34.7818)).toBe(0);
  });

  it("is symmetric in its arguments", () => {
    const a = calculateDistance(32.0853, 34.7818, 31.7683, 35.2137);
    const b = calculateDistance(31.7683, 35.2137, 32.0853, 34.7818);
    expect(a).toBeCloseTo(b, 10);
  });

  it("matches the known Tel Aviv → Jerusalem distance (~54km)", () => {
    // Real-world straight-line distance is ~54.4 km.
    const d = calculateDistance(32.0853, 34.7818, 31.7683, 35.2137);
    expect(d).toBeGreaterThan(53);
    expect(d).toBeLessThan(56);
  });

  it("returns a sensible distance for two nearby points (~1km)", () => {
    // ~0.009 deg lat ≈ ~1 km.
    const d = calculateDistance(32.0853, 34.7818, 32.0943, 34.7818);
    expect(d).toBeGreaterThan(0.9);
    expect(d).toBeLessThan(1.1);
  });
});

describe("calculateMapCenter", () => {
  it("falls back to Jerusalem when the list is empty", () => {
    expect(calculateMapCenter([])).toEqual(DEFAULT_MAP_CENTER);
    expect(DEFAULT_MAP_CENTER).toEqual([31.7683, 35.2137]);
  });

  it("returns a single point as-is", () => {
    const center = calculateMapCenter([{ lat: 32.0853, lng: 34.7818 }]);
    expect(center).toEqual([32.0853, 34.7818]);
  });

  it("averages two points to their midpoint", () => {
    const center = calculateMapCenter([
      { lat: 32, lng: 34 },
      { lat: 34, lng: 36 },
    ]);
    expect(center[0]).toBeCloseTo(33, 10);
    expect(center[1]).toBeCloseTo(35, 10);
  });

  it("computes the centroid of three Israeli cities", () => {
    // TLV, Jerusalem, Haifa
    const center = calculateMapCenter([
      { lat: 32.0853, lng: 34.7818 },
      { lat: 31.7683, lng: 35.2137 },
      { lat: 32.7940, lng: 34.9896 },
    ]);
    expect(center[0]).toBeCloseTo(32.2159, 3);
    expect(center[1]).toBeCloseTo(34.9950, 3);
  });
});
