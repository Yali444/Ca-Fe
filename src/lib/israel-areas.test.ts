import { describe, expect, it } from "vitest";
import {
  AREA_MAPPINGS,
  getAreaForCity,
  MAIN_AREAS,
  MAIN_AREA_SET,
} from "./israel-areas";

describe("getAreaForCity", () => {
  it("returns 'אחר' for null/empty input", () => {
    expect(getAreaForCity(null)).toBe("אחר");
    expect(getAreaForCity("")).toBe("אחר");
  });

  it("maps the canonical Tel Aviv variants to גוש דן", () => {
    expect(getAreaForCity("תל אביב")).toBe("תל אביב וגוש דן");
    expect(getAreaForCity("תל אביב - יפו")).toBe("תל אביב וגוש דן");
    expect(getAreaForCity("תל אביב-יפו")).toBe("תל אביב וגוש דן");
    expect(getAreaForCity("יפו")).toBe("תל אביב וגוש דן");
  });

  it("maps Haifa and northern kibbutzim to חיפה והצפון", () => {
    expect(getAreaForCity("חיפה")).toBe("חיפה והצפון");
    expect(getAreaForCity("קיבוץ יגור")).toBe("חיפה והצפון");
  });

  it("returns 'אחר' for cities not in the mapping", () => {
    expect(getAreaForCity("עיר שלא קיימת")).toBe("אחר");
  });
});

describe("MAIN_AREAS and AREA_MAPPINGS invariants", () => {
  it("every mapped area is one of the six canonical regions", () => {
    for (const area of Object.values(AREA_MAPPINGS)) {
      expect(MAIN_AREA_SET.has(area)).toBe(true);
    }
  });

  it("the set has exactly the six canonical regions", () => {
    expect(MAIN_AREA_SET.size).toBe(MAIN_AREAS.length);
    expect(MAIN_AREA_SET.size).toBe(6);
  });
});
