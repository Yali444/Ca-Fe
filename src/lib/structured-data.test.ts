import { describe, it, expect } from "vitest";
import { cafeJsonLd } from "./structured-data";
import type { CafeMeta } from "./cafe-lookup";

const meta: CafeMeta = {
  id: "cafe-1",
  name: "Test Cafe",
  location: "Tel Aviv",
  address: "Dizengoff 1",
  description: "A cafe",
  image: "/images/x.png",
  lat: 32.08,
  lng: 34.78,
  hours: null,
  brewMethods: [],
  vibeTags: [],
  instagram: null,
  website: null,
  lastModified: null,
  isRoaster: false,
  sellsBeans: false,
  isMatcha: false,
};

const siteUrl = "https://example.com";

describe("cafeJsonLd aggregateRating", () => {
  it("includes AggregateRating when there are reviews", () => {
    const ld = cafeJsonLd(meta, siteUrl, { count: 12, average: 4.6 }) as Record<
      string,
      unknown
    >;
    expect(ld.aggregateRating).toEqual({
      "@type": "AggregateRating",
      ratingValue: 4.6,
      reviewCount: 12,
      bestRating: 5,
      worstRating: 1,
    });
  });

  it("omits AggregateRating when rating is absent", () => {
    const ld = cafeJsonLd(meta, siteUrl) as Record<string, unknown>;
    expect(ld.aggregateRating).toBeUndefined();
  });

  it("omits AggregateRating when the review count is zero", () => {
    const ld = cafeJsonLd(meta, siteUrl, { count: 0, average: 0 }) as Record<
      string,
      unknown
    >;
    expect(ld.aggregateRating).toBeUndefined();
  });
});
