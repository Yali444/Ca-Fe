const fs = require('fs');
const path = require('path');

// Read the cafes data
const cafesPath = path.join(__dirname, '../public/data/cafes.json');
const cafes = JSON.parse(fs.readFileSync(cafesPath, 'utf8'));

console.log('=== Fixing Wrong Instagram Handles ===\n');

// Known wrong handles that need correction
const corrections = [
  {
    name: 'קפה לואי',
    wrongHandle: 'sigcafe',
    correctHandle: 'louiscafe.tlv'
  }
];

let fixedCount = 0;
const fixes = [];

cafes.forEach(cafe => {
  const name = cafe.name;
  const handle = cafe.instagramHandle;
  
  if (handle) {
    // Check if this handle needs correction
    const correction = corrections.find(c => 
      (c.name === name && c.wrongHandle === handle) ||
      (c.wrongHandle === handle && !corrections.some(other => other.name === name && other.correctHandle === handle))
    );
    
    if (correction && cafe.name === correction.name) {
      const originalHandle = handle;
      cafe.instagramHandle = correction.correctHandle;
      fixedCount++;
      
      fixes.push({
        name,
        old: originalHandle,
        new: correction.correctHandle
      });
      
      console.log(`✅ FIXED: ${name}: "${originalHandle}" → "${correction.correctHandle}"`);
    }
  }
});

// Save the updated data
const outputPath = path.join(__dirname, '../public/data/cafes.json');
fs.writeFileSync(outputPath, JSON.stringify(cafes, null, 2), 'utf8');

console.log(`\n=== Summary ===`);
console.log(`✅ Fixed: ${fixedCount} wrong handles`);
console.log(`📄 Updated file: ${outputPath}`);

if (fixes.length > 0) {
  // Save a report of the changes
  const reportPath = path.join(__dirname, '../instagram-wrong-handles-fixes.txt');
  const reportContent = fixes.map(({ name, old, new: newHandle }) => 
    `${name}: "${old}" → "${newHandle}"`
  ).join('\n');

  fs.writeFileSync(reportPath, reportContent, 'utf8');
  console.log(`📋 Report saved to: ${reportPath}`);
} else {
  console.log(`ℹ️  No wrong handles found to fix`);
}
