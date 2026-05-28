/**
 * Brew-methods helpers shared across the data layer and UI.
 *
 * BREW_METHODS is the canonical order/whitelist.
 *
 * parseBrewMethods is used at the data-loading boundary: takes the raw
 * comma-separated string from the cafes.json source and produces a sorted
 * array, preserving any unknown methods at the end.
 *
 * filterBrewMethods is used in the UI: takes an already-parsed array,
 * keeps only the three canonical methods (plus known aliases), normalizes
 * the aliases, dedupes, and sorts by the canonical order.
 */

/** Canonical brew-method whitelist, in display order. */
export const BREW_METHODS = ["אספרסו", "פילטר", "קולד ברו"] as const;

export type BrewMethod = (typeof BREW_METHODS)[number];

/**
 * Parse a comma-separated brew-methods string (as stored on cafes.json)
 * into an array, sorted by the canonical order. Unknown methods sort
 * stably at the end. Returns [] for nullish or non-string input.
 */
export const parseBrewMethods = (
  methods: string | undefined | null,
): string[] => {
  if (!methods || typeof methods !== "string") {
    return [];
  }
  const parsed = methods.split(",").map((m) => m.trim()).filter(Boolean);
  return parsed.sort((a, b) => {
    const indexA = BREW_METHODS.indexOf(a as BrewMethod);
    const indexB = BREW_METHODS.indexOf(b as BrewMethod);
    if (indexA === -1 && indexB === -1) return 0;
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });
};

/**
 * Filter a brew-methods array down to the canonical three (plus known
 * aliases: "V60" → "פילטר", "חליטה קרה" → "קולד ברו"), then dedupe and
 * sort by canonical order.
 */
export const filterBrewMethods = (methods: string[]): string[] => {
  const filtered = methods
    .filter(
      (method) =>
        method === "פילטר" ||
        method === "אספרסו" ||
        method === "קולד ברו" ||
        method === "V60" || // V60 is considered פילטר
        method === "חליטה קרה", // חליטה קרה is considered קולד ברו
    )
    .map((method) => {
      if (method === "V60") return "פילטר";
      if (method === "חליטה קרה") return "קולד ברו";
      return method;
    })
    .filter((method, index, arr) => arr.indexOf(method) === index); // dedupe

  return filtered.sort(
    (a, b) =>
      BREW_METHODS.indexOf(a as BrewMethod) -
      BREW_METHODS.indexOf(b as BrewMethod),
  );
};
