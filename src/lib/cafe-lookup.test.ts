import { describe, it, expect } from "vitest";
import { getAllCities, getCafesByCity } from "./cafe-lookup";

describe("cafe-lookup city normalization", () => {
  it("exposes Tel Aviv as a single canonical city (no variant entries)", () => {
    const cities = getAllCities().map((c) => c.city);
    expect(cities).toContain("תל אביב");
    expect(cities).not.toContain("תל אביב-יפו");
    expect(cities).not.toContain("תל אביב - יפו");
  });

  it("getCafesByCity('תל אביב') includes cafes stored under variant spellings", () => {
    const canonical = getCafesByCity("תל אביב");
    // Querying by a variant returns the same, unified list.
    const viaVariant = getCafesByCity("תל אביב-יפו");
    expect(viaVariant.length).toBe(canonical.length);
    // The unified list is larger than any single raw-spelling subset would be.
    expect(canonical.length).toBeGreaterThan(82);
  });

  it("every cafe carries both a normalized location and a raw city", () => {
    const cafes = getCafesByCity("תל אביב");
    for (const c of cafes) {
      expect(c.location).toBe("תל אביב");
      expect(typeof c.rawCity).toBe("string");
    }
    // At least some were stored under a variant raw spelling.
    expect(cafes.some((c) => c.rawCity !== "תל אביב")).toBe(true);
  });
});
