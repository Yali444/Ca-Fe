/**
 * Special-day (Israeli holidays) detection helpers.
 *
 * The site does NOT know each cafe's exact hours on holidays — that varies per
 * business and isn't published in any uniform machine-readable way. What we CAN
 * do reliably is detect *which* day it is (via the public Hebcal API) and show a
 * non-intrusive "hours may differ today" notice. These helpers are kept in a
 * plain (non-component, non-Next) module so they can be unit-tested and reused
 * by both the API route (server) and the hook (client) without dragging either
 * runtime in.
 *
 * Nothing here touches the existing open/closed computation in
 * `opening-hours.ts` — this is purely advisory.
 */

/** A single calendar item as returned (and trimmed down) from Hebcal. */
export type SpecialDay = {
  /** Hebrew title, e.g. "יום הזיכרון". */
  title: string;
  /** ISO date (YYYY-MM-DD) the item falls on, in Israel local time. */
  date: string;
  /** Hebcal category, e.g. "holiday", "roshchodesh". */
  category: string;
  /** Hebcal subcategory when present, e.g. "modern", "major", "fast". */
  subcat?: string;
};

/**
 * Hebcal subcategories worth surfacing a notice for. We deliberately skip
 * everyday markers like Rosh Chodesh, candle-lighting times, parsha readings,
 * etc. — they don't imply changed business hours.
 *
 * - `major`   → ראש השנה, יום כיפור, סוכות, פסח, שבועות …
 * - `modern`  → יום הזיכרון, יום השואה, יום העצמאות, יום ירושלים …
 * - `minor`   → פורים, ל"ג בעומר, חנוכה …
 * - `fast`    → צום that often shortens hours (תשעה באב, צום גדליה …)
 */
const RELEVANT_SUBCATS = new Set(["major", "modern", "minor", "fast"]);

/**
 * Some relevant days don't carry a subcat in every Hebcal response, so we also
 * match against known Hebrew title fragments as a fallback. Kept intentionally
 * small and specific to avoid false positives.
 */
const RELEVANT_TITLE_FRAGMENTS = [
  "יום הזיכרון",
  "יום הזכרון",
  "יום השואה",
  "יום העצמאות",
  "יום ירושלים",
  "יום כיפור",
  "ראש השנה",
  "פסח",
  "סוכות",
  "שבועות",
  "פורים",
  "חנוכה",
  "תשעה באב",
];

/** True when the given Hebcal item is worth showing an "hours may differ" notice. */
export function isRelevantSpecialDay(item: SpecialDay): boolean {
  if (!item || typeof item.title !== "string") return false;
  if (item.subcat && RELEVANT_SUBCATS.has(item.subcat)) return true;
  return RELEVANT_TITLE_FRAGMENTS.some((fragment) =>
    item.title.includes(fragment),
  );
}

/**
 * Builds the Hebrew notice line shown in the banner. Returns `null` when there
 * are no relevant days.
 *
 * @param items relevant special days (already filtered).
 * @param isEve when true the day is *tomorrow* and it's already evening, so we
 *              phrase it as an eve ("ערב …") — when many venues already adjust.
 */
export function buildNoticeMessage(
  items: SpecialDay[],
  isEve = false,
): string | null {
  if (!items || items.length === 0) return null;

  const names = items.map((item) => item.title);
  const joined =
    names.length === 1
      ? names[0]
      : `${names.slice(0, -1).join(", ")} ו${names[names.length - 1]}`;

  const lead = isEve ? `ערב ${joined}` : `היום ${joined}`;
  return `שים/י לב: ${lead} — ייתכנו שינויים בשעות הפתיחה של בתי הקפה`;
}

/**
 * Returns the current date as a YYYY-MM-DD string in Israel local time
 * (`Asia/Jerusalem`), regardless of the runtime's own timezone. Using the
 * locale-stable `en-CA` format gives ISO ordering (YYYY-MM-DD) directly.
 */
export function getIsraelToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** The hour (0–23) in Israel local time. Used to decide whether it's "evening". */
export function getIsraelHour(now: Date = new Date()): number {
  const hour = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jerusalem",
    hour: "2-digit",
    hour12: false,
  }).format(now);
  // "24" can appear for midnight in some environments — normalize to 0.
  return Number.parseInt(hour, 10) % 24;
}

/** The local date string for "tomorrow" in Israel time. */
export function getIsraelTomorrow(now: Date = new Date()): string {
  const todayMs = Date.parse(`${getIsraelToday(now)}T00:00:00Z`);
  return new Date(todayMs + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** From the hour onwards we treat it as "evening" for eve-of-holiday notices. */
export const EVENING_HOUR = 17;

/**
 * Given the relevant special days for today and tomorrow, decide which notice
 * (if any) to show. Today's days win; otherwise, if it's already evening, we
 * surface tomorrow's as an "eve" notice.
 */
export function selectNotice(
  todayItems: SpecialDay[],
  tomorrowItems: SpecialDay[],
  now: Date = new Date(),
): string | null {
  if (todayItems.length > 0) {
    return buildNoticeMessage(todayItems, false);
  }
  if (tomorrowItems.length > 0 && getIsraelHour(now) >= EVENING_HOUR) {
    return buildNoticeMessage(tomorrowItems, true);
  }
  return null;
}
