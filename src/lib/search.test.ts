import { describe, expect, it } from "vitest";
import {
  normalizeSearchText,
  scoreCafeMatch,
  type SearchableShop,
} from "./search";

describe("normalizeSearchText", () => {
  it("returns an empty string for null/undefined/empty input", () => {
    expect(normalizeSearchText(null)).toBe("");
    expect(normalizeSearchText(undefined)).toBe("");
    expect(normalizeSearchText("")).toBe("");
  });

  it("lowercases Latin characters", () => {
    expect(normalizeSearchText("Cafe Levinsky")).toBe("cafe levinsky");
  });

  it("strips straight and curly quotes, geresh, and gershayim", () => {
    expect(normalizeSearchText("ג'ו")).toBe("גו");
    expect(normalizeSearchText('צ"ק')).toBe("צק");
    expect(normalizeSearchText("L'origine")).toBe("lorigine");
    expect(normalizeSearchText("test’s")).toBe("tests");
  });

  it("strips Hebrew niqqud / cantillation marks", () => {
    // "שָׁלוֹם" contains niqqud; should normalize to "שלום".
    expect(normalizeSearchText("שָׁלוֹם")).toBe("שלום");
  });

  it("collapses internal whitespace and trims", () => {
    expect(normalizeSearchText("  Cafe   Levinsky  ")).toBe("cafe levinsky");
  });
});

describe("scoreCafeMatch", () => {
  const shop = (overrides: Partial<SearchableShop> = {}): SearchableShop => ({
    name: "Cafe Levinsky",
    location: "Tel Aviv",
    address: "10 Levinsky St",
    ...overrides,
  });

  // Callers pre-normalize, so use a normalized query in every test.
  it("returns 0 for an empty query", () => {
    expect(scoreCafeMatch(shop(), "")).toBe(0);
  });

  it("returns 100 for an exact name match (case-insensitive)", () => {
    expect(scoreCafeMatch(shop(), "cafe levinsky")).toBe(100);
  });

  it("returns 85 when the name starts with the query", () => {
    expect(scoreCafeMatch(shop(), "cafe lev")).toBe(85);
  });

  it("returns 70 when any whole word in the name starts with the query", () => {
    // "levinsky" starts with "lev" but "Cafe Levinsky" doesn't start with "lev"
    expect(scoreCafeMatch(shop(), "lev")).toBe(70);
  });

  it("returns 55 when the name contains the query (but no word starts with it)", () => {
    // "vins" is inside "levinsky" but no word starts with it
    expect(scoreCafeMatch(shop(), "vins")).toBe(55);
  });

  it("returns 35 when the city starts with the query", () => {
    expect(scoreCafeMatch(shop({ name: "Other" }), "tel")).toBe(35);
  });

  it("returns 25 when the city contains but does not start with the query", () => {
    expect(scoreCafeMatch(shop({ name: "Other" }), "viv")).toBe(25);
  });

  it("returns 18 when only the address contains the query", () => {
    expect(scoreCafeMatch(shop({ name: "Other", location: "Haifa" }), "10")).toBe(18);
  });

  it("returns 0 when nothing matches", () => {
    expect(
      scoreCafeMatch(shop({ name: "Other", location: "Haifa", address: "1 Main" }), "xyz"),
    ).toBe(0);
  });

  it("handles a null address without throwing", () => {
    expect(() =>
      scoreCafeMatch(shop({ address: null }), "cafe"),
    ).not.toThrow();
  });

  it("priority: a stronger name match beats a city/address match", () => {
    // Query matches "cafe" both in the name (prefix → 85) and in the
    // address ("cafe street") — the higher score must win.
    const s = shop({ address: "Cafe Street" });
    expect(scoreCafeMatch(s, "cafe")).toBe(85);
  });
});
