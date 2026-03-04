/**
 * Geocode the 3 new Jerusalem cafes that use Lev Coffee
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

  const newCafes = [
    {
      name: "CASA LAVI",
      address: "בית לחם 41, ירושלים",
      city: "ירושלים"
    },
    {
      name: "Rova Coffee House",
      address: "בית אל 8, ירושלים",
      city: "ירושלים"
    },
    {
      name: "Patachou Boutique",
      address: "אגריפס 88, ירושלים",
      city: "ירושלים"
    }
  ];

  console.log('🔍 Geocoding new Jerusalem cafes...\n');
  
  for (const cafe of newCafes) {
    if (!cafe.address) {
      console.log(`⚠️  ${cafe.name} - Address not found, skipping...\n`);
      continue;
    }
    
    console.log(`📍 ${cafe.name}`);
    console.log(`   Address: ${cafe.address}, ${cafe.city}`);
    
    const result = await geocodeGoogle(cafe.name, cafe.address, cafe.city, apiKey);
    
    if (result) {
      console.log(`   ✅ Coordinates: ${result.lat}, ${result.lng}`);
      console.log(`   📍 Formatted: ${result.formatted_address}`);
      console.log(`   🎯 Confidence: ${result.confidence}\n`);
    } else {
      console.log(`   ❌ Geocoding failed\n`);
    }
    
    // Small delay to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 200));
  }
}

main().catch(console.error);

