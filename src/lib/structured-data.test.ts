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
  googlePlaceId: null,
  phone: null,
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

describe("cafeJsonLd entity graph & enrichment", () => {
  it("gives the cafe a stable @id and links it to the WebSite", () => {
    const ld = cafeJsonLd(meta, siteUrl) as Record<string, unknown>;
    expect(ld["@id"]).toBe(`${siteUrl}/cafe/cafe-1#place`);
    expect(ld.isPartOf).toEqual({ "@id": `${siteUrl}#website` });
  });

  it("adds a Google Maps sameAs when a place id is present", () => {
    const ld = cafeJsonLd(
      { ...meta, googlePlaceId: "ChIJabc123" },
      siteUrl,
    ) as Record<string, unknown>;
    expect(ld.sameAs).toContain(
      "https://www.google.com/maps/place/?q=place_id:ChIJabc123",
    );
  });

  it("omits the Google Maps sameAs when there is no place id", () => {
    const ld = cafeJsonLd(meta, siteUrl) as Record<string, unknown>;
    const sameAs = (ld.sameAs as string[] | undefined) ?? [];
    expect(sameAs.some((s) => s.includes("maps"))).toBe(false);
  });

  it("maps brew methods to a Menu, and beans to an Offer", () => {
    const ld = cafeJsonLd(
      { ...meta, vibeTags: ["חמים וביתי"], brewMethods: ["אספרסו"], sellsBeans: true },
      siteUrl,
    ) as Record<string, unknown>;

    const menu = ld.hasMenu as { hasMenuItem: { name: string }[] };
    expect(menu.hasMenuItem.map((i) => i.name)).toContain("אספרסו");

    const offers = ld.makesOffer as { "@type": string; name: string }[];
    expect(offers.map((o) => o.name)).toContain("פולי קפה לקנייה");
    expect(offers.every((o) => !("itemOffered" in o))).toBe(true);
  });

  it("emits opening hours as OpeningHoursSpecification objects", () => {
    const ld = cafeJsonLd(
      { ...meta, hours: { sunday: "08:00-17:00" } },
      siteUrl,
    ) as Record<string, unknown>;
    const spec = ld.openingHoursSpecification as {
      "@type": string;
      dayOfWeek: string;
      opens: string;
      closes: string;
    }[];
    expect(spec).toContainEqual({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: "Sunday",
      opens: "08:00",
      closes: "17:00",
    });
  });

  it("emits telephone when the cafe has a phone, and omits it otherwise", () => {
    const withPhone = cafeJsonLd(
      { ...meta, phone: "03-1234567" },
      siteUrl,
    ) as Record<string, unknown>;
    expect(withPhone.telephone).toBe("03-1234567");

    const without = cafeJsonLd(meta, siteUrl) as Record<string, unknown>;
    expect(without.telephone).toBeUndefined();
  });

  it("emits one spec per window when a day is split", () => {
    const ld = cafeJsonLd(
      { ...meta, hours: { thursday: "08:00-16:00, 19:00-23:00" } },
      siteUrl,
    ) as Record<string, unknown>;
    expect(ld.openingHoursSpecification).toEqual([
      { "@type": "OpeningHoursSpecification", dayOfWeek: "Thursday", opens: "08:00", closes: "16:00" },
      { "@type": "OpeningHoursSpecification", dayOfWeek: "Thursday", opens: "19:00", closes: "23:00" },
    ]);
  });

  it("drops windows whose bounds are not real times", () => {
    const ld = cafeJsonLd(
      {
        ...meta,
        // Real dataset shapes: Hebrew prose for the Shabbat edges.
        hours: { friday: "06:30-ערב שבת", saturday: 'מוצ"ש-24:00', sunday: "06:45-24:00" },
      },
      siteUrl,
    ) as Record<string, unknown>;
    expect(ld.openingHoursSpecification).toEqual([
      { "@type": "OpeningHoursSpecification", dayOfWeek: "Sunday", opens: "06:45", closes: "24:00" },
    ]);
  });

  it("omits opening hours entirely when the value is free text", () => {
    const ld = cafeJsonLd(
      { ...meta, hours: "בתיאום מראש בלבד" as unknown as Record<string, string> },
      siteUrl,
    ) as Record<string, unknown>;
    expect(ld.openingHoursSpecification).toBeUndefined();
  });

  it("does not put CreativeWork properties on the Place node", () => {
    const ld = cafeJsonLd(
      { ...meta, lastModified: "2026-08-01", vibeTags: ["חמים וביתי"] },
      siteUrl,
    ) as Record<string, unknown>;
    expect(ld.dateModified).toBeUndefined();
    expect(ld.keywords).toBeUndefined();
  });

  it("emits telephone when known", () => {
    expect((cafeJsonLd({ ...meta, phone: "03-5551234" }, siteUrl) as Record<string, unknown>).telephone)
      .toBe("03-5551234");
    expect((cafeJsonLd(meta, siteUrl) as Record<string, unknown>).telephone).toBeUndefined();
  });
});

describe("organizationJsonLd", () => {
  it("emits an Organization with an absolute logo and social sameAs", () => {
    const ld = organizationJsonLd(siteUrl) as Record<string, unknown>;
    expect(ld["@type"]).toBe("Organization");
    expect(ld["@id"]).toBe(`${siteUrl}#organization`);
    expect(ld.logo).toBe(`${siteUrl}/images/ca_fe_logo.png`);
    expect(ld.sameAs).toEqual([
      "https://instagram.com/whoisyali",
      "https://www.facebook.com/yali.oz",
    ]);
    expect(ld.founder).toEqual({ "@type": "Person", name: "יהלי עוז" });
  });
});

describe("websiteJsonLd", () => {
  it("has a stable @id and references the Organization publisher by @id", () => {
    const ld = websiteJsonLd(siteUrl) as Record<string, unknown>;
    expect(ld["@id"]).toBe(`${siteUrl}#website`);
    expect(ld.publisher).toEqual({ "@id": `${siteUrl}#organization` });
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
