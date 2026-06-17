import type { Metadata } from "next";

import HomeClient from "./HomeClient";
import { findCafeMeta, type CafeMeta } from "@/lib/cafe-lookup";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.ca-fe.xyz";

/**
 * Per-cafe metadata for shared `?cafe=<id>` deep-links: a pasted link shows the
 * cafe's name, description and a generated preview image instead of the generic
 * site card. Falls back to the layout's site-level defaults when no (or an
 * unknown) cafe is requested.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ cafe?: string }>;
}): Promise<Metadata> {
  const { cafe } = await searchParams;
  const meta = cafe ? findCafeMeta(cafe) : null;
  if (!meta) return {};

  const title = `${meta.name}${meta.location ? ` · ${meta.location}` : ""} | מדריך הקפה של ישראל`;
  const description =
    meta.description ||
    `${meta.name}${meta.location ? ` ב${meta.location}` : ""} — מתוך מדריך הקפה המיוחד של ישראל`;
  const canonical = `/?cafe=${encodeURIComponent(meta.id)}`;
  const ogImage = `/opengraph-image/${encodeURIComponent(meta.id)}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      images: [{ url: ogImage, width: 1200, height: 630, alt: meta.name }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

/** Schema.org JSON-LD: a specific cafe when deep-linked, else the site itself. */
function buildJsonLd(meta: CafeMeta | null) {
  if (meta) {
    const absoluteImage = meta.image.startsWith("http")
      ? meta.image
      : `${siteUrl}${meta.image}`;
    return {
      "@context": "https://schema.org",
      "@type": "CafeOrCoffeeShop",
      name: meta.name,
      image: absoluteImage,
      ...(meta.description ? { description: meta.description } : {}),
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
        ? {
            geo: {
              "@type": "GeoCoordinates",
              latitude: meta.lat,
              longitude: meta.lng,
            },
          }
        : {}),
      servesCuisine: "Coffee",
      url: `${siteUrl}/?cafe=${encodeURIComponent(meta.id)}`,
    };
  }
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Israel Specialty Coffee Guide",
    alternateName: "מדריך הקפה של ישראל",
    url: siteUrl,
    inLanguage: "he",
  };
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ cafe?: string }>;
}) {
  const { cafe } = await searchParams;
  const meta = cafe ? findCafeMeta(cafe) : null;
  const jsonLd = buildJsonLd(meta);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomeClient />
    </>
  );
}
