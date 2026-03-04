const https = require('https');

function geocodeAddress(address) {
  return new Promise((resolve, reject) => {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
    
    const options = {
      headers: {
        'User-Agent': 'CafeGuide/1.0 (geocoding verification)'
      }
    };
    
    https.get(url, options, (res) => {
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
            console.log('Response status:', res.statusCode);
            console.log('Response data:', data);
            resolve(null);
          }
        } catch (err) {
          console.error('Parse error:', err.message);
          console.log('Response data:', data);
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

async function verifyBuna() {
  const address = 'קלמן מגן 3, תל אביב, שרונה מרקט';
  console.log('Geocoding:', address);
  
  try {
    const result = await geocodeAddress(address);
    if (result) {
      console.log('✅ New coordinates:', result);
      console.log('📍 Current coordinates: lat: 32.049417, lng: 34.793313');
      console.log('📏 Difference:', {
        latDiff: result.lat - 32.049417,
        lngDiff: result.lng - 34.793313
      });
      
      // Check if the difference is significant
      const latDiff = Math.abs(result.lat - 32.049417);
      const lngDiff = Math.abs(result.lng - 34.793313);
      
      if (latDiff > 0.001 || lngDiff > 0.001) {
        console.log('🚨 SIGNIFICANT DIFFERENCE DETECTED - Coordinates need updating!');
      } else {
        console.log('✅ Coordinates are accurate');
      }
    } else {
      console.log('❌ No results found');
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

verifyBuna();
