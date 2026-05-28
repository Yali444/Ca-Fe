import { describe, expect, it } from "vitest";
import { calculateDistance } from "./geo";

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
