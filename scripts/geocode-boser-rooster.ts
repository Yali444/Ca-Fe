/**
 * Geocode Boser and Rooster Coffee cafes using Google Maps Geocoding API
 */

import fs from 'fs';
import path from 'path';

// Load environment variables from .env.local or env.local manually
const envPaths = [
  path.join(process.cwd(), '.env.local'),
  path.join(process.cwd(), 'env.local')
];

// Load all found env files (don't break on first)
for (const envPath of envPaths) {
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
}

interface Cafe {
  id: string;
  name: string;
  hebrewName: string;
  city: string;
  address: string;
  region: string;
  type: string;
  description: string;
  latitude: number;
  longitude: number;
  instagram: string;
  googleMapsUrl: string;
  website?: string;
}

interface GeocodeResult {
  lat: number;
  lng: number;
  formatted_address?: string;
  confidence?: 'high' | 'medium' | 'low';
}

const cafes: Cafe[] = [
  {
    "id": "boser-tlv",
    "name": "Boser",
    "hebrewName": "בוסר",
    "city": "Tel Aviv",
    "address": "HaHashmal 12",
    "region": "center",
    "type": "coffee",
    "description": "יין, אוכל וקפה באווירה מיוחדת.",
    "latitude": 0,
    "longitude": 0,
    "instagram": "boser.tlv",
    "googleMapsUrl": ""
  },
  {
    "id": "rooster-coffee-ph",
    "name": "Rooster Coffee",
    "hebrewName": "רוסטר קפה",
    "city": "Pardes Hanna-Karkur",
    "address": "Kana'im St 2",
    "region": "north",
    "type": "coffee",
    "description": "בית קלייה מקומי ואיכותי בפרדס חנה.",
    "latitude": 0,
    "longitude": 0,
    "instagram": "rooster_coffee_roaster",
    "website": "https://www.rooster-coffee.co.il/",
    "googleMapsUrl": ""
  }
];

/**
 * Translate city names to Hebrew for geocoding
 */
const cityTranslations: Record<string, string> = {
  'Tel Aviv': 'תל אביב',
  'Pardes Hanna-Karkur': 'פרדס חנה-כרכור',
};

function translateCityToHebrew(city: string): string {
  return cityTranslations[city] || city;
}

/**
 * Geocode using OpenStreetMap Nominatim API (free, no API key needed)
 */
async function geocodeNominatim(cafe: Cafe): Promise<GeocodeResult | null> {
  try {
    const cityHebrew = translateCityToHebrew(cafe.city);
    
    // Try multiple query variations for better accuracy
    const queries = [
      `${cafe.address}, ${cityHebrew}, Israel`,
      `${cafe.hebrewName}, ${cafe.address}, ${cityHebrew}, Israel`,
      `${cafe.name}, ${cafe.address}, ${cafe.city}, Israel`,
      `${cafe.address}, ${cafe.city}, Israel`,
    ];
    
    for (const query of queries) {
      // Use Nominatim API (free, no key required)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=il`
      );
      
      // Add delay to respect rate limits (1 request per second)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const data = await response.json();

      if (Array.isArray(data) && data.length > 0) {
        const result = data[0];
        return {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
          formatted_address: result.display_name,
          confidence: 'medium'
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Error geocoding "${cafe.name}":`, error);
    return null;
  }
}

/**
 * Geocode using Google Maps API (if API key is available)
 */
async function geocodeGoogle(cafe: Cafe, apiKey: string): Promise<GeocodeResult | null> {
  try {
    const cityHebrew = translateCityToHebrew(cafe.city);
    
    // Try multiple query variations for better accuracy
    const queries = [
      `${cafe.address}, ${cityHebrew}, Israel`,
      `${cafe.hebrewName}, ${cafe.address}, ${cityHebrew}, Israel`,
      `${cafe.name}, ${cafe.address}, ${cafe.city}, Israel`,
      `${cafe.address}, ${cafe.city}, Israel`,
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
    console.error(`Error geocoding "${cafe.name}":`, error);
    return null;
  }
}

/**
 * Main function
 */
async function main() {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const useGoogle = !!apiKey;
  
  if (useGoogle) {
    console.log('🔍 Geocoding new cafes using Google Maps API...\n');
  } else {
    console.log('🔍 Geocoding new cafes using OpenStreetMap Nominatim API...\n');
    console.log('   (Note: Using free service, may be slower due to rate limits)\n');
  }
  
  const results: Array<Cafe & GeocodeResult & { status: string }> = [];
  
  for (let i = 0; i < cafes.length; i++) {
    const cafe = cafes[i];
    console.log(`[${i + 1}/${cafes.length}] Geocoding: ${cafe.name} (${cafe.hebrewName})`);
    console.log(`   Address: ${cafe.address}, ${cafe.city}`);
    
    const geocodeResult = useGoogle 
      ? await geocodeGoogle(cafe, apiKey!)
      : await geocodeNominatim(cafe);
    
    if (geocodeResult) {
      console.log(`   ✅ Found: ${geocodeResult.lat}, ${geocodeResult.lng}`);
      console.log(`   📍 Address: ${geocodeResult.formatted_address}`);
      console.log(`   🎯 Confidence: ${geocodeResult.confidence}\n`);
      
      results.push({
        ...cafe,
        ...geocodeResult,
        latitude: geocodeResult.lat,
        longitude: geocodeResult.lng,
        status: 'success'
      });
    } else {
      console.log(`   ❌ Not found\n`);
      results.push({
        ...cafe,
        lat: 0,
        lng: 0,
        status: 'failed'
      });
    }
    
    // Small delay to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  // Save results to JSON file
  const outputPath = path.join(process.cwd(), 'scripts', 'boser-rooster-geocoding-results.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');
  
  console.log(`\n✅ Geocoding complete!`);
  console.log(`📄 Results saved to: ${outputPath}`);
  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Success: ${results.filter(r => r.status === 'success').length}`);
  console.log(`   ❌ Failed: ${results.filter(r => r.status === 'failed').length}`);
  
  // Print formatted results for easy copy-paste
  console.log(`\n📋 Formatted results with coordinates:\n`);
  results.forEach(result => {
    if (result.status === 'success') {
      console.log(`{`);
      console.log(`  "id": "${result.id}",`);
      console.log(`  "name": "${result.name}",`);
      console.log(`  "hebrewName": "${result.hebrewName}",`);
      console.log(`  "city": "${result.city}",`);
      console.log(`  "address": "${result.address}",`);
      console.log(`  "region": "${result.region}",`);
      console.log(`  "type": "${result.type}",`);
      console.log(`  "description": "${result.description}",`);
      console.log(`  "latitude": ${result.latitude},`);
      console.log(`  "longitude": ${result.longitude},`);
      console.log(`  "instagram": "${result.instagram}",`);
      console.log(`  "googleMapsUrl": "${result.googleMapsUrl}"${result.website ? ',' : ''}`);
      if (result.website) {
        console.log(`  "website": "${result.website}"`);
      }
      console.log(`},`);
    }
  });
}

main().catch(console.error);






