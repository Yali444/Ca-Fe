import { getAllCafes, getAllCities } from "@/lib/cafe-lookup";
import { getThemesWithCounts } from "@/lib/themes";
import { cafeUrl, cityUrl, themeUrl } from "@/lib/structured-data";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.ca-fe.xyz";

// Prerender to a static /llms.txt file, matching the static posture of the
// sitemap — this is a build-time snapshot of the catalogue, not per-request.
export const dynamic = "force-static";

/** Collapse a description to a single clean line for the Markdown index. */
function oneLine(text: string): string {
  const line = text.replace(/\s+/g, " ").trim();
  // Keep it short — the first sentence, capped, so the index stays scannable.
  const firstSentence = line.split(/(?<=[.!?׃])\s/)[0] ?? line;
  const chosen = firstSentence.length > 20 ? firstSentence : line;
  return chosen.length > 160 ? `${chosen.slice(0, 157).trimEnd()}…` : chosen;
}

/**
 * `/llms.txt` — the emerging llms.txt standard (llmstxt.org): a curated,
 * plain-Markdown map of the whole catalogue for large language models and AI
 * answer engines. It is the GEO counterpart to `sitemap.xml`, giving models a
 * single, link-rich entry point to every cafe, city and theme page.
 */
export function GET() {
  const cafes = getAllCafes();
  const cities = getAllCities();
  const themes = getThemesWithCounts();

  const lines: string[] = [
    "# Ca-Fe — בתי קפה ספיישלטי בישראל",
    "",
    `> מדריך אינטראקטיבי ל-${cafes.length} בתי קפה, בתי קלייה וקפה ספיישלטי איכותי ב-${cities.length} ערים ברחבי ישראל, עם מפה, שעות פתיחה וביקורות.`,
    "",
    `גרסה מלאה עם פרטי כל בית קפה (כתובת, שעות, קישורים): ${siteUrl}/llms-full.txt`,
    "",
    "## ערים",
    "",
    ...cities.map(
      ({ city, count }) => `- [בתי קפה ב${city}](${cityUrl(siteUrl, city)}): ${count} מקומות`,
    ),
    "",
    "## נושאים",
    "",
    ...themes.map(
      ({ theme, count }) =>
        `- [${theme.heading}](${themeUrl(siteUrl, theme.slug)}): ${theme.blurb} (${count} מקומות)`,
    ),
    "",
    "## בתי קפה",
    "",
    ...cafes.map((cafe) => {
      const label = cafe.location ? `${cafe.name} — ${cafe.location}` : cafe.name;
      const suffix = cafe.description ? `: ${oneLine(cafe.description)}` : "";
      return `- [${label}](${cafeUrl(siteUrl, cafe.id)})${suffix}`;
    }),
    "",
  ];

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
