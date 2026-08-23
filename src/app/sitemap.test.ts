import { describe, expect, it } from "vitest";

import { getAllCafes, getAllCities } from "@/lib/cafe-lookup";
import { getThemesWithCounts } from "@/lib/themes";
import sitemap from "./sitemap";

const entries = sitemap();
// Mirrors the module-level default in sitemap.ts; NEXT_PUBLIC_SITE_URL is read
// at import time, so a stubbed env would not apply here.
const siteUrl = "https://www.ca-fe.xyz";

describe("sitemap", () => {
  describe("invariants that keep it a valid sitemap", () => {
    // A duplicate URL is the failure mode that silently degrades indexing, and
    // nothing else in the build would catch it.
    it("has no duplicate urls", () => {
      const urls = entries.map((e) => e.url);
      expect(urls).toHaveLength(new Set(urls).size);
    });

    it("emits only absolute urls on the canonical origin", () => {
      for (const { url } of entries) {
        expect(url.startsWith(`${siteUrl}/`) || url === siteUrl).toBe(true);
      }
    });

    it("emits only parseable urls", () => {
      for (const { url } of entries) {
        expect(() => new URL(url)).not.toThrow();
      }
    });

    // Hebrew city names and cafe ids go through encodeURIComponent. A raw space
    // or '#' would truncate or break the URL in a crawler.
    it("leaves no unescaped spaces or fragments in any url", () => {
      for (const { url } of entries) {
        expect(url).not.toMatch(/[ "<>#]/);
      }
    });

    it("gives every entry a valid lastModified date", () => {
      for (const { url, lastModified } of entries) {
        const date = new Date(lastModified as string | Date);
        expect(Number.isNaN(date.getTime()), `invalid date on ${url}`).toBe(false);
      }
    });

    it("keeps every priority within the 0–1 range the spec allows", () => {
      for (const { priority } of entries) {
        expect(priority).toBeGreaterThanOrEqual(0);
        expect(priority).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("coverage of the site", () => {
    it("lists the homepage first, at top priority", () => {
      expect(entries[0].url).toBe(siteUrl);
      expect(entries[0].priority).toBe(1);
    });

    it("includes the cities and themes index pages", () => {
      const urls = entries.map((e) => e.url);
      expect(urls).toContain(`${siteUrl}/cities`);
      expect(urls).toContain(`${siteUrl}/themes`);
    });

    it("includes one entry per cafe in the dataset", () => {
      const cafes = getAllCafes();
      const cafeUrls = entries.filter((e) => e.url.includes("/cafe/")).map((e) => e.url);

      expect(cafeUrls).toHaveLength(cafes.length);
      for (const cafe of cafes) {
        expect(cafeUrls).toContain(`${siteUrl}/cafe/${encodeURIComponent(cafe.id)}`);
      }
    });

    it("includes one entry per city, with Hebrew names encoded", () => {
      const cities = getAllCities();
      const cityUrls = entries.filter((e) => e.url.includes("/city/")).map((e) => e.url);

      expect(cityUrls).toHaveLength(cities.length);
      for (const { city } of cities) {
        expect(cityUrls).toContain(`${siteUrl}/city/${encodeURIComponent(city)}`);
      }
    });

    it("includes one entry per theme", () => {
      const themes = getThemesWithCounts();
      const themeUrls = entries.filter((e) => e.url.includes("/theme/")).map((e) => e.url);

      expect(themeUrls).toHaveLength(themes.length);
      for (const { theme } of themes) {
        expect(themeUrls).toContain(`${siteUrl}/theme/${theme.slug}`);
      }
    });

    it("never lists an API route", () => {
      expect(entries.some((e) => e.url.includes("/api/"))).toBe(false);
    });
  });

  describe("lastModified", () => {
    it("uses the dataset's own timestamp for a cafe that has one", () => {
      const cafe = getAllCafes().find((c) => c.lastModified);
      // Guard rather than assume: the dataset could legitimately have none.
      if (!cafe) return;

      const entry = entries.find(
        (e) => e.url === `${siteUrl}/cafe/${encodeURIComponent(cafe.id)}`,
      );

      expect(new Date(entry!.lastModified as Date).toISOString()).toBe(
        new Date(cafe.lastModified!).toISOString(),
      );
    });
  });
});
