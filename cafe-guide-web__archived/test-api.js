const https = require('https');

function testAPI() {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=קלמן מגן 3, תל אביב&limit=1`;
  
  const options = {
    headers: {
      'User-Agent': 'CafeGuide/1.0 (geocoding verification)'
    }
  };
  
  console.log('Testing URL:', url);
  
  https.get(url, options, (res) => {
    console.log('Status Code:', res.statusCode);
    console.log('Headers:', res.headers);
    
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('Response length:', data.length);
      console.log('Response preview:', data.substring(0, 200));
      
      try {
        if (res.statusCode === 200) {
          const results = JSON.parse(data);
          console.log('Parsed results:', results.length, 'items');
          if (results.length > 0) {
            console.log('First result:', results[0]);
          }
        }
      } catch (err) {
        console.error('Parse error:', err.message);
      }
    });
  }).on('error', (err) => {
    console.error('Request error:', err.message);
  });
}

testAPI();
