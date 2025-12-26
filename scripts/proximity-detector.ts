import * as fs from 'fs';
import * as path from 'path';

interface Coordinates {
  lat: number;
  lng: number;
}

interface Cafe {
  id: number;
  name: string;
  city?: string;
  address?: string;
  coordinates: Coordinates;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRadians(coord2.lat - coord1.lat);
  const dLon = toRadians(coord2.lng - coord1.lng);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(coord1.lat)) *
      Math.cos(toRadians(coord2.lat)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

function main() {
  const filePath = path.join(__dirname, '../public/data/cafes.json');
  
  console.log('🔍 Proximity Detector - Scanning for cafes within 10 meters...\n');
  console.log(`Reading file: ${filePath}\n`);
  
  // Read and parse JSON file
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const cafes: Cafe[] = JSON.parse(fileContent);
  
  console.log(`Found ${cafes.length} cafes in total.\n`);
  console.log('Scanning coordinates...\n');
  
  const suspiciousPairs: Array<{
    cafe1: Cafe;
    cafe2: Cafe;
    distance: number;
  }> = [];
  
  // Compare every cafe against every other cafe
  for (let i = 0; i < cafes.length; i++) {
    const cafe1 = cafes[i];
    
    // Skip if coordinates are missing
    if (!cafe1.coordinates || !cafe1.coordinates.lat || !cafe1.coordinates.lng) {
      continue;
    }
    
    for (let j = i + 1; j < cafes.length; j++) {
      const cafe2 = cafes[j];
      
      // Skip if coordinates are missing
      if (!cafe2.coordinates || !cafe2.coordinates.lat || !cafe2.coordinates.lng) {
        continue;
      }
      
      // Calculate distance
      const distance = calculateDistance(cafe1.coordinates, cafe2.coordinates);
      
      // If within 10 meters, add to suspicious pairs
      if (distance <= 10) {
        suspiciousPairs.push({
          cafe1,
          cafe2,
          distance
        });
      }
    }
  }
  
  // Sort by distance (closest first)
  suspiciousPairs.sort((a, b) => a.distance - b.distance);
  
  // Report results
  console.log('='.repeat(80));
  console.log(`⚠️  SUSPICIOUS PAIRS FOUND: ${suspiciousPairs.length}`);
  console.log('='.repeat(80));
  console.log();
  
  if (suspiciousPairs.length === 0) {
    console.log('✅ No suspicious pairs found! All cafes are at least 10 meters apart.');
  } else {
    suspiciousPairs.forEach((pair, index) => {
      const { cafe1, cafe2, distance } = pair;
      console.log(`${index + 1}. ID ${cafe1.id} "${cafe1.name}"`);
      console.log(`   ID ${cafe2.id} "${cafe2.name}"`);
      console.log(`   Distance: ${distance.toFixed(2)} meters`);
      if (cafe1.address) console.log(`   Address 1: ${cafe1.address}`);
      if (cafe2.address) console.log(`   Address 2: ${cafe2.address}`);
      if (cafe1.city) console.log(`   City 1: ${cafe1.city}`);
      if (cafe2.city) console.log(`   City 2: ${cafe2.city}`);
      console.log();
    });
  }
  
  console.log('='.repeat(80));
  console.log('Scan complete!');
}

main();











