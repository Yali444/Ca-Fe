const fs = require('fs');
const path = require('path');

// Read the cafes data
const cafesPath = path.join(__dirname, '../public/data/cafes.json');
const cafes = JSON.parse(fs.readFileSync(cafesPath, 'utf8'));

console.log('=== Fixing Cafe Ola Instagram Handle ===\n');

// Find cafe עולה
const olaCafe = cafes.find(c => c.name === 'קפה עולה');

if (olaCafe) {
  const oldHandle = olaCafe.instagramHandle;
  olaCafe.instagramHandle = 'cafeolle_coffee_roastery';
  
  console.log(`✅ FIXED: קפה עולה`);
  console.log(`   Old: "${oldHandle || 'null'}"`);
  console.log(`   New: "cafeolle_coffee_roastery"`);
  console.log(`   Location: ${olaCafe.address}, ${olaCafe.city}`);
  
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
  console.log('❌ Cafe קפה עולה not found in the database');
}
