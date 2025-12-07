/**
 * Script to update coordinates in data files based on geocoding results
 */

import fs from 'fs';
import path from 'path';

// Read geocoding results
const resultsPath = path.join(process.cwd(), 'geocoding-results.json');
const results = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));

// Read data files
const roasteriesPath = path.join(process.cwd(), 'src/data/roasteries.ts');
const matchaPath = path.join(process.cwd(), 'src/data/matcha.ts');

let roasteriesContent = fs.readFileSync(roasteriesPath, 'utf-8');
let matchaContent = fs.readFileSync(matchaPath, 'utf-8');

let updatedCount = 0;

// Function to format coordinate
function formatCoord(coord: number): string {
  // Keep precision but remove trailing zeros
  const rounded = Math.round(coord * 1000000) / 1000000;
  return rounded.toString();
}

// Update coordinates in content
function updateCoordinates(content: string, name: string, newLat: number, newLng: number): { content: string; updated: boolean } {
  const latStr = formatCoord(newLat);
  const lngStr = formatCoord(newLng);
  
  // Escape special regex characters in name
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Pattern: coordinates: { lat: NUMBER, lng: NUMBER }
  // Match the entire coordinates object
  const pattern = new RegExp(
    `(name:\\s*"${escapedName}"[\\s\\S]*?coordinates:\\s*\\{\\s*lat:\\s*)[\\d.]+(\\s*,\\s*lng:\\s*)[\\d.]+(\\s*\\})`,
    'g'
  );
  
  if (pattern.test(content)) {
    // Reset regex
    pattern.lastIndex = 0;
    const newContent = content.replace(pattern, `$1${latStr}$2${lngStr}$3`);
    if (newContent !== content) {
      return { content: newContent, updated: true };
    }
  }
  
  return { content, updated: false };
}

console.log('🔄 Updating coordinates based on Google Geocoding API results...\n');

// Process each result
for (const result of results) {
  if (!result.newCoords) {
    continue;
  }
  
  const { name, type, newCoords } = result;
  const { lat, lng } = newCoords;
  
  if (type === 'coffee') {
    const { content, updated } = updateCoordinates(roasteriesContent, name, lat, lng);
    if (updated) {
      roasteriesContent = content;
      console.log(`✅ Updated: ${name} (coffee) -> ${lat}, ${lng}`);
    } else {
      console.log(`⚠️  Could not find: ${name} (coffee) in roasteries.ts`);
    }
  } else if (type === 'matcha') {
    const { content, updated } = updateCoordinates(matchaContent, name, lat, lng);
    if (updated) {
      matchaContent = content;
      console.log(`✅ Updated: ${name} (matcha) -> ${lat}, ${lng}`);
    } else {
      console.log(`⚠️  Could not find: ${name} (matcha) in matcha.ts`);
    }
  }
}

// Write updated files
fs.writeFileSync(roasteriesPath, roasteriesContent);
fs.writeFileSync(matchaPath, matchaContent);

console.log(`\n✅ Update complete! Files saved.`);
console.log(`📁 ${roasteriesPath}`);
console.log(`📁 ${matchaPath}`);
