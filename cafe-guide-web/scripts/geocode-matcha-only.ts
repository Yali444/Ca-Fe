/**
 * Script to geocode only matcha places
 */

import fs from 'fs';
import path from 'path';

// Load environment variables
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

import { MATCHA_PLACES_RAW } from '../src/data/matcha';

interface GeocodeResult {
  lat: number;
  lng: number;
  formatted_address?: string;
  confidence?: 'high' | 'medium' | 'low';
}

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
  'פרדס חנה כרכור': 'Pardes Hanna Karkur',
  'קיבוץ יגור': 'Kibbutz Yagur',
  'שריגים': 'Srigim',
  'ערד': 'Arad',
  'בית יהושע': 'Beit Yehoshua',
  'תל אביב - יפו': 'Tel Aviv-Yafo',
  'נמל תל אביב': 'Tel Aviv Port',
  'נמל יפו': 'Jaffa Port'
};

function translateAddressToEnglish(address: string, city: string): string {
  const englishCity = cityTranslations[city] || city;
  let englishAddress = address
    .replace(/רחוב/g, 'Street')
    .replace(/שדרות/g, 'Boulevard')
    .replace(/מצודה/g, 'Metzuda')
    .replace(/האנגר/g, 'Hangar')
    .replace(/נמל/g, 'Port');
  return `${englishAddress}, ${englishCity}, Israel`;
}

async function geocodeGoogle(address: string, city: string, apiKey: string): Promise<GeocodeResult | null> {
  try {
    const englishAddress = translateAddressToEnglish(address, city);
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
      
      if (data.status !== 'OK' && query === queries[0]) {
        continue;
      }
    }
    return null;
  } catch (error) {
    console.error(`Error geocoding "${address}":`, error);
    return null;
  }
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
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

async function main() {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    console.error('❌ GOOGLE_MAPS_API_KEY not found');
    return;
  }

  console.log(`\n🍵 Geocoding ${MATCHA_PLACES_RAW.length} matcha places...\n`);
  
  const results: Array<{
    id: number;
    name: string;
    address: string;
    oldCoords: { lat: number; lng: number };
    newCoords?: GeocodeResult;
  }> = [];

  for (const place of MATCHA_PLACES_RAW) {
    if (!place.address) continue;

    console.log(`📍 ${place.name}: ${place.address}, ${place.city}`);

    const geocodeResult = await geocodeGoogle(place.address, place.city, apiKey);

    if (geocodeResult) {
      const oldLat = place.coordinates.lat || 0;
      const oldLng = place.coordinates.lng || 0;
      const distance = calculateDistance(oldLat, oldLng, geocodeResult.lat, geocodeResult.lng);

      results.push({
        id: place.id,
        name: place.name,
        address: `${place.address}, ${place.city}, Israel`,
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

  const outputPath = path.join(process.cwd(), 'matcha-geocoding-results.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n✅ Results saved to: ${outputPath}`);
}

main().catch(console.error);

