/**
 * Geocode new cafe places using Google Maps Geocoding API
 */

import fs from 'fs';
import path from 'path';

// Load environment variables from .env.local manually
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const equalIndex = trimmed.indexOf('=');
      if (equalIndex > 0) {
        const key = trimmed.substring(0, equalIndex).trim();
        const value = trimmed.substring(equalIndex + 1).trim();
        process.env[key] = value;
      }
    }
  });
}

interface Place {
  name: string;
  address: string;
  city: string;
}

interface GeocodeResult {
  lat: number;
  lng: number;
  formatted_address?: string;
  confidence?: 'high' | 'medium' | 'low';
}

const places: Place[] = [
  { name: "F*ckn Sunday", address: "לוינסקי 61", city: "תל אביב" },
  { name: "Coffee Organization Studio", address: "מקווה ישראל 3", city: "תל אביב" },
  { name: "קפה אלג׳יר", address: "ביאליק 26", city: "תל אביב" },
  { name: "טימותי", address: "אבן גבירול 187", city: "תל אביב" },
  { name: "BUNA", address: "קלמן מגן 3", city: "תל אביב" }, // שרונה מרקט
  { name: "קפה פיקולו", address: "דרויאנוב 5", city: "תל אביב" },
  { name: "קפליקס (יפו)", address: "סגולה 13", city: "תל אביב-יפו" },
  { name: "קפליקס (לוינסקי)", address: "מרחביה 6", city: "תל אביב" },
  { name: "קפליקס (מרכז העיר)", address: "שלמה המלך 12", city: "תל אביב" },
  { name: "בית חנה (סניף פלורנטין)", address: "הרבי מבכרך 6", city: "תל אביב" },
  { name: "טוני ואסתר", address: "לוינסקי 39", city: "תל אביב" },
  { name: "קפה ברזילי", address: "ברזילי 1", city: "תל אביב" },
  { name: "Loveat", address: "דיזנגוף 232", city: "תל אביב" },
  { name: "תמוז", address: "מזא\"ה 7", city: "תל אביב" },
  { name: "מיראג׳", address: "דרך יפו 9 (בית רומנו)", city: "תל אביב" },
  { name: "קפה נעימה", address: "דרך יפו 49", city: "חיפה" },
  { name: "קפה מורן", address: "קיבוץ מורן", city: "" },
];

/**
 * Translate Hebrew city names to English
 */
const cityTranslations: Record<string, string> = {
  'תל אביב': 'Tel Aviv',
  'תל אביב-יפו': 'Tel Aviv-Yafo',
  'ירושלים': 'Jerusalem',
  'חיפה': 'Haifa',
  'ראשון לציון': 'Rishon LeZion',
  'באר שבע': 'Beer Sheva',
  'נתניה': 'Netanya',
  'אשדוד': 'Ashdod',
  'רחובות': 'Rehovot',
  'רמת גן': 'Ramat Gan',
  'גבעתיים': 'Givatayim',
  'פתח תקווה': 'Petah Tikva',
  'אשקלון': 'Ashkelon',
};

function translateCity(city: string): string {
  return cityTranslations[city] || city;
}

/**
 * Geocode using Google Maps API
 */
async function geocodeGoogle(place: Place, apiKey: string): Promise<GeocodeResult | null> {
  try {
    const cityEnglish = translateCity(place.city);
    
    // Try multiple query variations for better accuracy
    const queries = [
      `${place.address}, ${cityEnglish}, Israel`,
      `${place.name}, ${place.address}, ${cityEnglish}, Israel`,
      `${place.address}, ${place.city}, Israel`,
    ];
    
    for (const query of queries) {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}&region=il`
      );
      const data = await response.json();

      if (data.status === 'OK' && data.results.length > 0) {
        const result = data.results[0];
        const location = result.geometry.location;
        return {
          lat: location.lat,
          lng: location.lng,
          formatted_address: result.formatted_address,
          confidence: result.geometry.location_type === 'ROOFTOP' ? 'high' : 'medium'
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Error geocoding "${place.name}":`, error);
    return null;
  }
}

/**
 * Main function
 */
async function main() {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    console.error('❌ GOOGLE_MAPS_API_KEY not found in .env.local');
    process.exit(1);
  }

  console.log('🔍 Geocoding new places using Google Maps API...\n');
  
  const results: Array<Place & GeocodeResult & { status: string }> = [];
  
  for (let i = 0; i < places.length; i++) {
    const place = places[i];
    console.log(`[${i + 1}/${places.length}] Geocoding: ${place.name} - ${place.address}, ${place.city}`);
    
    const geocodeResult = await geocodeGoogle(place, apiKey);
    
    if (geocodeResult) {
      console.log(`  ✅ Found: ${geocodeResult.lat}, ${geocodeResult.lng}`);
      console.log(`  📍 Address: ${geocodeResult.formatted_address}`);
      console.log(`  🎯 Confidence: ${geocodeResult.confidence}\n`);
      
      results.push({
        ...place,
        ...geocodeResult,
        status: 'success'
      });
    } else {
      console.log(`  ❌ Not found\n`);
      results.push({
        ...place,
        lat: 0,
        lng: 0,
        status: 'failed'
      });
    }
    
    // Small delay to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  // Save results to JSON file
  const outputPath = path.join(process.cwd(), 'scripts', 'new-places-geocoding-results.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');
  
  console.log(`\n✅ Geocoding complete!`);
  console.log(`📄 Results saved to: ${outputPath}`);
  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Success: ${results.filter(r => r.status === 'success').length}`);
  console.log(`   ❌ Failed: ${results.filter(r => r.status === 'failed').length}`);
  
  // Print formatted results for easy copy-paste
  console.log(`\n📋 Formatted results:\n`);
  results.forEach(result => {
    if (result.status === 'success') {
      console.log(`{`);
      console.log(`  name: "${result.name}",`);
      console.log(`  address: "${result.address}",`);
      console.log(`  city: "${result.city}",`);
      console.log(`  coordinates: { lat: ${result.lat}, lng: ${result.lng} },`);
      console.log(`},`);
    }
  });
}

main().catch(console.error);

