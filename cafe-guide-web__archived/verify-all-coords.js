const fs = require('fs');
const path = require('path');
const https = require('https');

// Read the cafes.json file
const filePath = path.join(__dirname, 'public', 'data', 'cafes.json');
const cafesData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

function geocodeAddress(address) {
  return new Promise((resolve, reject) => {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
    
    const options = {
      headers: {
        'User-Agent': 'CafeGuide/1.0 (geocoding verification)'
      }
    };
    
    const req = https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const results = JSON.parse(data);
            if (results.length > 0) {
              resolve({
                lat: parseFloat(results[0].lat),
                lng: parseFloat(results[0].lon),
                display_name: results[0].display_name
              });
            } else {
              resolve(null);
            }
          } else {
            resolve(null);
          }
        } catch (err) {
          resolve(null);
        }
      });
    });
    
    req.on('error', () => resolve(null));
    req.setTimeout(5000, () => {
      req.destroy();
      resolve(null);
    });
  });
}

async function verifyAllCafes() {
  console.log('🔍 Starting geocoding verification for all cafes...\n');
  
  const results = [];
  let verifiedCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < cafesData.length; i++) {
    const cafe = cafesData[i];
    const address = `${cafe.address}, ${cafe.city}`;
    
    console.log(`📍 ${i + 1}/${cafesData.length}: ${cafe.name}`);
    console.log(`   Address: ${address}`);
    
    try {
      const geocoded = await geocodeAddress(address);
      
      if (geocoded) {
        const currentCoords = cafe.coordinates;
        const latDiff = Math.abs(geocoded.lat - currentCoords.lat);
        const lngDiff = Math.abs(geocoded.lng - currentCoords.lng);
        const distanceKm = Math.sqrt(Math.pow(latDiff * 111, 2) + Math.pow(lngDiff * 111, 2));
        
        const needsUpdate = latDiff > 0.001 || lngDiff > 0.001; // More than ~100m difference
        
        results.push({
          name: cafe.name,
          address: address,
          current: currentCoords,
          geocoded: geocoded,
          distanceKm: distanceKm,
          needsUpdate: needsUpdate
        });
        
        if (needsUpdate) {
          console.log(`   🚨 LOCATION ERROR - ${distanceKm.toFixed(2)}km difference`);
          console.log(`   📍 Current: ${currentCoords.lat}, ${currentCoords.lng}`);
          console.log(`   📍 Should be: ${geocoded.lat}, ${geocoded.lng}`);
          errorCount++;
        } else {
          console.log(`   ✅ Location accurate (${distanceKm.toFixed(3)}km)`);
          verifiedCount++;
        }
      } else {
        console.log(`   ❌ Geocoding failed`);
        errorCount++;
      }
    } catch (err) {
      console.log(`   ❌ Error: ${err.message}`);
      errorCount++;
    }
    
    console.log('');
    
    // Add delay to avoid overwhelming the API
    if (i < cafesData.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Summary
  console.log('📊 VERIFICATION SUMMARY:');
  console.log(`✅ Accurate locations: ${verifiedCount}`);
  console.log(`🚨 Location errors: ${errorCount}`);
  console.log(`📍 Total cafes: ${cafesData.length}`);
  
  // Save results to file
  const resultsPath = path.join(__dirname, 'geocoding-verification-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Results saved to: geocoding-verification-results.json`);
  
  return results;
}

// Run the verification
verifyAllCafes().catch(console.error);
