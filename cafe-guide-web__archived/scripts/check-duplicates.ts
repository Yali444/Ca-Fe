import fs from 'fs';
import path from 'path';

// Read cafes.json
const cafesPath = path.join(process.cwd(), 'public', 'data', 'cafes.json');
const cafesData = JSON.parse(fs.readFileSync(cafesPath, 'utf-8'));

// Read matcha.ts - we need to extract the MATCHA_PLACES_RAW array
const matchaPath = path.join(process.cwd(), 'src', 'data', 'matcha.ts');
const matchaContent = fs.readFileSync(matchaPath, 'utf-8');

// Extract MATCHA_PLACES_RAW array using regex
const matchaArrayMatch = matchaContent.match(/export const MATCHA_PLACES_RAW: MatchaPlaceRaw\[\] = (\[[\s\S]*?\]);/);
if (!matchaArrayMatch) {
  console.error('Could not find MATCHA_PLACES_RAW in matcha.ts');
  process.exit(1);
}

// Evaluate the array (this is a bit hacky but works for this use case)
const matchaData = eval(matchaArrayMatch[1]);

// Create maps by name + city
const cafesMap = new Map<string, any>();
cafesData.forEach((cafe: any) => {
  const key = `${cafe.name}-${cafe.city || ''}`;
  cafesMap.set(key, cafe);
});

const matchaMap = new Map<string, any>();
matchaData.forEach((place: any) => {
  const key = `${place.name}-${place.city || ''}`;
  matchaMap.set(key, place);
});

// Find duplicates
const duplicates: Array<{
  name: string;
  city: string;
  cafeHasBrewMethods: boolean;
  matchaHasBrewMethods: boolean;
  shouldBeMatchaOnly: boolean;
}> = [];

const allKeys = new Set([...cafesMap.keys(), ...matchaMap.keys()]);

allKeys.forEach(key => {
  const cafe = cafesMap.get(key);
  const matcha = matchaMap.get(key);
  
  if (cafe && matcha) {
    const cafeBrewMethods = cafe.brewMethods;
    const cafeHasBrewMethods = cafeBrewMethods && 
      (typeof cafeBrewMethods === 'string' ? cafeBrewMethods.trim().length > 0 : 
       Array.isArray(cafeBrewMethods) ? cafeBrewMethods.length > 0 : false);
    
    const matchaHasBrewMethods = false; // Matcha places don't have brewMethods in the raw data
    
    // Should be matcha-only if cafe has brewMethods but matcha doesn't
    const shouldBeMatchaOnly = cafeHasBrewMethods && !matchaHasBrewMethods;
    
    duplicates.push({
      name: cafe.name,
      city: cafe.city,
      cafeHasBrewMethods,
      matchaHasBrewMethods,
      shouldBeMatchaOnly
    });
  }
});

console.log('\n=== DUPLICATE PLACES ANALYSIS ===\n');
console.log(`Found ${duplicates.length} places that appear in both cafes.json and matcha.ts:\n`);

duplicates.forEach(dup => {
  const status = dup.shouldBeMatchaOnly ? '⚠️  SHOULD BE MATCHA-ONLY' : '✓ OK (has both or coffee-only)';
  console.log(`${status}`);
  console.log(`  Name: ${dup.name}`);
  console.log(`  City: ${dup.city}`);
  console.log(`  Cafe has brewMethods: ${dup.cafeHasBrewMethods}`);
  console.log(`  Matcha has brewMethods: ${dup.matchaHasBrewMethods}`);
  console.log('');
});

const matchaOnlyPlaces = duplicates.filter(d => d.shouldBeMatchaOnly);
console.log(`\n=== SUMMARY ===`);
console.log(`Total duplicates: ${duplicates.length}`);
console.log(`Should be matcha-only: ${matchaOnlyPlaces.length}`);
console.log(`\nMatcha-only places:`);
matchaOnlyPlaces.forEach(p => {
  console.log(`  - ${p.name} (${p.city})`);
});
