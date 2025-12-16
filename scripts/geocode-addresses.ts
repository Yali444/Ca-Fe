/**
 * Geocoding Script for Cafe Coordinates
 * 
 * This script helps get accurate coordinates from addresses using:
 * 1. Google Geocoding API (recommended, requires API key)
 * 2. Nominatim (OpenStreetMap, free but less accurate)
 * 
 * Usage:
 * 1. Create .env.local file with: GOOGLE_MAPS_API_KEY=your_api_key
 * 2. Run with Google API: npx tsx scripts/geocode-addresses.ts --google
 * 3. Run with Nominatim: npx tsx scripts/geocode-addresses.ts
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

// Import the data files
import { getROASTERIES } from '../src/data/roasteries';
import { MATCHA_PLACES_RAW } from '../src/data/matcha';

interface GeocodeResult {
  lat: number;
  lng: number;
  formatted_address?: string;
  confidence?: 'high' | 'medium' | 'low';
}

/**
 * Geocode using Google Maps API (most accurate)
 */
async function geocodeGoogle(address: string, city: string, apiKey: string): Promise<GeocodeResult | null> {
  try {
    // Try English address first for better results
    const englishAddress = translateAddressToEnglish(address, city);
    
    // Try English first, then Hebrew
    const queries = [englishAddress, `${address}, ${city}, Israel`];
    
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
      
      // If English didn't work and we have Hebrew, try Hebrew (will happen in second iteration)
      if (data.status !== 'OK' && query === queries[0]) {
        continue; // Try next query (Hebrew)
      }
    }
    return null;
  } catch (error) {
    console.error(`Error geocoding "${address}":`, error);
    return null;
  }
}

/**
 * Translate common Hebrew city names to English
 */
const cityTranslations: Record<string, string> = {
  'תל אביב': 'Tel Aviv',
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
  'רמת השרון': 'Ramat HaSharon',
  'פרדס חנה-כרכור': 'Pardes Hanna-Karkur',
  'קיבוץ יגור': 'Kibbutz Yagur',
  'שריגים': 'Srigim',
  'ערד': 'Arad',
  'בית יהושע': 'Beit Yehoshua',
  'תל אביב - יפו': 'Tel Aviv-Yafo',
  'נמל תל אביב': 'Tel Aviv Port',
  'נמל יפו': 'Jaffa Port'
};

/**
 * Translate Hebrew address to English (basic translation)
 */
function translateAddressToEnglish(address: string, city: string): string {
  const englishCity = cityTranslations[city] || city;
  
  // Try to translate common street patterns
  // This is basic - you might want to enhance it
  let englishAddress = address
    .replace(/רחוב/g, 'Street')
    .replace(/שדרות/g, 'Boulevard')
    .replace(/מצודה/g, 'Metzuda')
    .replace(/האנגר/g, 'Hangar')
    .replace(/נמל/g, 'Port');
  
  return `${englishAddress}, ${englishCity}, Israel`;
}

/**
 * Geocode using Nominatim (OpenStreetMap, free but less accurate)
 * Tries English translation first, then falls back to Hebrew
 */
async function geocodeNominatim(address: string, city: string, cafeName?: string): Promise<GeocodeResult | null> {
  try {
    // Rate limit: 1 request per second (required by Nominatim)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Nominatim requires a User-Agent header
    const headers = {
      'User-Agent': 'CafeGuide-Geocoding-Tool/1.0 (contact: your-email@example.com)'
    };

    // Try multiple query variations for better results
    const queries = [
      // 1. English translation
      translateAddressToEnglish(address, city),
      // 2. Cafe name + city in English
      cafeName ? `${cafeName}, ${cityTranslations[city] || city}, Israel` : null,
      // 3. Original Hebrew address
      `${address}, ${city}, Israel`
    ].filter(Boolean) as string[];

    for (const query of queries) {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1`,
        { headers }
      );
      const data = await response.json();

      if (data.length > 0) {
        const result = data[0];
        // Check if result is in Israel (basic validation)
        if (result.address?.country === 'ישראל' || result.address?.country === 'Israel') {
          return {
            lat: parseFloat(result.lat),
            lng: parseFloat(result.lon),
            formatted_address: result.display_name,
            confidence: 'medium'
          };
        }
      }
      
      // Small delay between attempts
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return null;
  } catch (error) {
    console.error(`Error geocoding "${address}":`, error);
    return null;
  }
}

/**
 * Batch geocode all cafes
 */
async function geocodeAllCafes(useGoogle: boolean = false) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  
  if (useGoogle) {
    if (!apiKey) {
      console.error('❌ GOOGLE_MAPS_API_KEY not found in .env.local');
      console.log('💡 Get a free API key from: https://console.cloud.google.com/');
      console.log('💡 Enable "Geocoding API" in Google Cloud Console');
      console.log(`💡 Debug: Process.env keys: ${Object.keys(process.env).filter(k => k.includes('GOOGLE')).join(', ') || 'none'}`);
      return;
    }
    console.log(`✅ Using Google Geocoding API (key: ${apiKey.substring(0, 10)}...)`);
  }

  // Load roasteries data
  const ROASTERIES = getROASTERIES();

  const results: Array<{
    id: string | number;
    name: string;
    type: 'coffee' | 'matcha';
    address: string;
    oldCoords: { lat: number; lng: number };
    newCoords?: GeocodeResult;
  }> = [];

  console.log(`\n🔍 Geocoding ${ROASTERIES.length} coffee shops and ${MATCHA_PLACES_RAW.length} matcha places...\n`);
  console.log(`Using: ${useGoogle && apiKey ? 'Google Geocoding API' : 'Nominatim (OpenStreetMap)'}\n`);

  // Process coffee shops
  console.log('☕ COFFEE SHOPS:\n');
  for (const cafe of ROASTERIES) {
    if (!cafe.address) continue;

    const fullAddress = `${cafe.address}, ${cafe.city}, Israel`;
    console.log(`📍 ${cafe.name}: ${fullAddress}`);

    const geocodeResult = useGoogle && apiKey
      ? await geocodeGoogle(cafe.address, cafe.city || '', apiKey)
      : await geocodeNominatim(cafe.address, cafe.city || '', cafe.name);

    if (geocodeResult) {
      const oldLat = cafe.latitude || 0;
      const oldLng = cafe.longitude || 0;
      const distance = calculateDistance(oldLat, oldLng, geocodeResult.lat, geocodeResult.lng);

      results.push({
        id: cafe.id,
        name: cafe.name,
        type: 'coffee',
        address: fullAddress,
        oldCoords: { lat: oldLat, lng: oldLng },
        newCoords: geocodeResult
      });

      const diffIcon = distance > 0.5 ? '⚠️ ' : distance > 0.1 ? '🔶 ' : '✓ ';
      console.log(`   ✅ Found: ${geocodeResult.lat}, ${geocodeResult.lng} (${diffIcon}${distance.toFixed(3)}km difference)`);
      if (geocodeResult.formatted_address) {
        console.log(`   📝 ${geocodeResult.formatted_address}`);
      }
    } else {
      console.log(`   ❌ Not found`);
    }
    console.log('');
  }

  // Process matcha places
  console.log('\n🍵 MATCHA PLACES:\n');
  for (const place of MATCHA_PLACES_RAW) {
    if (!place.address) continue;

    const fullAddress = `${place.address}, ${place.city}, Israel`;
    console.log(`📍 ${place.name}: ${fullAddress}`);

    const geocodeResult = useGoogle && apiKey
      ? await geocodeGoogle(place.address, place.city, apiKey)
      : await geocodeNominatim(place.address, place.city, place.name);

    if (geocodeResult) {
      const oldLat = place.coordinates.lat || 0;
      const oldLng = place.coordinates.lng || 0;
      const distance = calculateDistance(oldLat, oldLng, geocodeResult.lat, geocodeResult.lng);

      results.push({
        id: place.id,
        name: place.name,
        type: 'matcha',
        address: fullAddress,
        oldCoords: { lat: oldLat, lng: oldLng },
        newCoords: geocodeResult
      });

      const diffIcon = distance > 0.5 ? '⚠️ ' : distance > 0.1 ? '🔶 ' : '✓ ';
      console.log(`   ✅ Found: ${geocodeResult.lat}, ${geocodeResult.lng} (${diffIcon}${distance.toFixed(3)}km difference)`);
      if (geocodeResult.formatted_address) {
        console.log(`   📝 ${geocodeResult.formatted_address}`);
      }
    } else {
      console.log(`   ❌ Not found`);
    }
    console.log('');
  }

  // Save results to JSON file for review
  const outputPath = path.join(process.cwd(), 'geocoding-results.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n✅ Results saved to: ${outputPath}`);
  console.log(`\n📋 Review the results, then manually update coordinates in the data files.\n`);
}

// Helper: Calculate distance between coordinates (Haversine formula)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
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

// Run if called directly
// Support command line argument: --google for Google API, otherwise Nominatim
if (require.main === module) {
  const useGoogle = process.argv.includes('--google');
  geocodeAllCafes(useGoogle).catch(console.error);
}

