#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.resolve(__dirname, "../public/data/cafes.json");
const csvPath = path.resolve(process.argv[2] || path.join(__dirname, "phones-report.csv"));

function norm(raw) {
  let d = String(raw).replace(/[^\d+]/g, "");
  if (d.startsWith("+972")) d = "0" + d.slice(4);
  else if (d.startsWith("972")) d = "0" + d.slice(3);
  d = d.replace(/\D/g, "");
  if (/^1[78]00\d{6}$/.test(d)) return `${d.slice(0, 4)}-${d.slice(4, 7)}-${d.slice(7)}`;
  if (/^0(5|7)\d{8}$/.test(d)) return `${d.slice(0, 3)}-${d.slice(3)}`;
  if (/^0[2-489]\d{7}$/.test(d)) return `${d.slice(0, 2)}-${d.slice(2)}`;
  return "";
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
