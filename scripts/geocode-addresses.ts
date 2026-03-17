/**
 * Geocoding Script for Cafe Coordinates
 * This script verifies all addresses in cafes.json using Google Geocoding API
 * and updates coordinates if they differ significantly.
 * 
 * Usage:
 * 1. Create .env.local file with: GOOGLE_MAPS_API_KEY=your_api_key
 * 2. Run: npx tsx scripts/geocode-addresses.ts --google --update
 * 
 * Options:
 * --google: Use Google Geocoding API (required for verification)
 * --update: Update cafes.json with verified coordinates (default: just verify)
 * --dry-run: Verify without updating (default behavior without --update)
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

// Cafe interface matching the JSON structure
interface Cafe {
  id: number;
  name: string;
  city: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  [key: string]: any; // Allow other properties
}

interface GeocodeResult {
  lat: number;
  lng: number;
  formatted_address?: string;
  confidence?: 'high' | 'medium' | 'low';
}

/**
 * Geocode using Google Maps API (most accurate)
 */
async function geocodeGoogle(address: string, city: string, apiKey: string, cafeName?: string): Promise<GeocodeResult | null> {
  try {
    // Try English address first for better results
    const englishAddress = translateAddressToEnglish(address, city);
    
    // Try multiple queries with cafe name included for better accuracy
    const queries = [
      // Most specific: cafe name + full address
      cafeName ? `${cafeName}, ${address}, ${city}, Israel` : null,
      // English version
      cafeName ? `${cafeName}, ${englishAddress}` : null,
      // Fallback to address only (skip generic addresses like "תל אביב")
      englishAddress && !englishAddress.match(/^(תל אביב|ירושלים|חיפה|באר שבע)$/i) ? englishAddress : null,
      `${address}, ${city}, Israel`
    ].filter(Boolean) as string[];
    
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
 */
async function geocodeNominatim(address: string, city: string, cafeName?: string): Promise<GeocodeResult | null> {
  try {
    // Rate limit: 1 request per second (required by Nominatim)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Nominatim requires a User-Agent header
    const headers = {
      'User-Agent': 'CafeGuide-Geocoding-Tool/1.0 (contact: your-email@example.com)'
    };

    const queries = [
      translateAddressToEnglish(address, city),
      cafeName ? `${cafeName}, ${cityTranslations[city] || city}, Israel` : null,
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
        if (result.address?.country === 'ישראל' || result.address?.country === 'Israel') {
          return {
            lat: parseFloat(result.lat),
            lng: parseFloat(result.lon),
            formatted_address: result.display_name,
            confidence: 'medium'
          };
        }
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return null;
  } catch (error) {
    console.error(`Error geocoding "${address}":`, error);
    return null;
  }
}

/**
 * Verify and update all cafes in cafes.json using Google Geocoding
 */
async function verifyAllCafes(updateFile: boolean = false) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    console.error('❌ GOOGLE_MAPS_API_KEY not found in .env.local');
    console.error('   Please create .env.local file with: GOOGLE_MAPS_API_KEY=your_api_key');
    return;
  }
  
  console.log(`✅ Using Google Geocoding API (key: ${apiKey.substring(0, 10)}...)`);
  console.log(`📝 Mode: ${updateFile ? 'UPDATE (will modify cafes.json)' : 'VERIFY ONLY (dry run)'}\n`);

  // Load cafes.json directly
  const cafesPath = path.join(process.cwd(), 'public', 'data', 'cafes.json');
  console.log(`Reading cafes from: ${cafesPath}`);
  
  if (!fs.existsSync(cafesPath)) {
    console.error(`❌ Data file not found at ${cafesPath}`);
    return;
  }

  const originalCafesContent = fs.readFileSync(cafesPath, 'utf-8');
  const cafes: Cafe[] = JSON.parse(originalCafesContent);
  console.log(`Found ${cafes.length} cafes to verify\n`);
  
  // Validate all cafes have required fields
  const invalidCafes = cafes.filter(cafe => !cafe.name || !cafe.address || !cafe.city);
  if (invalidCafes.length > 0) {
    console.error(`❌ Found ${invalidCafes.length} cafes with missing required fields (name, address, or city):`);
    invalidCafes.forEach(cafe => {
      console.error(`   - ID ${cafe.id}: ${cafe.name || 'NO NAME'} at ${cafe.address || 'NO ADDRESS'}, ${cafe.city || 'NO CITY'}`);
    });
    console.error(`\n⚠️  These cafes will be skipped during geocoding.`);
  }

  const results: Array<{
    id: number;
    name: string;
    address: string;
    oldCoords: { lat: number; lng: number };
    newCoords?: GeocodeResult;
    distance: number;
    updated: boolean;
  }> = [];

  let updatedCount = 0;
  let verifiedCount = 0;
  let errorCount = 0;

  // Process each cafe
  for (let i = 0; i < cafes.length; i++) {
    const cafe = cafes[i];
    
    // Skip cafes with missing required fields
    if (!cafe.name || !cafe.address || !cafe.city) {
      console.log(`⏭️  [${i + 1}/${cafes.length}] ID ${cafe.id}: Missing required fields, skipping`);
      continue;
    }

    const fullAddress = `${cafe.address}, ${cafe.city}, Israel`;
    console.log(`📍 [${i + 1}/${cafes.length}] ${cafe.name}`);
    console.log(`   Address: ${fullAddress}`);

    // Add delay to respect API rate limits (50 requests per second for Google)
    if (i > 0 && i % 10 === 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const geocodeResult = await geocodeGoogle(cafe.address, cafe.city || '', apiKey, cafe.name);

    if (geocodeResult) {
      // Ensure coordinates object exists
      if (!cafe.coordinates) {
        cafe.coordinates = { lat: 0, lng: 0 };
      }
      
      const oldLat = cafe.coordinates.lat || 0;
      const oldLng = cafe.coordinates.lng || 0;
      const hasExistingCoords = oldLat !== 0 || oldLng !== 0;
      const distance = hasExistingCoords ? calculateDistance(oldLat, oldLng, geocodeResult.lat, geocodeResult.lng) : Infinity;

      // Check for potential duplicates with existing cafes
      const nearbyCafes = findNearbyCafes(geocodeResult.lat, geocodeResult.lng, cafes, cafe.id);
      if (nearbyCafes.length > 0) {
        console.log(`   ⚠️  WARNING: Coordinates are very close to existing cafes:`);
        nearbyCafes.forEach(nearby => {
          const dist = calculateDistance(geocodeResult.lat, geocodeResult.lng, nearby.coordinates!.lat, nearby.coordinates!.lng);
          console.log(`      - "${nearby.name}" (ID: ${nearby.id}) - ${dist.toFixed(3)}km away`);
        });
        console.log(`   💡 This might indicate a geocoding error for chains with multiple branches`);
      }

      const shouldUpdate = !hasExistingCoords || distance > 0.01; // Update if no coords or difference is more than ~10 meters

      results.push({
        id: cafe.id,
        name: cafe.name,
        address: fullAddress,
        oldCoords: { lat: oldLat, lng: oldLng },
        newCoords: geocodeResult,
        distance: hasExistingCoords ? distance : 0,
        updated: shouldUpdate && updateFile
      });

      if (geocodeResult.formatted_address) {
        console.log(`   📝 Verified: ${geocodeResult.formatted_address}`);
      }

      if (!hasExistingCoords) {
        console.log(`   🆕 No existing coordinates found`);
        if (updateFile) {
          cafe.coordinates.lat = geocodeResult.lat;
          cafe.coordinates.lng = geocodeResult.lng;
          console.log(`   ✏️  Added coordinates: ${geocodeResult.lat}, ${geocodeResult.lng}`);
          updatedCount++;
        }
        verifiedCount++;
      } else if (distance < 0.01) {
        console.log(`   ✅ Coordinates match (${distance.toFixed(4)}km difference)`);
        verifiedCount++;
      } else {
        const diffIcon = distance > 0.5 ? '⚠️ ' : distance > 0.1 ? '🔶 ' : '🔸 ';
        console.log(`   ${diffIcon}Difference: ${distance.toFixed(3)}km`);
        console.log(`   Old: ${oldLat}, ${oldLng}`);
        console.log(`   New: ${geocodeResult.lat}, ${geocodeResult.lng}`);
        
        if (updateFile && shouldUpdate) {
          cafe.coordinates.lat = geocodeResult.lat;
          cafe.coordinates.lng = geocodeResult.lng;
          console.log(`   ✏️  Updated coordinates in memory`);
          updatedCount++;
        } else if (updateFile) {
          console.log(`   ✓  Keeping existing coordinates (difference too small)`);
        }
        verifiedCount++;
      }
    } else {
      console.log(`   ❌ Could not geocode address`);
      errorCount++;
      results.push({
        id: cafe.id,
        name: cafe.name,
        address: fullAddress,
        oldCoords: cafe.coordinates || { lat: 0, lng: 0 },
        distance: 0,
        updated: false
      });
    }
    console.log('');
  }

  // Save updated cafes.json if in update mode
  if (updateFile && updatedCount > 0) {
    const backupPath = cafesPath + '.backup';
    fs.writeFileSync(backupPath, originalCafesContent);
    console.log(`💾 Backup saved to: ${backupPath}`);
    
    fs.writeFileSync(cafesPath, JSON.stringify(cafes, null, 2));
    console.log(`✅ Updated ${updatedCount} coordinates in cafes.json`);
  }

  // Save verification results
  const outputPath = path.join(process.cwd(), 'geocoding-verification-results.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  
  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Verified: ${verifiedCount}`);
  console.log(`   ✏️  Updated: ${updatedCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📋 Results saved to: ${outputPath}`);
  
  if (!updateFile) {
    console.log(`\n💡 To update cafes.json with verified coordinates, run with --update flag`);
  }
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

// Helper: Check if coordinates are too close to existing cafes (potential duplicate)
function findNearbyCafes(targetLat: number, targetLng: number, cafes: Cafe[], currentCafeId: number, thresholdKm: number = 0.05): Cafe[] {
  return cafes.filter(cafe => 
    cafe.id !== currentCafeId && 
    cafe.coordinates && 
    cafe.coordinates.lat !== 0 && 
    cafe.coordinates.lng !== 0 &&
    calculateDistance(targetLat, targetLng, cafe.coordinates.lat, cafe.coordinates.lng) < thresholdKm
  );
}

// Helper: Validate that cafe actually exists in our database
function validateCafeExists(cafeName: string, cafes: Cafe[]): boolean {
  return cafes.some(cafe => cafe.name === cafeName);
}

// Run if called directly
if (require.main === module) {
  const useGoogle = process.argv.includes('--google');
  const updateFile = process.argv.includes('--update');
  
  if (!useGoogle) {
    console.error('❌ This script requires --google flag to use Google Geocoding API');
    console.error('   Usage: npx tsx scripts/geocode-addresses.ts --google [--update]');
    process.exit(1);
  }
  
  verifyAllCafes(updateFile).catch(console.error);
}
