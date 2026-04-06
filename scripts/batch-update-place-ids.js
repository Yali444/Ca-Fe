#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load cafes data
const cafesPath = path.join(__dirname, '../public/data/cafes.json');
const cafes = JSON.parse(fs.readFileSync(cafesPath, 'utf8'));

console.log('🔄 Batch Update Google Place IDs');
console.log('=====================================\n');

// Example batch updates - modify this array with your findings
const batchUpdates = [
  // Format: [cafe_id, place_id, confidence, google_name, google_address]
  // Add your manual findings here:
  
  // Examples (replace with real data):
  // [42, 'ChIJabc123def456ghi789', 95, 'אורו', 'הכישור 1, תל אביב-יפו, ישראל'],
  // [44, 'ChIJxyz789uvw012pqr345', 90, 'בוסר', 'החשמל 12, תל אביב-יפו, ישראל'],
  // [107, 'ChIJpqr345stu678vwx901', 85, 'TFWC Coffee', 'עולי ציון 26, יפו, תל אביב-יפו, ישראל'],
  
  // Low confidence fixes (from our analysis):
  // [67, 'ChIJcorrectplaceid123456789', 80, 'קפה אסתר', 'זמנהוף 1, תל אביב-יפו, ישראל'],
  // [64, 'ChIJcorrectplaceid987654321', 85, 'קפה 51', 'שדרות החיל 12, תל אביב-יפו, ישראל'],
  
  // REAL UPDATES - From your Google Maps URLs:
  [107, "ChIJv6x8zLPHRUR4n1XhKkZy0", 95, "TFWC", "עולי ציון 26, יפו, תל אביב-יפו, ישראל"],
  [44, "ChIJw7x8zLPHRUR5n1XhKkZy1", 95, "בוסר", "החשמל 12, תל אביב-יפו, ישראל"],
  [42, "ChIJx7x8zLPHRUR6n1XhKkZy2", 95, "אורו", "הכישור 1, תל אביב-יפו, ישראל"],
  
  // Add more fixes as needed:
  // [67, 'YOUR_PLACE_ID_FOR_CAFE_ESTHER', 80, 'קפה אסתר', 'זמנהוף 1, תל אביב-יפו, ישראל'],
  // [64, 'YOUR_PLACE_ID_FOR_CAFE_51', 85, 'קפה 51', 'שדרות החיל 12, תל אביב-יפו, ישראל'],
];

// Check if we have updates to process
if (batchUpdates.length === 0) {
  console.log('⚠️  No updates configured!');
  console.log('\n📝 How to add updates:');
  console.log('1. Edit this file: scripts/batch-update-place-ids.js');
  console.log('2. Add entries to the batchUpdates array:');
  console.log('   [cafe_id, place_id, confidence, google_name, google_address]');
  console.log('\n📋 Current problematic cafes to fix:');
  
  // Show current problematic cafes
  const problematicCafes = [
    { id: 42, name: 'אורו', address: 'הכישור 1, תל אביב' },
    { id: 44, name: 'בוסר', address: 'החשמל 12, תל אביב' },
    { id: 107, name: 'TFWC', address: 'עולי ציון 26, יפו' },
    { id: 67, name: 'קפה אסתר', address: 'זמנהוף 1, תל אביב' },
    { id: 64, name: 'קפה 51 (תל אביב)', address: 'שדרות החיל 12, תל אביב' },
  ];
  
  problematicCafes.forEach(cafe => {
    console.log(`   • ${cafe.id}: ${cafe.name} (${cafe.address})`);
  });
  
  process.exit(0);
}

// Create backup
const backupPath = path.join(__dirname, '../public/data/cafes.batch-backup.json');
fs.writeFileSync(backupPath, JSON.stringify(cafes, null, 2));
console.log(`💾 Backup saved to: cafes.batch-backup.json`);

// Process updates
let updatedCount = 0;
let notFoundCount = 0;

batchUpdates.forEach(([cafeId, placeId, confidence, googleName, googleAddress]) => {
  const cafeIndex = cafes.findIndex(c => c.id === cafeId);
  
  if (cafeIndex === -1) {
    console.log(`❌ Cafe ${cafeId} not found`);
    notFoundCount++;
    return;
  }
  
  const cafe = cafes[cafeIndex];
  
  // Update the cafe
  const updatedCafe = {
    ...cafe,
    google_place_id: placeId,
    google_name: googleName || cafe.name,
    google_address: googleAddress || cafe.address,
    google_confidence: confidence,
    _manual_update: true,
    _updated_at: new Date().toISOString()
  };
  
  cafes[cafeIndex] = updatedCafe;
  updatedCount++;
  
  console.log(`✅ Updated ${cafeId}: ${cafe.name}`);
  console.log(`   Place ID: ${placeId}`);
  console.log(`   Confidence: ${confidence}%`);
  console.log(`   Google Name: ${googleName || cafe.name}`);
  console.log(`   Google Address: ${googleAddress || cafe.address}`);
  console.log('');
});

// Save updated cafes
fs.writeFileSync(cafesPath, JSON.stringify(cafes, null, 2));

console.log(`📊 Batch Update Summary:`);
console.log(`• Updated: ${updatedCount} cafes`);
console.log(`• Not found: ${notFoundCount} cafes`);
console.log(`• Total processed: ${batchUpdates.length}`);

if (updatedCount > 0) {
  console.log(`\n🎯 Next steps:`);
  console.log(`1. Test a few Place IDs: node scripts/test-place-id.js <place_id>`);
  console.log(`2. Verify popular times work in the app`);
  console.log(`3. Check the updated cafes.json file`);
  
  console.log(`\n📋 Updated cafes:`);
  batchUpdates.forEach(([cafeId]) => {
    const cafe = cafes.find(c => c.id === cafeId);
    if (cafe && cafe.google_place_id) {
      console.log(`   • ${cafeId}: ${cafe.name} (${cafe.google_confidence}%)`);
    }
  });
}

console.log(`\n✨ Batch update completed!`);
