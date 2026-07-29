/**
 * Write reviewed gluten-free decisions into public/data/cafes.json.
 *
 * Reads scripts/gluten-free-candidates.json (produced by detect-gluten-free.ts
 * and then edited by a human, who sets each `glutenFree` to true or false) and
 * applies only the entries that were decided. Entries left as `null` are
 * skipped, so a half-reviewed file is safe to run.
 *
 * The public field is a plain boolean; the `_gluten_free_*` keys alongside it
 * record where the answer came from, matching the dataset's existing
 * `_geocode_verified` / `_last_updated` convention.
 *
 *   npx tsx scripts/apply-gluten-free.ts             # dry run, prints the diff
 *   npx tsx scripts/apply-gluten-free.ts --write     # actually save
 *   npx tsx scripts/apply-gluten-free.ts --write --input scripts/manual.json
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  GLUTEN_FREE_ITEMS,
  hasSubstantialGlutenFreeItems,
  parseGlutenFreeItems,
} from '../src/lib/gluten-free';

const CAFES_PATH = path.join(__dirname, '../public/data/cafes.json');
const DEFAULT_INPUT = path.join(__dirname, 'gluten-free-candidates.json');

type EvidenceSource = 'website' | 'google_reviews' | 'manual';

interface Candidate {
  id: string;
  name: string;
  glutenFree: boolean | null;
  glutenFreeItems?: string[];
  sources?: EvidenceSource[];
  evidence?: { source: EvidenceSource; term: string; snippet: string }[];
}

interface RawCafe {
  id: number | string;
  name: string;
  glutenFree?: boolean;
  glutenFreeItems?: string[];
  _gluten_free_source?: string;
  _gluten_free_evidence?: string;
  _gluten_free_updated?: string;
  [key: string]: unknown;
}

function main() {
  const args = process.argv.slice(2);
  const write = args.includes('--write');
  const inputIndex = args.indexOf('--input');
  const inputPath = inputIndex !== -1 ? path.resolve(args[inputIndex + 1]) : DEFAULT_INPUT;

  if (!fs.existsSync(inputPath)) {
    console.error(`No candidates file at ${inputPath}`);
    console.error('Run: npx tsx scripts/detect-gluten-free.ts');
    process.exit(1);
  }

  const candidates: Candidate[] = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  const cafes: RawCafe[] = JSON.parse(fs.readFileSync(CAFES_PATH, 'utf-8'));
  const today = new Date().toISOString().slice(0, 10);

  console.log('=== Applying gluten-free decisions ===\n');
  console.log(`Input: ${inputPath}\n`);

  let applied = 0;
  let skipped = 0;
  const missing: string[] = [];

  for (const candidate of candidates) {
    if (candidate.glutenFree === null || candidate.glutenFree === undefined) {
      skipped++;
      continue;
    }

    const cafe = cafes.find((c) => String(c.id) === String(candidate.id));
    if (!cafe) {
      missing.push(`${candidate.name} (id ${candidate.id})`);
      continue;
    }

    // Reject unknown categories loudly rather than dropping them quietly —
    // a typo here would otherwise silently publish less than was recorded.
    const rawItems = candidate.glutenFreeItems ?? [];
    const items = parseGlutenFreeItems(rawItems);
    const rejected = rawItems.map((item) => item.trim()).filter((item) => !items.includes(item));
    if (rejected.length > 0) {
      console.log(`   ⚠️  ${candidate.name}: unknown categories ignored — ${rejected.join(', ')}`);
      console.log(`       valid: ${GLUTEN_FREE_ITEMS.join(' · ')}`);
    }

    if (candidate.glutenFree === true) {
      if (items.length === 0) {
        console.log(`   ⚠️  ${candidate.name}: marked gluten-free with no categories.`);
      } else if (!hasSubstantialGlutenFreeItems(items)) {
        // Exactly the case this vocabulary exists to surface.
        console.log(`   ⚠️  ${candidate.name}: only token options (${items.join(', ')}).`);
      }
    }

    const before = cafe.glutenFree;
    cafe.glutenFree = candidate.glutenFree;
    if (items.length > 0) cafe.glutenFreeItems = items;
    cafe._gluten_free_source = (candidate.sources ?? ['manual']).join('+');
    // Keep one quote so a future reader can re-judge the call without re-running
    // the scan against a website that may have changed since.
    if (candidate.evidence?.length) {
      cafe._gluten_free_evidence = candidate.evidence[0].snippet;
    }
    cafe._gluten_free_updated = today;

    const change = before === undefined ? 'new' : `${before} → ${candidate.glutenFree}`;
    const itemsLabel = items.length > 0 ? ` — ${items.join(', ')}` : '';
    console.log(`✅ ${cafe.name}: ${change}${itemsLabel} [${cafe._gluten_free_source}]`);
    applied++;
  }

  if (missing.length > 0) {
    console.log(`\n⚠️  Not found in cafes.json (${missing.length}):`);
    missing.forEach((name) => console.log(`   ${name}`));
  }

  console.log(`\nApplied: ${applied}   Skipped (undecided): ${skipped}`);

  const confirmed = cafes.filter((c) => c.glutenFree === true).length;
  console.log(`Cafes marked gluten-free after this run: ${confirmed}`);

  if (!write) {
    console.log('\nDry run — nothing saved. Re-run with --write to save.');
    return;
  }

  fs.writeFileSync(CAFES_PATH, `${JSON.stringify(cafes, null, 2)}\n`, 'utf-8');
  console.log(`\nSaved to ${CAFES_PATH}`);
}

main();
