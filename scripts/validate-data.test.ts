import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * The validator guards the dataset, so these check that it actually fails on
 * the defect shapes that reached production — a validator that passes
 * everything is worse than none, because CI would vouch for broken data.
 *
 * Each case copies the repo into a temp dir, corrupts one record, and asserts
 * the exit status.
 */
const ROOT = path.resolve(__dirname, "..");

function runOn(mutate: (cafes: Record<string, unknown>[]) => void) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cafe-validate-"));
  try {
    fs.mkdirSync(path.join(dir, "scripts"), { recursive: true });
    fs.mkdirSync(path.join(dir, "public/data"), { recursive: true });
    fs.cpSync(path.join(ROOT, "public/images"), path.join(dir, "public/images"), {
      recursive: true,
    });
    fs.copyFileSync(
      path.join(ROOT, "scripts/validate-data.mjs"),
      path.join(dir, "scripts/validate-data.mjs"),
    );

    const cafes = JSON.parse(
      fs.readFileSync(path.join(ROOT, "public/data/cafes.json"), "utf8"),
    );
    mutate(cafes);
    fs.writeFileSync(path.join(dir, "public/data/cafes.json"), JSON.stringify(cafes));

    // Warnings go to stderr and errors to stdout+stderr, so both streams are
    // needed on success as well as failure.
    const r = spawnSync("node", [path.join(dir, "scripts/validate-data.mjs")], {
      encoding: "utf8",
    });
    return { code: r.status, out: `${r.stdout}${r.stderr}` };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

describe("validate-data", () => {
  it("passes on the committed dataset", () => {
    expect(runOn(() => {}).code).toBe(0);
  });

  it("fails on a duplicate google_place_id", () => {
    const r = runOn((c) => {
      const withId = c.filter((x) => x.google_place_id);
      withId[1].google_place_id = withId[0].google_place_id;
    });
    expect(r.code).toBe(1);
    expect(r.out).toContain("כפול");
  });

  it("fails on an opening-hours range that is not times", () => {
    const r = runOn((c) => {
      c[0].openingHours = { sunday: "0800 to 1600" };
    });
    expect(r.code).toBe(1);
    expect(r.out).toContain("לא נפרסות");
  });

  it("fails on an invalid phone number", () => {
    const r = runOn((c) => {
      c[0].phone = "02-1768322"; // local part starting 1 — impossible in IL
    });
    expect(r.code).toBe(1);
    expect(r.out).toContain("טלפון לא תקין");
  });

  it("fails when a landline's area code contradicts the city", () => {
    const r = runOn((c) => {
      const tlv = c.find((x) => x.city === "תל אביב")!;
      tlv.phone = "04-6543210"; // Haifa area code on a Tel Aviv cafe
    });
    expect(r.code).toBe(1);
    expect(r.out).toContain("לא תואמת");
  });

  it("fails on coordinates outside Israel", () => {
    const r = runOn((c) => {
      c[0].coordinates = { lat: 48.85, lng: 2.35 };
    });
    expect(r.code).toBe(1);
    expect(r.out).toContain("מחוץ לישראל");
  });

  it("fails on a heroImage that is not on disk", () => {
    const r = runOn((c) => {
      c[0].heroImage = "/images/does-not-exist.avif";
    });
    expect(r.code).toBe(1);
    expect(r.out).toContain("לא קיים בדיסק");
  });

  it("tolerates Hebrew prose hours as a warning, not an error", () => {
    const r = runOn((c) => {
      c[0].openingHours = { friday: "06:30-ערב שבת" };
    });
    expect(r.code).toBe(0);
    expect(r.out).toContain("לא ניתנות לפענוח מכונה");
  });

  it("accepts a split day with two valid windows", () => {
    const r = runOn((c) => {
      c[0].openingHours = { thursday: "08:00-16:00, 19:00-23:00" };
    });
    expect(r.code).toBe(0);
  });
});
