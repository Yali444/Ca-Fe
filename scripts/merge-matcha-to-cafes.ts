import * as fs from 'fs';
import * as path from 'path';

interface MatchaPlace {
  id: number;
  name: string;
  city: string;
  address?: string;
  openingHours?: string | any;
  description?: string;
  vibeTags?: string[];
  instagramHandle?: string;
  website?: string;
  coordinates?: { lat: number; lng: number };
  heroImage?: string;
  matchaOrigin?: string;
  milkOptions?: string;
}

interface CafePlace {
  id: number;
  name: string;
  city?: string;
  address?: string;
  openingHours?: any;
  description?: string;
  brewMethods?: string;
  vibeTags?: string[];
  instagramHandle?: string;
  website?: string;
  coordinates?: { lat: number; lng: number };
  heroImage?: string;
  type?: 'coffee' | 'matcha';
  matchaOrigin?: string;
  milkOptions?: string;
  isRoaster?: boolean;
  sellsBeans?: boolean;
}

function main() {
  const cafesPath = path.join(__dirname, '../public/data/cafes.json');
  const matchaPath = path.join(__dirname, '../public/data/matcha.json');
  
  console.log('📖 Reading files...');
  const cafes: CafePlace[] = JSON.parse(fs.readFileSync(cafesPath, 'utf-8'));
  const matcha: MatchaPlace[] = JSON.parse(fs.readFileSync(matchaPath, 'utf-8'));
  
  console.log(`Found ${cafes.length} cafes and ${matcha.length} matcha places`);
  
  // Create a set of existing places (name + city)
  const existingPlaces = new Set<string>();
  cafes.forEach(cafe => {
    const key = `${cafe.name}|${cafe.city || ''}`;
    existingPlaces.add(key);
  });
  
  // Find matcha places that don't exist in cafes.json
  const missingPlaces: CafePlace[] = [];
  matcha.forEach(place => {
    const key = `${place.name}|${place.city || ''}`;
    if (!existingPlaces.has(key)) {
      // Convert matcha place to cafe format
      const cafePlace: CafePlace = {
        id: place.id,
        name: place.name,
        city: place.city,
        address: place.address,
        openingHours: typeof place.openingHours === 'string' 
          ? place.openingHours 
          : place.openingHours,
        description: place.description,
        vibeTags: place.vibeTags || [],
        instagramHandle: place.instagramHandle,
        website: place.website || '',
        coordinates: place.coordinates,
        heroImage: place.heroImage,
        type: 'matcha', // Mark as matcha
        matchaOrigin: place.matchaOrigin,
        milkOptions: place.milkOptions,
        isRoaster: false,
        sellsBeans: false,
      };
      missingPlaces.push(cafePlace);
    }
  });
  
  console.log(`\n✅ Found ${missingPlaces.length} matcha places to add to cafes.json`);
  
  if (missingPlaces.length > 0) {
    // Add missing places to cafes array
    const updatedCafes = [...cafes, ...missingPlaces];
    
    // Sort by ID to keep order
    updatedCafes.sort((a, b) => (a.id || 0) - (b.id || 0));
    
    // Write back to cafes.json
    fs.writeFileSync(
      cafesPath,
      JSON.stringify(updatedCafes, null, 2),
      'utf-8'
    );
    
    console.log(`\n✅ Successfully added ${missingPlaces.length} places to cafes.json`);
    console.log(`   Total cafes now: ${updatedCafes.length}`);
    
    // List the added places
    console.log('\n📋 Added places:');
    missingPlaces.forEach(place => {
      console.log(`   - ${place.name} (${place.city})`);
    });
  } else {
    console.log('\n✅ All matcha places already exist in cafes.json');
  }
}

main();
















