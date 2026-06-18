import type { Metadata } from "next";

import HomeClient from "./HomeClient";
import { findCafeMeta, getAllCafes } from "@/lib/cafe-lookup";
import {
  cafeJsonLd,
  cafeUrl,
  itemListJsonLd,
  websiteJsonLd,
} from "@/lib/structured-data";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.ca-fe.xyz";

/**
 * Per-cafe metadata for shared `?cafe=<id>` deep-links: a pasted link shows the
 * cafe's name, description and a generated preview image instead of the generic
 * site card. The canonical points at the cafe's own /cafe/<id> page so search
 * engines consolidate signals there rather than on the query-param URL.
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
  const ogImage = `/opengraph-image/${encodeURIComponent(meta.id)}`;

  return {
    title,
    description,
    alternates: { canonical: cafeUrl(siteUrl, meta.id) },
    openGraph: {
      title,
      description,
      url: `/?cafe=${encodeURIComponent(meta.id)}`,
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

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ cafe?: string }>;
}) {
  const { cafe } = await searchParams;
  const meta = cafe ? findCafeMeta(cafe) : null;

  // A specific cafe when deep-linked, else the site + the full cafe ItemList so
  // the homepage exposes every cafe as structured data.
  const jsonLd = meta
    ? cafeJsonLd(meta, siteUrl)
    : {
        "@context": "https://schema.org",
        "@graph": [websiteJsonLd(siteUrl), itemListJsonLd(getAllCafes(), siteUrl)],
      };

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
