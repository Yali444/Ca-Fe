import { describe, expect, it } from "vitest";
import {
  AREA_MAPPINGS,
  getAreaForCity,
  groupShopsByArea,
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

describe("groupShopsByArea", () => {
  const shop = (name: string, location: string) => ({ name, location });

  it("returns an empty array for no shops", () => {
    expect(groupShopsByArea([])).toEqual([]);
  });

  it("groups shops by their region (via getAreaForCity)", () => {
    const groups = groupShopsByArea([
      shop("Cafe A", "תל אביב"),
      shop("Cafe B", "חיפה"),
      shop("Cafe C", "יפו"), // also maps to גוש דן
    ]);

    const tlv = groups.find((g) => g.area === "תל אביב וגוש דן");
    const haifa = groups.find((g) => g.area === "חיפה והצפון");
    expect(tlv?.shops).toHaveLength(2);
    expect(haifa?.shops).toHaveLength(1);
  });

  it("puts shops in unmapped cities into the 'אחר' bucket", () => {
    const groups = groupShopsByArea([shop("Cafe X", "עיר שלא קיימת")]);
    expect(groups[0].area).toBe("אחר");
  });

  it("sorts the regions by shop count descending", () => {
    const groups = groupShopsByArea([
      shop("A", "חיפה"),
      shop("B", "תל אביב"),
      shop("C", "תל אביב"),
      shop("D", "תל אביב"),
    ]);
    expect(groups[0].area).toBe("תל אביב וגוש דן");
    expect(groups[0].shops).toHaveLength(3);
    expect(groups[1].area).toBe("חיפה והצפון");
  });

  it("sorts the shops inside each group alphabetically with Hebrew collation", () => {
    const groups = groupShopsByArea([
      shop("ג", "תל אביב"),
      shop("א", "תל אביב"),
      shop("ב", "תל אביב"),
    ]);
    expect(groups[0].shops.map((s) => s.name)).toEqual(["א", "ב", "ג"]);
  });

  it("treats missing names as empty strings without throwing", () => {
    const items = [
      { name: "", location: "תל אביב" },
      { name: "אבי", location: "תל אביב" },
    ];
    expect(() => groupShopsByArea(items)).not.toThrow();
  });
});
