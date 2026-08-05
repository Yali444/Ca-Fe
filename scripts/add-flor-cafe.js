const fs = require('fs');
const path = require('path');

// Read the cafes data
const cafesPath = path.join(__dirname, '../public/data/cafes.json');
const cafes = JSON.parse(fs.readFileSync(cafesPath, 'utf8'));

console.log('=== Adding FLOR (Cave à Manger) ===\n');

// FLOR is an established Tel Aviv natural-wine bar (@flor.telaviv) that now
// serves coffee in the mornings. Per their Instagram, the morning coffee
// window (☕) is 07:30–15:00 Sun–Fri; evenings are wine service only, so this
// coffee-finder lists just the coffee hours. Saturday is evening-only (no
// coffee) and is therefore omitted.
const newCafe = {
  id: Math.max(...cafes.map(c => c.id)) + 1, // Next available ID
  name: "FLOR",
  city: "תל אביב",
  address: "וילסון 10, תל אביב",
  openingHours: {
    sunday: "07:30-15:00",
    monday: "07:30-15:00",
    tuesday: "07:30-15:00",
    wednesday: "07:30-15:00",
    thursday: "07:30-15:00",
    friday: "07:30-15:00"
    // Saturday: evening wine service only (17:00–23:00), no morning coffee
  },
  description: "בר יין טבעי ('Cave à Manger') ותיק ומוערך בפינת וילסון–לינקולן בתל אביב, בהשראת ברי היין של איטליה. בבקרים (07:30–15:00, ראשון–שישי) מגישים כאן קפה ומאפים, ובערב התפריט עובר ליינות טבעיים ואוכל עונתי משתנה. כניסה ללא הזמנה מראש (walk-in), האפי אַוֶר 17:00–19:00.",
  brewMethods: "אספרסו",
  isRoaster: false,
  sellsBeans: false,
  vibeTags: ["מודרני ומעוצב", "בוטיק ויוקרתי", "תוסס ומלא חיים"],
  instagramHandle: "flor.telaviv",
  website: "",
  // Coordinates for Wilson 10 (corner of Lincoln), anchored to Beit Rubinstein
  // at 1–20 Lincoln St (32.0658167, 34.7829750). Not verified through the
  // Google geocoding pipeline, hence _geocode_verified: false.
  coordinates: {
    lat: 32.065650,
    lng: 34.782700
  },
  heroImage: null,
  _geocode_verified: false,
  _last_updated: "2026-08-05"
};

// Add and keep the file sorted by ID
cafes.push(newCafe);
cafes.sort((a, b) => a.id - b.id);

fs.writeFileSync(cafesPath, JSON.stringify(cafes, null, 2) + '\n', 'utf8');

console.log(`✅ Added: ${newCafe.name}`);
console.log(`📍 Address: ${newCafe.address}`);
console.log(`📱 Instagram: @${newCafe.instagramHandle}`);
console.log(`🆔 ID: ${newCafe.id}`);
console.log(`📄 Updated file: ${cafesPath}`);
