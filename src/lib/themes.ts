import { getAllCafes, type CafeMeta } from "@/lib/cafe-lookup";

/**
 * Curated "characteristic" theme pages — a small, finite whitelist (not one
 * page per vibe tag, which would create thin/duplicate content). Each theme
 * filters the dataset by a single, search-meaningful characteristic and renders
 * a /theme/<slug> landing page mirroring the city pages.
 */
export interface ThemeDef {
  slug: string;
  /** <h1> text, also the ItemList name. */
  heading: string;
  /** Short label for inline chips (e.g. on a cafe page). */
  chipLabel: string;
  /** Intro paragraph + base for the meta description. */
  blurb: string;
  match: (cafe: CafeMeta) => boolean;
}

export const THEMES: ThemeDef[] = [
  {
    slug: "roasters",
    heading: "בתי קלייה בישראל",
    chipLabel: "בית קלייה",
    blurb:
      "בתי קפה שקולים את פולי הקפה במקום — קלייה טרייה, שליטה מלאה על הפרופיל, וקפה ברמה גבוהה במיוחד.",
    match: (c) => c.isRoaster,
  },
  {
    slug: "beans",
    heading: "בתי קפה שמוכרים פולי קפה",
    chipLabel: "מוכרים פולים",
    blurb:
      "מקומות שאפשר לקנות בהם פולי קפה איכותיים לבית — לקחת הביתה את אותו הקפה שאוהבים במקום.",
    match: (c) => c.sellsBeans,
  },
  {
    slug: "matcha",
    heading: "בתי קפה ובארים למאצ׳ה בישראל",
    chipLabel: "מאצ׳ה",
    blurb:
      "בתי קפה ובארים המתמחים במאצ׳ה — מאצ׳ה לאטה, משקאות עונתיים ואפשרויות חלב מגוונות.",
    match: (c) => c.isMatcha,
  },
];

export function getTheme(slug: string): ThemeDef | undefined {
  return THEMES.find((t) => t.slug === slug);
}

/** Cafes matching a theme, normalised and sorted by name (Hebrew collation). */
export function getCafesForTheme(theme: ThemeDef): CafeMeta[] {
  return getAllCafes()
    .filter(theme.match)
    .sort((a, b) => a.name.localeCompare(b.name, "he"));
}

/** Every theme with its current cafe count — for the index page and sitemap. */
export function getThemesWithCounts(): { theme: ThemeDef; count: number }[] {
  const cafes = getAllCafes();
  return THEMES.map((theme) => ({
    theme,
    count: cafes.filter(theme.match).length,
  }));
}
