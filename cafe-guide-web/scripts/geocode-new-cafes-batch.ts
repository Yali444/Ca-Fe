/**
 * Geocode all new cafes that need to be added
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

interface GeocodeResult {
  lat: number;
  lng: number;
  formatted_address?: string;
  confidence?: 'high' | 'medium' | 'low';
}

/**
 * Translate Hebrew city names to English
 */
const cityTranslations: Record<string, string> = {
  'ירושלים': 'Jerusalem',
  'תל אביב': 'Tel Aviv',
  'חיפה': 'Haifa',
  'זיכרון יעקב': 'Zichron Yaakov',
  'רמת השרון': 'Ramat HaSharon',
  'ראשון לציון': 'Rishon LeZion',
};

function translateCity(city: string): string {
  return cityTranslations[city] || city;
}

/**
 * Geocode using Google Maps API
 */
async function geocodeGoogle(name: string, address: string, city: string, apiKey: string): Promise<GeocodeResult | null> {
  try {
    const cityEnglish = translateCity(city);
    
    // Try multiple query variations for better accuracy
    const queries = [
      `${address}, ${cityEnglish}, Israel`,
      `${name}, ${address}, ${cityEnglish}, Israel`,
      `${address}, ${city}, Israel`,
      `${name}, ${cityEnglish}, Israel`,
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
    console.error(`Error geocoding "${name}":`, error);
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

  // List of cafes to geocode with addresses found
  const newCafes = [
    { name: "URU", address: "הכישור 1, תל אביב", city: "תל אביב", type: "roastery" },
    { name: "קפה Louis", address: "", city: "תל אביב", type: "cafe" }, // Need to find address
    { name: "קפה שכנים", address: "שדרות הנשיא 116, חיפה", city: "חיפה", type: "cafe" },
    { name: "קפה 14", address: "", city: "תל אביב", type: "both" }, // Need to find address - both matcha and cafe
    { name: "You Need Coffee", address: "יפו 78, ירושלים", city: "ירושלים", type: "cafe" },
    { name: "טימותי", address: "שלמה אבן גבירול 187, תל אביב", city: "תל אביב", type: "cafe" },
    { name: "ניחוח קפה", address: "המייסדים 61, זיכרון יעקב", city: "זיכרון יעקב", type: "cafe" },
    { name: "אילן שנהב חותם הקפה", address: "סוקולוב 81, רמת השרון", city: "רמת השרון", type: "cafe" },
    { name: "SIG Café", address: "בית לחם 3, תל אביב", city: "תל אביב", type: "cafe" },
    { name: "ג'רה", address: "מורשת ישראל 15, ראשון לציון", city: "ראשון לציון", type: "cafe", note: "main branch - already exists" },
    { name: "ג'רה", address: "שלמה אבן גבירול 54, תל אביב", city: "תל אביב", type: "cafe", note: "אבן גבירול branch" },
  ];

  console.log('🔍 Searching for addresses and geocoding new cafes...\n');
  console.log('⚠️  Note: Some addresses need to be found manually first.\n');
  
  // For now, we'll create a template that can be filled in
  const results: Array<{
    name: string;
    city: string;
    address: string;
    type: string;
    coordinates?: GeocodeResult;
  }> = [];

  for (const cafe of newCafes) {
    if (!cafe.address) {
      console.log(`⚠️  ${cafe.name} (${cafe.city}) - Address needed, skipping geocoding...`);
      results.push({
        name: cafe.name,
        city: cafe.city,
        address: cafe.address,
        type: cafe.type
      });
      continue;
    }
    
    console.log(`📍 ${cafe.name}`);
    console.log(`   Address: ${cafe.address}, ${cafe.city}`);
    
    const result = await geocodeGoogle(cafe.name, cafe.address, cafe.city, apiKey);
    
    if (result) {
      console.log(`   ✅ Coordinates: ${result.lat}, ${result.lng}`);
      console.log(`   📍 Formatted: ${result.formatted_address}`);
      console.log(`   🎯 Confidence: ${result.confidence}\n`);
      
      results.push({
        name: cafe.name,
        city: cafe.city,
        address: cafe.address,
        type: cafe.type,
        coordinates: result
      });
    } else {
      console.log(`   ❌ Geocoding failed\n`);
      results.push({
        name: cafe.name,
        city: cafe.city,
        address: cafe.address,
        type: cafe.type
      });
    }
    
    // Small delay to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  // Save results
  const outputPath = path.join(process.cwd(), 'scripts', 'new-cafes-geocoding-results.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`\n📄 Results saved to: ${outputPath}`);
}

main().catch(console.error);

