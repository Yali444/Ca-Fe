/**
 * Geocode Reut Roasters cafe
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
  place_id?: string;
  confidence?: 'high' | 'medium' | 'low';
}

const place: Place = {
  name: "רעות - מקום של קפה",
  address: "מתחם יקב תבור, Sderot Kakal",
  city: "Kfar Tavor"
};

/**
 * Geocode using Google Maps API
 */
async function geocodeGoogle(place: Place, apiKey: string): Promise<GeocodeResult | null> {
  try {
    // Try multiple query variations for better accuracy
    const queries = [
      `${place.address}, ${place.city}, Israel`,
      `${place.name}, ${place.address}, ${place.city}, Israel`,
      `Tabor Winery, ${place.city}, Israel`,
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
          place_id: result.place_id,
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

  console.log('🔍 Geocoding Reut Roasters...\n');
  
  const geocodeResult = await geocodeGoogle(place, apiKey);
  
  if (geocodeResult) {
    console.log(`✅ Found: ${geocodeResult.lat}, ${geocodeResult.lng}`);
    console.log(`📍 Address: ${geocodeResult.formatted_address}`);
    console.log(`🆔 Place ID: ${geocodeResult.place_id}`);
    console.log(`🎯 Confidence: ${geocodeResult.confidence}\n`);
    
    // Save result to JSON file
    const outputPath = path.join(process.cwd(), 'scripts', 'reut-geocoding-result.json');
    fs.writeFileSync(outputPath, JSON.stringify({
      ...place,
      ...geocodeResult,
      status: 'success'
    }, null, 2), 'utf-8');
    
    console.log(`📄 Result saved to: ${outputPath}`);
  } else {
    console.log(`❌ Not found`);
  }
}

main().catch(console.error);
