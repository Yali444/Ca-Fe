import { describe, it, expect } from "vitest";
import {
  cafeJsonLd,
  faqJsonLd,
  organizationJsonLd,
  websiteJsonLd,
  type FaqCounts,
} from "./structured-data";
import type { CafeMeta } from "./cafe-lookup";

const meta: CafeMeta = {
  id: "cafe-1",
  name: "Test Cafe",
  location: "Tel Aviv",
  rawCity: "Tel Aviv",
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

describe("organizationJsonLd", () => {
  it("emits an Organization with an absolute logo and social sameAs", () => {
    const ld = organizationJsonLd(siteUrl) as Record<string, unknown>;
    expect(ld["@type"]).toBe("Organization");
    expect(ld.logo).toBe(`${siteUrl}/images/ca_fe_logo.png`);
    expect(ld.sameAs).toEqual([
      "https://instagram.com/whoisyali",
      "https://www.facebook.com/yali.oz",
    ]);
    expect(ld.founder).toEqual({ "@type": "Person", name: "יהלי עוז" });
  });
});

describe("websiteJsonLd", () => {
  it("references the Organization as publisher", () => {
    const ld = websiteJsonLd(siteUrl) as Record<string, unknown>;
    expect(ld.publisher).toMatchObject({ "@type": "Organization" });
  });
});

describe("faqJsonLd", () => {
  const counts: FaqCounts = {
    cafes: 153,
    cities: 24,
    roasters: 64,
    beans: 93,
    matcha: 33,
  };

  it("builds a FAQPage whose questions each carry an accepted answer", () => {
    const ld = faqJsonLd(counts) as {
      "@type": string;
      mainEntity: { "@type": string; name: string; acceptedAnswer: { "@type": string; text: string } }[];
    };
    expect(ld["@type"]).toBe("FAQPage");
    expect(ld.mainEntity.length).toBeGreaterThanOrEqual(5);
    for (const entry of ld.mainEntity) {
      expect(entry["@type"]).toBe("Question");
      expect(entry.name.length).toBeGreaterThan(0);
      expect(entry.acceptedAnswer["@type"]).toBe("Answer");
      expect(entry.acceptedAnswer.text.length).toBeGreaterThan(0);
    }
  });

  it("weaves the passed-in counts into the answers", () => {
    const ld = faqJsonLd(counts) as {
      mainEntity: { acceptedAnswer: { text: string } }[];
    };
    const answers = ld.mainEntity.map((e) => e.acceptedAnswer.text).join(" ");
    expect(answers).toContain("153");
    expect(answers).toContain("64");
    expect(answers).toContain("33");
  });
});
