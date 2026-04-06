#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load cafes data
const cafesPath = path.join(__dirname, '../public/data/cafes.json');
const cafes = JSON.parse(fs.readFileSync(cafesPath, 'utf8'));

// Command line arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: node manual-update-place-id.js <cafe_id> <place_id> [confidence]');
  console.log('Example: node manual-update-place-id.js 42 ChIJ1234567890abcdef 90');
  process.exit(1);
}

const cafeId = parseInt(args[0]);
const placeId = args[1];
const confidence = args[2] ? parseInt(args[2]) : 100;

// Find the cafe
const cafeIndex = cafes.findIndex(c => c.id === cafeId);
if (cafeIndex === -1) {
  console.log(`❌ Cafe with ID ${cafeId} not found`);
  process.exit(1);
}

const cafe = cafes[cafeIndex];

// Update the cafe with the new Place ID
const updatedCafe = {
  ...cafe,
  google_place_id: placeId,
  google_name: cafe.name, // Use our name as default
  google_address: cafe.address, // Use our address as default
  google_confidence: confidence,
  _manual_update: true,
  _updated_at: new Date().toISOString()
};

// Replace in array
cafes[cafeIndex] = updatedCafe;

// Create backup
const backupPath = path.join(__dirname, '../public/data/cafes.manual-backup.json');
fs.writeFileSync(backupPath, JSON.stringify(cafes.filter(c => c.id !== cafeId), null, 2));

// Save updated cafes
fs.writeFileSync(cafesPath, JSON.stringify(cafes, null, 2));

console.log(`✅ Updated cafe ${cafeId}: ${cafe.name}`);
console.log(`   Place ID: ${placeId}`);
console.log(`   Confidence: ${confidence}%`);
console.log(`   Backup saved to: cafes.manual-backup.json`);

// Show what was updated
console.log(`\n📋 Updated fields:`);
console.log(`   google_place_id: ${placeId}`);
console.log(`   google_name: ${cafe.name}`);
console.log(`   google_address: ${cafe.address}`);
console.log(`   google_confidence: ${confidence}%`);
console.log(`   _manual_update: true`);
console.log(`   _updated_at: ${new Date().toISOString()}`);

console.log(`\n💡 Next steps:`);
console.log(`1. Test the Place ID with: node scripts/test-place-id.js ${placeId}`);
console.log(`2. Verify popular times work in the app`);
console.log(`3. If needed, update google_name and google_address manually`);
