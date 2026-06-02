import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  generatePopularTimes,
  getBestTimeToVisit,
  getCachedPopularTimes,
  getCurrentPopularity,
  getPopularityStatus,
  type DayPopularTimes,
} from "./popular-times";

describe("getPopularityStatus", () => {
  it("classifies the four bands by Hebrew label", () => {
    expect(getPopularityStatus(0).text).toBe("שקט");
    expect(getPopularityStatus(29).text).toBe("שקט");
    expect(getPopularityStatus(30).text).toBe("די עמוס");
    expect(getPopularityStatus(59).text).toBe("די עמוס");
    expect(getPopularityStatus(60).text).toBe("עמוס");
    expect(getPopularityStatus(79).text).toBe("עמוס");
    expect(getPopularityStatus(80).text).toBe("עמוס מאוד");
    expect(getPopularityStatus(100).text).toBe("עמוס מאוד");
  });

  it("returns a level enum that matches the label", () => {
    expect(getPopularityStatus(10).level).toBe("quiet");
    expect(getPopularityStatus(45).level).toBe("moderate");
    expect(getPopularityStatus(70).level).toBe("busy");
    expect(getPopularityStatus(90).level).toBe("very-busy");
  });

  it("returns Tailwind color tokens", () => {
    const status = getPopularityStatus(70);
    expect(status.color).toContain("text-amber-600");
    expect(status.bgColor).toContain("bg-amber-100");
  });
});

describe("getCurrentPopularity", () => {
  // 2024-01-08 was a Monday.
  const fixedMonday = new Date(2024, 0, 8, 12, 0, 0);

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedMonday);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const buildDay = (day: string, popularityAtNoon: number): DayPopularTimes => ({
    day,
    peakHours: [],
    quietHours: [],
    hours: [{ hour: 12, popularity: popularityAtNoon, day }],
  });

  it("returns the popularity for the current day and hour", () => {
    const popularTimes: DayPopularTimes[] = [buildDay("Monday", 75)];
    expect(getCurrentPopularity(popularTimes)).toBe(75);
  });

  it("returns 0 when the current day has no entry", () => {
    const popularTimes: DayPopularTimes[] = [buildDay("Tuesday", 75)];
    expect(getCurrentPopularity(popularTimes)).toBe(0);
  });

  it("returns 0 when the day exists but the current hour does not", () => {
    const popularTimes: DayPopularTimes[] = [
      { day: "Monday", peakHours: [], quietHours: [], hours: [] },
    ];
    expect(getCurrentPopularity(popularTimes)).toBe(0);
  });
});

describe("getBestTimeToVisit", () => {
  // 2024-01-08 12:00 — Monday at noon.
  const fixedMonday = new Date(2024, 0, 8, 12, 0, 0);

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedMonday);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // popularTimes is indexed by JS getDay(): 0=Sunday, 1=Monday, ...
  const makeWeek = (
    monday: { hour: number; popularity: number }[],
    nextDay: { hour: number; popularity: number }[] = [],
  ): DayPopularTimes[] => {
    const empty = (): DayPopularTimes => ({
      day: "x",
      hours: [],
      peakHours: [],
      quietHours: [],
    });
    const week = Array.from({ length: 7 }, empty);
    week[1] = {
      day: "Monday",
      hours: monday.map((h) => ({ ...h, day: "Monday" })),
      peakHours: [],
      quietHours: [],
    };
    week[2] = {
      day: "Tuesday",
      hours: nextDay.map((h) => ({ ...h, day: "Tuesday" })),
      peakHours: [],
      quietHours: [],
    };
    return week;
  };

  it("returns the next quiet hour today when one exists", () => {
    const week = makeWeek([
      { hour: 13, popularity: 70 },
      { hour: 14, popularity: 25 },
      { hour: 15, popularity: 35 }, // not < 40? 35 < 40, so this also counts; lower popularity wins
    ]);
    // hour=14 has popularity 25, hour=15 has popularity 35. Sorted ascending
    // by popularity, hour 14 wins.
    expect(getBestTimeToVisit(week)).toBe("השעה הטובה היום: 14:00");
  });

  it("falls back to tomorrow morning when today has nothing quieter than 40", () => {
    const week = makeWeek(
      [{ hour: 13, popularity: 80 }], // nothing today < 40
      [
        { hour: 8, popularity: 30 },
        { hour: 9, popularity: 20 },
      ],
    );
    expect(getBestTimeToVisit(week)).toBe("השעה הטובה מחר: 9:00");
  });

  it("returns the generic suggestion when no quiet slot is found at all", () => {
    const week = makeWeek([{ hour: 13, popularity: 90 }], []);
    expect(getBestTimeToVisit(week)).toBe("מומלץ לבדוק את השעות השקטות");
  });
});

describe("generatePopularTimes (invariants)", () => {
  // Pin RNG so output is deterministic for shape assertions.
  beforeEach(() => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 7 days of data", () => {
    const week = generatePopularTimes("coffee", "Tel Aviv");
    expect(week).toHaveLength(7);
    expect(week.map((d) => d.day)).toEqual([
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ]);
  });

  it("emits 18 hourly buckets (06:00 through 23:00) per day", () => {
    const week = generatePopularTimes("coffee", "Tel Aviv");
    for (const day of week) {
      expect(day.hours).toHaveLength(18);
      expect(day.hours[0].hour).toBe(6);
      expect(day.hours[day.hours.length - 1].hour).toBe(23);
    }
  });

  it("clamps every popularity reading into [5, 95]", () => {
    const week = generatePopularTimes("coffee", "Tel Aviv");
    for (const day of week) {
      for (const slot of day.hours) {
        expect(slot.popularity).toBeGreaterThanOrEqual(5);
        expect(slot.popularity).toBeLessThanOrEqual(95);
      }
    }
  });

  it("populates exactly 3 peak hours and 3 quiet hours per day", () => {
    const week = generatePopularTimes("coffee", "Tel Aviv");
    for (const day of week) {
      expect(day.peakHours).toHaveLength(3);
      expect(day.quietHours).toHaveLength(3);
    }
  });

  it("peak hours always have popularity >= quiet hours for the same day", () => {
    const week = generatePopularTimes("coffee", "תל אביב");
    for (const day of week) {
      const minPeak = Math.min(
        ...day.hours
          .filter((h) => day.peakHours.includes(h.hour))
          .map((h) => h.popularity),
      );
      const maxQuiet = Math.max(
        ...day.hours
          .filter((h) => day.quietHours.includes(h.hour))
          .map((h) => h.popularity),
      );
      expect(minPeak).toBeGreaterThanOrEqual(maxQuiet);
    }
  });
});

describe("getCachedPopularTimes", () => {
  beforeEach(() => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the same array reference on repeat calls with identical args", () => {
    const a = getCachedPopularTimes("cafe-cache-1", "coffee", "Tel Aviv");
    const b = getCachedPopularTimes("cafe-cache-1", "coffee", "Tel Aviv");
    expect(a).toBe(b);
  });

  it("returns a fresh entry when any cache-key component changes", () => {
    const a = getCachedPopularTimes("cafe-cache-2", "coffee", "Tel Aviv");
    const b = getCachedPopularTimes("cafe-cache-2", "matcha", "Tel Aviv");
    const c = getCachedPopularTimes("cafe-cache-3", "coffee", "Tel Aviv");
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
  });
});
