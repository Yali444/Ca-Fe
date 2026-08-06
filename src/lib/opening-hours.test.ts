import { describe, expect, it } from "vitest";
import {
  formatDayGroupLabel,
  formatMinutesToClock,
  getLiveOpeningStatus,
  groupConsecutiveDays,
  groupContainsCurrentDay,
  hasHoursOnWeekday,
  isCurrentlyOpen,
  isOpenNow,
  isTimeInRange,
  parseRangeMinutes,
  parseTime,
} from "./opening-hours";
import type { OpeningHours } from "@/types/place";

describe("parseTime", () => {
  it("parses zero-padded times", () => {
    expect(parseTime("08:30")).toEqual({ hour: 8, minute: 30 });
    expect(parseTime("23:59")).toEqual({ hour: 23, minute: 59 });
  });

  it("accepts single-digit hours", () => {
    expect(parseTime("9:00")).toEqual({ hour: 9, minute: 0 });
  });

  it("returns null for malformed strings", () => {
    expect(parseTime("")).toBeNull();
    expect(parseTime("12:5")).toBeNull(); // minutes must be 2 digits
    expect(parseTime("noon")).toBeNull();
    expect(parseTime("12-00")).toBeNull();
  });
});

describe("isTimeInRange", () => {
  it("returns true inside a same-day range", () => {
    expect(isTimeInRange("08:00-18:00", 10, 30)).toBe(true);
  });

  it("returns false outside a same-day range", () => {
    expect(isTimeInRange("08:00-18:00", 7, 0)).toBe(false);
    expect(isTimeInRange("08:00-18:00", 19, 0)).toBe(false);
  });

  it("treats the exact boundary as inside the range", () => {
    expect(isTimeInRange("08:00-18:00", 8, 0)).toBe(true);
    expect(isTimeInRange("08:00-18:00", 18, 0)).toBe(true);
  });

  it("handles midnight-crossing ranges — open late at night", () => {
    expect(isTimeInRange("22:00-02:00", 23, 30)).toBe(true);
    expect(isTimeInRange("22:00-02:00", 1, 0)).toBe(true);
  });

  it("handles midnight-crossing ranges — closed in the daytime gap", () => {
    expect(isTimeInRange("22:00-02:00", 10, 0)).toBe(false);
    expect(isTimeInRange("22:00-02:00", 21, 59)).toBe(false);
  });

  it('treats "12:00-00:00" as open all afternoon and evening', () => {
    expect(isTimeInRange("12:00-00:00", 14, 0)).toBe(true);
    expect(isTimeInRange("12:00-00:00", 23, 59)).toBe(true);
    // 00:00 endTime is zero, so the "before midnight" branch should NOT
    // mark 03:00 as inside the range.
    expect(isTimeInRange("12:00-00:00", 3, 0)).toBe(false);
  });

  it("returns false for malformed ranges", () => {
    expect(isTimeInRange("not a range", 10, 0)).toBe(false);
    expect(isTimeInRange("08:00", 10, 0)).toBe(false);
    expect(isTimeInRange("08:00-bad", 10, 0)).toBe(false);
  });
});

describe("isCurrentlyOpen", () => {
  // 2024-01-08 was a Monday.
  const monday = (h: number, m: number) =>
    new Date(2024, 0, 8, h, m, 0); // local time, not UTC

  it("returns true when today's hours include now", () => {
    const hours: OpeningHours = { monday: "08:00-18:00" };
    expect(isCurrentlyOpen(hours, monday(10, 0))).toBe(true);
  });

  it("returns false when today's hours are missing", () => {
    const hours: OpeningHours = { tuesday: "08:00-18:00" };
    expect(isCurrentlyOpen(hours, monday(10, 0))).toBe(false);
  });

  it("respects midnight-crossing ranges", () => {
    const hours: OpeningHours = { monday: "22:00-02:00" };
    expect(isCurrentlyOpen(hours, monday(23, 30))).toBe(true);
    expect(isCurrentlyOpen(hours, monday(10, 0))).toBe(false);
  });

  it("handles a split shift with two comma-separated ranges", () => {
    // A morning window and an evening window on the same day.
    const hours: OpeningHours = { monday: "08:00-16:00, 19:00-23:00" };
    expect(isCurrentlyOpen(hours, monday(15, 1))).toBe(true); // inside morning
    expect(isCurrentlyOpen(hours, monday(20, 0))).toBe(true); // inside evening
    expect(isCurrentlyOpen(hours, monday(17, 30))).toBe(false); // in the gap
    expect(isCurrentlyOpen(hours, monday(7, 0))).toBe(false); // before opening
  });
});

describe("groupConsecutiveDays", () => {
  it("returns an empty list when no days have hours", () => {
    expect(groupConsecutiveDays({})).toEqual([]);
  });

  it("groups consecutive days with identical hours into one block", () => {
    const hours: OpeningHours = {
      sunday: "08:00-18:00",
      monday: "08:00-18:00",
      tuesday: "08:00-18:00",
      wednesday: "08:00-18:00",
      thursday: "08:00-18:00",
    };
    const groups = groupConsecutiveDays(hours);
    expect(groups).toEqual([
      { startIndex: 0, endIndex: 4, hours: "08:00-18:00" },
    ]);
  });

  it("starts a new group when the hours change", () => {
    const hours: OpeningHours = {
      sunday: "08:00-18:00",
      monday: "08:00-18:00",
      tuesday: "09:00-17:00",
    };
    const groups = groupConsecutiveDays(hours);
    expect(groups).toEqual([
      { startIndex: 0, endIndex: 1, hours: "08:00-18:00" },
      { startIndex: 2, endIndex: 2, hours: "09:00-17:00" },
    ]);
  });

  it("breaks a group when an in-between day is closed", () => {
    const hours: OpeningHours = {
      sunday: "08:00-18:00",
      // monday closed
      tuesday: "08:00-18:00",
    };
    const groups = groupConsecutiveDays(hours);
    expect(groups).toHaveLength(2);
    expect(groups[0]).toEqual({
      startIndex: 0,
      endIndex: 0,
      hours: "08:00-18:00",
    });
    expect(groups[1]).toEqual({
      startIndex: 2,
      endIndex: 2,
      hours: "08:00-18:00",
    });
  });

  it("captures a trailing group on Saturday", () => {
    const hours: OpeningHours = {
      friday: "08:00-15:00",
      saturday: "08:00-15:00",
    };
    const groups = groupConsecutiveDays(hours);
    expect(groups).toEqual([
      { startIndex: 5, endIndex: 6, hours: "08:00-15:00" },
    ]);
  });
});

describe("formatDayGroupLabel", () => {
  it("returns a single Hebrew day label for a one-day group", () => {
    expect(formatDayGroupLabel(0, 0)).toBe("ראשון");
    expect(formatDayGroupLabel(6, 6)).toBe("שבת");
  });

  it("returns 'start - end' for a multi-day group", () => {
    expect(formatDayGroupLabel(0, 4)).toBe("ראשון - חמישי");
  });
});

describe("groupContainsCurrentDay", () => {
  it("is true when today's index falls inside the group", () => {
    const monday = new Date(2024, 0, 8, 12, 0); // Monday = index 1
    expect(groupContainsCurrentDay(0, 4, monday)).toBe(true);
  });

  it("is false when today's index is outside the group", () => {
    const saturday = new Date(2024, 0, 6, 12, 0); // Saturday = index 6
    expect(groupContainsCurrentDay(0, 4, saturday)).toBe(false);
  });

  it("treats the boundary days as inside the group", () => {
    const sunday = new Date(2024, 0, 7, 12, 0); // Sunday = index 0
    expect(groupContainsCurrentDay(0, 4, sunday)).toBe(true);
  });
});

describe("parseRangeMinutes", () => {
  it("parses a same-day range into minutes-since-midnight", () => {
    expect(parseRangeMinutes("08:00-18:00")).toEqual({ open: 480, close: 1080 });
  });

  it("accepts an en-dash separator", () => {
    expect(parseRangeMinutes("08:00–18:00")).toEqual({ open: 480, close: 1080 });
  });

  it("returns null when the string has no recognizable range", () => {
    expect(parseRangeMinutes("closed")).toBeNull();
    expect(parseRangeMinutes("")).toBeNull();
  });
});

describe("formatMinutesToClock", () => {
  it("formats minutes-since-midnight as a zero-padded 24h clock", () => {
    expect(formatMinutesToClock(0)).toBe("00:00");
    expect(formatMinutesToClock(60)).toBe("01:00");
    expect(formatMinutesToClock(8 * 60 + 30)).toBe("08:30");
    expect(formatMinutesToClock(23 * 60 + 59)).toBe("23:59");
  });

  it("wraps minutes past midnight back into the same-day clock", () => {
    // 25:00 → 01:00
    expect(formatMinutesToClock(25 * 60)).toBe("01:00");
  });

  it("handles negative input by wrapping forwards", () => {
    expect(formatMinutesToClock(-60)).toBe("23:00");
  });
});

describe("getLiveOpeningStatus", () => {
  // 2024-01-08 was a Monday. Build local-time anchors for predictable behavior.
  const monday = (h: number, m = 0) => new Date(2024, 0, 8, h, m, 0);

  it("returns null when no hours are provided at all", () => {
    expect(getLiveOpeningStatus(undefined, monday(10))).toBeNull();
    expect(getLiveOpeningStatus("", monday(10))).toBeNull();
  });

  it("returns null when a string parses to nothing meaningful", () => {
    expect(getLiveOpeningStatus("גיבריש", monday(10))).toBeNull();
  });

  it("returns an 'open' tone with the closing time when comfortably open", () => {
    const hours: OpeningHours = { monday: "08:00-18:00" };
    const status = getLiveOpeningStatus(hours, monday(10));
    expect(status?.tone).toBe("open");
    expect(status?.label).toContain("18:00");
  });

  it("flips to 'soon' when closing within 45 minutes", () => {
    const hours: OpeningHours = { monday: "08:00-18:00" };
    const status = getLiveOpeningStatus(hours, monday(17, 30));
    expect(status?.tone).toBe("soon");
    expect(status?.label).toContain("30");
  });

  it("returns a 'closed · opens today at HH:MM' label before opening", () => {
    const hours: OpeningHours = { monday: "08:00-18:00" };
    const status = getLiveOpeningStatus(hours, monday(7));
    expect(status?.tone).toBe("closed");
    expect(status?.label).toContain("היום");
    expect(status?.label).toContain("08:00");
  });

  it("looks at tomorrow's hours when today's window has passed", () => {
    const hours: OpeningHours = {
      monday: "08:00-18:00",
      tuesday: "09:00-17:00",
    };
    const status = getLiveOpeningStatus(hours, monday(20));
    expect(status?.tone).toBe("closed");
    expect(status?.label).toContain("מחר");
    expect(status?.label).toContain("09:00");
  });

  it("falls back to 'closed' with no opening date when nothing is scheduled", () => {
    const hours: OpeningHours = {};
    const status = getLiveOpeningStatus(hours, monday(10));
    expect(status?.tone).toBe("closed");
    expect(status?.label).toBe("סגור כרגע");
  });

  it("handles midnight-crossing today range (open well past midnight)", () => {
    const hours: OpeningHours = { monday: "22:00-02:00" };
    const status = getLiveOpeningStatus(hours, monday(23, 30));
    expect(status?.tone).toBe("open");
  });
});

describe("hasHoursOnWeekday", () => {
  it("is true when the day has a valid range", () => {
    const hours: OpeningHours = { saturday: "09:00-17:00" };
    expect(hasHoursOnWeekday(hours, "saturday")).toBe(true);
  });

  it("is false when the day is missing or empty", () => {
    const hours: OpeningHours = { friday: "09:00-14:00" };
    expect(hasHoursOnWeekday(hours, "saturday")).toBe(false);
    expect(hasHoursOnWeekday({}, "saturday")).toBe(false);
    expect(hasHoursOnWeekday(undefined, "saturday")).toBe(false);
  });

  it("parses a string schedule before checking the day", () => {
    expect(hasHoursOnWeekday("ש': 10:00-15:00", "saturday")).toBe(true);
  });
});

describe("isOpenNow", () => {
  // Sunday is day 0, so this Date lands on a Sunday.
  const sunday = (h: number, m = 0) => new Date(2024, 0, 7, h, m);

  it("is true inside opening hours", () => {
    const hours: OpeningHours = { sunday: "08:00-18:00" };
    expect(isOpenNow(hours, sunday(12))).toBe(true);
  });

  it("is false outside opening hours", () => {
    const hours: OpeningHours = { sunday: "08:00-18:00" };
    expect(isOpenNow(hours, sunday(20))).toBe(false);
  });

  it("treats unknown hours as not-closed (so we don't wrongly dim them)", () => {
    expect(isOpenNow(undefined, sunday(12))).toBe(true);
  });
});
