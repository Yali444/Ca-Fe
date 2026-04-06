const fs = require('fs');
const path = require('path');

// Read the cafes data
const cafesPath = path.join(__dirname, '../public/data/cafes.json');
const cafes = JSON.parse(fs.readFileSync(cafesPath, 'utf8'));

console.log('=== Fixing Remaining Instagram Handles ===\n');

let fixedCount = 0;
const fixes = [];

// These were skipped before but are actually valid Instagram handles
const websiteLikeHandles = [
  'cafebar.co.il',
  'cafe.shchenim', 
  'slowdining.moran/',
  'coffee.uru.heart',
  'loveat.tlv',
  'p.o.c.c.a.f.e',
  'cafe.ahad.haam',
  'cafe.piccolo.il'
];

cafes.forEach(cafe => {
  const name = cafe.name;
  const handle = cafe.instagramHandle;
  
  if (handle) {
    // Skip if already has @ symbol
    if (handle.startsWith('@')) {
      return;
    }
    
    // Check if this was previously skipped but is actually valid
    if (websiteLikeHandles.includes(handle)) {
      const originalHandle = handle;
      cafe.instagramHandle = '@' + handle;
      fixedCount++;
      
      fixes.push({
        name,
        old: originalHandle,
        new: '@' + handle
      });
      
      console.log(`✅ FIXED (website-like): ${name}: "${originalHandle}" → "@${handle}"`);
    }
  }
});

// Save the updated data
const outputPath = path.join(__dirname, '../public/data/cafes.json');
fs.writeFileSync(outputPath, JSON.stringify(cafes, null, 2), 'utf8');

console.log(`\n=== Summary ===`);
console.log(`✅ Fixed: ${fixedCount} additional handles`);
console.log(`📄 Updated file: ${outputPath}`);

if (fixes.length > 0) {
  // Save a report of the changes
  const reportPath = path.join(__dirname, '../instagram-additional-fixes.txt');
  const reportContent = fixes.map(({ name, old, new: newHandle }) => 
    `${name}: "${old}" → "${newHandle}"`
  ).join('\n');

  fs.writeFileSync(reportPath, reportContent, 'utf8');
  console.log(`📋 Report saved to: ${reportPath}`);
} else {
  console.log(`ℹ️  No additional fixes needed`);
}
