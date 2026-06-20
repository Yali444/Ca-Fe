import type { Metadata } from "next";

import HomeClient from "./HomeClient";
import { findCafeMeta, getAllCafes, getAllCities } from "@/lib/cafe-lookup";
import { THEMES } from "@/lib/themes";
import {
  cafeJsonLd,
  cafeUrl,
  cityUrl,
  itemListJsonLd,
  themeUrl,
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

  const title = `${meta.name}${meta.location ? ` · ${meta.location}` : ""}`;
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

  // For the map homepage (no deep-link), gather the data that backs both the
  // ItemList JSON-LD and the server-rendered Hebrew content block below.
  const allCafes = meta ? [] : getAllCafes();
  const cities = meta ? [] : getAllCities();

  // A specific cafe when deep-linked, else the site + the full cafe ItemList so
  // the homepage exposes every cafe as structured data.
  const jsonLd = meta
    ? cafeJsonLd(meta, siteUrl)
    : {
        "@context": "https://schema.org",
        "@graph": [websiteJsonLd(siteUrl), itemListJsonLd(allCafes, siteUrl)],
      };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/*
        The interactive guide is client-only (ssr: false), so it contributes no
        server-rendered text or links. This visually-hidden block gives search
        engines crawlable Hebrew content for the homepage (targeting "קפה
        ספיישלטי" / "בתי קפה ספשיילטי") plus internal links to every city and
        theme landing page, and gives assistive tech a real heading + skip nav.
        Rendered only on the map homepage, not on ?cafe= deep-links.
      */}
      {!meta && (
        <section className="sr-only" aria-label="מדריך הקפה של ישראל">
          <h1>מדריך הקפה הספשיילטי של ישראל — בתי קפה וקפה ספיישלטי</h1>
          <p>
            מדריך הקפה הספשיילטי של ישראל: מפה אינטראקטיבית של {allCafes.length}{" "}
            בתי קפה, בתי קלייה ומקומות לקפה ספיישלטי איכותי בתל אביב, ירושלים,
            חיפה, באר שבע ובכל רחבי הארץ. אפשר למצוא בית קפה לפי עיר או לפי אופי
            המקום — בתי קלייה, מקומות שמוכרים פולי קפה ובארים למאצ׳ה.
          </p>

          <nav aria-label="בתי קפה ספיישלטי לפי עיר">
            <h2>בתי קפה ספיישלטי לפי עיר</h2>
            <ul>
              {cities.map(({ city, count }) => (
                <li key={city}>
                  <a href={cityUrl("", city)}>
                    בתי קפה ב{city} ({count})
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="בתי קפה לפי אופי המקום">
            <h2>בתי קפה לפי אופי המקום</h2>
            <ul>
              {THEMES.map((t) => (
                <li key={t.slug}>
                  <a href={themeUrl("", t.slug)}>{t.heading}</a>
                </li>
              ))}
              <li>
                <a href="/cities">בתי קפה לפי עיר</a>
              </li>
              <li>
                <a href="/themes">בתי קפה לפי נושא</a>
              </li>
            </ul>
          </nav>
        </section>
      )}
      <HomeClient />
    </>
  );
}
