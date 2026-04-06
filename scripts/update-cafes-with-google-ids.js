#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// Load data files
const cafesPath = path.join(__dirname, '../public/data/cafes.json');
const googleIdsPath = path.join(__dirname, '../google-place-ids.json');

const cafes = JSON.parse(fs.readFileSync(cafesPath, 'utf8'));
const googleData = JSON.parse(fs.readFileSync(googleIdsPath, 'utf8'));

console.log(`🔄 Updating ${cafes.length} cafes with Google Place IDs...`);

// Create a map of cafe ID to Google Place ID
const googleIdMap = new Map();
googleData.found.forEach(item => {
  if (item.confidence >= 50) { // Only use matches with 50%+ confidence
    googleIdMap.set(item.id, {
      google_place_id: item.google_place_id,
      google_name: item.google_name,
      google_address: item.google_address,
      confidence: item.confidence
    });
  }
});

// Update cafes with Google Place IDs
let updatedCount = 0;
let skippedCount = 0;

const updatedCafes = cafes.map(cafe => {
  const googleInfo = googleIdMap.get(cafe.id);
  
  if (googleInfo) {
    updatedCount++;
    console.log(`✅ [${cafe.id}] ${cafe.name} -> ${googleInfo.google_name} (${googleInfo.confidence}%)`);
    
    return {
      ...cafe,
      google_place_id: googleInfo.google_place_id,
      google_name: googleInfo.google_name,
      google_address: googleInfo.google_address,
      google_confidence: googleInfo.confidence
    };
  } else {
    skippedCount++;
    console.log(`⏭️  [${cafe.id}] ${cafe.name} - no match or low confidence`);
    return cafe;
  }
});

// Create backup of original file
const backupPath = path.join(__dirname, '../public/data/cafes.backup.json');
fs.writeFileSync(backupPath, JSON.stringify(cafes, null, 2));
console.log(`💾 Backup saved to: cafes.backup.json`);

// Write updated cafes file
fs.writeFileSync(cafesPath, JSON.stringify(updatedCafes, null, 2));

console.log(`\n📊 Update Summary:`);
console.log(`✅ Updated: ${updatedCount} cafes`);
console.log(`⏭️  Skipped: ${skippedCount} cafes`);
console.log(`📁 Updated file: ${cafesPath}`);
console.log(`🔄 Backup file: ${backupPath}`);

// Show some examples of high confidence matches
const highConfidence = updatedCafes.filter(cafe => cafe.google_confidence >= 80);
console.log(`\n🎯 High confidence matches (80%+): ${highConfidence.length}`);
highConfidence.slice(0, 5).forEach(cafe => {
  console.log(`  • ${cafe.name} -> ${cafe.google_name} (${cafe.google_confidence}%)`);
});

if (highConfidence.length > 5) {
  console.log(`  • ... and ${highConfidence.length - 5} more`);
}

// Show low confidence matches
const lowConfidence = updatedCafes.filter(cafe => cafe.google_confidence && cafe.google_confidence < 80);
if (lowConfidence.length > 0) {
  console.log(`\n⚠️  Low confidence matches (<80%): ${lowConfidence.length}`);
  lowConfidence.slice(0, 3).forEach(cafe => {
    console.log(`  • ${cafe.name} -> ${cafe.google_name} (${cafe.google_confidence}%)`);
  });
  if (lowConfidence.length > 3) {
    console.log(`  • ... and ${lowConfidence.length - 3} more`);
  }
}

console.log(`\n✨ Done! You can now use Google Places API for popular times!`);
