import fs from 'fs';
import path from 'path';

// Read matcha.ts file
const matchaPath = path.join(process.cwd(), 'src', 'data', 'matcha.ts');
const matchaContent = fs.readFileSync(matchaPath, 'utf-8');

// Extract MATCHA_PLACES_RAW array using regex
const matchaArrayMatch = matchaContent.match(/export const MATCHA_PLACES_RAW: MatchaPlaceRaw\[\] = (\[[\s\S]*?\]);/);
if (!matchaArrayMatch) {
  console.error('Could not find MATCHA_PLACES_RAW in matcha.ts');
  process.exit(1);
}

// Evaluate the array (safe in this context since it's our own file)
const matchaData = eval(matchaArrayMatch[1]);

// Filter out temporarily/permanently closed places (same logic as in matcha.ts)
const filteredData = matchaData.filter((place: any) => {
  // CUPS is temporarily closed - exclude it
  // הוק (פלורנטין) is permanently closed - exclude it
  return place.id !== 9 && place.name !== 'קאפס' && place.id !== 5 && place.name !== 'הוק (פלורנטין)';
});

// Write to JSON file
const outputPath = path.join(process.cwd(), 'public', 'data', 'matcha.json');
fs.writeFileSync(outputPath, JSON.stringify(filteredData, null, 2), 'utf-8');

console.log(`✅ Created matcha.json with ${filteredData.length} places`);
console.log(`   Excluded: CUPS (id: 9), הוק (פלורנטין) (id: 5)`);
