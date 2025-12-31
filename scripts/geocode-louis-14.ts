/**
 * Geocode קפה לואי and קפה 14
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

async function geocodeGoogle(address: string, apiKey: string) {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}&region=il`
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
    
    return null;
  } catch (error) {
    console.error(`Error geocoding "${address}":`, error);
    return null;
  }
}

async function main() {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    console.error('❌ GOOGLE_MAPS_API_KEY not found in .env.local');
    process.exit(1);
  }

  const cafes = [
    { name: "קפה לואי", address: "Malkhi Yisrael St 4, Tel Aviv-Yafo" },
    { name: "קפה 14", address: "Nahal HaBsor St 1, Tel Aviv-Yafo" }
  ];

  console.log('🔍 Geocoding קפה לואי and קפה 14...\n');
  
  for (const cafe of cafes) {
    console.log(`📍 ${cafe.name}`);
    console.log(`   Address: ${cafe.address}`);
    
    const result = await geocodeGoogle(cafe.address, apiKey);
    
    if (result) {
      console.log(`   ✅ Coordinates: ${result.lat}, ${result.lng}`);
      console.log(`   📍 Formatted: ${result.formatted_address}`);
      console.log(`   🎯 Confidence: ${result.confidence}\n`);
    } else {
      console.log(`   ❌ Geocoding failed\n`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
  }
}

main().catch(console.error);




























