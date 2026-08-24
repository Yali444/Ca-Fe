import { describe, expect, it, vi } from "vitest";

/**
 * `hidden` means "exclude from display" (src/types/place.ts), and cafe-lookup is
 * the single source for every server-rendered surface. These tests mock the
 * dataset because the real one currently has no hidden rows — so without a
 * fixture the behaviour would be unverifiable until the day someone hides a
 * cafe and discovers it still has a crawlable page.
 *
 * Lives in its own file so the mock does not leak into cafe-lookup.test.ts,
 * which deliberately asserts against the real dataset.
 */
vi.mock("../../public/data/cafes.json", () => ({
  default: [
    {
      id: 1,
      name: "גלוי א",
      city: "תל אביב",
      coordinates: { lat: 32.08, lng: 34.78 },
      brewMethods: ["אספרסו"],
      isRoaster: true,
    },
    {
      id: 2,
      name: "מוסתר",
      city: "תל אביב",
      coordinates: { lat: 32.09, lng: 34.79 },
      brewMethods: ["אספרסו"],
      isRoaster: true,
      hidden: true,
    },
    {
      id: 3,
      name: "גלוי ב",
      city: "חיפה",
      coordinates: { lat: 32.79, lng: 34.99 },
    },
    {
      id: 4,
      name: "מוסתר יחיד בעיר",
      city: "אילת",
      coordinates: { lat: 29.55, lng: 34.95 },
      hidden: true,
    },
  ],
}));

const { findCafeMeta, getAllCafeIds, getAllCafes, getAllCities, getCafesByCity } =
  await import("./cafe-lookup");
const { getCafesForTheme, getThemesWithCounts, getTheme } = await import("./themes");

describe("hidden cafes are excluded from every server-rendered surface", () => {
  it("getAllCafes omits them — this feeds the sitemap, homepage JSON-LD and llms.txt", () => {
    const names = getAllCafes().map((c) => c.name);

    expect(names).toEqual(["גלוי א", "גלוי ב"]);
    expect(names).not.toContain("מוסתר");
  });

  it("getAllCafeIds omits them, so no static page is generated for one", () => {
    expect(getAllCafeIds()).toEqual(["1", "3"]);
  });

  it("findCafeMeta returns null for a hidden id, so /cafe/<id> 404s", () => {
    expect(findCafeMeta("2")).toBeNull();
    expect(findCafeMeta("1")).not.toBeNull();
  });

  it("getCafesByCity omits them from a city listing", () => {
    const telAviv = getCafesByCity("תל אביב").map((c) => c.name);

    expect(telAviv).toEqual(["גלוי א"]);
  });

  // The bug that started this: a hidden cafe inflated the count shown on the
  // chip while never appearing in the list underneath it.
  it("getAllCities counts only visible cafes", () => {
    const telAviv = getAllCities().find((c) => c.city === "תל אביב");

    expect(telAviv?.count).toBe(1);
  });

  it("drops a city entirely when all of its cafes are hidden", () => {
    expect(getAllCities().map((c) => c.city)).not.toContain("אילת");
  });

  it("keeps every city's count equal to the length of its own listing", () => {
    for (const { city, count } of getAllCities()) {
      expect(getCafesByCity(city), `count mismatch for ${city}`).toHaveLength(count);
    }
  });

  it("excludes them from theme pages and theme counts", () => {
    const roasters = getTheme("roasters")!;

    expect(getCafesForTheme(roasters).map((c) => c.name)).toEqual(["גלוי א"]);
    expect(getThemesWithCounts().find((t) => t.theme.slug === "roasters")?.count).toBe(1);
  });
});
