const fs = require('fs');
const path = require('path');

// Read the cafes data
const cafesPath = path.join(__dirname, '../public/data/cafes.json');
const cafes = JSON.parse(fs.readFileSync(cafesPath, 'utf8'));

console.log('=== Fixing Instagram Handles ===\n');

let fixedCount = 0;
let skippedCount = 0;
const fixes = [];

cafes.forEach(cafe => {
  const name = cafe.name;
  const handle = cafe.instagramHandle;
  
  if (handle) {
    // Skip if already has @ symbol
    if (handle.startsWith('@')) {
      skippedCount++;
      return;
    }
    
    // Skip if looks like a website (contains . and not starting with @)
    if (handle.includes('.') && !handle.includes('@')) {
      console.log(`⚠️  SKIPPED (looks like website): ${name}: "${handle}"`);
      skippedCount++;
      return;
    }
    
    // Add @ symbol
    const originalHandle = handle;
    cafe.instagramHandle = '@' + handle;
    fixedCount++;
    
    fixes.push({
      name,
      old: originalHandle,
      new: '@' + handle
    });
    
    console.log(`✅ FIXED: ${name}: "${originalHandle}" → "@${handle}"`);
  } else {
    console.log(`❌ NO HANDLE: ${name}`);
  }
});

// Save the updated data
const outputPath = path.join(__dirname, '../public/data/cafes.json');
fs.writeFileSync(outputPath, JSON.stringify(cafes, null, 2), 'utf8');

console.log(`\n=== Summary ===`);
console.log(`✅ Fixed: ${fixedCount} handles`);
console.log(`⚠️  Skipped: ${skippedCount} handles (already correct or look like websites)`);
console.log(`📄 Updated file: ${outputPath}`);

// Save a report of the changes
const reportPath = path.join(__dirname, '../instagram-fixes-report.txt');
const reportContent = fixes.map(({ name, old, new: newHandle }) => 
  `${name}: "${old}" → "${newHandle}"`
).join('\n');

fs.writeFileSync(reportPath, reportContent, 'utf8');
console.log(`📋 Report saved to: ${reportPath}`);
