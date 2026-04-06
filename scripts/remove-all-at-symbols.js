const fs = require('fs');
const path = require('path');

// Read the cafes data
const cafesPath = path.join(__dirname, '../public/data/cafes.json');
const cafes = JSON.parse(fs.readFileSync(cafesPath, 'utf8'));

console.log('=== Removing All @ Symbols From Instagram Handles ===\n');

let removedCount = 0;
let alreadyCleanCount = 0;
const changes = [];

cafes.forEach(cafe => {
  const name = cafe.name;
  const handle = cafe.instagramHandle;
  
  if (handle) {
    // If handle starts with @, remove it
    if (handle.startsWith('@')) {
      const originalHandle = handle;
      cafe.instagramHandle = handle.substring(1); // Remove the @
      removedCount++;
      
      changes.push({
        name,
        old: originalHandle,
        new: handle.substring(1)
      });
      
      console.log(`✅ REMOVED @: ${name}: "${originalHandle}" → "${handle.substring(1)}"`);
    } else {
      alreadyCleanCount++;
      console.log(`ℹ️  Already clean: ${name}: "${handle}"`);
    }
  } else {
    console.log(`❌ No handle: ${name}`);
  }
});

// Save the updated data
const outputPath = path.join(__dirname, '../public/data/cafes.json');
fs.writeFileSync(outputPath, JSON.stringify(cafes, null, 2), 'utf8');

console.log(`\n=== Summary ===`);
console.log(`✅ Removed @ from: ${removedCount} handles`);
console.log(`ℹ️  Already clean: ${alreadyCleanCount} handles`);
console.log(`📄 Updated file: ${outputPath}`);

if (changes.length > 0) {
  // Save a report of the changes
  const reportPath = path.join(__dirname, '../instagram-at-removal-report.txt');
  const reportContent = changes.map(({ name, old, new: newHandle }) => 
    `${name}: "${old}" → "${newHandle}"`
  ).join('\n');

  fs.writeFileSync(reportPath, reportContent, 'utf8');
  console.log(`📋 Report saved to: ${reportPath}`);
}
