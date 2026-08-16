#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.resolve(__dirname, "../public/data/cafes.json");
const OUT_JSON = path.resolve(__dirname, "phones-found.json");
const OUT_CSV = path.resolve(__dirname, "phones-report.csv");

const CONCURRENCY = 6;
const TIMEOUT_MS = 9000;
const OVERPASS = "https://overpass-api.de/api/interpreter";

function extractPhones(text, { linkedOnly = false } = {}) {
  if (!text) return [];
  const out = new Set();
  for (const m of text.matchAll(/tel:\+?([\d\-\s().]{7,})/gi)) out.add(norm(m[1]));
  if (!linkedOnly) {
    const re = /(?:\+972[-\s.]?|0)(?:5\d|7\d|[2-489])(?:[-\s.]?\d){7}\b/g;
    for (const m of text.matchAll(re)) out.add(norm(m[0]));
  }
  return [...out].filter(Boolean);
}

/**
 * Normalise to a real, allocated Israeli number, or "" to reject. Kept in sync
 * with merge-phones.mjs. Digit-count alone let through tracking ids and order
 * numbers that merely look phone-shaped ("02-1768322", "056-…"); toll-free
 * 1-800/1-700 lines are rejected because they reach a chain's national desk
 * rather than the branch.
 */
function norm(raw) {
  let d = String(raw).replace(/[^\d+]/g, "");
  if (d.startsWith("+972")) d = "0" + d.slice(4);
  else if (d.startsWith("972")) d = "0" + d.slice(3);
  d = d.replace(/\D/g, "");
  if (/^0(5[02345689]|7[2346789])\d{7}$/.test(d)) return `${d.slice(0,3)}-${d.slice(3)}`;
  if (/^0[23489][2-9]\d{6}$/.test(d)) return `${d.slice(0,2)}-${d.slice(2)}`;
  return "";
}

async function fetchText(url) {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "User-Agent": "Ca-Fe-phone-bot/1.0 (contact: yalioz77@gmail.com)" },
      redirect: "follow",
    });
    if (!res.ok) return "";
    return await res.text();
  } catch {
    return "";
  }
}

async function fromWebsite(site) {
  if (!site) return null;
  const base = site.replace(/\/+$/, "");
  for (const u of [base, `${base}/contact`, `${base}/צור-קשר`, `${base}/about`]) {
    const html = await fetchText(u);
    if (!html) continue;
    // Prefer a tel: link — it is markup the site author wrote *as* a phone
    // number, unlike a bare digit run in body text, which is as likely to be an
    // order id or tracking code (the original source of several wrong numbers).
    const linked = extractPhones(html, { linkedOnly: true });
    if (linked.length) return { phone: linked[0], source: `website:${u}`, all: linked };
    const loose = extractPhones(html);
    // Only trust loose body text when the page agrees with itself.
    if (loose.length === 1) return { phone: loose[0], source: `website:${u}`, all: loose };
  }
  return null;
}

/**
 * OSM fallback. Restricted to cafe/restaurant/bar nodes within 60 m *whose name
 * resembles the cafe we're looking for* — an unfiltered radius query happily
 * returns the dentist next door, which is how wrong numbers got attributed the
 * first time round.
 */
async function fromOverpass(lat, lng, name) {
  if (lat == null || lng == null || !name) return null;
  const q = `[out:json][timeout:25];(` +
    `nwr(around:60,${lat},${lng})[amenity~"^(cafe|restaurant|bar|fast_food)$"];` +
    `);out center 20;`;
  try {
    const res = await fetch(OVERPASS, {
      method: "POST", body: q, signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) return null;
    const j = await res.json();
    for (const el of j.elements ?? []) {
      const p = norm(el.tags?.phone || el.tags?.["contact:phone"] || "");
      if (!p) continue;
      const osmName = `${el.tags?.name ?? ""} ${el.tags?.["name:he"] ?? ""} ${el.tags?.["name:en"] ?? ""}`;
      if (!namesMatch(name, osmName)) continue;
      return { phone: p, source: "openstreetmap" };
    }
  } catch { /* ignore */ }
  return null;
}

/** Loose name agreement — enough to reject a neighbouring business. */
function namesMatch(a, b) {
  const clean = (s) => s.toLowerCase().replace(/["'`׳״()]/g, "").replace(/\s+/g, " ").trim();
  const A = clean(a), B = clean(b);
  if (!A || !B) return false;
  if (B.includes(A) || A.includes(B)) return true;
  // Any shared word of 3+ chars (handles "רוסטרס (מודיעין)" vs "רוסטרס").
  const wordsA = new Set(A.split(" ").filter((w) => w.length >= 3));
  return B.split(" ").some((w) => w.length >= 3 && wordsA.has(w));
}

const mapsLink = (x) => x.google_place_id
  ? `https://www.google.com/maps/place/?q=place_id:${x.google_place_id}`
  : (x.coordinates?.lat ? `https://www.google.com/maps?q=${x.coordinates.lat},${x.coordinates.lng}` : "");

async function run() {
  const cafes = JSON.parse(fs.readFileSync(DATA, "utf8"));
  const found = {};
  const report = [];

  let i = 0;
  async function worker() {
    while (i < cafes.length) {
      const x = cafes[i++];
      const hit = (await fromWebsite(x.website))
        || (await fromOverpass(x.coordinates?.lat, x.coordinates?.lng, x.name));
      if (hit) found[String(x.id)] = { phone: hit.phone, source: hit.source };
      report.push({
        id: String(x.id), name: x.name || "", city: x.city || "", website: x.website || "",
        maps: mapsLink(x), phone: hit?.phone || "", source: hit?.source || "",
        status: hit ? "found" : "MISSING",
      });
      process.stderr.write(`\r${report.length}/${cafes.length} scanned`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  process.stderr.write("\n");

  fs.writeFileSync(OUT_JSON, JSON.stringify(found, null, 2));
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["id","name","city","website","google_maps","phone","source","status"];
  const csv = ["\uFEFF" + head.join(",")];
  report.sort((a,b)=> (a.status>b.status?1:a.status<b.status?-1:0) || a.city.localeCompare(b.city,"he"));
  for (const r of report) csv.push([r.id,r.name,r.city,r.website,r.maps,r.phone,r.source,r.status].map(esc).join(","));
  fs.writeFileSync(OUT_CSV, csv.join("\n"));

  const got = Object.keys(found).length;
  console.log(`\nDone: ${got}/${cafes.length} phones found. Review ${path.basename(OUT_CSV)} before merging.`);
}

run();
