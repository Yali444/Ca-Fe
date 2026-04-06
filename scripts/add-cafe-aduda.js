const fs = require('fs');
const path = require('path');

// Read the cafes data
const cafesPath = path.join(__dirname, '../public/data/cafes.json');
const cafes = JSON.parse(fs.readFileSync(cafesPath, 'utf8'));

console.log('=== Adding Cafe Aduda ===\n');

// New cafe data
const newCafe = {
  id: Math.max(...cafes.map(c => c.id)) + 1, // Get next available ID
  name: "קפה עדודה",
  city: "תל אביב-יפו",
  address: "אבולעפיה 18, תל אביב-יפו",
  openingHours: {
    sunday: "סגור",
    monday: "סגור", 
    tuesday: "סגור",
    wednesday: "סגור",
    thursday: "סגור",
    friday: "08:00-15:00",
    saturday: "09:00-15:00"
  },
  description: "פנינה מחתרתית בדרום העיר שמתעוררת לחיים רק בסופי שבוע בתוך מסגרייה פעילה. המקום מגיש קפה ספיישלטי מעולה עם פולים של \"צ'ופצ'יק\" (בית קלייה ועגלת קפה מבית יהושע), באווירה גולמית של שולחנות ריתוך ומוזיקה טובה.",
  brewMethods: "אספרסו, פילטר",
  isRoaster: false,
  sellsBeans: true,
  vibeTags: ["מחתרתי", "מסגרייה", "סופ\"ש", "דרום העיר"],
  instagramHandle: "adudacaffe",
  website: "",
  coordinates: {
    lat: 32.05145,
    lng: 34.76856
  },
  heroImage: "/images/aduda.jpg",
  _geocode_verified: true,
  _last_updated: "2026-04-04"
};

// Add the new cafe
cafes.push(newCafe);

// Sort cafes by ID to maintain order
cafes.sort((a, b) => a.id - b.id);

// Save the updated data
const outputPath = path.join(__dirname, '../public/data/cafes.json');
fs.writeFileSync(outputPath, JSON.stringify(cafes, null, 2), 'utf8');

console.log(`✅ Added: ${newCafe.name}`);
console.log(`📍 Address: ${newCafe.address}`);
console.log(`📱 Instagram: @${newCafe.instagramHandle}`);
console.log(`🆔 ID: ${newCafe.id}`);
console.log(`📄 Updated file: ${outputPath}`);

// Update the final instagram handles list
console.log(`\n=== Updating Instagram Handles List ===`);

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
