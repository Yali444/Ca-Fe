const fs = require('fs');
const path = require('path');

// Read the cafes data
const cafesPath = path.join(__dirname, '../public/data/cafes.json');
const cafes = JSON.parse(fs.readFileSync(cafesPath, 'utf8'));

console.log('=== Fixing Bar Instagram Handle ===\n');

// Find בר
const barCafe = cafes.find(c => c.name === 'בר');

if (barCafe) {
  const oldHandle = barCafe.instagramHandle;
  barCafe.instagramHandle = 'baaaar_cafeeee';
  
  // Also update opening hours if needed
  const currentHours = barCafe.openingHours;
  console.log(`✅ FIXED: בר`);
  console.log(`   Old: "${oldHandle}"`);
  console.log(`   New: "baaaar_cafeeee"`);
  console.log(`   Location: ${barCafe.address}, ${barCafe.city}`);
  console.log(`   Correct link: https://instagram.com/baaaar_cafeeee`);
  console.log(`   Opening Hours: ${JSON.stringify(currentHours)}`);
  console.log(`   Note: User provided correct handle with opening hours`);
  
  // Save the updated data
  const outputPath = path.join(__dirname, '../public/data/cafes.json');
  fs.writeFileSync(outputPath, JSON.stringify(cafes, null, 2), 'utf8');
  
  console.log(`\n📄 Updated file: ${outputPath}`);
  
  // Update the final instagram handles list
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
  
  // Save the updated complete list
  const listContent = handles.map(({ name, handle }) => `${name}: ${handle}`).join('\n');
  const finalListPath = path.join(__dirname, '../final-instagram-handles-list.txt');
  fs.writeFileSync(finalListPath, listContent, 'utf8');
  
  // Save the no-handle list
  const noHandleContent = noHandleCafes.join('\n');
  const noHandlePath = path.join(__dirname, '../cafes-without-instagram.txt');
  fs.writeFileSync(noHandlePath, noHandleContent, 'utf8');
  
  console.log(`📋 Updated complete list: ${finalListPath}`);
  console.log(`📋 Updated no Instagram list: ${noHandlePath}`);
  console.log(`\n✅ Total: ${handles.length} cafes with Instagram handles`);
  console.log(`❌ Total: ${noHandleCafes.length} cafes without Instagram`);
  
} else {
  console.log('❌ בר not found in the database');
}
