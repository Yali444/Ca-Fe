import { describe, it, expect } from "vitest";
import {
  GLUTEN_FREE_MIN_COVERAGE,
  countGlutenFreePlaces,
  findGlutenFreeEvidence,
  htmlToText,
  isGlutenFreeFilterAvailable,
  normalizeForMatching,
} from "./gluten-free";

describe("normalizeForMatching", () => {
  it("collapses whitespace", () => {
    expect(normalizeForMatching("  ללא\n\n  גלוטן  ")).toBe("ללא גלוטן");
  });

  it("converts a maqaf to an ASCII hyphen", () => {
    // The maqaf (U+05BE) is what Hebrew typography actually uses, but the
    // keyword list is written with the ASCII hyphen.
    expect(normalizeForMatching("ללא־גלוטן")).toBe("ללא-גלוטן");
  });

  it("strips niqqud so it can't split a word", () => {
    expect(normalizeForMatching("גְלוּטֵן")).toBe("גלוטן");
  });
});

describe("findGlutenFreeEvidence", () => {
  it("returns nothing for empty or unrelated text", () => {
    expect(findGlutenFreeEvidence("")).toEqual([]);
    expect(findGlutenFreeEvidence("קפה מעולה, שירות אדיב")).toEqual([]);
  });

  it("finds the Hebrew phrase and quotes its context", () => {
    const [match] = findGlutenFreeEvidence("יש לנו מאפים ללא גלוטן בהזמנה מראש");
    expect(match.term).toBe("ללא גלוטן");
    expect(match.snippet).toContain("מאפים ללא גלוטן");
  });

  it("finds the maqaf-spelled variant after normalisation", () => {
    const matches = findGlutenFreeEvidence("עוגות ללא־גלוטן");
    expect(matches).toHaveLength(1);
    expect(matches[0].term).toBe("ללא-גלוטן");
  });

  it.each(["נטול גלוטן", "נטולי גלוטן", "נטולת גלוטן", "נטולות גלוטן"])(
    "finds the %s variant",
    (term) => {
      expect(findGlutenFreeEvidence(`מגישים מאפים ${term} כל יום`)).toHaveLength(1);
    },
  );

  it("finds English mentions regardless of case", () => {
    expect(findGlutenFreeEvidence("Great GLUTEN FREE cake here")).toHaveLength(1);
    expect(findGlutenFreeEvidence("they have Gluten-Free options")).toHaveLength(1);
  });

  it("does not treat 'מכיל גלוטן' as a positive", () => {
    expect(findGlutenFreeEvidence("כל המאפים מכילים גלוטן")).toEqual([]);
  });

  it("discards a hit that a preceding negation cancels", () => {
    // The phrase is present but the sentence denies it — the whole reason
    // the matcher looks backwards before accepting a hit.
    expect(findGlutenFreeEvidence("אין לנו מאפים ללא גלוטן")).toEqual([]);
    expect(findGlutenFreeEvidence("לא מגישים אצלנו ללא גלוטן")).toEqual([]);
    expect(findGlutenFreeEvidence("we do not have gluten free options")).toEqual([]);
  });

  it("keeps a hit when the negation is too far away to be about it", () => {
    const text =
      "אין חניה בקרבת מקום וזה חבל מאוד כי המקום שווה את זה. " +
      "בתפריט יש עוגות ללא גלוטן";
    expect(findGlutenFreeEvidence(text)).toHaveLength(1);
  });

  it("reports each distinct mention once", () => {
    const matches = findGlutenFreeEvidence(
      "מאפים ללא גלוטן בבוקר. " + "בערב יש גם לחם נטול גלוטן.",
    );
    expect(matches).toHaveLength(2);
  });

  it("reports two spellings of the phrase as the two mentions they are", () => {
    const matches = findGlutenFreeEvidence("gluten free and gluten-free cake");
    expect(matches.map((match) => match.term)).toEqual(["gluten free", "gluten-free"]);
  });

  it("returns matches in the order they appear in the text", () => {
    const matches = findGlutenFreeEvidence(
      "בתפריט הבוקר יש לחם נטול גלוטן, " +
        "ובקינוחים יש גם עוגות ללא גלוטן וגם gluten free brownies",
    );
    expect(matches.map((match) => match.term)).toEqual([
      "נטול גלוטן",
      "ללא גלוטן",
      "gluten free",
    ]);
  });
});

describe("htmlToText", () => {
  it("keeps visible text and drops the tags around it", () => {
    expect(htmlToText("<p>עוגות <strong>ללא גלוטן</strong></p>")).toBe("עוגות ללא גלוטן");
  });

  it("drops script and style bodies", () => {
    // A menu embedded in a script tag would otherwise yield a snippet full of
    // JSON that nobody can review.
    const html = `
      <style>.gluten-free-badge { color: red }</style>
      <script>var menu = {"ללא גלוטן": true};</script>
      <div>יש לנו מאפים ללא גלוטן</div>
    `;
    const text = htmlToText(html);
    expect(text).toBe("יש לנו מאפים ללא גלוטן");
    expect(findGlutenFreeEvidence(text)).toHaveLength(1);
  });

  it("drops comments", () => {
    expect(htmlToText("<div>קפה<!-- ללא גלוטן --></div>")).toBe("קפה");
  });

  it("decodes the entities that break up a phrase", () => {
    expect(htmlToText("<p>ללא&nbsp;גלוטן</p>")).toBe("ללא גלוטן");
    expect(findGlutenFreeEvidence(htmlToText("<p>ללא&nbsp;גלוטן</p>"))).toHaveLength(1);
  });
});

describe("coverage gate", () => {
  it("counts only places explicitly marked true", () => {
    expect(
      countGlutenFreePlaces([
        { glutenFree: true },
        { glutenFree: false },
        {}, // unknown — not a "no"
        { glutenFree: true },
      ]),
    ).toBe(2);
  });

  it("hides the filter below the threshold and shows it at or above", () => {
    expect(isGlutenFreeFilterAvailable(0)).toBe(false);
    expect(isGlutenFreeFilterAvailable(GLUTEN_FREE_MIN_COVERAGE - 1)).toBe(false);
    expect(isGlutenFreeFilterAvailable(GLUTEN_FREE_MIN_COVERAGE)).toBe(true);
    expect(isGlutenFreeFilterAvailable(GLUTEN_FREE_MIN_COVERAGE + 40)).toBe(true);
  });
});
