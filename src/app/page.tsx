import type { Metadata } from "next";

import HomeClient from "./HomeClient";
import { getAllCafes, getAllCities } from "@/lib/cafe-lookup";
import { THEMES } from "@/lib/themes";
import {
  cityUrl,
  itemListJsonLd,
  themeUrl,
  websiteJsonLd,
} from "@/lib/structured-data";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.ca-fe.xyz";

/**
 * Static metadata only. This page deliberately does NOT read `searchParams`:
 * doing so opts the whole route out of prerendering, which made every single
 * homepage visit miss Vercel's CDN and run a serverless render
 * (`Cache-Control: private, no-cache, no-store`). Keeping it static lets the
 * HTML be served straight from the edge.
 *
 * Per-cafe share cards live on the cafe's own prerendered /cafe/<id> page,
 * which `buildShareUrl` now links to. Legacy `?cafe=<id>` links still work —
 * the client reads the param on mount and opens that cafe's panel — they just
 * render the generic site card when unfurled.
 */
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  // Data backing both the ItemList JSON-LD and the server-rendered Hebrew
  // content block below.
  const allCafes = getAllCafes();
  const cities = getAllCities();

  const jsonLd = {
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
        ספיישלטי" / "בתי קפה ספיישלטי") plus internal links to every city and
        theme landing page, and gives assistive tech a real heading + skip nav.
      */}
      <section className="sr-only" aria-label="בתי קפה ספיישלטי בישראל">
        <h1>בתי קפה ספיישלטי בישראל — קפה ספיישלטי איכותי</h1>
        <p>
          בתי קפה ספיישלטי בישראל: מפה אינטראקטיבית של {allCafes.length}{" "}
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
      <HomeClient />
    </>
  );
}
