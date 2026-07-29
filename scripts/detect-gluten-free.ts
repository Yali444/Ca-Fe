/**
 * Look for evidence that a Tel Aviv cafe serves gluten-free food, from the
 * three sources we can read without asking anyone: the cafe's own website, its
 * Wolt menu, and the reviews Google exposes for its Place ID.
 *
 * This script deliberately does NOT write to cafes.json. It produces a
 * candidates file with the quoted text behind every hit, for a human to accept
 * or reject before anything reaches the site — "a review mentioned gluten" is
 * not the same claim as "this cafe serves gluten-free food", and someone with
 * celiac disease is going to act on whatever we publish.
 *
 * Coverage is inherently partial: only ~36 of the 92 Tel Aviv cafes have a
 * website at all, and the Places API returns at most 5 reviews per place.
 * Expect hits for a minority of cafes; silence here means "no evidence found",
 * never "no gluten-free food".
 *
 *   npx tsx scripts/detect-gluten-free.ts
 *   npx tsx scripts/detect-gluten-free.ts --limit 5    # smoke test
 *   npx tsx scripts/detect-gluten-free.ts --skip-google --skip-websites   # Wolt only
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  findGlutenFreeEvidence,
  guessGlutenFreeItems,
  htmlToText,
  parseGlutenFreeItems,
  GLUTEN_FREE_ITEMS,
  type GlutenFreeMatch,
} from '../src/lib/gluten-free';
import { calculateDistance } from '../src/lib/geo';

// Load .env.local by hand — same approach as the geocode scripts, which run
// outside Next's env loading.
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const equalIndex = trimmed.indexOf('=');
    if (equalIndex > 0) {
      process.env[trimmed.slice(0, equalIndex).trim()] = trimmed.slice(equalIndex + 1).trim();
    }
  }
}

const CAFES_PATH = path.join(__dirname, '../public/data/cafes.json');
const OUTPUT_PATH = path.join(__dirname, 'gluten-free-candidates.json');

/** The dataset spells Tel Aviv three ways; all of them are in scope. */
const TEL_AVIV_CITIES = new Set(['תל אביב', 'תל אביב-יפו', 'יפו']);

const API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

/** Be a polite client: one request at a time, with a gap between them. */
const REQUEST_DELAY_MS = 250;
const FETCH_TIMEOUT_MS = 15_000;

type EvidenceSource = 'website' | 'google_reviews' | 'wolt';

interface RawCafe {
  id: number | string;
  name: string;
  city?: string;
  website?: string;
  google_place_id?: string;
  coordinates?: { lat?: number; lng?: number };
  glutenFree?: boolean;
}

interface Candidate {
  id: string;
  name: string;
  city: string;
  /** Left null for a human to fill in — this script never decides. */
  glutenFree: boolean | null;
  /**
   * Pre-filled from words near the hit, as a starting point only. "Has
   * gluten-free options" is not a useful claim on its own — a salad qualifies
   * — so this is what actually needs to be right before publishing.
   */
  glutenFreeItems: string[];
  sources: EvidenceSource[];
  evidence: { source: EvidenceSource; term: string; snippet: string }[];
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * A fetch that reports *why* it produced nothing.
 *
 * The distinction matters more than it looks: if an unreachable site is
 * reported the same way as a site with no gluten mentions, the run silently
 * looks complete while having checked nothing. Restrictive networks (or a
 * cafe that blocks bots) would then read as "no cafe in Tel Aviv serves
 * gluten-free food".
 */
type FetchOutcome =
  | { ok: true; text: string }
  | { ok: false; reason: string };

async function fetchText(url: string): Promise<FetchOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Ca-Fe gluten-free survey (+https://github.com/yali444/ca-fe)' },
    });
    if (!response.ok) return { ok: false, reason: `HTTP ${response.status}` };
    return { ok: true, text: await response.text() };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, reason: message.includes('abort') ? 'timeout' : message };
  } finally {
    clearTimeout(timer);
  }
}

/** Either the matches found, or the reason this source couldn't be read. */
type ScanResult =
  | { checked: true; matches: GlutenFreeMatch[] }
  | { checked: false; reason: string };

/** Nothing to check is not the same as a failure — treat it as a clean pass. */
const NOT_APPLICABLE: ScanResult = { checked: true, matches: [] };

async function scanWebsite(cafe: RawCafe): Promise<ScanResult> {
  if (!cafe.website?.trim()) return NOT_APPLICABLE;
  const outcome = await fetchText(cafe.website.trim());
  if (!outcome.ok) return { checked: false, reason: outcome.reason };
  return { checked: true, matches: findGlutenFreeEvidence(htmlToText(outcome.text)) };
}

async function scanGoogleReviews(cafe: RawCafe): Promise<ScanResult> {
  if (!cafe.google_place_id || !API_KEY) return NOT_APPLICABLE;

  const url =
    'https://maps.googleapis.com/maps/api/place/details/json' +
    `?place_id=${encodeURIComponent(cafe.google_place_id)}` +
    '&fields=reviews' +
    '&language=he' +
    `&key=${API_KEY}`;

  const outcome = await fetchText(url);
  if (!outcome.ok) return { checked: false, reason: outcome.reason };

  let payload: { status?: string; result?: { reviews?: { text?: string }[] } };
  try {
    payload = JSON.parse(outcome.text);
  } catch {
    return { checked: false, reason: 'unparseable JSON' };
  }

  // ZERO_RESULTS is a real answer; anything else non-OK means we didn't get to
  // look (bad key, quota, Places API not enabled on the project).
  if (payload.status && payload.status !== 'OK' && payload.status !== 'ZERO_RESULTS') {
    return { checked: false, reason: `Places API ${payload.status}` };
  }

  const reviews = payload.result?.reviews ?? [];
  return {
    checked: true,
    matches: reviews.flatMap((review) => findGlutenFreeEvidence(review.text ?? '')),
  };
}

// --- Wolt ---
//
// Wolt turned out to be the strongest signal available: a cafe that offers
// gluten-free food often says so in its own menu, sometimes as a whole
// category ("ללא גלוטן 🌽" on Edmund's). That's the cafe's own claim plus an
// itemised list, which is exactly what the categories field needs.
//
// These two URLs are the only Wolt-specific knowledge here, and they are
// UNVERIFIED — the sandbox this was written in has no outbound network, so
// nothing below has been run against the real API. If the first run 404s,
// open a cafe's Wolt page in a browser, check the network tab, and fix these
// two constants; everything else walks the JSON generically and should
// survive a shape change.
const WOLT_SEARCH_URL = (query: string, lat: number, lon: number) =>
  `https://restaurant-api.wolt.com/v1/pages/search?q=${encodeURIComponent(query)}&lat=${lat}&lon=${lon}`;
const WOLT_MENU_URL = (slug: string) =>
  `https://restaurant-api.wolt.com/v4/venues/slug/${encodeURIComponent(slug)}/menu`;

/** Resolved slugs are cached so re-runs don't re-search. `null` = searched, no match. */
const WOLT_SLUGS_PATH = path.join(__dirname, 'wolt-slugs.json');

/** How close a search hit must be to our coordinates to be the same place. */
const WOLT_MATCH_RADIUS_KM = 0.3;

type WoltSlugCache = Record<string, string | null>;

function loadWoltSlugs(): WoltSlugCache {
  if (!fs.existsSync(WOLT_SLUGS_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(WOLT_SLUGS_PATH, 'utf-8')) as WoltSlugCache;
  } catch {
    return {};
  }
}

function saveWoltSlugs(cache: WoltSlugCache): void {
  const ordered = Object.fromEntries(Object.entries(cache).sort(([a], [b]) => Number(a) - Number(b)));
  fs.writeFileSync(WOLT_SLUGS_PATH, `${JSON.stringify(ordered, null, 2)}\n`, 'utf-8');
}

interface WoltVenueHit {
  slug: string;
  name: string;
  lat?: number;
  lon?: number;
}

/**
 * Pull every venue-shaped object out of a search response, wherever it sits.
 *
 * Deliberately structure-agnostic: Wolt nests venues differently across
 * endpoint versions, and a hard-coded path silently yields zero results when
 * it changes — indistinguishable from "this cafe isn't on Wolt".
 */
function collectVenueHits(node: unknown, found: WoltVenueHit[] = []): WoltVenueHit[] {
  if (Array.isArray(node)) {
    for (const child of node) collectVenueHits(child, found);
    return found;
  }
  if (!node || typeof node !== 'object') return found;

  const record = node as Record<string, unknown>;
  if (typeof record.slug === 'string' && typeof record.name === 'string') {
    // Wolt reports GeoJSON order: [longitude, latitude].
    const coords = (record.location as { coordinates?: unknown } | undefined)?.coordinates;
    const pair = Array.isArray(coords) && coords.length === 2 ? coords : undefined;
    found.push({
      slug: record.slug,
      name: record.name,
      lon: typeof pair?.[0] === 'number' ? (pair[0] as number) : undefined,
      lat: typeof pair?.[1] === 'number' ? (pair[1] as number) : undefined,
    });
  }
  for (const value of Object.values(record)) collectVenueHits(value, found);
  return found;
}

/** Join every human-readable string in a menu payload into one searchable blob. */
function collectMenuText(node: unknown, parts: string[] = []): string[] {
  if (Array.isArray(node)) {
    for (const child of node) collectMenuText(child, parts);
    return parts;
  }
  if (!node || typeof node !== 'object') return parts;

  const record = node as Record<string, unknown>;
  for (const key of ['name', 'title', 'description', 'desc']) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) parts.push(value.trim());
  }
  for (const value of Object.values(record)) collectMenuText(value, parts);
  return parts;
}

async function fetchJson(url: string): Promise<{ ok: true; data: unknown } | { ok: false; reason: string }> {
  const outcome = await fetchText(url);
  if (!outcome.ok) return { ok: false, reason: outcome.reason };
  try {
    return { ok: true, data: JSON.parse(outcome.text) };
  } catch {
    return { ok: false, reason: 'unparseable JSON' };
  }
}

async function resolveWoltSlug(
  cafe: RawCafe,
  cache: WoltSlugCache,
): Promise<{ ok: true; slug: string | null } | { ok: false; reason: string }> {
  const key = String(cafe.id);
  if (key in cache) return { ok: true, slug: cache[key] };

  const lat = cafe.coordinates?.lat;
  const lon = cafe.coordinates?.lng;
  if (typeof lat !== 'number' || typeof lon !== 'number') {
    return { ok: true, slug: null };
  }

  const response = await fetchJson(WOLT_SEARCH_URL(cafe.name, lat, lon));
  if (!response.ok) return { ok: false, reason: response.reason };

  // Coordinates disambiguate far better than names do: the dataset has three
  // "מלה" and three "מתחת לעץ" branches whose names are identical.
  const hits = collectVenueHits(response.data);
  const nearest = hits
    .filter((hit) => typeof hit.lat === 'number' && typeof hit.lon === 'number')
    .map((hit) => ({ hit, km: calculateDistance(lat, lon, hit.lat!, hit.lon!) }))
    .sort((a, b) => a.km - b.km)[0];

  const slug = nearest && nearest.km <= WOLT_MATCH_RADIUS_KM ? nearest.hit.slug : null;
  cache[key] = slug;
  return { ok: true, slug };
}

async function scanWolt(cafe: RawCafe, cache: WoltSlugCache): Promise<ScanResult> {
  const resolved = await resolveWoltSlug(cafe, cache);
  if (!resolved.ok) return { checked: false, reason: `wolt search: ${resolved.reason}` };
  if (!resolved.slug) return NOT_APPLICABLE; // not on Wolt — a real answer

  await sleep(REQUEST_DELAY_MS);
  const menu = await fetchJson(WOLT_MENU_URL(resolved.slug));
  if (!menu.ok) return { checked: false, reason: `wolt menu: ${menu.reason}` };

  const text = collectMenuText(menu.data).join(' · ');
  return { checked: true, matches: findGlutenFreeEvidence(text) };
}

async function main() {
  const args = process.argv.slice(2);
  const skipGoogle = args.includes('--skip-google');
  const skipWebsites = args.includes('--skip-websites');
  const skipWolt = args.includes('--skip-wolt');
  const force = args.includes('--force');
  const outputIndex = args.indexOf('--output');
  const outputPath = outputIndex !== -1 ? path.resolve(args[outputIndex + 1]) : OUTPUT_PATH;
  const limitIndex = args.indexOf('--limit');
  const limit = limitIndex !== -1 ? Number(args[limitIndex + 1]) : Infinity;

  const all: RawCafe[] = JSON.parse(fs.readFileSync(CAFES_PATH, 'utf-8'));
  const telAviv = all
    .filter((cafe) => TEL_AVIV_CITIES.has((cafe.city ?? '').trim()))
    .slice(0, limit);

  console.log('=== Gluten-free evidence scan (Tel Aviv) ===\n');
  console.log(`Cafes in scope:        ${telAviv.length}`);
  console.log(`With a website:        ${telAviv.filter((c) => c.website?.trim()).length}`);
  console.log(`With a Google Place ID:${telAviv.filter((c) => c.google_place_id).length}`);
  if (!API_KEY && !skipGoogle) {
    console.log('\n⚠️  GOOGLE_MAPS_API_KEY is not set — skipping the reviews source.');
  }
  console.log('');

  const candidates: Candidate[] = [];
  const unreachable: { name: string; source: EvidenceSource; reason: string }[] = [];
  const woltSlugs = loadWoltSlugs();

  for (const [index, cafe] of telAviv.entries()) {
    process.stdout.write(`[${index + 1}/${telAviv.length}] ${cafe.name} … `);

    const evidence: Candidate['evidence'] = [];
    const failures: string[] = [];

    if (!skipWebsites) {
      const result = await scanWebsite(cafe);
      if (result.checked) {
        evidence.push(...result.matches.map((match) => ({ source: 'website' as const, ...match })));
      } else {
        failures.push(`website: ${result.reason}`);
        unreachable.push({ name: cafe.name, source: 'website', reason: result.reason });
      }
      await sleep(REQUEST_DELAY_MS);
    }

    if (!skipWolt) {
      const result = await scanWolt(cafe, woltSlugs);
      if (result.checked) {
        evidence.push(...result.matches.map((match) => ({ source: 'wolt' as const, ...match })));
      } else {
        failures.push(result.reason);
        unreachable.push({ name: cafe.name, source: 'wolt', reason: result.reason });
      }
      await sleep(REQUEST_DELAY_MS);
    }

    if (!skipGoogle && API_KEY) {
      const result = await scanGoogleReviews(cafe);
      if (result.checked) {
        evidence.push(
          ...result.matches.map((match) => ({ source: 'google_reviews' as const, ...match })),
        );
      } else {
        failures.push(`reviews: ${result.reason}`);
        unreachable.push({ name: cafe.name, source: 'google_reviews', reason: result.reason });
      }
      await sleep(REQUEST_DELAY_MS);
    }

    if (evidence.length === 0) {
      console.log(failures.length > 0 ? `⚠️  not checked (${failures.join('; ')})` : 'no evidence');
      continue;
    }

    const sources = [...new Set(evidence.map((item) => item.source))];
    const guessedItems = parseGlutenFreeItems(
      evidence.flatMap((item) => guessGlutenFreeItems(item.snippet)),
    );
    console.log(
      `✅ ${evidence.length} mention(s) from ${sources.join(' + ')}` +
        (guessedItems.length > 0 ? ` — maybe: ${guessedItems.join(', ')}` : ''),
    );
    candidates.push({
      id: String(cafe.id),
      name: cafe.name,
      city: (cafe.city ?? '').trim(),
      glutenFree: null,
      glutenFreeItems: guessedItems,
      sources,
      evidence,
    });
  }

  // Refuse to clobber reviewed work. Once a human has set `glutenFree` on any
  // entry, this file holds decisions that a fresh scan cannot reproduce —
  // and a `--limit 2` smoke run would otherwise wipe the lot.
  if (fs.existsSync(outputPath) && !force) {
    let decided = 0;
    try {
      const existing = JSON.parse(fs.readFileSync(outputPath, 'utf-8')) as Candidate[];
      decided = existing.filter((entry) => entry.glutenFree !== null).length;
    } catch {
      // Unreadable file — nothing worth protecting.
    }
    if (decided > 0) {
      console.log(`\n⛔ ${outputPath}`);
      console.log(`   already holds ${decided} reviewed decision(s) — not overwriting.`);
      console.log('   Apply them first, or re-run with --output <path> (or --force).');
      return;
    }
  }

  fs.writeFileSync(outputPath, `${JSON.stringify(candidates, null, 2)}\n`, 'utf-8');
  if (!skipWolt) saveWoltSlugs(woltSlugs);

  console.log('\n=== Done ===');
  console.log(`Cafes with evidence: ${candidates.length} / ${telAviv.length}`);
  console.log(`Written to: ${outputPath}`);

  if (!skipWolt) {
    const matched = Object.values(woltSlugs).filter(Boolean).length;
    console.log(`Wolt venues matched: ${matched} / ${Object.keys(woltSlugs).length} looked up`);
    if (matched === 0 && Object.keys(woltSlugs).length > 0) {
      // Zero matches across the board is far more likely to be a changed API
      // than every cafe in Tel Aviv being absent from Wolt.
      console.log('   ⚠️  No venue matched at all — check WOLT_SEARCH_URL near the top of this file.');
    }
  }

  if (unreachable.length > 0) {
    // Loud on purpose. A run where every source failed produces the same empty
    // candidates file as a run that genuinely found nothing, and the difference
    // is the whole value of the output.
    // Counted per source rather than "website vs. everything else" — the
    // latter reported Wolt failures as review failures once Wolt was added.
    const perSource = new Map<EvidenceSource, number>();
    for (const item of unreachable) {
      perSource.set(item.source, (perSource.get(item.source) ?? 0) + 1);
    }
    const breakdown = [...perSource]
      .sort((a, b) => b[1] - a[1])
      .map(([source, count]) => `${count} ${source}`)
      .join(', ');
    console.log(`\n⚠️  ${unreachable.length} source(s) could not be read (${breakdown}).`);
    console.log('   Those cafes were NOT checked — absence of evidence here means nothing.');
    const reasons = new Map<string, number>();
    for (const item of unreachable) reasons.set(item.reason, (reasons.get(item.reason) ?? 0) + 1);
    for (const [reason, count] of [...reasons].sort((a, b) => b[1] - a[1]).slice(0, 5)) {
      console.log(`   ${count}×  ${reason}`);
    }
  }

  console.log('\nNext: read each snippet, set "glutenFree" to true or false');
  console.log('(leave null to skip) and correct "glutenFreeItems". Valid values:');
  console.log(`  ${GLUTEN_FREE_ITEMS.join(' · ')}`);
  console.log('Then run:');
  console.log('  npx tsx scripts/apply-gluten-free.ts');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
