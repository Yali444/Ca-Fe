import { describe, expect, it } from "vitest";
import { getNumericId } from "./numeric-id";

describe("getNumericId", () => {
  it("is deterministic — the same input always produces the same id", () => {
    expect(getNumericId("cafe-1")).toBe(getNumericId("cafe-1"));
    expect(getNumericId("matcha-shtrudel")).toBe(getNumericId("matcha-shtrudel"));
  });

  it("extracts the integer directly from a `cafe-<N>` id", () => {
    expect(getNumericId("cafe-1")).toBe(1);
    expect(getNumericId("cafe-42")).toBe(42);
    expect(getNumericId("cafe-12345")).toBe(12345);
  });

  // Frozen-output snapshots: this is the database contract for the reviews
  // table's cafe_id column. If a test below breaks, every existing review
  // for that place becomes orphaned — bump the algorithm version and write
  // a backfill migration instead of "fixing" the snapshot.
  it("matches the frozen output for non-cafe ids (DB contract)", () => {
    expect(getNumericId("matcha-shtrudel-tlv-abc123")).toBe(1820466);
    expect(getNumericId("origem-cafe-jerusalem-yl9bjq")).toBe(1215316);
    expect(getNumericId("")).toBe(1000000);
    expect(getNumericId("x")).toBe(1000120);
  });

  it("keeps non-cafe ids out of the cafe-N integer range", () => {
    // The offset of 1_000_000 means any non-cafe id is >= 1_000_000, so it
    // cannot collide with a real cafe-<N> row.
    expect(getNumericId("matcha-anything")).toBeGreaterThanOrEqual(1000000);
    expect(getNumericId("anything-at-all")).toBeGreaterThanOrEqual(1000000);
  });

  it("always returns a non-negative integer", () => {
    for (const id of ["", "a", "long-string-with-many-chars", "שטרודל"]) {
      const n = getNumericId(id);
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(0);
    }
  });

  it("treats different non-cafe ids as different numeric ids", () => {
    const a = getNumericId("matcha-shtrudel-tlv-abc123");
    const b = getNumericId("origem-cafe-jerusalem-yl9bjq");
    expect(a).not.toBe(b);
  });
});
