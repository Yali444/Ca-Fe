import * as fs from 'fs';
import * as path from 'path';

interface Cafe {
  id: number;
  name: string;
  city?: string;
  address?: string;
  [key: string]: any;
}

function main() {
  const cafesPath = path.join(__dirname, '../public/data/cafes.json');
  
  console.log('🔍 Cleaning up cafes.json...\n');
  
  // Read and parse JSON file
  const fileContent = fs.readFileSync(cafesPath, 'utf-8');
  const cafes: Cafe[] = JSON.parse(fileContent);
  
  console.log(`Found ${cafes.length} cafes in total.\n`);
  
  // Step 1: Check for duplicate IDs
  console.log('📋 Step 1: Checking for duplicate IDs...');
  const idMap = new Map<number, Cafe[]>();
  cafes.forEach(cafe => {
    if (!idMap.has(cafe.id)) {
      idMap.set(cafe.id, []);
    }
    idMap.get(cafe.id)!.push(cafe);
  });
  
  const duplicateIds: number[] = [];
  idMap.forEach((cafesWithId, id) => {
    if (cafesWithId.length > 1) {
      duplicateIds.push(id);
      console.log(`   ⚠️  ID ${id} appears ${cafesWithId.length} times:`);
      cafesWithId.forEach(cafe => {
        console.log(`      - "${cafe.name}" (${cafe.city || 'no city'})`);
      });
    }
  });
  
  if (duplicateIds.length === 0) {
    console.log('   ✅ No duplicate IDs found.\n');
  } else {
    console.log(`   ⚠️  Found ${duplicateIds.length} duplicate ID(s).\n`);
  }
  
  // Step 2: Check for duplicate places (same name + city)
  console.log('📋 Step 2: Checking for duplicate places (same name + city)...');
  const placeMap = new Map<string, Cafe[]>();
  cafes.forEach(cafe => {
    const key = `${cafe.name}|${cafe.city || ''}`;
    if (!placeMap.has(key)) {
      placeMap.set(key, []);
    }
    placeMap.get(key)!.push(cafe);
  });
  
  const duplicatePlaces: string[] = [];
  placeMap.forEach((cafesWithName, key) => {
    if (cafesWithName.length > 1) {
      duplicatePlaces.push(key);
      console.log(`   ⚠️  "${key}" appears ${cafesWithName.length} times:`);
      cafesWithName.forEach(cafe => {
        console.log(`      - ID ${cafe.id}: "${cafe.name}" (${cafe.city || 'no city'})`);
      });
    }
  });
  
  if (duplicatePlaces.length === 0) {
    console.log('   ✅ No duplicate places found.\n');
  } else {
    console.log(`   ⚠️  Found ${duplicatePlaces.length} duplicate place(s).\n`);
  }
  
  // Step 3: Find missing or invalid IDs
  console.log('📋 Step 3: Checking ID validity...');
  const invalidIds: Cafe[] = [];
  cafes.forEach(cafe => {
    if (typeof cafe.id !== 'number' || cafe.id <= 0 || !Number.isInteger(cafe.id)) {
      invalidIds.push(cafe);
      console.log(`   ⚠️  Invalid ID: "${cafe.name}" has ID: ${cafe.id}`);
    }
  });
  
  if (invalidIds.length === 0) {
    console.log('   ✅ All IDs are valid numbers.\n');
  } else {
    console.log(`   ⚠️  Found ${invalidIds.length} invalid ID(s).\n`);
  }
  
  // Step 4: Fix issues
  console.log('📋 Step 4: Fixing issues...');
  
  // Remove duplicate places (keep the first one with the lowest ID)
  const seenPlaces = new Set<string>();
  const cafesToKeep: Cafe[] = [];
  const cafesToRemove: Cafe[] = [];
  
  // Sort by ID first to keep the lowest ID when duplicates exist
  const sortedCafes = [...cafes].sort((a, b) => a.id - b.id);
  
  sortedCafes.forEach(cafe => {
    const key = `${cafe.name}|${cafe.city || ''}`;
    if (!seenPlaces.has(key)) {
      seenPlaces.add(key);
      cafesToKeep.push(cafe);
    } else {
      cafesToRemove.push(cafe);
      console.log(`   🗑️  Removing duplicate: ID ${cafe.id} - "${cafe.name}" (${cafe.city || 'no city'})`);
    }
  });
  
  if (cafesToRemove.length > 0) {
    console.log(`   ✅ Removed ${cafesToRemove.length} duplicate place(s).\n`);
  }
  
  // Reassign IDs sequentially starting from 1
  console.log('📋 Step 5: Reassigning IDs sequentially...');
  cafesToKeep.sort((a, b) => {
    // Sort by: type (matcha last), then city, then name
    const typeA = a.type === 'matcha' ? 1 : 0;
    const typeB = b.type === 'matcha' ? 1 : 0;
    if (typeA !== typeB) return typeA - typeB;
    
    const cityA = (a.city || '').toLowerCase();
    const cityB = (b.city || '').toLowerCase();
    if (cityA !== cityB) return cityA.localeCompare(cityB);
    
    return (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase());
  });
  
  let newId = 1;
  cafesToKeep.forEach(cafe => {
    const oldId = cafe.id;
    cafe.id = newId++;
    if (oldId !== cafe.id) {
      console.log(`   🔄 Reassigned ID: "${cafe.name}" from ${oldId} to ${cafe.id}`);
    }
  });
  
  console.log(`   ✅ Reassigned all IDs sequentially (1-${cafesToKeep.length}).\n`);
  
  // Step 6: Write back to file
  console.log('📋 Step 6: Writing cleaned data to file...');
  fs.writeFileSync(
    cafesPath,
    JSON.stringify(cafesToKeep, null, 2),
    'utf-8'
  );
  
  console.log(`\n✅ Cleanup complete!`);
  console.log(`   - Original count: ${cafes.length}`);
  console.log(`   - Final count: ${cafesToKeep.length}`);
  console.log(`   - Removed: ${cafes.length - cafesToKeep.length} duplicate(s)`);
  console.log(`   - All IDs are now unique and sequential (1-${cafesToKeep.length})`);
}

main();

















