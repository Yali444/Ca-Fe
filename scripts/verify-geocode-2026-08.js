const fs = require('fs');
const path = require('path');

// Read the cafes data
const cafesPath = path.join(__dirname, '../public/data/cafes.json');
const cafes = JSON.parse(fs.readFileSync(cafesPath, 'utf8'));

console.log('=== Geocode verification pass (WebSearch-based, no live Google API key) ===\n');

// No GOOGLE_MAPS_API_KEY is available in this environment, so the existing
// verify-all-coordinates.ts / geocode-addresses.ts scripts can't run here.
// These 12 cafés had _geocode_verified false/missing. Each was researched via
// WebSearch: confirming the business + address exist and sanity-checking the
// stored lat/lng against known street/neighborhood geography. In every
// confirmed case below, the existing coordinates were already plausible, so
// only the verification flag changes — no coordinates were altered.
//
// Three of the 12 are deliberately left untouched (see SKIPPED below):
// two lack any fixed public address to verify against, and one is a business
// that could not be confirmed to exist at its listed address at all.
const VERIFIED_IDS = [134, 138, 139, 140, 141, 143, 145, 147, 148];

const SKIPPED = [
  { id: 136, name: "Brew Brothers", reason: "No fixed public street address found (Wolt delivery listing + online bean shop only) — likely a delivery/roastery brand without a walk-in location." },
  { id: 142, name: "First Crack", reason: "Confirmed self-pickup-only roastery in Ramat Gan, but no published street address — pickup appears to be arranged privately with customers." },
  { id: 146, name: "קפה פראיסו", reason: "Could not confirm this business currently operates at המלך ג'ורג' 18 despite extensive search — needs manual spot-check, possibly closed/renamed/mis-entered." },
];

let updated = 0;
for (const id of VERIFIED_IDS) {
  const cafe = cafes.find((c) => c.id === id);
  if (!cafe) {
    throw new Error(`id ${id} not found in cafes.json`);
  }
  cafe._geocode_verified = true;
  cafe._last_updated = "2026-08-06";
  console.log(`✅ VERIFIED: ${cafe.name} (id ${cafe.id}) — coordinates unchanged, address confirmed via WebSearch`);
  updated += 1;
}

console.log(`\n⏭️  SKIPPED (left unverified, needs follow-up):`);
for (const s of SKIPPED) {
  console.log(`   id ${s.id} — ${s.name}: ${s.reason}`);
}

fs.writeFileSync(cafesPath, JSON.stringify(cafes, null, 2) + '\n', 'utf8');
console.log(`\n📄 Updated ${updated} records in: ${cafesPath}`);
