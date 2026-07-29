/**
 * Look for evidence that a Tel Aviv cafe serves gluten-free food, from the two
 * sources we can read without asking anyone: the cafe's own website, and the
 * reviews Google exposes for its Place ID.
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
 *   npx tsx scripts/detect-gluten-free.ts --skip-google
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

type EvidenceSource = 'website' | 'google_reviews';

interface RawCafe {
  id: number | string;
  name: string;
  city?: string;
  website?: string;
  google_place_id?: string;
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

async function main() {
  const args = process.argv.slice(2);
  const skipGoogle = args.includes('--skip-google');
  const skipWebsites = args.includes('--skip-websites');
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

  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(candidates, null, 2)}\n`, 'utf-8');

  console.log('\n=== Done ===');
  console.log(`Cafes with evidence: ${candidates.length} / ${telAviv.length}`);
  console.log(`Written to: ${OUTPUT_PATH}`);

  if (unreachable.length > 0) {
    // Loud on purpose. A run where every source failed produces the same empty
    // candidates file as a run that genuinely found nothing, and the difference
    // is the whole value of the output.
    const websiteFailures = unreachable.filter((item) => item.source === 'website').length;
    const reviewFailures = unreachable.length - websiteFailures;
    console.log(
      `\n⚠️  ${unreachable.length} source(s) could not be read ` +
        `(${websiteFailures} website, ${reviewFailures} reviews).`,
    );
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
