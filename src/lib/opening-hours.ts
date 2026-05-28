import type { OpeningHours } from "@/types/place";

/**
 * Pure helpers behind <OpeningHoursDisplay />.
 *
 * Kept in a non-component module so they can be unit-tested without a DOM
 * and so the same time logic can be reused elsewhere without dragging the
 * component in.
 */

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
  return isTimeInRange(hoursForDay, now.getHours(), now.getMinutes());
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
