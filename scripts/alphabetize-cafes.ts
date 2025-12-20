/**
 * Script to alphabetize cafes.json by name
 */

import fs from 'fs';
import path from 'path';

const cafesPath = path.join(__dirname, '..', 'public', 'data', 'cafes.json');

// Read the JSON file
const cafes = JSON.parse(fs.readFileSync(cafesPath, 'utf8'));

// Sort by name (handles both Hebrew and English)
cafes.sort((a: any, b: any) => {
  const nameA = a.name || '';
  const nameB = b.name || '';
  return nameA.localeCompare(nameB, 'he', { sensitivity: 'base' });
});

// Write back to file with proper formatting
fs.writeFileSync(cafesPath, JSON.stringify(cafes, null, 2), 'utf8');

console.log(`✅ Alphabetized ${cafes.length} cafes by name`);




