import type { MetadataRoute } from "next";
import { buildSitemapEntries } from "@opinly/shared";
import { opinlyConfig } from "@opinly/next";
import { getOpinlyClient } from "@/lib/opinly/client";

export const revalidate = false;

import { getAllCafes, getAllCities } from "@/lib/cafe-lookup";
import { getThemesWithCounts } from "@/lib/themes";
import { cafeUrl, cityUrl, themeUrl } from "@/lib/structured-data";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.ca-fe.xyz";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const blog = process.env.OPINLY_API_KEY
    ? buildSitemapEntries(await getOpinlyClient().routes(), opinlyConfig).map((entry) => ({
        url: entry.url,
        lastModified: new Date(entry.lastModified),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }))
    : [];
  // Homepage plus a crawlable, indexable page per cafe (/cafe/<id>), each with
  // a real lastModified taken from the dataset rather than build time.
  const cafes = getAllCafes().map((cafe) => ({
    url: cafeUrl(siteUrl, cafe.id),
    lastModified: cafe.lastModified ? new Date(cafe.lastModified) : new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  // City landing pages (/city/<city>) target local "בתי קפה ב<עיר>" searches.
  const cities = getAllCities().map(({ city }) => ({
    url: cityUrl(siteUrl, city),
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Theme landing pages (/theme/<slug>) target characteristic searches such as
  // "בתי קלייה בישראל".
  const themes = getThemesWithCounts().map(({ theme }) => ({
    url: themeUrl(siteUrl, theme.slug),
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/cities`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${siteUrl}/themes`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    },
    ...themes,
    ...cities,
    ...cafes,
    ...blog,
  ];
}
