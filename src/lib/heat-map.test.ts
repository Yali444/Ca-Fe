import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  calculateDistance,
  calculateHeatMapData,
  getDensityLevel,
  getHeatMapAreas,
  getHeatMapColor,
  type HeatMapInput,
} from "./heat-map";

const cafe = (overrides: Partial<HeatMapInput> & { id?: string } = {}): HeatMapInput => ({
  lat: 32.0853,
  lng: 34.7818,
  reviews: [],
  ...overrides,
});

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

describe("getHeatMapColor", () => {
  it("maps each intensity band to the documented color", () => {
    expect(getHeatMapColor(0.0)).toBe("rgba(0, 255, 0, 0.3)");
    expect(getHeatMapColor(0.1)).toBe("rgba(0, 255, 0, 0.3)");
    expect(getHeatMapColor(0.3)).toBe("rgba(255, 255, 0, 0.4)");
    expect(getHeatMapColor(0.5)).toBe("rgba(255, 165, 0, 0.5)");
    expect(getHeatMapColor(0.7)).toBe("rgba(255, 69, 0, 0.6)");
    expect(getHeatMapColor(0.9)).toBe("rgba(255, 0, 0, 0.7)");
    expect(getHeatMapColor(1.0)).toBe("rgba(255, 0, 0, 0.7)");
  });

  it("treats band boundaries as belonging to the upper band", () => {
    // < 0.2 is green, so 0.2 should NOT be green.
    expect(getHeatMapColor(0.2)).not.toBe("rgba(0, 255, 0, 0.3)");
    expect(getHeatMapColor(0.4)).not.toBe("rgba(255, 255, 0, 0.4)");
    expect(getHeatMapColor(0.6)).not.toBe("rgba(255, 165, 0, 0.5)");
    expect(getHeatMapColor(0.8)).not.toBe("rgba(255, 69, 0, 0.6)");
  });
});

describe("getDensityLevel", () => {
  it("classifies each density band", () => {
    expect(getDensityLevel(0).level).toBe("very-low");
    expect(getDensityLevel(0.3).level).toBe("very-low");
    expect(getDensityLevel(0.7).level).toBe("low");
    expect(getDensityLevel(1.2).level).toBe("medium");
    expect(getDensityLevel(1.7).level).toBe("high");
    expect(getDensityLevel(2.5).level).toBe("very-high");
  });

  it("uses the documented Hebrew labels", () => {
    expect(getDensityLevel(0.3).text).toBe("צפיפות נמוכה מאוד");
    expect(getDensityLevel(2.5).text).toBe("צפיפות גבוהה מאוד");
  });

  it("returns Tailwind color tokens for each band", () => {
    const high = getDensityLevel(1.7);
    expect(high.color).toContain("text-orange-600");
    expect(high.bgColor).toContain("bg-orange-100");
  });
});

describe("getHeatMapAreas", () => {
  it("returns one entry per predefined Israeli area", () => {
    const areas = getHeatMapAreas([]);
    expect(areas.length).toBe(17);
    expect(areas.every((a) => a.cafeDensity === 0)).toBe(true);
  });

  it("counts a cafe inside Tel Aviv center toward its area", () => {
    const areas = getHeatMapAreas([
      cafe({ id: "1", lat: 32.0853, lng: 34.7818 }), // exactly TA center
    ]);
    const taCenter = areas.find((a) => a.name === "תל אביב מרכז");
    expect(taCenter?.cafeDensity).toBeGreaterThan(0);
  });

  it("sorts results by density descending", () => {
    const cafes = [
      cafe({ id: "1", lat: 32.0853, lng: 34.7818 }),
      cafe({ id: "2", lat: 32.0853, lng: 34.7818 }),
      cafe({ id: "3", lat: 32.0853, lng: 34.7818 }),
    ];
    const areas = getHeatMapAreas(cafes);
    for (let i = 1; i < areas.length; i++) {
      expect(areas[i - 1].cafeDensity).toBeGreaterThanOrEqual(
        areas[i].cafeDensity,
      );
    }
  });

  it("ranks popular types by frequency within an area", () => {
    const cafes = [
      cafe({ id: "1", lat: 32.0853, lng: 34.7818, type: "matcha" }),
      cafe({ id: "2", lat: 32.0853, lng: 34.7818, type: "matcha" }),
      cafe({ id: "3", lat: 32.0853, lng: 34.7818, type: "coffee" }),
    ];
    const taCenter = getHeatMapAreas(cafes).find(
      (a) => a.name === "תל אביב מרכז",
    );
    expect(taCenter?.popularTypes[0]).toBe("matcha");
  });

  it("treats cafes without a type as 'coffee'", () => {
    const cafes = [
      cafe({ id: "1", lat: 32.0853, lng: 34.7818 }),
      cafe({ id: "2", lat: 32.0853, lng: 34.7818 }),
    ];
    const taCenter = getHeatMapAreas(cafes).find(
      (a) => a.name === "תל אביב מרכז",
    );
    expect(taCenter?.popularTypes).toContain("coffee");
  });
});

describe("calculateHeatMapData", () => {
  // The function uses Math.random() for jitter — pin it so output is deterministic.
  beforeEach(() => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns no points when there are no cafes", () => {
    expect(calculateHeatMapData([])).toEqual([]);
  });

  it("produces points for areas that contain the cafe", () => {
    // A cafe at TA-center coords falls inside multiple overlapping radii
    // (TA-center and Ramat Gan), so we just assert it shows up in TA-center.
    const points = calculateHeatMapData([
      cafe({ id: "1", lat: 32.0853, lng: 34.7818 }),
    ]);
    expect(points.length).toBeGreaterThan(0);
    expect(points.some((p) => p.area === "תל אביב מרכז")).toBe(true);
  });

  it("does not emit points for areas far from any cafe", () => {
    const points = calculateHeatMapData([
      cafe({ id: "1", lat: 32.0853, lng: 34.7818 }), // Tel Aviv center
    ]);
    // Be'er Sheva is ~100km south — should never appear.
    expect(points.some((p) => p.area === "באר שבע")).toBe(false);
  });

  it("emits at least 3 points per non-empty area for smoother visualization", () => {
    const points = calculateHeatMapData([
      cafe({ id: "1", lat: 32.0853, lng: 34.7818 }),
    ]);
    expect(points.length).toBeGreaterThanOrEqual(3);
  });

  it("emits intensity values within [0, 1]", () => {
    const points = calculateHeatMapData([
      cafe({ id: "1", lat: 32.0853, lng: 34.7818 }),
      cafe({ id: "2", lat: 32.0853, lng: 34.7818 }),
      cafe({ id: "3", lat: 32.0853, lng: 34.7818 }),
    ]);
    for (const p of points) {
      expect(p.intensity).toBeGreaterThanOrEqual(0);
      expect(p.intensity).toBeLessThanOrEqual(1);
    }
  });
});
