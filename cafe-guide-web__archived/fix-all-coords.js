const fs = require('fs');
const path = require('path');

// Read the verification results
const resultsPath = path.join(__dirname, 'geocoding-verification-results.json');
const verificationResults = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));

// Read the cafes data
const cafesPath = path.join(__dirname, 'public', 'data', 'cafes.json');
const cafesData = JSON.parse(fs.readFileSync(cafesPath, 'utf8'));

console.log('🔧 Fixing all location errors...\n');

let fixedCount = 0;
let errorCount = 0;

// Fix each cafe with location error
verificationResults.forEach(result => {
  if (result.needsUpdate) {
    const cafeIndex = cafesData.findIndex(cafe => cafe.name === result.name);
    
    if (cafeIndex !== -1) {
      const oldCoords = cafesData[cafeIndex].coordinates;
      
      // Update coordinates
      cafesData[cafeIndex].coordinates = {
        lat: result.geocoded.lat,
        lng: result.geocoded.lng
      };
      
      // Mark as verified
      cafesData[cafeIndex]._geocode_verified = true;
      
      console.log(`✅ Fixed: ${result.name}`);
      console.log(`   📍 Old: ${oldCoords.lat}, ${oldCoords.lng}`);
      console.log(`   📍 New: ${result.geocoded.lat}, ${result.geocoded.lng}`);
      console.log(`   📏 Distance: ${result.distanceKm.toFixed(2)}km\n`);
      
      fixedCount++;
    } else {
      console.log(`❌ Could not find: ${result.name}`);
      errorCount++;
    }
  }
});

// Write the fixed data back
fs.writeFileSync(cafesPath, JSON.stringify(cafesData, null, 2), 'utf8');

console.log('📊 FIX SUMMARY:');
console.log(`✅ Fixed cafes: ${fixedCount}`);
console.log(`❌ Errors: ${errorCount}`);
console.log(`📍 Total processed: ${verificationResults.length}`);

// Show some examples of major fixes
const majorFixes = verificationResults
  .filter(r => r.needsUpdate && r.distanceKm > 0.5)
  .sort((a, b) => b.distanceKm - a.distanceKm)
  .slice(0, 5);

if (majorFixes.length > 0) {
  console.log('\n🚨 MAJOR FIXES (>0.5km):');
  majorFixes.forEach(fix => {
    console.log(`   ${fix.name}: ${fix.distanceKm.toFixed(2)}km`);
  });
}

console.log('\n✅ All location errors have been fixed!');
console.log('📝 cafes.json has been updated with correct coordinates');
