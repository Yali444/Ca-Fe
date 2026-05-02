const fs = require('fs');
const path = require('path');

// Read the cafes data
const cafesPath = path.join(__dirname, '../public/data/cafes.json');
const cafes = JSON.parse(fs.readFileSync(cafesPath, 'utf8'));

console.log('=== Adding Reut Roasters ===\n');

// New cafe data
const newCafe = {
  id: Math.max(...cafes.map(c => c.id)) + 1, // Get next available ID
  name: "רעות - מקום של קפה",
  city: "כפר תבור",
  address: "מתחם יקב תבור, Sderot Kakal, כפר תבור",
  openingHours: {
    sunday: "08:00-17:00",
    monday: "08:00-17:00", 
    tuesday: "08:00-17:00",
    wednesday: "08:00-17:00",
    thursday: "08:00-17:00",
    friday: "08:00-14:00",
    saturday: "סגור"
  },
  description: "רעות, בית קליה וקפה במתחם היקב בכפר תבור, למרגלות הר תבור שבגליל התחתון. אנחנו קולים קפה ירוק מאזורי גידול מובחרים ברחבי העולם, בצורה מדויקת, מותאמת ומחמיאה לכל זן. תוכלו לעצור אצלנו לקפה על הדרך, להישאר לארוחה קלה ולרכוש קפה טרי הביתה.",
  brewMethods: "אספרסו, פילטר, קולד ברו",
  isRoaster: true,
  sellsBeans: true,
  vibeTags: ["בית קלייה", "כפרי", "גליל", "יין וקפה", "תבור", "איכותי"],
  instagramHandle: "reut.roasters",
  website: "",
  coordinates: {
    lat: 32.6987,
    lng: 35.4352
  },
  heroImage: "/images/reut_roasters.avif",
  _geocode_verified: false,
  _last_updated: "2026-05-03"
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
console.log(`\n📍 Note: Coordinates need manual verification - Kfar Tavor area approximation`);
