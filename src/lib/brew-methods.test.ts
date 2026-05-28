import { describe, expect, it } from "vitest";
import {
  BREW_METHODS,
  filterBrewMethods,
  parseBrewMethods,
} from "./brew-methods";

describe("BREW_METHODS", () => {
  it("exposes the three canonical methods in the documented display order", () => {
    expect(BREW_METHODS).toEqual(["אספרסו", "פילטר", "קולד ברו"]);
  });
});

describe("parseBrewMethods", () => {
  it("returns [] for nullish or non-string input", () => {
    expect(parseBrewMethods(null)).toEqual([]);
    expect(parseBrewMethods(undefined)).toEqual([]);
    expect(parseBrewMethods("")).toEqual([]);
  });

  it("splits on commas and trims whitespace", () => {
    expect(parseBrewMethods("אספרסו, פילטר")).toEqual(["אספרסו", "פילטר"]);
  });

  it("sorts by the canonical order even if the input is jumbled", () => {
    expect(parseBrewMethods("קולד ברו, אספרסו, פילטר")).toEqual([
      "אספרסו",
      "פילטר",
      "קולד ברו",
    ]);
  });

  it("appends unknown methods stably at the end", () => {
    // "V60" is not in BREW_METHODS — parseBrewMethods (unlike
    // filterBrewMethods) preserves it without aliasing.
    const result = parseBrewMethods("V60, אספרסו, קולד ברו");
    expect(result.slice(0, 2)).toEqual(["אספרסו", "קולד ברו"]);
    expect(result[2]).toBe("V60");
  });

  it("drops empty segments produced by trailing/double commas", () => {
    expect(parseBrewMethods("אספרסו,,פילטר,")).toEqual(["אספרסו", "פילטר"]);
  });
});

describe("filterBrewMethods", () => {
  it("returns [] when no methods match the whitelist", () => {
    expect(filterBrewMethods([])).toEqual([]);
    expect(filterBrewMethods(["אחר", "תה"])).toEqual([]);
  });

  it("keeps only the three canonical methods (with alias normalization)", () => {
    expect(filterBrewMethods(["פילטר", "אחר", "אספרסו"])).toEqual([
      "אספרסו",
      "פילטר",
    ]);
  });

  it("normalizes 'V60' to 'פילטר'", () => {
    expect(filterBrewMethods(["V60"])).toEqual(["פילטר"]);
  });

  it("normalizes 'חליטה קרה' to 'קולד ברו'", () => {
    expect(filterBrewMethods(["חליטה קרה"])).toEqual(["קולד ברו"]);
  });

  it("dedupes when an alias collapses onto a canonical entry", () => {
    // V60 → פילטר, and פילטר is already present → only one פילטר in output
    expect(filterBrewMethods(["V60", "פילטר"])).toEqual(["פילטר"]);
  });

  it("sorts the output by the canonical display order", () => {
    expect(filterBrewMethods(["קולד ברו", "אספרסו", "פילטר"])).toEqual([
      "אספרסו",
      "פילטר",
      "קולד ברו",
    ]);
  });

  it("handles a real-world mixed input", () => {
    expect(
      filterBrewMethods([
        "אספרסו",
        "V60",
        "תה ירוק", // dropped
        "חליטה קרה",
        "פילטר", // V60 already normalized to this — dedupe
      ]),
    ).toEqual(["אספרסו", "פילטר", "קולד ברו"]);
  });
});
