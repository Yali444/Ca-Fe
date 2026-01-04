const fs = require('fs');
const path = require('path');

// Read the cafes.json file
const cafesPath = path.join(__dirname, 'public', 'data', 'cafes.json');
const cafes = JSON.parse(fs.readFileSync(cafesPath, 'utf8'));

// GROUP A: ROASTERS (isRoaster: true, sellsBeans: true)
const roasters = new Set([
  'libira-haifa',
  'mae-montfiore', // This is cafe ID 3 (קפה מאה with מונטיפיורי address)
  3, // קפה מאה (מונטיפיורי)
  'waycup-tlv', // WayCup entries
  15, // ווייקאפ (יוחנן הסנדלר)
  83, // ווייקאפ (מקווה ישראל)
  'origem-tlv',
  'nahat-hatahana',
  6, // קפה נחת (ריינס 20)
  'cafelix', // Any Cafelix entry
  7, // קפליקס (מרחביה)
  53, // קפליקס (יפו)
  54, // קפליקס (לוינסקי)
  55, // קפליקס (מרכז העיר)
  'cafe-bakibutz',
  'roaster-pardes-hanna', // Need to find this - might be רוסטר קפה (ID 86)
  86, // רוסטר קפה (פרדס חנה)
  13, // בלומס (Blooms)
]);

// GROUP B: RETAILERS (isRoaster: false, sellsBeans: true)
const retailers = new Set([
  'hoc-trumpeldor',
  87, // הוק (טרומפלדור)
  14, // הוק (תבור) - also multi-roaster
  'ada-levinsky',
  'cafe-lili-tlv',
  'cafe-nachmani',
  'slowness-moran',
  'picnic-player',
  'tfwc-jaffa',
  'boser-tlv',
  85, // בוסר
]);

// GROUP C: MATCHA / OTHER (isRoaster: false, sellsBeans: false)
const matchaOnly = new Set([
  'cafe-boker-tlv',
  'liba-cafe-caesarea',
]);

// Helper function to check if cafe ID matches (handles both numeric and string IDs)
function matchesId(cafe, idSet) {
  if (idSet.has(cafe.id)) return true;
  if (typeof cafe.id === 'string' && typeof idSet.has === 'function') {
    // Check if any string ID in the set matches
    for (const id of idSet) {
      if (typeof id === 'string' && cafe.id === id) return true;
    }
  }
  
  // Check for name-based matching for specific cases
  const name = cafe.name?.toLowerCase() || '';
  
  // Mae cafes (קפה מאה) - check address contains מונטיפיורי
  if (idSet.has(3) || idSet.has('mae-montfiore')) {
    if (name.includes('מאה') && cafe.address?.includes('מונטיפיורי')) {
      return true;
    }
  }
  
  // WayCup cafes (ווייקאפ)
  if (idSet.has(15) || idSet.has(83) || idSet.has('waycup-tlv')) {
    if (name.includes('ווייקאפ') || name.includes('waycup')) {
      return true;
    }
  }
  
  // Cafelix cafes (קפליקס)
  if (idSet.has('cafelix') || idSet.has(7) || idSet.has(53) || idSet.has(54) || idSet.has(55)) {
    if (name.includes('קפליקס') || name.includes('קפליקס') || name.toLowerCase().includes('cafelix')) {
      return true;
    }
  }
  
  // Roaster Pardes Hanna - look for רוסטר קפה in פרדס חנה
  if (idSet.has('roaster-pardes-hanna')) {
    if (cafe.city?.includes('פרדס חנה') && (name.includes('רוסטר') || name.includes('רוסטרס'))) {
      return true;
    }
  }
  
  // HOC (הוק) - multi-roaster
  if (idSet.has('hoc-trumpeldor') || idSet.has(87) || idSet.has(14)) {
    if (name.includes('הוק') || name.toLowerCase().includes('hoc')) {
      return true;
    }
  }
  
  return false;
}

// Step 1: Set defaults for all cafes
cafes.forEach(cafe => {
  cafe.isRoaster = false;
  cafe.sellsBeans = false;
});

// Step 2: Apply GROUP A overrides (Roasters)
cafes.forEach(cafe => {
  if (matchesId(cafe, roasters)) {
    cafe.isRoaster = true;
    cafe.sellsBeans = true;
  }
});

// Step 3: Apply GROUP B overrides (Retailers)
cafes.forEach(cafe => {
  if (matchesId(cafe, retailers)) {
    cafe.isRoaster = false;
    cafe.sellsBeans = true;
  }
});

// Step 4: Apply GROUP C overrides (Matcha/Other - already false, but ensure consistency)
cafes.forEach(cafe => {
  if (matchesId(cafe, matchaOnly)) {
    cafe.isRoaster = false;
    cafe.sellsBeans = false;
  }
});

// Write the updated file
fs.writeFileSync(cafesPath, JSON.stringify(cafes, null, 2), 'utf8');

console.log(`✅ Updated ${cafes.length} cafes with isRoaster and sellsBeans flags`);
console.log(`\nSummary:`);
const roasterCount = cafes.filter(c => c.isRoaster === true).length;
const beansCount = cafes.filter(c => c.sellsBeans === true).length;
console.log(`- Roasters: ${roasterCount}`);
console.log(`- Sells Beans: ${beansCount}`);
console.log(`- Regular Cafes: ${cafes.length - beansCount}`);


















