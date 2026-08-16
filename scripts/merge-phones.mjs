#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.resolve(__dirname, "../public/data/cafes.json");
const csvPath = path.resolve(process.argv[2] || path.join(__dirname, "phones-report.csv"));

/**
 * Normalise to a real, allocated Israeli number, or "" to reject.
 *
 * Digit-count alone is far too permissive: a first pass accepted things like
 * "02-1768322" (local part starting 1 — impossible here) and "056-…"/"057-…"
 * (prefixes Israel does not allocate), which are usually tracking ids or
 * order numbers scraped out of page markup rather than phone numbers.
 * Toll-free 1-800/1-700 lines are rejected too: they belong to a chain's
 * national support desk, not the branch we're describing.
 */
function norm(raw) {
  let d = String(raw).replace(/[^\d+]/g, "");
  if (d.startsWith("+972")) d = "0" + d.slice(4);
  else if (d.startsWith("972")) d = "0" + d.slice(3);
  d = d.replace(/\D/g, "");
  // Mobile / VoIP: only prefixes actually in use.
  if (/^0(5[02345689]|7[2346789])\d{7}$/.test(d)) return `${d.slice(0, 3)}-${d.slice(3)}`;
  // Landline: area code + 7 digits whose local part starts 2-9.
  if (/^0[23489][2-9]\d{6}$/.test(d)) return `${d.slice(0, 2)}-${d.slice(2)}`;
  return "";
}

/**
 * Landline area codes by city. A Haifa cafe answering on an 02 (Jerusalem)
 * number is someone else's phone — the second-biggest source of wrong data
 * after malformed digit runs, so mismatches are rejected rather than stored.
 * Cities absent from this map are simply not geo-checked.
 */
const AREA = {
  "תל אביב": "03", "תל אביב-יפו": "03", "יפו": "03", "רמת גן": "03", "גבעתיים": "03",
  "ראשון לציון": "03", "בת ים": "03", "חולון": "03", "רמת השרון": "03", "בני ברק": "03",
  "הרצליה": "09", "רעננה": "09", "כפר סבא": "09", "נתניה": "09", "הוד השרון": "09",
  "חיפה": "04", "קריית טבעון": "04", "זיכרון יעקב": "04", "בנימינה": "04",
  "פרדס חנה-כרכור": "04", "עכו": "04", "טבריה": "04", "נהריה": "04", "עתלית": "04", "יקנעם": "04",
  "ירושלים": "02", "באר שבע": "08", "אשדוד": "08", "רחובות": "08", "מודיעין": "08",
  "אשקלון": "08", "נס ציונה": "08", "רמלה": "08", "ערד": "08", "אילת": "08",
};

/** "" when the landline's area code contradicts the cafe's city. */
function geoMismatch(phone, city) {
  const m = phone.match(/^(0[23489])-/);
  if (!m || !AREA[city]) return null;
  return m[1] === AREA[city] ? null : `קידומת ${m[1]} לא תואמת ל${city} (צפוי ${AREA[city]})`;
}

function splitCsvLine(line) {
  const out = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

function parseCsv(text) {
  text = text.replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/).filter((l) => l.length);
  const header = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const row = {};
    header.forEach((h, i) => (row[h] = cells[i] ?? ""));
    return row;
  });
}

function run() {
  if (!fs.existsSync(csvPath)) {
    console.error(`לא נמצא קובץ CSV: ${csvPath}`);
    process.exit(1);
  }
  const rows = parseCsv(fs.readFileSync(csvPath, "utf8"));
  const cafes = JSON.parse(fs.readFileSync(DATA, "utf8"));
  const byId = new Map(cafes.map((c) => [String(c.id), c]));

  let added = 0, updated = 0, skippedEmpty = 0, skippedInvalid = 0, unmatched = 0;
  for (const row of rows) {
    const id = String(row.id ?? "").trim();
    const raw = String(row.phone ?? "").trim();
    if (!id) continue;
    if (!raw) { skippedEmpty++; continue; }
    const phone = norm(raw);
    if (!phone) {
      console.warn(`  ! ${id} (${row.name || "?"}) — לא זוהה כמספר תקין, מדלג: "${raw}"`);
      skippedInvalid++;
      continue;
    }
    const cafe = byId.get(id);
    if (!cafe) { unmatched++; continue; }
    const mismatch = geoMismatch(phone, cafe.city ?? "");
    if (mismatch) {
      console.warn(`  ! ${id} (${cafe.name}) — ${mismatch}, מדלג: "${phone}"`);
      skippedInvalid++;
      continue;
    }
    if (cafe.phone === phone) continue;
    if (cafe.phone) updated++; else added++;
    cafe.phone = phone;
  }

  fs.writeFileSync(DATA, JSON.stringify(cafes, null, 2) + "\n");
  console.log(`\nעודכן public/data/cafes.json:`);
  console.log(`  נוספו: ${added}`);
  console.log(`  עודכנו: ${updated}`);
  console.log(`  דולגו (ריק): ${skippedEmpty}`);
  console.log(`  דולגו (פורמט לא זוהה): ${skippedInvalid}`);
  if (unmatched) console.log(`  id ללא התאמה: ${unmatched}`);
}

run();
