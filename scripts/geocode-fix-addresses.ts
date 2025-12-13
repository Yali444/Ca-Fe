/**
 * Fix addresses and geocode:
 * - קפה 51 (תל אביב) - should be שדרות החיל 12, תל אביב (not אחד העם 40)
 * - קפה אחד העם - should be אחד העם 51, תל אביב
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

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

if (!GOOGLE_MAPS_API_KEY) {
  console.error('GOOGLE_MAPS_API_KEY not found in .env.local');
  process.exit(1);
}

// TypeScript now knows GOOGLE_MAPS_API_KEY is defined after the check
const API_KEY: string = GOOGLE_MAPS_API_KEY;

interface GeocodeResult {
  lat: number;
  lng: number;
  formatted_address?: string;
  confidence?: 'high' | 'medium' | 'low';
}

async function geocodeGoogle(address: string, city: string, apiKey: string): Promise<GeocodeResult | null> {
  try {
    // Translate city to English
    const cityTranslations: Record<string, string> = {
      'ירושלים': 'Jerusalem',
      'תל אביב': 'Tel Aviv',
    };
    const englishCity = cityTranslations[city] || city;
    
    // Try English address first
    const queries = [
      `${address}, ${englishCity}, Israel`,
      `${address}, ${city}, Israel`
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
    console.error(`Error geocoding "${address}":`, error);
    return null;
  }
}

async function main() {
  const places = [
    {
      name: 'קפה 51 (תל אביב)',
      city: 'תל אביב',
      address: 'שדרות החיל 12, תל אביב'
    },
    {
      name: 'קפה אחד העם',
      city: 'תל אביב',
      address: 'אחד העם 51, תל אביב'
    }
  ];

  console.log('Geocoding cafes with corrected addresses...\n');

  for (const place of places) {
    console.log(`Geocoding: ${place.name} - ${place.address}`);
    const result = await geocodeGoogle(place.address, place.city, API_KEY);
    
    if (result) {
      console.log(`✓ Found coordinates: ${result.lat}, ${result.lng}`);
      console.log(`  Formatted address: ${result.formatted_address}`);
      console.log(`  Confidence: ${result.confidence}\n`);
      
      // Save to results
      (place as any).coordinates = { lat: result.lat, lng: result.lng };
      (place as any).formatted_address = result.formatted_address;
    } else {
      console.log(`✗ Failed to geocode\n`);
    }
    
    // Wait a bit to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  // Save results to JSON
  const resultsPath = path.join(process.cwd(), 'geocoding-results-fix-addresses.json');
  fs.writeFileSync(resultsPath, JSON.stringify(places, null, 2));
  console.log(`\nResults saved to: ${resultsPath}`);
}

main().catch(console.error);

