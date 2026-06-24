import { describe, expect, it } from "vitest";
import {
  buildNoticeMessage,
  getIsraelHour,
  getIsraelToday,
  getIsraelTomorrow,
  isRelevantSpecialDay,
  selectNotice,
  type SpecialDay,
} from "./special-days";

const day = (over: Partial<SpecialDay>): SpecialDay => ({
  title: "יום הזיכרון",
  date: "2026-04-21",
  category: "holiday",
  ...over,
});

describe("isRelevantSpecialDay", () => {
  it("matches relevant subcategories", () => {
    expect(isRelevantSpecialDay(day({ subcat: "modern" }))).toBe(true);
    expect(isRelevantSpecialDay(day({ subcat: "major" }))).toBe(true);
    expect(isRelevantSpecialDay(day({ subcat: "minor" }))).toBe(true);
    expect(isRelevantSpecialDay(day({ subcat: "fast" }))).toBe(true);
  });

  it("falls back to known Hebrew title fragments when subcat is absent", () => {
    expect(
      isRelevantSpecialDay(day({ title: "יום השואה", subcat: undefined })),
    ).toBe(true);
    expect(
      isRelevantSpecialDay(day({ title: "יום העצמאות", subcat: undefined })),
    ).toBe(true);
  });

  it("ignores everyday markers like Rosh Chodesh", () => {
    expect(
      isRelevantSpecialDay(
        day({ title: "ראש חודש אייר", category: "roshchodesh", subcat: undefined }),
      ),
    ).toBe(false);
  });

  it("guards against malformed items", () => {
    expect(isRelevantSpecialDay({} as SpecialDay)).toBe(false);
  });
});

describe("buildNoticeMessage", () => {
  it("returns null for an empty list", () => {
    expect(buildNoticeMessage([])).toBeNull();
  });

  it("phrases a single day as 'today'", () => {
    const msg = buildNoticeMessage([day({ title: "יום הזיכרון" })]);
    expect(msg).toContain("היום יום הזיכרון");
    expect(msg).toContain("ייתכנו שינויים בשעות הפתיחה");
  });

  it("phrases an eve notice with 'ערב'", () => {
    const msg = buildNoticeMessage([day({ title: "יום הזיכרון" })], true);
    expect(msg).toContain("ערב יום הזיכרון");
  });

  it("joins two days with a Hebrew conjunction (no comma)", () => {
    const msg = buildNoticeMessage([
      day({ title: "יום הזיכרון" }),
      day({ title: "יום העצמאות" }),
    ]);
    expect(msg).toContain("יום הזיכרון ויום העצמאות");
  });

  it("comma-separates three or more days before the final conjunction", () => {
    const msg = buildNoticeMessage([
      day({ title: "פסח" }),
      day({ title: "חול המועד פסח" }),
      day({ title: "שביעי של פסח" }),
    ]);
    expect(msg).toContain("פסח, חול המועד פסח ושביעי של פסח");
  });
});

describe("getIsraelToday / getIsraelTomorrow", () => {
  it("returns an ISO date for a known instant in Israel time", () => {
    // 2026-04-21 09:00 UTC → still the 21st in Israel (UTC+3 in April).
    const now = new Date("2026-04-21T09:00:00Z");
    expect(getIsraelToday(now)).toBe("2026-04-21");
    expect(getIsraelTomorrow(now)).toBe("2026-04-22");
  });

  it("rolls over to the next day late at night in Israel", () => {
    // 2026-04-21 22:00 UTC → 01:00 on the 22nd in Israel.
    const now = new Date("2026-04-21T22:00:00Z");
    expect(getIsraelToday(now)).toBe("2026-04-22");
  });
});

describe("getIsraelHour", () => {
  it("reflects Israel local hour, not UTC", () => {
    // 12:00 UTC in April (UTC+3) → 15:00 in Israel.
    expect(getIsraelHour(new Date("2026-04-21T12:00:00Z"))).toBe(15);
  });
});

describe("selectNotice", () => {
  const today = [day({ title: "יום הזיכרון" })];
  const tomorrow = [day({ title: "יום העצמאות", date: "2026-04-22" })];

  it("prefers today's days regardless of the hour", () => {
    const morning = new Date("2026-04-21T05:00:00Z"); // 08:00 IL
    expect(selectNotice(today, tomorrow, morning)).toContain("היום יום הזיכרון");
  });

  it("shows tomorrow as an eve notice only in the evening", () => {
    const evening = new Date("2026-04-21T16:00:00Z"); // 19:00 IL
    expect(selectNotice([], tomorrow, evening)).toContain("ערב יום העצמאות");
  });

  it("stays quiet about tomorrow during the day", () => {
    const noon = new Date("2026-04-21T09:00:00Z"); // 12:00 IL
    expect(selectNotice([], tomorrow, noon)).toBeNull();
  });

  it("returns null on an ordinary day", () => {
    const noon = new Date("2026-04-21T09:00:00Z");
    expect(selectNotice([], [], noon)).toBeNull();
  });
});
