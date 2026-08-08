import { describe, it, expect } from "vitest";
import { normalizeCity } from "./cities";

describe("normalizeCity", () => {
  it("collapses the Tel Aviv variants to one canonical name", () => {
    expect(normalizeCity("תל אביב")).toBe("תל אביב");
    expect(normalizeCity("תל אביב-יפו")).toBe("תל אביב");
    expect(normalizeCity("תל אביב - יפו")).toBe("תל אביב");
  });

  it("trims surrounding whitespace before matching", () => {
    expect(normalizeCity("  תל אביב-יפו  ")).toBe("תל אביב");
  });

  it("leaves unmapped cities unchanged (only trimmed)", () => {
    expect(normalizeCity("ירושלים")).toBe("ירושלים");
    expect(normalizeCity(" חיפה ")).toBe("חיפה");
    expect(normalizeCity("יפו")).toBe("יפו"); // distinct identity, not merged
  });

  it("handles null/undefined/empty", () => {
    expect(normalizeCity(null)).toBe("");
    expect(normalizeCity(undefined)).toBe("");
    expect(normalizeCity("")).toBe("");
  });
});
