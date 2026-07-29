/**
 * Apply reviewed Instagram handle corrections to public/data/cafes.json.
 *
 * Reads scripts/instagram-handle-audit.json (produced by a manual WebSearch
 * audit — Instagram itself returns 403 to server-side fetches from this
 * environment, same as Wolt, so verification has to go through search
 * results rather than the API) and applies only entries with
 * `status: "wrong"` and a `suggestedHandle`. Entries marked "uncertain" are
 * left untouched on purpose — a wrong guess sends a stranger's Instagram
 * account a DM meant for a cafe, so silence beats a bad guess.
 *
 *   npx tsx scripts/apply-instagram-fixes.ts             # dry run, prints the diff
 *   npx tsx scripts/apply-instagram-fixes.ts --write      # actually save
 *   npx tsx scripts/apply-instagram-fixes.ts --input scripts/handle-corrections.json --write
 */

import * as fs from 'fs';
import * as path from 'path';

const CAFES_PATH = path.join(__dirname, '../public/data/cafes.json');
const DEFAULT_AUDIT_PATH = path.join(__dirname, 'instagram-handle-audit.json');

interface AuditEntry {
  ids: string[];
  names: string[];
  storedHandle: string;
  status: 'wrong' | 'uncertain' | 'confirmed';
  suggestedHandle?: string;
  evidence?: string;
  note?: string;
}

interface RawCafe {
  id: number | string;
  name: string;
  instagramHandle?: string;
  [key: string]: unknown;
}

function main() {
  const args = process.argv.slice(2);
  const write = args.includes('--write');
  const inputIndex = args.indexOf('--input');
  const auditPath = inputIndex !== -1 ? path.resolve(args[inputIndex + 1]) : DEFAULT_AUDIT_PATH;

  if (!fs.existsSync(auditPath)) {
    console.error(`No audit file at ${auditPath}`);
    process.exit(1);
  }

  console.log(`Input: ${auditPath}\n`);
  const audit: AuditEntry[] = JSON.parse(fs.readFileSync(auditPath, 'utf-8'));
  const cafes: RawCafe[] = JSON.parse(fs.readFileSync(CAFES_PATH, 'utf-8'));

  console.log('=== Applying Instagram handle corrections ===\n');

  let applied = 0;
  let skipped = 0;
  const missing: string[] = [];

  for (const entry of audit) {
    if (entry.status !== 'wrong' || !entry.suggestedHandle) {
      skipped++;
      continue;
    }

    for (const id of entry.ids) {
      const cafe = cafes.find((c) => String(c.id) === id);
      if (!cafe) {
        missing.push(`${entry.names.join('/')} (id ${id})`);
        continue;
      }

      const before = cafe.instagramHandle;
      if (before !== entry.storedHandle) {
        // The stored value has already changed since the audit was run —
        // applying blindly here could clobber a newer, unrelated edit.
        console.log(
          `   ⚠️  ${cafe.name}: expected stored handle "${entry.storedHandle}" but found ` +
            `"${before}" — skipping to avoid overwriting an unrelated change.`,
        );
        continue;
      }

      cafe.instagramHandle = entry.suggestedHandle;
      console.log(`✅ ${cafe.name}: "${before}" → "${entry.suggestedHandle}"`);
      applied++;
    }
  }

  if (missing.length > 0) {
    console.log(`\n⚠️  Not found in cafes.json (${missing.length}):`);
    missing.forEach((name) => console.log(`   ${name}`));
  }

  const uncertainCount = audit.filter((e) => e.status === 'uncertain').length;
  console.log(`\nApplied: ${applied}   Left untouched (uncertain): ${uncertainCount}`);

  if (!write) {
    console.log('\nDry run — nothing saved. Re-run with --write to save.');
    return;
  }

  fs.writeFileSync(CAFES_PATH, `${JSON.stringify(cafes, null, 2)}\n`, 'utf-8');
  console.log(`\nSaved to ${CAFES_PATH}`);
}

main();
