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

function extractPhones(text) {
  if (!text) return [];
  const out = new Set();
  for (const m of text.matchAll(/tel:\+?([\d\-\s().]{7,})/gi)) out.add(norm(m[1]));
  const re = /(?:\+972[-\s.]?|0)(?:5\d|7\d|[2-489])(?:[-\s.]?\d){7}\b|1[-\s.]?[78]00[-\s.]?\d{3}[-\s.]?\d{3}/g;
  for (const m of text.matchAll(re)) out.add(norm(m[0]));
  return [...out].filter(Boolean);
}

function norm(raw) {
  let d = String(raw).replace(/[^\d+]/g, "");
  if (d.startsWith("+972")) d = "0" + d.slice(4);
  else if (d.startsWith("972")) d = "0" + d.slice(3);
  d = d.replace(/\D/g, "");
  if (/^1[78]00\d{6}$/.test(d)) return `${d.slice(0,4)}-${d.slice(4,7)}-${d.slice(7)}`;
  if (/^0(5|7)\d{8}$/.test(d)) return `${d.slice(0,3)}-${d.slice(3)}`;
  if (/^0[2-489]\d{7}$/.test(d)) return `${d.slice(0,2)}-${d.slice(2)}`;
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
    const phones = extractPhones(await fetchText(u));
    if (phones.length) return { phone: phones[0], source: `website:${u}`, all: phones };
  }
  return null;
}

async function fromOverpass(lat, lng) {
  if (lat == null || lng == null) return null;
  const q = `[out:json][timeout:25];(` +
    `node(around:130,${lat},${lng})[phone];node(around:130,${lat},${lng})["contact:phone"];` +
    `);out center 8;`;
  try {
    const res = await fetch(OVERPASS, {
      method: "POST", body: q, signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) return null;
    const j = await res.json();
    for (const el of j.elements ?? []) {
      const p = norm(el.tags?.phone || el.tags?.["contact:phone"] || "");
      if (p) return { phone: p, source: "openstreetmap" };
    }
  } catch { /* ignore */ }
  return null;
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
      const hit = (await fromWebsite(x.website)) || (await fromOverpass(x.coordinates?.lat, x.coordinates?.lng));
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
