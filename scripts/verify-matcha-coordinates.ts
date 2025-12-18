/**
 * Verify and update all coordinates in matcha.ts using Google Geocoding API
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

// Import the data
import { MATCHA_PLACES_RAW } from '../src/data/matcha';

interface GeocodeResult {
  lat: number;
  lng: number;
  formatted_address?: string;
  confidence?: 'high' | 'medium' | 'low';
  distance?: number; // Distance from current coordinates in km
}

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
  'פרדס חנה-כרכור': 'Pardes Hanna-Karkur',
};

function translateCity(city: string): string {
  return cityTranslations[city] || city;
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
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

  console.log('🔍 Verifying coordinates for all matcha places using Google Maps API...\n');
  console.log(`Total matcha places to verify: ${MATCHA_PLACES_RAW.length}\n`);
  
  const results: Array<{
    id: number;
    name: string;
    address: string;
    city: string;
    current: { lat: number; lng: number };
    geocoded: GeocodeResult | null;
    needsUpdate: boolean;
  }> = [];
  
  for (let i = 0; i < MATCHA_PLACES_RAW.length; i++) {
    const place = MATCHA_PLACES_RAW[i];
    console.log(`[${i + 1}/${MATCHA_PLACES_RAW.length}] ${place.name} - ${place.address}, ${place.city}`);
    
    const geocodeResult = await geocodeGoogle(place.name, place.address, place.city, apiKey);
    
    if (geocodeResult) {
      const distance = calculateDistance(
        place.coordinates.lat,
        place.coordinates.lng,
        geocodeResult.lat,
        geocodeResult.lng
      );
      
      geocodeResult.distance = distance;
      const needsUpdate = distance > 0.1; // Update if distance > 100 meters
      
      if (needsUpdate) {
        console.log(`  ⚠️  Needs update!`);
        console.log(`     Current: ${place.coordinates.lat}, ${place.coordinates.lng}`);
        console.log(`     Geocoded: ${geocodeResult.lat}, ${geocodeResult.lng}`);
        console.log(`     Distance: ${distance.toFixed(3)} km`);
        console.log(`     📍 Address: ${geocodeResult.formatted_address}`);
        console.log(`     🎯 Confidence: ${geocodeResult.confidence}\n`);
      } else {
        console.log(`  ✅ Accurate (distance: ${distance.toFixed(3)} km)\n`);
      }
      
      results.push({
        id: place.id,
        name: place.name,
        address: place.address,
        city: place.city,
        current: place.coordinates,
        geocoded: geocodeResult,
        needsUpdate
      });
    } else {
      console.log(`  ❌ Geocoding failed\n`);
      results.push({
        id: place.id,
        name: place.name,
        address: place.address,
        city: place.city,
        current: place.coordinates,
        geocoded: null,
        needsUpdate: false
      });
    }
    
    // Small delay to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  // Save results to JSON file
  const outputPath = path.join(process.cwd(), 'scripts', 'matcha-coordinate-verification-results.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');
  
  const needsUpdate = results.filter(r => r.needsUpdate).length;
  const accurate = results.filter(r => r.geocoded && !r.needsUpdate).length;
  const failed = results.filter(r => !r.geocoded).length;
  
  console.log(`\n✅ Verification complete!`);
  console.log(`📄 Results saved to: ${outputPath}`);
  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Accurate: ${accurate}`);
  console.log(`   ⚠️  Needs update: ${needsUpdate}`);
  console.log(`   ❌ Failed: ${failed}`);
  
  if (needsUpdate > 0) {
    console.log(`\n📋 Matcha places that need coordinate updates:\n`);
    results
      .filter(r => r.needsUpdate && r.geocoded)
      .forEach(result => {
        console.log(`ID ${result.id}: ${result.name}`);
        console.log(`  Current: { lat: ${result.current.lat}, lng: ${result.current.lng} }`);
        console.log(`  Update to: { lat: ${result.geocoded!.lat}, lng: ${result.geocoded!.lng} }`);
        console.log(`  Distance: ${result.geocoded!.distance!.toFixed(3)} km\n`);
      });
  }
}

main().catch(console.error);













