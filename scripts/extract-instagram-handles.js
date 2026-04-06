const fs = require('fs');
const path = require('path');

// Read the cafes data
const cafesPath = path.join(__dirname, '../public/data/cafes.json');
const cafes = JSON.parse(fs.readFileSync(cafesPath, 'utf8'));

console.log('=== Instagram Handles Analysis ===\n');

const handles = [];
const issues = [];

cafes.forEach(cafe => {
  const name = cafe.name;
  const handle = cafe.instagramHandle;
  
  if (handle) {
    handles.push({ name, handle });
    
    // Check for potential issues
    if (!handle.startsWith('@')) {
      issues.push(`${name}: "${handle}" - Missing @ symbol`);
    }
    
    // Check for common invalid patterns
    if (handle.includes(' ') || handle.includes('.') && !handle.startsWith('@')) {
      issues.push(`${name}: "${handle}" - Contains spaces or looks like a website`);
    }
    
    // Check if it's empty or just @
    if (handle === '@' || handle.trim() === '') {
      issues.push(`${name}: "${handle}" - Empty or invalid handle`);
    }
  } else {
    issues.push(`${name}: No Instagram handle`);
  }
});

// Sort by cafe name
handles.sort((a, b) => a.name.localeCompare(a.name, 'he'));

console.log(`Found ${handles.length} cafes with Instagram handles:\n`);
handles.forEach(({ name, handle }) => {
  console.log(`${name}: ${handle}`);
});

console.log(`\n=== Issues Found (${issues.length}) ===\n`);
issues.forEach(issue => {
  console.log(issue);
});

// Save the clean list to a file
const outputPath = path.join(__dirname, '../instagram-handles-list.txt');
const listContent = handles.map(({ name, handle }) => `${name}: ${handle}`).join('\n');
fs.writeFileSync(outputPath, listContent, 'utf8');

console.log(`\nClean list saved to: ${outputPath}`);
