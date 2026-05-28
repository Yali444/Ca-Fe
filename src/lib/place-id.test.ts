import { describe, expect, it } from "vitest";
import { generatePlaceId } from "./place-id";

describe("generatePlaceId", () => {
  it("is deterministic — the same input always produces the same id", () => {
    const id1 = generatePlaceId("Cafe Levinsky", "Tel Aviv");
    const id2 = generatePlaceId("Cafe Levinsky", "Tel Aviv");
    expect(id1).toBe(id2);
  });

  // These snapshots are the URL contract for cafe deep-links. If a test below
  // breaks, every saved link to that cafe also breaks — bump the version of
  // the slug strategy and write a migration instead of "fixing" the snapshot.
  it("matches the frozen output for known inputs (URL contract)", () => {
    expect(generatePlaceId("Cafe Levinsky", "Tel Aviv")).toBe(
      "cafe-levinsky-tel-aviv-q60gj6",
    );
    expect(generatePlaceId("Origem (Cafe)", "Jerusalem")).toBe(
      "origem-cafe-jerusalem-yl9bjq",
    );
    expect(generatePlaceId("The Coffee House", "Haifa")).toBe(
      "the-coffee-house-haifa-2kxgyh",
    );
    expect(generatePlaceId("A", "B")).toBe("a-b-1dbq");
  });

  it("falls back to 'cafe'/'city' when slugs would be empty (e.g. all-Hebrew)", () => {
    const id = generatePlaceId("שטרודל", "תל אביב");
    expect(id).toMatch(/^cafe---[a-z0-9]{1,6}$/);
  });

  it("hash disambiguates places whose slugs would collide", () => {
    // Two different Hebrew-only inputs slug to the same prefix ("cafe---").
    // The hash suffix must differ so URLs stay unique.
    const a = generatePlaceId("שטרודל", "תל אביב");
    const b = generatePlaceId("נוטרי", "ירושלים");
    expect(a).not.toBe(b);
  });

  it("strips Latin punctuation and parens from the name slug", () => {
    expect(generatePlaceId("Origem (Cafe)", "Jerusalem")).toContain(
      "origem-cafe-",
    );
  });

  it("clamps the name slug to 20 chars and the city slug to 15 chars", () => {
    const id = generatePlaceId(
      "abcdefghijklmnopqrstuvwxyz",
      "abcdefghijklmnopqrstuvwxyz",
    );
    const [name, city, hash] = id.split("-");
    expect(name).toHaveLength(20);
    expect(city).toHaveLength(15);
    expect(hash.length).toBeGreaterThan(0);
  });

  it("handles totally empty inputs without throwing", () => {
    expect(() => generatePlaceId("", "")).not.toThrow();
    expect(generatePlaceId("", "")).toBe("cafe-city-19");
  });
});
