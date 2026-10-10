import { describe, expect, it } from "vitest";
import {
  formatCityCafeCount,
  formatPlacesCount,
  formatRecommendedPlacesCount,
} from "./hebrew-count";

describe("Hebrew place counts", () => {
  it("uses singular wording for one place", () => {
    expect(formatPlacesCount(1)).toBe("מקום אחד");
    expect(formatRecommendedPlacesCount(1)).toBe("מקום מומלץ אחד");
    expect(formatCityCafeCount(1, "מודיעין")).toBe("מקום מומלץ אחד במודיעין");
  });
  it("keeps plural wording for zero or multiple places", () => {
    expect(formatPlacesCount(0)).toBe("0 מקומות");
    expect(formatPlacesCount(4)).toBe("4 מקומות");
    expect(formatRecommendedPlacesCount(4)).toBe("4 מקומות מומלצים");
  });
});
