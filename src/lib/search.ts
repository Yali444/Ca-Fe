/**
 * Fuzzy-search helpers for cafe lookup.
 *
 * Normalization strips Hebrew niqqud/cantillation marks, geresh/gershayim,
 * straight/curly quotes, lowercases ASCII letters, and collapses whitespace —
 * so that user input like `"קפה ג'ו"` matches a stored value like
 * `"קפה גו"`, and Latin queries are case-insensitive.
 *
 * Scoring is a small priority ladder: exact name > name-prefix >
 * word-prefix > name-contains > city-prefix > city-contains >
 * address-contains. Higher = better, 0 = no match. The thresholds and
 * order are part of the search-relevance contract and are locked in by
 * unit tests.
 */

export const normalizeSearchText = (s: string | null | undefined): string =>
  (s || "")
    .toLowerCase()
    .replace(/[֑-ׇ]/g, "") // Hebrew niqqud / cantillation
    .replace(/['"׳״`’]/g, "") // geresh, gershayim, quotes
    .replace(/\s+/g, " ")
    .trim();

export type SearchableShop = {
  name: string;
  location: string;
  address: string | null;
};

/**
 * Score a cafe against a query that has ALREADY been passed through
 * normalizeSearchText. Returns 0 for empty queries or no match;
 * 100/85/70/55/35/25/18 for the priority ladder described above.
 *
 * The caller is responsible for normalizing the query — passing a raw
 * user-typed string here will skip the lowercase/niqqud normalization
 * and produce wrong scores. See the call site in IsraelCoffeeGuide.tsx.
 */
export const scoreCafeMatch = (shop: SearchableShop, q: string): number => {
  if (!q) return 0;
  const name = normalizeSearchText(shop.name);
  const city = normalizeSearchText(shop.location);
  const address = normalizeSearchText(shop.address);

  if (name === q) return 100;
  if (name.startsWith(q)) return 85;
  if (name.split(" ").some((w) => w.startsWith(q))) return 70;
  if (name.includes(q)) return 55;
  if (city.startsWith(q)) return 35;
  if (city.includes(q)) return 25;
  if (address.includes(q)) return 18;
  return 0;
};
