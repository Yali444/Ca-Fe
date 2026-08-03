import { describe, expect, it } from "vitest";
import { getFontFamily, hasLatinCharacters } from "./fonts-helpers";

describe("hasLatinCharacters", () => {
  it("returns true when any ASCII letter is present", () => {
    expect(hasLatinCharacters("Cafe")).toBe(true);
    expect(hasLatinCharacters("שטרודל - cafe")).toBe(true);
    expect(hasLatinCharacters("a")).toBe(true);
  });

  it("returns false for pure Hebrew text", () => {
    expect(hasLatinCharacters("שטרודל")).toBe(false);
    expect(hasLatinCharacters("תל אביב")).toBe(false);
  });

  it("returns false for whitespace, digits, and punctuation alone", () => {
    expect(hasLatinCharacters("")).toBe(false);
    expect(hasLatinCharacters("   ")).toBe(false);
    expect(hasLatinCharacters("123")).toBe(false);
    expect(hasLatinCharacters("!!!")).toBe(false);
    expect(hasLatinCharacters("123-456")).toBe(false);
  });
});

describe("getFontFamily", () => {
  it("uses the TimeBurner (Latin) family when Latin characters are present", () => {
    const family = getFontFamily("Cafe Levinsky");
    expect(family).toContain("--font-timeburner");
  });

  it("uses the Aran (Hebrew) family for pure Hebrew text", () => {
    const family = getFontFamily("שטרודל");
    expect(family).toContain("--font-aran");
    expect(family).not.toContain("--font-timeburner");
  });

  it("falls back to the Latin family when text is mixed (Latin dominates)", () => {
    // A single Latin char is enough to flip the branch — documents current
    // behavior so a future "majority wins" change is a conscious decision.
    expect(getFontFamily("שטרודל a")).toContain("--font-timeburner");
  });

  it("uses the Hebrew family for an empty string (no Latin chars)", () => {
    expect(getFontFamily("")).toContain("--font-aran");
  });
});
