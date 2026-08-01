const fs = require('fs');
const path = require('path');

// Read the cafes data
const cafesPath = path.join(__dirname, '../public/data/cafes.json');
const cafes = JSON.parse(fs.readFileSync(cafesPath, 'utf8'));

console.log('=== Adding Cafe Nono ===\n');

// New cafe data
const newCafe = {
  id: Math.max(...cafes.map(c => c.id)) + 1, // Get next available ID
  name: "קפה נונו",
  city: "בנימינה",
  address: "הטחנה 42, בנימינה",
  openingHours: {
    sunday: "07:00-19:00",
    monday: "07:00-19:00",
    tuesday: "07:00-19:00",
    wednesday: "07:00-19:00",
    thursday: "07:00-19:00",
    friday: "08:00-14:00",
    saturday: "08:00-15:00"
  },
  description: "בית קפה קטן וקסום הממוקם ליד תחנת הרכבת בנימינה, מגיש קפה איכותי לצד כריכים, סלטים, מתוקים ומאפים, באווירה חמימה וקהילתית.",
  brewMethods: "אספרסו",
  isRoaster: false,
  sellsBeans: false,
  vibeTags: ["שכונתי וקהילתי", "חמים וביתי", "מאפים ואוכל"],
  instagramHandle: "cafe.nono",
  website: "",
  // Coordinates decoded from Plus Code GW7X+JH Binyamina-Giv'at Ada (full code 8G4PGW7X+JH)
  coordinates: {
    lat: 32.514062,
    lng: 34.948938
  },
  heroImage: "/images/cafe_nono_binyamina.avif",
  _geocode_verified: true,
  _last_updated: "2026-08-01"
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
