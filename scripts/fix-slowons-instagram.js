const fs = require('fs');
const path = require('path');

// Read the cafes data
const cafesPath = path.join(__dirname, '../public/data/cafes.json');
const cafes = JSON.parse(fs.readFileSync(cafesPath, 'utf8'));

console.log('=== Fixing Slowons Instagram Handle ===\n');

// Find סלואונס
const slowonsCafe = cafes.find(c => c.name === 'סלואונס');

if (slowonsCafe) {
  const oldHandle = slowonsCafe.instagramHandle;
  // Remove trailing slash
  slowonsCafe.instagramHandle = 'slowdining.moran';
  
  console.log(`✅ FIXED: סלואונס`);
  console.log(`   Old: "${oldHandle}"`);
  console.log(`   New: "slowdining.moran"`);
  console.log(`   Location: ${slowonsCafe.address}, ${slowonsCafe.city}`);
  console.log(`   Website: ${slowonsCafe.website}`);
  
  // Save the updated data
  const outputPath = path.join(__dirname, '../public/data/cafes.json');
  fs.writeFileSync(outputPath, JSON.stringify(cafes, null, 2), 'utf8');
  
  console.log(`\n📄 Updated file: ${outputPath}`);
  console.log(`🔗 New Instagram link: https://instagram.com/slowdining.moran`);
  
} else {
  console.log('❌ סלואונס not found in the database');
}
