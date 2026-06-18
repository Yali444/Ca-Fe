import type { MetadataRoute } from "next";

import { getAllCafes, getAllCities } from "@/lib/cafe-lookup";
import { cafeUrl, cityUrl } from "@/lib/structured-data";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.ca-fe.xyz";

export default function sitemap(): MetadataRoute.Sitemap {
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
    ...cities,
    ...cafes,
  ];
}
