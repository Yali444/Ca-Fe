const fs = require('fs');
const path = require('path');

// Read the cafes data
const cafesPath = path.join(__dirname, '../public/data/cafes.json');
const cafes = JSON.parse(fs.readFileSync(cafesPath, 'utf8'));

console.log('=== Adding קפה הָעֶגְלָה (HaEgla) ===\n');

// A brand-new coffee cart that opened this week in Kibbutz Gadot (Upper
// Galilee), run by a longtime קפה נחת (Nahat) team member. Serves Nahat
// beans — cold brew and hot filter — plus fresh cakes and sandwiches.
//
// id is fixed at 158: 157 is reserved for FLOR (open in PR #117), so both
// can merge in any order without an id collision.
const newCafe = {
  id: 158,
  name: "קפה הָעֶגְלָה",
  city: "קיבוץ גדות",
  address: "קיבוץ גדות",
  openingHours: {
    monday: "07:30-12:00",
    thursday: "07:30-12:00",
    friday: "08:00-12:00",
    saturday: "08:30-12:00"
    // Saturday is a summer addition (open Saturdays through August).
  },
  description: "עגלת קפה חדשה וקסומה בקיבוץ גדות שבגליל העליון, המשך ישיר לשנים של ניסיון בקפה נחת. מגישים קפה מפולים של נחת — קולד ברו מרענן לקיץ או פילטר חם — לצד עוגות טריות, כריכים ועוד, באווירה ירוקה ושקטה בלב הקיבוץ. עצירה מושלמת בדרך לגולן או לראש פינה. בחודש אוגוסט פתוחים גם בשבתות.",
  brewMethods: "פילטר, קולד ברו",
  isRoaster: false,
  sellsBeans: false,
  vibeTags: ["ירוק וטבעי", "שקט ורגוע", "שכונתי וקהילתי"],
  instagramHandle: "haeglacafe",
  website: "",
  // Exact cart location provided by the owner.
  coordinates: {
    lat: 33.0192988,
    lng: 35.6203627
  },
  heroImage: "/images/haegla.avif",
  _geocode_verified: true,
  _last_updated: "2026-08-06"
};

// Guard against accidental duplicate id / handle
if (cafes.some(c => c.id === newCafe.id)) {
  throw new Error(`id ${newCafe.id} already exists`);
}
if (cafes.some(c => c.instagramHandle === newCafe.instagramHandle)) {
  throw new Error(`handle ${newCafe.instagramHandle} already exists`);
}

cafes.push(newCafe);
cafes.sort((a, b) => a.id - b.id);

fs.writeFileSync(cafesPath, JSON.stringify(cafes, null, 2) + '\n', 'utf8');

console.log(`✅ Added: ${newCafe.name}`);
console.log(`📍 Location: ${newCafe.city}`);
console.log(`📱 Instagram: @${newCafe.instagramHandle}`);
console.log(`🆔 ID: ${newCafe.id}`);
console.log(`📄 Updated file: ${cafesPath}`);
