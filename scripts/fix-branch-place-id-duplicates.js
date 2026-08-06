const fs = require('fs');
const path = require('path');

// Read the cafes data
const cafesPath = path.join(__dirname, '../public/data/cafes.json');
const cafes = JSON.parse(fs.readFileSync(cafesPath, 'utf8'));

console.log('=== Fixing copy-pasted google_place_id on second branches ===\n');

// Both pairs share one Instagram handle across genuine multi-branch chains
// (בוטי, מתחת לעץ), which is correct. But in each pair the *second* branch's
// google_place_id/google_address/google_confidence were copy-pasted from the
// first branch and still describe the first branch's location. Since there is
// no live Google API key in this environment to fetch the correct place_id,
// wrong metadata is worse than missing metadata: clear it on the second
// branch rather than leave it pointing at the wrong address. These fields
// carry no runtime behavior (unused in src/, per AUDIT.md) so this is a pure
// data-hygiene fix.
const fixes = [
  {
    id: 92,
    name: "בוטי (שרונה)",
    reason: "google_place_id/google_address were copied from id 91 (בוטי דיזנגוף, כיכר דיזנגוף 4) despite this branch's own address being ארניה אוסוולדו 9",
  },
  {
    id: 130,
    name: "מתחת לעץ נתן אלתרמן",
    reason: "google_place_id/google_address were copied from id 128 (מתחת לעץ בן יהודה, בן יהודה 202); also completes the incomplete address field",
    addressFix: "נתן אלתרמן 13, תל אביב-יפו", // confirmed via WebSearch (Instagram: מתחת לעץ נאות אפקה, נתן אלתרמן 13)
  },
];

for (const fix of fixes) {
  const cafe = cafes.find((c) => c.id === fix.id);
  if (!cafe) {
    throw new Error(`id ${fix.id} (${fix.name}) not found in cafes.json`);
  }

  const before = {
    address: cafe.address,
    google_place_id: cafe.google_place_id,
    google_address: cafe.google_address,
    google_confidence: cafe.google_confidence,
  };

  delete cafe.google_place_id;
  delete cafe.google_address;
  delete cafe.google_confidence;
  if (fix.addressFix) {
    cafe.address = fix.addressFix;
  }
  cafe._last_updated = "2026-08-06";

  console.log(`✅ FIXED: ${cafe.name} (id ${cafe.id})`);
  console.log(`   Reason: ${fix.reason}`);
  console.log(`   Before: address="${before.address}", google_place_id="${before.google_place_id}"`);
  console.log(`   After:  address="${cafe.address}", google_place_id=<cleared>`);
  console.log('');
}

fs.writeFileSync(cafesPath, JSON.stringify(cafes, null, 2) + '\n', 'utf8');
console.log(`📄 Updated file: ${cafesPath}`);
