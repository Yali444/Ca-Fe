import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.ca-fe.xyz";

export default function sitemap(): MetadataRoute.Sitemap {
  // The guide is a single-page app — all cafe content lives on "/" and is
  // deep-linked via ?cafe=<id> query params rather than distinct routes, so
  // the homepage is the one canonical, indexable URL.
  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
