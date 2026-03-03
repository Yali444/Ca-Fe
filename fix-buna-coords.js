const fs = require('fs');
const path = require('path');

// Read the cafes.json file
const filePath = path.join(__dirname, 'public', 'data', 'cafes.json');
const cafesData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// Find "בונה" and update its coordinates
const bunaIndex = cafesData.findIndex(shop => shop.name === 'בונה');

if (bunaIndex !== -1) {
  const oldCoords = cafesData[bunaIndex].coordinates;
  
  // Update to correct coordinates for Kalman Magan area
  cafesData[bunaIndex].coordinates = {
    lat: 32.0749,
    lng: 34.7952
  };
  
  // Mark as verified
  cafesData[bunaIndex]._geocode_verified = true;
  
  console.log('✅ Found "בונה" at index', bunaIndex);
  console.log('📍 Old coordinates:', oldCoords);
  console.log('📍 New coordinates:', cafesData[bunaIndex].coordinates);
  
  // Write back to file
  fs.writeFileSync(filePath, JSON.stringify(cafesData, null, 2), 'utf8');
  
  console.log('✅ Successfully updated cafes.json');
  console.log('📝 "בונה" is now correctly positioned in Kalman Magan area');
} else {
  console.log('❌ Could not find "בונה" in the data');
}
