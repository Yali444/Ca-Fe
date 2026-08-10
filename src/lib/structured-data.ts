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
