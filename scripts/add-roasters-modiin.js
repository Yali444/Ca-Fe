const fs = require('fs');
const path = require('path');

const cafesPath = path.join(__dirname, '../public/data/cafes.json');
const cafes = JSON.parse(fs.readFileSync(cafesPath, 'utf8'));

console.log('=== Adding Roasters Modi\'in ===\n');

const geocodeResultPath = path.join(__dirname, 'roasters-modiin-geocoding-result.json');
let coordinates = { lat: 31.8970, lng: 35.0151 };
let geocodeMeta = { _geocode_verified: false };

if (fs.existsSync(geocodeResultPath)) {
  const geocode = JSON.parse(fs.readFileSync(geocodeResultPath, 'utf8'));
  if (geocode.lat && geocode.lng) {
    coordinates = { lat: geocode.lat, lng: geocode.lng };
    geocodeMeta = {
      _geocode_verified: geocode.confidence === 'high',
      google_place_id: geocode.place_id,
      google_name: geocode.name,
      google_address: geocode.formatted_address,
      google_confidence: geocode.confidence === 'high' ? 90 : geocode.confidence === 'medium' ? 70 : 50,
    };
  }
}

const newCafe = {
  id: Math.max(...cafes.map(c => c.id)) + 1,
  name: "רוסטרס (מודיעין)",
  city: "מודיעין-מכבים-רעות",
  address: "דם המכבים 55, מודיעין-מכבים-רעות",
  openingHours: {
    sunday: "06:45-00:00",
    monday: "06:45-00:00",
    tuesday: "06:45-00:00",
    wednesday: "06:45-00:00",
    thursday: "06:45-00:00",
    friday: "06:30 עד שעה לפני כניסת שבת",
    saturday: "שעה אחרי צאת שבת עד 00:00"
  },
  description: "סניף רוסטרס במודיעין. בית הקלייה הירושלמי מתרחב לעיר עם חוויית קפה ספשלטי ומאפים, כולל פתיחה במוצאי שבת.",
  brewMethods: "פילטר, אספרסו, קולד ברו",
  vibeTags: ["מודיעין", "פרברי", "מרכזי", "צעיר", "ישיבה בפנים"],
  instagramHandle: "roasters_coffeebar",
  website: "https://roastersjlm.co.il",
  coordinates,
  heroImage: "/images/Roasters_Modiin.avif",
  isRoaster: true,
  sellsBeans: true,
  ...geocodeMeta,
  _last_updated: "2026-05-04"
};

cafes.push(newCafe);
cafes.sort((a, b) => a.id - b.id);

fs.writeFileSync(cafesPath, JSON.stringify(cafes, null, 2), 'utf8');

console.log(`✅ Added: ${newCafe.name}`);
console.log(`📍 Address: ${newCafe.address}`);
console.log(`📱 Instagram: @${newCafe.instagramHandle}`);
console.log(`🆔 ID: ${newCafe.id}`);
console.log(`📌 Coords: ${coordinates.lat}, ${coordinates.lng} (verified: ${geocodeMeta._geocode_verified})`);
console.log(`📄 Updated file: ${cafesPath}`);

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

handles.sort((a, b) => a.name.localeCompare(b.name, 'he'));
noHandleCafes.sort((a, b) => a.localeCompare(b, 'he'));

const listContent = handles.map(({ name, handle }) => `${name}: ${handle}`).join('\n');
const finalListPath = path.join(__dirname, '../final-instagram-handles-list.txt');
fs.writeFileSync(finalListPath, listContent, 'utf8');

const noHandleContent = noHandleCafes.join('\n');
const noHandlePath = path.join(__dirname, '../cafes-without-instagram.txt');
fs.writeFileSync(noHandlePath, noHandleContent, 'utf8');

console.log(`📋 Updated complete list: ${finalListPath}`);
console.log(`📋 Updated no Instagram list: ${noHandlePath}`);
console.log(`\n✅ Total: ${handles.length} cafes with Instagram handles`);
console.log(`❌ Total: ${noHandleCafes.length} cafes without Instagram`);
