import type { OpeningHours } from "@/types/place";
import { parseOpeningHoursString } from "./formatters";

/**
 * Pure helpers behind <OpeningHoursDisplay />.
 *
 * Kept in a non-component module so they can be unit-tested without a DOM
 * and so the same time logic can be reused elsewhere without dragging the
 * component in.
 */

const DAY_KEYS: Array<keyof OpeningHours> = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const NEXT_DAY_LABELS = [
  "היום",
  "מחר",
  "שלישי",
  "רביעי",
  "חמישי",
  "שישי",
  "שבת",
];

export const DAYS: Array<{ key: keyof OpeningHours; label: string }> = [
  { key: "sunday", label: "ראשון" },
  { key: "monday", label: "שני" },
  { key: "tuesday", label: "שלישי" },
  { key: "wednesday", label: "רביעי" },
  { key: "thursday", label: "חמישי" },
  { key: "friday", label: "שישי" },
  { key: "saturday", label: "שבת" },
];

/** Parse "HH:MM" into hours+minutes. Returns null for any non-matching string. */
export function parseTime(
  timeStr: string,
): { hour: number; minute: number } | null {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return {
    hour: parseInt(match[1], 10),
    minute: parseInt(match[2], 10),
  };
}

/**
 * True if `currentHour:currentMinute` falls inside `range` (e.g. "08:00-18:00").
 * Handles ranges that cross midnight: "22:00-02:00", "12:00-00:00", etc.
 */
export function isTimeInRange(
  range: string,
  currentHour: number,
  currentMinute: number,
): boolean {
  const parts = range.split("-");
  if (parts.length !== 2) return false;

  const start = parseTime(parts[0].trim());
  const end = parseTime(parts[1].trim());
  if (!start || !end) return false;

  const currentTime = currentHour * 60 + currentMinute;
  const startTime = start.hour * 60 + start.minute;
  const endTime = end.hour * 60 + end.minute;

  if (endTime <= startTime) {
    // Range crosses midnight. For "12:00-00:00" the end at exactly midnight
    // means "closes at end of day"; treat current < endTime as inside only
    // when endTime is past midnight (> 0).
    return currentTime >= startTime || (endTime > 0 && currentTime < endTime);
  }
  return currentTime >= startTime && currentTime <= endTime;
}

/** True if the place is open at `now` (defaults to `new Date()`). */
export function isCurrentlyOpen(
  openingHours: OpeningHours,
  now: Date = new Date(),
): boolean {
  const dayIndex = now.getDay();
  const dayKey = DAYS[dayIndex].key;
  const hoursForDay = openingHours[dayKey];
  if (!hoursForDay) return false;
  // A single day can hold several ranges (e.g. a split shift like
  // "08:00-16:00, 19:00-23:00"). Open if now falls inside any of them.
  return hoursForDay
    .split(",")
    .some((range) => isTimeInRange(range, now.getHours(), now.getMinutes()));
}

export type DayGroup = {
  startIndex: number;
  endIndex: number;
  hours: string;
};

/**
 * Group consecutive days that share the same hours into a single block so we
 * can render "Sun-Thu 08:00-18:00" instead of five identical rows. Days
 * without hours act as a separator that ends the current run.
 */
export function groupConsecutiveDays(openingHours: OpeningHours): DayGroup[] {
  const groups: DayGroup[] = [];
  let currentGroup: DayGroup | null = null;

  DAYS.forEach((day, index) => {
    const hours = openingHours[day.key];

    if (!hours) {
      if (currentGroup) {
        groups.push(currentGroup);
        currentGroup = null;
      }
      return;
    }

    if (currentGroup && currentGroup.hours === hours) {
      currentGroup.endIndex = index;
    } else {
      if (currentGroup) {
        groups.push(currentGroup);
      }
      currentGroup = { startIndex: index, endIndex: index, hours };
    }
  });

  if (currentGroup) {
    groups.push(currentGroup);
  }

  return groups;
}

/** "ראשון" or "ראשון - חמישי" depending on whether the group is one day or many. */
export function formatDayGroupLabel(
  startIndex: number,
  endIndex: number,
): string {
  if (startIndex === endIndex) {
    return DAYS[startIndex].label;
  }
  return `${DAYS[startIndex].label} - ${DAYS[endIndex].label}`;
}

/** True if a `[startIndex, endIndex]` day group contains `now`'s weekday. */
export function groupContainsCurrentDay(
  startIndex: number,
  endIndex: number,
  now: Date = new Date(),
): boolean {
  const currentDayIndex = now.getDay();
  return currentDayIndex >= startIndex && currentDayIndex <= endIndex;
}

/** Parse "HH:MM-HH:MM" into minutes-since-midnight, or null on malformed input. */
export const parseRangeMinutes = (
  range: string,
): { open: number; close: number } | null => {
  const match = range.match(/(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const open = Number.parseInt(match[1], 10) * 60 + Number.parseInt(match[2], 10);
  const close = Number.parseInt(match[3], 10) * 60 + Number.parseInt(match[4], 10);
  return { open, close };
};

/** Render a minutes-since-midnight count as "HH:MM" (24h clock, wraps at 1440). */
export const formatMinutesToClock = (minutes: number): string => {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60).toString().padStart(2, "0");
  const m = (normalized % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
};

export type LiveStatus = {
  label: string;
  tone: "open" | "soon" | "closed";
};

/**
 * Rich "is it open right now?" status with Hebrew copy suitable for a chip.
 * Returns null only when no opening hours are known at all.
 *
 *   - tone "open"   → currently open with more than 45 min left
 *   - tone "soon"   → currently open but closing within 45 min
 *   - tone "closed" → not open; label says when it opens next
 */
export const getLiveOpeningStatus = (
  hours: string | OpeningHours | undefined,
  now: Date = new Date(),
): LiveStatus | null => {
  if (!hours) return null;

  const parsed =
    typeof hours === "string" ? parseOpeningHoursString(hours) : hours;
  if (!parsed) return null;

  const dayIndex = now.getDay();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const todayRange = parsed[DAY_KEYS[dayIndex]];
  const todayParsed = todayRange ? parseRangeMinutes(todayRange) : null;

  if (todayParsed) {
    const closeAdjusted =
      todayParsed.close <= todayParsed.open
        ? todayParsed.close + 1440
        : todayParsed.close;
    const nowAdjusted =
      nowMinutes < todayParsed.open && closeAdjusted > 1440
        ? nowMinutes + 1440
        : nowMinutes;
    const isOpenNow =
      nowAdjusted >= todayParsed.open && nowAdjusted <= closeAdjusted;

    if (isOpenNow) {
      const minutesToClose = closeAdjusted - nowAdjusted;
      if (minutesToClose <= 45) {
        return {
          label: `נסגר בעוד ${Math.max(1, minutesToClose)} דק׳`,
          tone: "soon",
        };
      }
      return {
        label: `פתוח עכשיו · עד ${formatMinutesToClock(closeAdjusted)}`,
        tone: "open",
      };
    }

    if (nowMinutes < todayParsed.open) {
      return {
        label: `נפתח היום ב-${formatMinutesToClock(todayParsed.open)}`,
        tone: "closed",
      };
    }
  }

  for (let offset = 1; offset <= 7; offset += 1) {
    const targetDay = (dayIndex + offset) % 7;
    const dayRange = parsed[DAY_KEYS[targetDay]];
    if (!dayRange) continue;
    const parsedRange = parseRangeMinutes(dayRange);
    if (!parsedRange) continue;
    const label =
      offset === 1
        ? NEXT_DAY_LABELS[1]
        : NEXT_DAY_LABELS[targetDay] || "בהמשך השבוע";
    return {
      label: `נפתח ${label} ב-${formatMinutesToClock(parsedRange.open)}`,
      tone: "closed",
    };
  }

  return { label: "סגור כרגע", tone: "closed" };
};

/**
 * True if the place is open at `now`, derived from the same live-status logic
 * used by the cards (so the map and cards never disagree). Unknown hours count
 * as "not closed" so we don't wrongly dim places we have no data for.
 */
export const isOpenNow = (
  hours: string | OpeningHours | undefined,
  now: Date = new Date(),
): boolean => {
  const status = getLiveOpeningStatus(hours, now);
  if (!status) return true; // no hours data → don't treat as closed
  return status.tone !== "closed";
};

/** True if the place has any opening hours on the given weekday (e.g. Saturday). */
export const hasHoursOnWeekday = (
  hours: string | OpeningHours | undefined,
  dayKey: keyof OpeningHours,
): boolean => {
  if (!hours) return false;
  const parsed = typeof hours === "string" ? parseOpeningHoursString(hours) : hours;
  if (!parsed) return false;
  const range = parsed[dayKey];
  if (!range) return false;
  return parseRangeMinutes(range) !== null;
};
