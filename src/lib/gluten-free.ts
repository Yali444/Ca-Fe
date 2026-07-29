/**
 * Gluten-free helpers, shared by the UI and the offline collection scripts.
 *
 * Two unrelated concerns live here because both are tiny and both are about
 * the same field:
 *
 * 1. `findGlutenFreeEvidence` — the pure text matcher used by
 *    `scripts/detect-gluten-free.ts` to scan cafe websites and Google
 *    reviews. It never decides anything on its own; it returns quoted
 *    snippets for a human to confirm.
 * 2. The coverage gate — the filter chip stays hidden until enough cafes
 *    carry the field, so the first user to tap it doesn't get a two-result
 *    list that looks broken.
 */

/**
 * Minimum number of cafes marked `glutenFree` before the filter chip is
 * shown. Below this the data is displayed on individual cafes but there
 * isn't enough of it for filtering to be a useful action.
 */
export const GLUTEN_FREE_MIN_COVERAGE = 15;

/**
 * The kinds of gluten-free food a place serves, as a closed vocabulary.
 *
 * "Serves gluten-free options" on its own is close to useless: a salad is
 * technically an option, and nobody walks into a cafe hoping for one. What
 * decides whether the trip is worth making is whether there's real food —
 * a sandwich, a pastry — so the categories are recorded and shown.
 *
 * Categories only. Which sandwiches or which pastries is a menu that changes
 * weekly; that we deliberately don't track. The base (tortilla, bread) is its
 * own entry because for someone avoiding gluten it's the part that decides
 * whether a sandwich exists at all.
 *
 * Ordered most to least substantial — display sorts by this, so the thing
 * worth crossing town for is what you read first.
 */
export const GLUTEN_FREE_ITEMS = [
  "לחם",
  "כריכים",
  "טורטיות",
  "מאפים מלוחים",
  "מאפים מתוקים",
  "עוגות",
  "קינוחים",
  "ארוחת בוקר",
  "פסטה",
  "גרנולה",
  "סלטים",
] as const;

export type GlutenFreeItem = (typeof GLUTEN_FREE_ITEMS)[number];

const GLUTEN_FREE_ITEM_SET = new Set<string>(GLUTEN_FREE_ITEMS);

/**
 * Items that don't, on their own, make a cafe worth choosing — the exact case
 * this vocabulary exists to expose. Kept separate from the display order so
 * the two can be reasoned about independently.
 */
const TOKEN_ITEMS = new Set<string>(["סלטים", "גרנולה"]);

/**
 * Keep only known categories, dedupe, and sort by the canonical order above.
 * Unknown strings are dropped rather than passed through: this feeds a
 * dietary claim, so a typo should disappear instead of rendering as fact.
 */
export const parseGlutenFreeItems = (items: readonly string[] | undefined | null): string[] => {
  if (!Array.isArray(items)) return [];
  const kept = items
    .map((item) => item.trim())
    .filter((item) => GLUTEN_FREE_ITEM_SET.has(item));
  return [...new Set(kept)].sort(
    (a, b) =>
      GLUTEN_FREE_ITEMS.indexOf(a as GlutenFreeItem) -
      GLUTEN_FREE_ITEMS.indexOf(b as GlutenFreeItem),
  );
};

/**
 * True when at least one category is a real meal rather than a token gesture.
 * A cafe whose only gluten-free item is a salad is honestly reported as such.
 */
export const hasSubstantialGlutenFreeItems = (items: readonly string[] | undefined): boolean =>
  parseGlutenFreeItems(items).some((item) => !TOKEN_ITEMS.has(item));

/** How many of these places are known to serve gluten-free options. */
export const countGlutenFreePlaces = (
  places: readonly { glutenFree?: boolean }[],
): number => places.reduce((total, place) => (place.glutenFree === true ? total + 1 : total), 0);

/**
 * True when there's enough coverage to expose the filter. Callers must also
 * treat a `false` here as "ignore any stored/URL filter value" — otherwise a
 * saved `gf=1` would silently filter the list with no chip to switch off.
 */
export const isGlutenFreeFilterAvailable = (glutenFreeCount: number): boolean =>
  glutenFreeCount >= GLUTEN_FREE_MIN_COVERAGE;

// --- Text matching (used by scripts/detect-gluten-free.ts) ---

/**
 * Phrases that indicate gluten-free offerings. Matched as plain substrings
 * rather than with `\b` boundaries: JavaScript's `\w` is ASCII-only, so
 * `\b` never fires between a space and a Hebrew letter and would silently
 * match nothing.
 */
const POSITIVE_TERMS = [
  "ללא גלוטן",
  "ללא-גלוטן",
  "נטול גלוטן",
  "נטולי גלוטן",
  "נטולת גלוטן",
  "נטולות גלוטן",
  "gluten free",
  "gluten-free",
  "glutenfree",
] as const;

/**
 * Phrases that flip a nearby positive match into a denial — "אין לנו מאפים
 * ללא גלוטן" contains "ללא גלוטן" but means the opposite. Checked against
 * the text immediately preceding a hit.
 *
 * Hebrew negations are substrings: final letters (ן in "אין") make that safe,
 * and it's why bare "לא" is absent — it hides inside ordinary words like
 * "מלאות", so only its unambiguous verb phrases are listed.
 */
const HEBREW_NEGATIONS = [
  "אין",
  "איננו",
  "לא מציעים",
  "לא מגישים",
  "לא מוכרים",
  "לא מכינים",
  "לא כולל",
] as const;

/**
 * English negations need real word boundaries — a bare "no" substring would
 * fire inside "know". `\b` is safe here because these are all ASCII.
 */
const ENGLISH_NEGATIONS = [
  /\bno\b/,
  /\bnot\b/,
  /\bnever\b/,
  /\bwithout\b/,
  /\bdon'?t\b/,
  /\bdoesn'?t\b/,
] as const;

/** Characters before a hit that are scanned for a negation. */
const NEGATION_WINDOW = 30;

/** Characters of context kept on each side of a hit in the quoted snippet. */
const SNIPPET_PADDING = 70;

/**
 * Reduce an HTML page to its visible text.
 *
 * Script and style bodies are dropped first: a menu embedded in a JSON blob or
 * a CSS class name can otherwise produce a "hit" whose snippet is unreadable
 * to whoever has to judge it, which defeats the point of quoting evidence.
 */
export const htmlToText = (html: string): string =>
  html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();

export interface GlutenFreeMatch {
  /** The phrase that matched, e.g. "ללא גלוטן". */
  term: string;
  /** Surrounding text, for a human to judge the hit. */
  snippet: string;
}

/**
 * Collapse whitespace and normalise the punctuation variants that show up in
 * Hebrew menus: the maqaf (־) is a different codepoint from the ASCII hyphen,
 * and niqqud would otherwise split "גלוטן" mid-word.
 */
export const normalizeForMatching = (text: string): string =>
  text
    // Maqaf first: U+05BE sits inside the niqqud range below, so stripping
    // that range first would delete the hyphen instead of converting it and
    // silently glue "ללא־גלוטן" into an unmatchable "ללאגלוטן".
    .replace(/־/g, "-")
    .replace(/[֑-ׇ]/g, "") // niqqud & cantillation
    .replace(/\s+/g, " ")
    .trim();

/**
 * Find every gluten-free mention in a block of text, skipping hits that a
 * nearby negation cancels.
 *
 * Deliberately returns evidence, not a verdict: "someone mentioned gluten in
 * a review" is not the same as "this cafe serves gluten-free food", and
 * publishing a wrong `true` matters when the reader has celiac disease.
 */
export const findGlutenFreeEvidence = (text: string): GlutenFreeMatch[] => {
  if (!text) return [];

  const normalized = normalizeForMatching(text);
  const haystack = normalized.toLowerCase();

  const hits: { at: number; term: string }[] = [];

  for (const term of POSITIVE_TERMS) {
    let from = 0;
    for (;;) {
      const at = haystack.indexOf(term, from);
      if (at === -1) break;
      from = at + term.length;

      const before = haystack.slice(Math.max(0, at - NEGATION_WINDOW), at);
      const denied =
        HEBREW_NEGATIONS.some((negation) => before.includes(negation)) ||
        ENGLISH_NEGATIONS.some((negation) => negation.test(before));
      if (denied) continue;

      hits.push({ at, term });
    }
  }

  hits.sort((a, b) => a.at - b.at || b.term.length - a.term.length);

  // Report each stretch of text once. Today's terms can't overlap each other,
  // so this only matters if the list grows a phrase that contains another —
  // the longer one wins because of the sort above.
  const matches: GlutenFreeMatch[] = [];
  let consumedUpTo = -1;
  for (const { at, term } of hits) {
    if (at < consumedUpTo) continue;
    consumedUpTo = at + term.length;
    matches.push({
      term,
      snippet: normalized
        .slice(Math.max(0, at - SNIPPET_PADDING), at + term.length + SNIPPET_PADDING)
        .trim(),
    });
  }

  return matches;
};

/**
 * Words that suggest a category, for pre-filling the candidates file. Only a
 * hint to whoever reviews the evidence — never a substitute for reading it.
 *
 * Ambiguous words are absent on purpose: a bare "מאפים" could be a croissant
 * or a bourekas, and guessing wrong is worse than leaving the field empty for
 * a human to fill.
 */
const ITEM_HINTS: readonly (readonly [RegExp, GlutenFreeItem])[] = [
  // "כריך" ends in a final kaf, a different letter from the one in "כריכים" —
  // matching only the plural stem would miss the singular form menus use most.
  [/כריכ|כריך|סנדוויץ|טוסט/, "כריכים"],
  [/טורטי/, "טורטיות"],
  [/לחמני|לחם/, "לחם"],
  [/בורקס|קיש|פוקצ/, "מאפים מלוחים"],
  [/קרואסון|בריוש|רוגלך|מאפה מתוק|מאפים מתוקים/, "מאפים מתוקים"],
  [/עוגיי|עוגיו|עוגה|עוגות|צ'יזקייק|בראוני|brownie/, "עוגות"],
  [/קינוח/, "קינוחים"],
  [/ארוחת בוקר|שקשוקה/, "ארוחת בוקר"],
  [/פסטה|נודלס/, "פסטה"],
  [/גרנול/, "גרנולה"],
  [/סלט/, "סלטים"],
];

/**
 * Suggest categories mentioned near a gluten-free hit. Returns them in
 * canonical order; an empty array means "couldn't tell", not "nothing there".
 */
export const guessGlutenFreeItems = (text: string): string[] => {
  const normalized = normalizeForMatching(text).toLowerCase();
  return parseGlutenFreeItems(
    ITEM_HINTS.filter(([pattern]) => pattern.test(normalized)).map(([, item]) => item),
  );
};
