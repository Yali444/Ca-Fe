#!/usr/bin/env node
/**
 * validate-data.mjs — structural checks over public/data/cafes.json.
 *
 * The test suite covers code; this covers the dataset the code reads. Two
 * production defects motivated it, and both would have been caught here:
 * opening-hours values that don't parse to real times (published as invalid
 * `opens`/`closes` in JSON-LD), and auto-harvested phone numbers that were
 * tracking ids or a neighbouring business's line.
 *
 * Exits non-zero on any ERROR, so CI blocks the merge. WARN entries are
 * reported but do not fail the build — they flag data worth a human look
 * (an ambiguous Google match) rather than something provably broken.
 *
 *   node scripts/validate-data.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA = path.join(ROOT, "public/data/cafes.json");

const errors = [];
const warnings = [];
const err = (id, name, msg) => errors.push(`${id} (${name}): ${msg}`);
const warn = (id, name, msg) => warnings.push(`${id} (${name}): ${msg}`);

/** Matches the parser in src/lib/structured-data.ts. */
const TIME = /^([01]?\d|2[0-4]):[0-5]\d$/;
/** Matches the gate in scripts/merge-phones.mjs. */
const PHONE =
  /^0(5[02345689]|7[2346789])-\d{7}$|^0[23489]-[2-9]\d{6}$/;

/** Landline area codes by city — a mismatch means someone else's phone. */
const AREA = {
  "תל אביב": "03", "תל אביב-יפו": "03", "יפו": "03", "רמת גן": "03", "גבעתיים": "03",
  "ראשון לציון": "03", "בת ים": "03", "חולון": "03", "רמת השרון": "03", "בני ברק": "03",
  "הרצליה": "09", "רעננה": "09", "כפר סבא": "09", "נתניה": "09", "הוד השרון": "09",
  "חיפה": "04", "קריית טבעון": "04", "זיכרון יעקב": "04", "בנימינה": "04",
  "פרדס חנה-כרכור": "04", "עכו": "04", "טבריה": "04", "נהריה": "04", "עתלית": "04", "יקנעם": "04",
  "ירושלים": "02", "באר שבע": "08", "אשדוד": "08", "רחובות": "08", "מודיעין": "08",
  "אשקלון": "08", "נס ציונה": "08", "רמלה": "08", "ערד": "08", "אילת": "08",
};

/** Rough bounding box of Israel. */
const BBOX = { minLat: 29.4, maxLat: 33.4, minLng: 34.2, maxLng: 35.9 };

const isHebrew = (s) => /[֐-׿]/.test(s) && !/[a-zA-Z]/.test(s);
const stripMarks = (s) =>
  (s ?? "")
    // Combining niqqud/te'amim — "בּר" and "בר" are the same name.
    .replace(/[֑-ׇ]/g, "")
    .replace(/["'`׳״()\[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim();

function run() {
  const cafes = JSON.parse(fs.readFileSync(DATA, "utf8"));
  const placeIds = new Map();

  for (const c of cafes) {
    const id = String(c.id);
    const name = c.name ?? "?";

    if (!c.name) err(id, name, "חסר שם");
    if (!c.city) err(id, name, "חסרה עיר");

    // --- coordinates -------------------------------------------------
    const k = c.coordinates;
    if (!k || typeof k.lat !== "number" || typeof k.lng !== "number") {
      err(id, name, "קואורדינטות חסרות או לא מספריות");
    } else if (
      k.lat < BBOX.minLat || k.lat > BBOX.maxLat ||
      k.lng < BBOX.minLng || k.lng > BBOX.maxLng
    ) {
      err(id, name, `קואורדינטות מחוץ לישראל (${k.lat}, ${k.lng})`);
    }

    // --- hero image --------------------------------------------------
    if (c.heroImage && !fs.existsSync(path.join(ROOT, "public", c.heroImage))) {
      err(id, name, `heroImage לא קיים בדיסק: ${c.heroImage}`);
    }

    // --- opening hours -----------------------------------------------
    // Free-text values ("בתיאום מראש בלבד") are legitimate and skipped by the
    // JSON-LD builder; only an *object* promising per-day ranges is checked.
    if (c.openingHours && typeof c.openingHours === "object") {
      for (const [day, value] of Object.entries(c.openingHours)) {
        if (typeof value !== "string" || !value.trim()) continue;
        if (value.trim() === "סגור") continue; // explicit closed marker
        const windows = value.split(",");
        const anyValid = windows.some((w) => {
          const [o, cl, ...rest] = w.split("-").map((s) => s.trim());
          return !rest.length && TIME.test(o ?? "") && TIME.test(cl ?? "");
        });
        if (!anyValid) {
          // Hebrew prose ("06:30-ערב שבת", "מוצ״ש-24:00") is deliberate: the UI
          // shows it verbatim and both parsers skip it. Anything else that
          // fails to parse is a malformed range — a typo worth blocking.
          if (/[֐-׿]/.test(value)) {
            warn(id, name, `שעות ${day} לא ניתנות לפענוח מכונה (יוצג כטקסט, יושמט מ-JSON-LD): "${value}"`);
          } else {
            err(id, name, `שעות ${day} לא נפרסות לזמן תקין: "${value}"`);
          }
        }
      }
    }

    // --- phone --------------------------------------------------------
    if (c.phone) {
      if (!PHONE.test(c.phone)) {
        err(id, name, `טלפון לא תקין: ${c.phone}`);
      } else {
        const m = c.phone.match(/^(0[23489])-/);
        if (m && AREA[c.city] && m[1] !== AREA[c.city]) {
          err(id, name, `קידומת ${m[1]} לא תואמת ל${c.city} (צפוי ${AREA[c.city]})`);
        }
      }
    }

    // --- google place id ---------------------------------------------
    if (c.google_place_id) {
      const prev = placeIds.get(c.google_place_id);
      if (prev) {
        err(id, name, `google_place_id כפול עם ${prev} — שני עמודים יוצהרו כאותה ישות`);
      } else {
        placeIds.set(c.google_place_id, `${id} (${name})`);
      }

      // A Hebrew name that disagrees with Google's Hebrew name can't be
      // explained by transliteration, so it points at a bad match.
      const a = stripMarks(c.name);
      const b = stripMarks(c.google_name);
      if (b && isHebrew(a) && isHebrew(b) && !a.includes(b) && !b.includes(a)) {
        const wordsA = new Set(a.split(" ").filter((w) => w.length >= 3 && w !== "קפה"));
        const shared = b.split(" ").some((w) => w.length >= 3 && w !== "קפה" && wordsA.has(w));
        if (!shared) warn(id, name, `google_name שונה מהותית: "${c.google_name}" — לאמת שה-place_id נכון`);
      }
    }
  }

  for (const w of warnings) console.warn(`  ⚠ ${w}`);
  for (const e of errors) console.error(`  ✗ ${e}`);

  const n = cafes.length;
  if (errors.length) {
    console.error(`\nולידציית דאטה נכשלה: ${errors.length} שגיאות, ${warnings.length} אזהרות (${n} רשומות).`);
    process.exit(1);
  }
  console.log(
    `ולידציית דאטה עברה: ${n} רשומות, 0 שגיאות` +
      (warnings.length ? `, ${warnings.length} אזהרות` : ""),
  );
}

run();
