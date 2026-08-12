import { getAllCafes, getAllCities } from "@/lib/cafe-lookup";
import { getThemesWithCounts } from "@/lib/themes";
import { cafeUrl, googleMapsUrl, themeUrl } from "@/lib/structured-data";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.ca-fe.xyz";

// Prerender to a static file, like the sitemap and /llms.txt.
export const dynamic = "force-static";

// Israeli week order with Hebrew labels — mirrors the per-cafe page.
const WEEK: [string, string][] = [
  ["sunday", "ראשון"],
  ["monday", "שני"],
  ["tuesday", "שלישי"],
  ["wednesday", "רביעי"],
  ["thursday", "חמישי"],
  ["friday", "שישי"],
  ["saturday", "שבת"],
];

function hoursLine(hours: Record<string, string> | null): string | null {
  if (!hours) return null;
  const parts = WEEK.filter(([key]) => hours[key]).map(
    ([key, label]) => `${label} ${hours[key]}`,
  );
  return parts.length ? parts.join(" · ") : null;
}

/**
 * `/llms-full.txt` — the expanded companion to `/llms.txt`. Where llms.txt is a
 * link index, this inlines each cafe's key facts (address, hours, description,
 * links, Google Maps entity) so a language model can answer factual questions
 * about a place without fetching its page.
 */
export function GET() {
  const cafes = getAllCafes();
  const cities = getAllCities();
  const themes = getThemesWithCounts();

  const lines: string[] = [
    "# Ca-Fe — בתי קפה ספיישלטי בישראל (גרסה מלאה)",
    "",
    `> פרטים מלאים על ${cafes.length} בתי קפה, בתי קלייה וקפה ספיישלטי איכותי ב-${cities.length} ערים בישראל — כתובת, שעות פתיחה, קישורים ומיקום ב-Google Maps. אינדקס הקישורים הקצר נמצא ב-${siteUrl}/llms.txt`,
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
  ];

  for (const cafe of cafes) {
    const title = cafe.location ? `${cafe.name} — ${cafe.location}` : cafe.name;
    lines.push(`### ${title}`);
    if (cafe.description) lines.push(cafe.description);

    const facts: string[] = [];
    if (cafe.address) facts.push(`- כתובת: ${cafe.address}`);
    const hrs = hoursLine(cafe.hours);
    if (hrs) facts.push(`- שעות: ${hrs}`);
    if (cafe.brewMethods.length) facts.push(`- שיטות חליטה: ${cafe.brewMethods.join(", ")}`);
    if (cafe.website) facts.push(`- אתר: ${cafe.website}`);
    if (cafe.instagram)
      facts.push(`- אינסטגרם: https://instagram.com/${cafe.instagram.replace("@", "")}`);
    if (cafe.googlePlaceId) facts.push(`- Google Maps: ${googleMapsUrl(cafe.googlePlaceId)}`);
    facts.push(`- עמוד: ${cafeUrl(siteUrl, cafe.id)}`);

    lines.push(...facts, "");
  }

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
