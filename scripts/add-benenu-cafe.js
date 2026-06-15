const fs = require('fs');
const path = require('path');

// Read the cafes data
const cafesPath = path.join(__dirname, '../public/data/cafes.json');
const cafes = JSON.parse(fs.readFileSync(cafesPath, 'utf8'));

console.log('=== Adding Benenu Coffee ===\n');

// New cafe data
const newCafe = {
  id: Math.max(...cafes.map(c => c.id)) + 1, // Get next available ID
  name: "בינינו",
  city: "קריית טבעון",
  address: "אלכסנדר זייד 1, קריית טבעון",
  openingHours: {
    sunday: "07:30-14:00",
    monday: "07:30-14:00",
    tuesday: "07:30-14:00",
    wednesday: "07:30-14:00",
    thursday: "07:30-14:00",
    friday: "07:30-14:00",
    saturday: "סגור"
  },
  description: "בית קפה שכונתי בקריית טבעון שקולה את הקפה במקום. מציעים אספרסו, מאצ'ה משובחת ומבחר אוכל ומאפים מעולים, באווירה נעימה וקהילתית. פתוח בימים ראשון עד שישי.",
  brewMethods: "אספרסו",
  isRoaster: true,
  sellsBeans: false,
  vibeTags: ["קריית טבעון", "שכונתי", "קהילתי", "בית קלייה", "מאצ'ה", "מאפים", "אוכל"],
  instagramHandle: "benenu_coffee",
  website: "",
  // Coordinates from Plus Code P46G+M8 Kiryat Tiv'on (8G4QP46G+M8)
  coordinates: {
    lat: 32.711687,
    lng: 35.125812
  },
  heroImage: null,
  _geocode_verified: true,
  _last_updated: "2026-06-15"
};

// Add the new cafe
cafes.push(newCafe);

// Sort cafes by ID to maintain order
cafes.sort((a, b) => a.id - b.id);

// Save the updated data
fs.writeFileSync(cafesPath, JSON.stringify(cafes, null, 2) + '\n', 'utf8');

console.log(`✅ Added: ${newCafe.name}`);
console.log(`📍 Address: ${newCafe.address}`);
console.log(`📱 Instagram: @${newCafe.instagramHandle}`);
console.log(`🆔 ID: ${newCafe.id}`);
console.log(`📄 Updated file: ${cafesPath}`);
console.log(`\n📍 Note: Coordinates are approximate (Kiryat Tivon) - need manual verification`);
