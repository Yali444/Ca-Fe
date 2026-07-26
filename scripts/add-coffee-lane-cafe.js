const fs = require('fs');
const path = require('path');

// Read the cafes data
const cafesPath = path.join(__dirname, '../public/data/cafes.json');
const cafes = JSON.parse(fs.readFileSync(cafesPath, 'utf8'));

console.log('=== Adding Coffee Lane ===\n');

// New cafe data
const newCafe = {
  id: Math.max(...cafes.map(c => c.id)) + 1, // Get next available ID
  name: "Coffee Lane",
  city: "תל אביב",
  address: "בר יוחאי 20, תל אביב",
  openingHours: {
    sunday: "08:00-17:00",
    monday: "08:00-17:00",
    tuesday: "08:00-17:00",
    wednesday: "08:00-17:00",
    thursday: "08:00-17:00",
    friday: "09:00-14:00",
    saturday: "סגור"
  },
  description: "בית קפה ובית קלייה קטן שנפתח בקריית המלאכה בתל אביב, בבעלות תומר שחזר לארץ אחרי 18 שנה במלבורן ופתח את בית הקפה השני שלו יחד עם אחיו. קפה שנקלה במקום, לצד מבחר קפה מיובא ומקומי, אספרסו ומאצ'ה, ומאפים תוצרת בית.",
  brewMethods: "אספרסו, פילטר",
  isRoaster: true,
  sellsBeans: true,
  vibeTags: ["פלורנטין", "קריית המלאכה", "בית קלייה", "עיצוב תעשייתי", "מאצ'ה", "מאפים"],
  instagramHandle: "coffeelane.tlv",
  website: "",
  // Coordinates decoded from Plus Code 3Q3F+67 Tel Aviv-Yafo (full code 8G4P3Q3F+67)
  coordinates: {
    lat: 32.053062,
    lng: 34.773188
  },
  heroImage: "/images/coffee_lane_tlv.avif",
  _geocode_verified: true,
  _last_updated: "2026-07-26"
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
