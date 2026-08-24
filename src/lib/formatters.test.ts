import { describe, expect, it } from "vitest";
import {
  formatOpeningHoursForDisplay,
  instagramUrl,
  parseOpeningHoursString,
} from "./formatters";
import type { OpeningHours } from "@/types/place";

describe("instagramUrl", () => {
  it("returns null for null/undefined/empty input", () => {
    expect(instagramUrl(null)).toBeNull();
    expect(instagramUrl(undefined)).toBeNull();
    expect(instagramUrl("")).toBeNull();
  });

  it("builds a profile URL from a plain handle", () => {
    expect(instagramUrl("cafe_handle")).toBe("https://instagram.com/cafe_handle");
  });

  it("strips a single leading @", () => {
    expect(instagramUrl("@cafe_handle")).toBe("https://instagram.com/cafe_handle");
  });
});

describe("parseOpeningHoursString", () => {
  it("returns null when the string is empty or unparseable", () => {
    expect(parseOpeningHoursString("")).toBeNull();
    expect(parseOpeningHoursString("nonsense without times")).toBeNull();
  });

  it("parses a Hebrew range with apostrophes (א'-ה')", () => {
    const result = parseOpeningHoursString("א'-ה': 07:00-19:00");
    expect(result).toEqual({
      sunday: "07:00-19:00",
      monday: "07:00-19:00",
      tuesday: "07:00-19:00",
      wednesday: "07:00-19:00",
      thursday: "07:00-19:00",
    });
  });

  it("parses a Hebrew range without apostrophes (א-ה)", () => {
    const result = parseOpeningHoursString("א-ה: 08:00-18:00");
    expect(Object.keys(result ?? {}).sort()).toEqual(
      ["monday", "sunday", "thursday", "tuesday", "wednesday"].sort(),
    );
  });

  it("normalizes en-dash and em-dash to a regular hyphen in time", () => {
    const enDash = parseOpeningHoursString("א'-ה': 07:00–19:00");
    const emDash = parseOpeningHoursString("א'-ה': 07:00—19:00");
    expect(enDash?.sunday).toBe("07:00-19:00");
    expect(emDash?.sunday).toBe("07:00-19:00");
  });

  it("treats Saturday-as-closed as missing key", () => {
    const result = parseOpeningHoursString("א'-ה': 07:00-19:00, שבת: סגור");
    expect(result?.saturday).toBeUndefined();
    expect(result?.sunday).toBe("07:00-19:00");
  });

  it("parses a multi-segment Hebrew string with single days", () => {
    const result = parseOpeningHoursString(
      "א'-ה': 07:00-19:00, ו': 07:00-16:00, שבת: 08:00-21:00",
    );
    expect(result?.friday).toBe("07:00-16:00");
    expect(result?.saturday).toBe("08:00-21:00");
    expect(result?.sunday).toBe("07:00-19:00");
  });

  it("parses the all-week pattern א'-ש' as all seven days", () => {
    const result = parseOpeningHoursString("א'-ש': 09:00-22:00");
    expect(Object.keys(result ?? {}).sort()).toEqual(
      [
        "friday",
        "monday",
        "saturday",
        "sunday",
        "thursday",
        "tuesday",
        "wednesday",
      ],
    );
  });

  it("parses English day ranges (Mon-Sat)", () => {
    const result = parseOpeningHoursString("Mon-Sat: 07:00-19:00");
    expect(result?.monday).toBe("07:00-19:00");
    expect(result?.saturday).toBe("07:00-19:00");
    expect(result?.sunday).toBeUndefined();
  });

  it("parses English full day names with closed Sunday", () => {
    const result = parseOpeningHoursString(
      "Monday-Friday: 09:00-17:00, Saturday: 10:00-14:00, Sunday: closed",
    );
    expect(result?.monday).toBe("09:00-17:00");
    expect(result?.friday).toBe("09:00-17:00");
    expect(result?.saturday).toBe("10:00-14:00");
    expect(result?.sunday).toBeUndefined();
  });

  it("recognizes Hebrew מוצ\"ש as Saturday", () => {
    const result = parseOpeningHoursString('מוצ"ש: 20:00-23:00');
    expect(result?.saturday).toBe("20:00-23:00");
  });
});

describe("formatOpeningHoursForDisplay", () => {
  it("returns an empty string for falsy input", () => {
    expect(formatOpeningHoursForDisplay(null)).toBe("");
    expect(formatOpeningHoursForDisplay(undefined)).toBe("");
  });

  it("passes through a string unchanged", () => {
    expect(formatOpeningHoursForDisplay("א'-ה': 07:00-19:00")).toBe(
      "א'-ה': 07:00-19:00",
    );
  });

  it("renders an object as comma-joined Hebrew day labels in order", () => {
    const hours: OpeningHours = {
      sunday: "07:00-19:00",
      friday: "07:00-16:00",
      saturday: "08:00-21:00",
    };
    expect(formatOpeningHoursForDisplay(hours)).toBe(
      "א': 07:00-19:00, ו': 07:00-16:00, שבת: 08:00-21:00",
    );
  });

  it("skips days without hours", () => {
    const hours: OpeningHours = { monday: "08:00-18:00" };
    expect(formatOpeningHoursForDisplay(hours)).toBe("ב': 08:00-18:00");
  });
});
