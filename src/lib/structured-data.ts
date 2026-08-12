import type { CafeMeta } from "@/lib/cafe-lookup";
import type { CafeRating } from "@/lib/ratings";
import type { Review } from "@/types/roastery";

/**
 * Schema.org JSON-LD builders shared by the homepage and the per-cafe pages.
 * All return plain objects — pass them through `jsonLdScript` before putting
 * them in a <script type="application/ld+json"> tag.
 */

/**
 * Serializes a JSON-LD object for dangerouslySetInnerHTML. Escaping `<`
 * prevents a `</script>` (or any other tag) inside string data — e.g. a cafe
 * name or description — from breaking out of the script tag; the data here
 * is build-time/static today, but this keeps the pattern safe regardless.
 */
export const jsonLdScript = (data: unknown): string =>
  JSON.stringify(data).replace(/</g, "\\u003c");

/** Canonical URL of a cafe's own SEO page. */
export const cafeUrl = (siteUrl: string, id: string) =>
  `${siteUrl}/cafe/${encodeURIComponent(id)}`;

/** Canonical URL of a city landing page. */
export const cityUrl = (siteUrl: string, city: string) =>
  `${siteUrl}/city/${encodeURIComponent(city)}`;

/** Canonical URL of a theme landing page. */
export const themeUrl = (siteUrl: string, slug: string) =>
  `${siteUrl}/theme/${slug}`;

const absoluteImage = (siteUrl: string, image: string) =>
  image.startsWith("http") ? image : `${siteUrl}${image}`;

const DAY_CODE: Record<string, string> = {
  monday: "Mo",
  tuesday: "Tu",
  wednesday: "We",
  thursday: "Th",
  friday: "Fr",
  saturday: "Sa",
  sunday: "Su",
};

function openingHoursSpec(hours: Record<string, string> | null): string[] | undefined {
  if (!hours) return undefined;
  const spec = Object.entries(hours)
    .filter(([day, range]) => DAY_CODE[day] && range)
    .map(([day, range]) => `${DAY_CODE[day]} ${range}`);
  return spec.length ? spec : undefined;
}

export function cafeJsonLd(
  meta: CafeMeta,
  siteUrl: string,
  rating?: CafeRating | null,
  reviews?: Review[],
) {
  const sameAs = [
    ...(meta.website ? [meta.website] : []),
    ...(meta.instagram ? [`https://instagram.com/${meta.instagram.replace("@", "")}`] : []),
  ];
  const openingHours = openingHoursSpec(meta.hours);

  return {
    "@context": "https://schema.org",
    "@type": "CafeOrCoffeeShop",
    name: meta.name,
    image: absoluteImage(siteUrl, meta.image),
    ...(meta.description ? { description: meta.description } : {}),
    // Only emit AggregateRating when there are real reviews — Google rejects an
    // empty/zero aggregate, so a cafe with no reviews must omit it entirely.
    ...(rating && rating.count > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: rating.average,
            reviewCount: rating.count,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
    ...(reviews && reviews.length > 0
      ? {
          review: reviews.map((r) => ({
            "@type": "Review",
            reviewRating: {
              "@type": "Rating",
              ratingValue: r.rating,
              bestRating: 5,
              worstRating: 1,
            },
            author: { "@type": "Person", name: r.author },
            ...(r.text ? { reviewBody: r.text } : {}),
            ...(r.date ? { datePublished: r.date } : {}),
          })),
        }
      : {}),
    ...(meta.address || meta.location
      ? {
          address: {
            "@type": "PostalAddress",
            ...(meta.address ? { streetAddress: meta.address } : {}),
            ...(meta.location ? { addressLocality: meta.location } : {}),
            addressCountry: "IL",
          },
        }
      : {}),
    ...(meta.lat != null && meta.lng != null
      ? { geo: { "@type": "GeoCoordinates", latitude: meta.lat, longitude: meta.lng } }
      : {}),
    ...(openingHours ? { openingHours } : {}),
    ...(sameAs.length ? { sameAs } : {}),
    servesCuisine: "Coffee",
    url: cafeUrl(siteUrl, meta.id),
  };
}

export function breadcrumbJsonLd(meta: CafeMeta, siteUrl: string) {
  const items: { "@type": "ListItem"; position: number; name: string; item: string }[] = [
    { "@type": "ListItem", position: 1, name: "בתי קפה ספיישלטי", item: siteUrl },
  ];
  if (meta.location) {
    items.push({
      "@type": "ListItem",
      position: items.length + 1,
      name: meta.location,
      item: cityUrl(siteUrl, meta.location),
    });
  }
  items.push({
    "@type": "ListItem",
    position: items.length + 1,
    name: meta.name,
    item: cafeUrl(siteUrl, meta.id),
  });
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items,
  };
}

/** ItemList of a set of cafes, identified by a display name. */
export function namedItemListJsonLd(name: string, cafes: CafeMeta[], siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: cafes.length,
    itemListElement: cafes.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: cafeUrl(siteUrl, c.id),
      name: c.name,
    })),
  };
}

/** ItemList of the cafes on a city landing page. */
export function cityItemListJsonLd(city: string, cafes: CafeMeta[], siteUrl: string) {
  return namedItemListJsonLd(`בתי קפה ב${city}`, cafes, siteUrl);
}

export function websiteJsonLd(siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "בתי קפה ספיישלטי בישראל",
    alternateName: "Ca-Fe",
    url: siteUrl,
    inLanguage: "he",
    description:
      "מדריך אינטראקטיבי לבתי קפה, בתי קלייה וקפה ספיישלטי איכותי בישראל.",
    // Tie the site to its publishing Organization entity (defined by
    // organizationJsonLd on the same page) so answer engines can attribute
    // content and merge the two nodes into one entity.
    publisher: { "@type": "Organization", name: "Ca-Fe", url: siteUrl },
  };
}

/**
 * The publisher entity behind the guide. A clear Organization node with a logo,
 * founder and social `sameAs` gives search and answer engines a stable thing to
 * attribute citations to, rather than an anonymous page.
 */
export function organizationJsonLd(siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Ca-Fe",
    alternateName: "בתי קפה ספיישלטי בישראל",
    url: siteUrl,
    logo: absoluteImage(siteUrl, "/images/ca_fe_logo.png"),
    description:
      "מדריך אינטראקטיבי לבתי קפה, בתי קלייה וקפה ספיישלטי איכותי בישראל.",
    founder: { "@type": "Person", name: "יהלי עוז" },
    sameAs: [
      "https://instagram.com/whoisyali",
      "https://www.facebook.com/yali.oz",
    ],
  };
}

/** A single question/answer pair for the homepage FAQ. */
export interface FaqEntry {
  question: string;
  answer: string;
}

/** Live catalogue counts the FAQ answers are built from — passed in from the
 *  page so the numbers always match the dataset. */
export interface FaqCounts {
  cafes: number;
  cities: number;
  roasters: number;
  beans: number;
  matcha: number;
}

/**
 * Self-contained, factual Hebrew Q&A about the guide. Answer engines quote
 * FAQPage answers verbatim, so each answer is written to stand on its own and
 * the counts come straight from the dataset.
 */
export function faqEntries(counts: FaqCounts): FaqEntry[] {
  return [
    {
      question: "מהו קפה ספיישלטי?",
      answer:
        "קפה ספיישלטי הוא קפה איכותי במיוחד שקיבל ציון גבוה בבדיקת טעימות מקצועית, עם מעקב אחר מקור הפולים, קלייה מדויקת והכנה קפדנית. בישראל הוא מוגש בבתי קפה ובבתי קלייה שמתמחים בכך.",
    },
    {
      question: "כמה בתי קפה ספיישלטי יש במדריך Ca-Fe?",
      answer: `המדריך כולל ${counts.cafes} בתי קפה, בתי קלייה ומקומות לקפה ספיישלטי ב-${counts.cities} ערים ברחבי ישראל, עם מפה אינטראקטיבית, שעות פתיחה וביקורות.`,
    },
    {
      question: "באילו ערים אפשר למצוא בתי קפה ספיישלטי?",
      answer: `המדריך מכסה ${counts.cities} ערים בישראל, בהן תל אביב, ירושלים, חיפה ובאר שבע. אפשר לסנן בתי קפה לפי עיר או להציג את כולם על המפה.`,
    },
    {
      question: "אילו בתי קלייה של קפה יש בישראל?",
      answer: `במדריך יש ${counts.roasters} בתי קלייה שקולים את פולי הקפה במקום — קלייה טרייה ושליטה מלאה על הפרופיל. אפשר לראות את כולם בעמוד "בתי קלייה בישראל".`,
    },
    {
      question: "האם אפשר לקנות פולי קפה לבית?",
      answer: `כן. ${counts.beans} מהמקומות במדריך מוכרים פולי קפה איכותיים לקנייה, כדי לחלוט בבית את אותו הקפה שאוהבים במקום.`,
    },
    {
      question: "האם יש בתי קפה ובארים למאצ׳ה?",
      answer: `כן. המדריך כולל ${counts.matcha} בתי קפה ובארים המתמחים במאצ׳ה — מאצ׳ה לאטה, משקאות עונתיים ואפשרויות חלב מגוונות.`,
    },
  ];
}

/** FAQPage JSON-LD built from the live catalogue counts. */
export function faqJsonLd(counts: FaqCounts) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqEntries(counts).map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: { "@type": "Answer", text: entry.answer },
    })),
  };
}

export function itemListJsonLd(cafes: CafeMeta[], siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "בתי קפה ומאפיות בוטיק בישראל",
    numberOfItems: cafes.length,
    itemListElement: cafes.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: cafeUrl(siteUrl, c.id),
      name: c.name,
    })),
  };
}
