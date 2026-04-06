const fs = require('fs');
const path = require('path');

// Read the cafes data
const cafesPath = path.join(__dirname, '../public/data/cafes.json');
const cafes = JSON.parse(fs.readFileSync(cafesPath, 'utf8'));

console.log('=== Generating Final Instagram Handles List ===\n');

const handles = [];
const noHandleCafes = [];

cafes.forEach(cafe => {
  const name = cafe.name;
  const handle = cafe.instagramHandle;
  
  if (handle) {
    handles.push({ name, handle });
  } else {
    noHandleCafes.push(name);
  }
});

// Sort by cafe name
handles.sort((a, b) => a.name.localeCompare(b.name, 'he'));
noHandleCafes.sort((a, b) => a.localeCompare(b, 'he'));

console.log(`=== Instagram Handles (${handles.length} cafes) ===\n`);
handles.forEach(({ name, handle }) => {
  console.log(`${name}: ${handle}`);
});

console.log(`\n=== Cafes Without Instagram (${noHandleCafes.length} cafes) ===\n`);
noHandleCafes.forEach(name => {
  console.log(name);
});

// Save the complete list
const listContent = handles.map(({ name, handle }) => `${name}: ${handle}`).join('\n');
const outputPath = path.join(__dirname, '../final-instagram-handles-list.txt');
fs.writeFileSync(outputPath, listContent, 'utf8');

// Save the no-handle list
const noHandleContent = noHandleCafes.join('\n');
const noHandlePath = path.join(__dirname, '../cafes-without-instagram.txt');
fs.writeFileSync(noHandlePath, noHandleContent, 'utf8');

console.log(`\n=== Files Created ===`);
console.log(`📋 Complete list: ${outputPath}`);
console.log(`📋 No Instagram list: ${noHandlePath}`);
console.log(`\n✅ Total: ${handles.length} cafes with Instagram handles`);
console.log(`❌ Total: ${noHandleCafes.length} cafes without Instagram`);
