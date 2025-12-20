/**
 * Geocode Jera gas station branch in Rishon LeZion
 * Address: זאב שלנג, ראשון לציון (תחנת דלק)
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
      'ראשון לציון': 'Rishon LeZion',
    };
    const englishCity = cityTranslations[city] || city;
    
    // Try multiple query variations
    const queries = [
      `${address}, ${englishCity}, Israel`,
      `זאב שלנג ${englishCity} gas station`,
      `זאב שלנג ${englishCity} תחנת דלק`,
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
  const place = {
    name: 'ג\'רה (תחנת דלק זאב שלנג)',
    nameEn: 'Jera (Zeev Shlang Gas Station)',
    city: 'ראשון לציון',
    address: 'זאב שלנג, ראשון לציון (תחנת דלק)'
  };

  console.log('Geocoding Jera gas station branch...\n');
  console.log(`Geocoding: ${place.name} - ${place.address}`);
  
  const result = await geocodeGoogle(place.address, place.city, API_KEY);
  
  if (result) {
    console.log(`✓ Found coordinates: ${result.lat}, ${result.lng}`);
    console.log(`  Formatted address: ${result.formatted_address}`);
    console.log(`  Confidence: ${result.confidence}\n`);
    
    // Save to results
    (place as any).coordinates = { lat: result.lat, lng: result.lng };
    (place as any).formatted_address = result.formatted_address;
    
    // Save results to JSON
    const resultsPath = path.join(process.cwd(), 'geocoding-results-jera-gas.json');
    fs.writeFileSync(resultsPath, JSON.stringify(place, null, 2));
    console.log(`\nResults saved to: ${resultsPath}`);
  } else {
    console.log(`✗ Failed to geocode\n`);
  }
}

main().catch(console.error);














