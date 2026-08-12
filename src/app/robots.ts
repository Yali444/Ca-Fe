import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.ca-fe.xyz";

// AI answer/citation crawlers we explicitly welcome. Being named (rather than
// only covered by "*") is an unambiguous signal that ChatGPT, Perplexity,
// Google AI Overviews, Claude, Apple Intelligence and Common Crawl may read and
// cite the guide — the GEO counterpart to allowing search-engine bots.
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Keep crawlers out of internal API routes — they hold no indexable
        // content and some hit external geocoding services.
        disallow: "/api/",
      },
      {
        userAgent: AI_CRAWLERS,
        allow: "/",
        disallow: "/api/",
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
