const fs = require('fs');
const path = require('path');

const cafesPath = path.join(__dirname, '../public/data/cafes.json');
const cafes = JSON.parse(fs.readFileSync(cafesPath, 'utf8'));

console.log('=== Verifying קפה פראיסו via user-provided Plus Code ===\n');

// verify-geocode-2026-08.js left id 146 (קפה פראיסו) unverified because
// WebSearch couldn't confirm the business existed at המלך ג'ורג' 18. The
// owner/user then confirmed it via a Google Maps link and shared its Plus
// Code: 3QCF+F3 Tel Aviv-Yafo (full code 8G4P3QCF+F3), which decodes to
// 32.071188, 34.772687 — within ~30m of the coordinates already on file,
// confirming the original placement was accurate all along.
const cafe = cafes.find((c) => c.id === 146);
if (!cafe) {
  throw new Error('id 146 (קפה פראיסו) not found in cafes.json');
}

cafe.coordinates = { lat: 32.071188, lng: 34.772687 };
cafe._geocode_verified = true;
cafe._last_updated = "2026-08-06";

console.log(`✅ VERIFIED: ${cafe.name} (id ${cafe.id}) via Plus Code 3QCF+F3 Tel Aviv-Yafo`);
console.log(`   Coordinates: ${cafe.coordinates.lat}, ${cafe.coordinates.lng}`);

fs.writeFileSync(cafesPath, JSON.stringify(cafes, null, 2) + '\n', 'utf8');
console.log(`\n📄 Updated file: ${cafesPath}`);
