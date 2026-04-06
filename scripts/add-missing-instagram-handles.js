const fs = require('fs');
const path = require('path');

// Read the cafes data
const cafesPath = path.join(__dirname, '../public/data/cafes.json');
const cafes = JSON.parse(fs.readFileSync(cafesPath, 'utf8'));

console.log('=== Adding Missing Instagram Handles ===\n');

// Missing handles that need to be added
const missingHandles = [
  { name: 'שוקפה', handle: 'shukaffe_jlm' },
  { name: 'קפה אולה', handle: 'cafeolle_coffee_roastery' },
  { name: 'קפה אנין', handle: null }, // No Instagram
  { name: 'קפה בוקר', handle: 'cafe.boker.tlv' },
  { name: 'קפה נחמני', handle: 'nachmani_tlv' },
  { name: 'TFWC', handle: 'tfwc.il' },
  { name: 'דה פיקניק פלייר', handle: 'picnicplayer3000' },
  { name: 'אוריג\'ם', handle: 'origem_coffee' }
];

let addedCount = 0;
const changes = [];

cafes.forEach(cafe => {
  const missing = missingHandles.find(m => m.name === cafe.name);
  if (missing && missing.handle) {
    const oldHandle = cafe.instagramHandle;
    cafe.instagramHandle = missing.handle;
    addedCount++;
    
    changes.push({
      name: cafe.name,
      old: oldHandle || 'null',
      new: missing.handle
    });
    
    console.log(`✅ ADDED: ${cafe.name}: "${oldHandle || 'null'}" → "${missing.handle}"`);
  } else if (missing && !missing.handle) {
    console.log(`ℹ️  NO INSTAGRAM: ${cafe.name} - confirmed no Instagram account`);
  }
});

// Save the updated data
const outputPath = path.join(__dirname, '../public/data/cafes.json');
fs.writeFileSync(outputPath, JSON.stringify(cafes, null, 2), 'utf8');

console.log(`\n=== Summary ===`);
console.log(`✅ Added: ${addedCount} new handles`);
console.log(`ℹ️  Confirmed no Instagram: 1 cafe`);
console.log(`📄 Updated file: ${outputPath}`);

if (changes.length > 0) {
  // Save a report of the changes
  const reportPath = path.join(__dirname, '../instagram-missing-handles-added.txt');
  const reportContent = changes.map(({ name, old, new: newHandle }) => 
    `${name}: "${old}" → "${newHandle}"`
  ).join('\n');

  fs.writeFileSync(reportPath, reportContent, 'utf8');
  console.log(`📋 Report saved to: ${reportPath}`);
}
