import type { Roastery } from "@/types/roastery";

// Helper function to generate ID from name and city
// Creates a unique hash-based ID that works with Hebrew text
const generateId = (name: string, city: string): string => {
  // Create a simple hash from the full name and city
  const str = `${name}-${city}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Also create a readable part from Latin characters and numbers
  const namePart = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[()]/g, "")
    .substring(0, 20) || "cafe";
  const cityPart = city
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "-")
    .substring(0, 15) || "city";
  
  // Combine readable part with hash to ensure uniqueness
  const hashStr = Math.abs(hash).toString(36).substring(0, 6);
  return `${namePart}-${cityPart}-${hashStr}`;
};

// Helper function to parse brew methods and maintain order
const parseBrewMethods = (methods: string): string[] => {
  const order = ["אספרסו", "פילטר", "קולד ברו"];
  const parsed = methods.split(",").map((m) => m.trim()).filter(Boolean);
  return parsed.sort((a, b) => {
    const indexA = order.indexOf(a);
    const indexB = order.indexOf(b);
    if (indexA === -1 && indexB === -1) return 0;
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });
};

// Helper function to parse vibe tags
const parseVibeTags = (tags: string[] | string): string[] => {
  if (Array.isArray(tags)) return tags;
  return tags.split(",").map((t) => t.trim()).filter(Boolean);
};

// Helper function to clean Instagram handle (remove @ if present)
const cleanInstagramHandle = (handle: string | undefined): string | undefined => {
  if (!handle || handle.trim() === "") return undefined;
  return handle.replace(/^@/, "");
};

// New CAFES format - raw data
type CafeRaw = {
  id: number;
  name: string;
  city: string;
  address: string;
  openingHours: string;
  description: string;
  brewMethods: string;
  vibeTags: string[];
  instagramHandle: string;
  website: string;
  coordinates: { lat: number; lng: number };
  heroImage: string;
};

export const CAFES: CafeRaw[] = [
  {
    id: 1,
    name: "קפה 51",
    city: "גבעתיים",
    address: "אריאל שרון 10, גבעתיים",
    openingHours: "א'-ה': 07:00–19:00, ו': 07:00–15:00, שבת: סגור",
    description: "הסניף החדש והמעוצב. ממוקם מתחת לבנייני מגורים, והוא הבחירה המושלמת לעצירת בוקר מהירה עם אספרסו חזק ומאפים טריים.",
    brewMethods: "פילטר, אספרסו, קולד ברו",
    vibeTags: ["קז'ואל", "מהיר", "נגיש", "מינימליסטי", "שירותי"],
    instagramHandle: "@coffeeshop51",
    website: "https://www.coffeeshop51.com",
    coordinates: { lat: 32.080681, lng: 34.799844 },
    heroImage: "/images/1Coffeeshop 51.jpg"
  },
  {
    id: 2,
    name: "ג'רה",
    city: "ראשון לציון",
    address: "מורשת ישראל 15, ראשון לציון",
    openingHours: "א'-ה': 07:00–19:00, ו': 07:00–16:00, שבת: סגור",
    description: "בית קלייה ובוטיק קפה שמציע פולים מיוחדים ותערובות ייחודיות. מתמחים בקלייה בהירה-בינונית.",
    brewMethods: "פילטר, אספרסו, קולד ברו",
    vibeTags: ["תעשייתי", "בוטיק", "שקט", "נסתר", "קהילתי"],
    instagramHandle: "@jeracoffee",
    website: "https://www.jeracoffee.com",
    coordinates: { lat: 31.975323, lng: 34.774201 },
    heroImage: "/images/Jera_Rlshon_shlang.jpg"
  },
  {
    id: 3,
    name: "קפה מאה",
    city: "תל אביב",
    address: "מונטיפיורי 3, תל אביב",
    openingHours: "א'-ה': 07:00–19:00, ו': 08:00–16:00, שבת: סגור",
    description: "בית קלייה מרכזי בתל אביב עם קשרים ישירים לחקלאים בקוסטה ריקה. חוויה של קפה נקי ואסתטי.",
    brewMethods: "פילטר, אספרסו, קולד ברו",
    vibeTags: ["אסתטי", "בוטיק", "מרכזי", "עירוני", "מוקפד"],
    instagramHandle: "@maecoffee",
    website: "https://maecafe.co.il",
    coordinates: { lat: 32.064771, lng: 34.769257 },
    heroImage: "/images/mae.jpg"
  },
  {
    id: 4,
    name: "קופילאב",
    city: "תל אביב",
    address: "שדרות הר ציון 108, תל אביב",
    openingHours: "א'-ה': 07:00–18:00, ו': 07:00–16:00, שבת: סגור",
    description: "אחד מחלוצי קפה הספשלטי בישראל. בית קלייה תעשייתי, מקצועי ומוסד ללימודי קפה. מוקפד ברמת הדיוק.",
    brewMethods: "אספרסו",
    vibeTags: ["תעשייתי", "מקצועי", "לומד", "ותיק", "דרומי"],
    instagramHandle: "@coffeelab_roaster",
    website: "https://www.coffeelab.co.il",
    coordinates: { lat: 32.054837, lng: 34.775165 },
    heroImage: "/images/CoffeeLab.jpg"
  },
  {
    id: 5,
    name: "סטודיו קפה",
    city: "ערד",
    address: "סדן 7, ערד",
    openingHours: "א'-ה': 07:30–14:00, ו': 08:00–14:00, שבת: סגור",
    description: "פנינה מדברית בלב רובע האמנים של ערד. קפה קלוי במקום, עם אווירה שקטה ומיוחדת.",
    brewMethods: "פילטר, אספרסו, קולד ברו",
    vibeTags: ["מדברי", "אומנותי", "קהילתי", "שקט", "מקומי"],
    instagramHandle: "@studiocoffeearadil",
    website: "https://www.studiocoffee.co.il",
    coordinates: { lat: 31.247698, lng: 35.194077 },
    heroImage: "/images/studio cafe arad.jpg"
  },
  {
    id: 6,
    name: "קפה נחת",
    city: "תל אביב",
    address: "ריינס 20, תל אביב",
    openingHours: "א'-ה': 07:00–18:00, ו': 07:00–16:00, שבת: סגור",
    description: "אחד מבתי הקלייה המובילים בישראל. ידועים בגישה בלתי מתפשרת לאיכות ובקפה חד-זני ברמה גבוהה.",
    brewMethods: "פילטר, אספרסו, קולד ברו",
    vibeTags: ["היפסטרי", "מינימליסטי", "שקט", "מוקפד", "קהילתי"],
    instagramHandle: "@nahatcoffee",
    website: "https://nahat.co.il",
    coordinates: { lat: 32.079809, lng: 34.775426 },
    heroImage: "/images/nahat_dizingoff_square.jpg"
  },
  {
    id: 7,
    name: "קפליקס",
    city: "תל אביב",
    address: "מרחביה 6, תל אביב",
    openingHours: "א'-ה': 07:00–18:00, ו': 07:00–16:00, שבת: סגור",
    description: "קפה קלוי טרי בלב פלורנטין. אחד המוסדות הראשונים של הספשלטי בארץ. אווירה חמימה ושכונתית.",
    brewMethods: "פילטר, אספרסו, קולד ברו",
    vibeTags: ["שכונתי", "חמים", "בייתי", "ותיק", "קהילתי"],
    instagramHandle: "@cafelixcoffee",
    website: "",
    coordinates: { lat: 32.060163, lng: 34.772120 },
    heroImage: "/images/Cafelix.jpg"
  },
  {
    id: 8,
    name: "אדא חנינא",
    city: "תל אביב",
    address: "רבי חנינא 9, יפו",
    openingHours: "א'-ו': 08:00–18:00, שבת: 09:00–16:00",
    description: "בית קפה קטן וקסום ביפו העתיקה. מתמחים בפולי Guest Roasters מתחלפים, ונותנים דגש על פילטר ו-Slow Brew.",
    brewMethods: "פילטר, אספרסו, קולד ברו",
    vibeTags: ["אומנותי", "יפואי", "רגוע", "ישיבה בחוץ"],
    instagramHandle: "@adacafes",
    website: "https://adachanina.com",
    coordinates: { lat: 32.052306, lng: 34.755586 },
    heroImage: "/images/ada hanina.jpg"
  },
  {
    id: 9,
    name: "רוסטרס (שוק מחנה יהודה)",
    city: "ירושלים",
    address: "האפרסק 20, ירושלים",
    openingHours: "א'-ה': 08:00–20:00, ו': 08:00–15:00, שבת: סגור",
    description: "הסניף המקורי והמרכזי של בית הקלייה. פועלים מלב השוק ומציעים חוויית קפה ירושלמית תוססת.",
    brewMethods: "פילטר, אספרסו, קולד ברו",
    vibeTags: ["שוק", "הומה", "תוסס", "ירושלמי", "צעיר"],
    instagramHandle: "@roasters_coffeebar",
    website: "https://roastersjlm.co.il",
    coordinates: { lat: 31.784762, lng: 35.212785 },
    heroImage: "/images/Roasters_JRSLM.jpg"
  },
  {
    id: 10,
    name: "סיבריס",
    city: "ירושלים",
    address: "עזה 13, ירושלים",
    openingHours: "א'-ה': 07:30–17:00, ו': 07:30–15:00, שבת: סגור",
    description: "בית קלייה בלב רחביה שמדגיש את המדע מאחורי הקפה. מינימליזם, טכניקה ואיכות פולים.",
    brewMethods: "פילטר, אספרסו, קולד ברו",
    vibeTags: ["מדעי", "שקט", "טכני", "מוקפד", "יוקרתי"],
    instagramHandle: "@sybaris_coffee",
    website: "https://www.sybaris.coffee",
    coordinates: { lat: 31.773215, lng: 35.215142 },
    heroImage: "/images/Sybrais.jpg"
  },
  {
    id: 11,
    name: "יוניקו",
    city: "קיבוץ יגור",
    address: "מתחם חוצות יגור, קיבוץ יגור",
    openingHours: "א'-ה': 08:00–17:00, ו': 08:00–14:00, שבת: סגור",
    description: "בית קלייה בוטיקי עם דגש על חד-זניים ו-Specialty. מקום מעולה לרכישת פולים בצפון.",
    brewMethods: "פילטר, אספרסו, קולד ברו",
    vibeTags: ["בוטיק", "נגיש", "רחב", "משפחתי", "צפוני"],
    instagramHandle: "@unico_coffee",
    website: "https://unicoffee.co.il",
    coordinates: { lat: 32.750087, lng: 35.069290 },
    heroImage: "/images/Unico.jpg"
  },
  {
    id: 12,
    name: "אגרוקפה",
    city: "שריגים",
    address: "אשכולות 40, שריגים",
    openingHours: "א'-ה': 08:00–16:00, ו': 08:00–14:00, שבת: סגור",
    description: "בית קלייה כפרי בלב הרי יהודה. מציע שקט ושלווה לצד קפה ספשלטי ופוליק קפה שנקלים במקום.",
    brewMethods: "פילטר, אספרסו, קולד ברו",
    vibeTags: ["כפרי", "רגוע", "משפחתי", "שקט", "נופי"],
    instagramHandle: "@agrocafeisrael",
    website: "https://www.agrocafe.co.il",
    coordinates: { lat: 31.676143, lng: 34.935574 },
    heroImage: "/images/Agrocafe.jpg"
  },
  {
    id: 13,
    name: "בלומס",
    city: "פרדס חנה-כרכור",
    address: "החרושת 1, פרדס חנה כרכור",
    openingHours: "א'-ו': 07:00–14:00, שבת: סגור",
    description: "פנינה של קפה ספשלטי בלב פרדס חנה. עגלת קפה ובית קלייה עם אווירה קהילתית, בתוך מתחם אמנים ירוק וקסום.",
    brewMethods: "פילטר, אספרסו, קולד ברו",
    vibeTags: ["קהילתי", "ירוק", "אומנותי", "קליל", "ישיבה בחוץ"],
    instagramHandle: "@blooms_specialty_coffee",
    website: "https://bloomscoffeeroastery.com",
    coordinates: { lat: 32.477823, lng: 34.978875 },
    heroImage: "/images/BLooms.jpg"
  },
  {
    id: 14,
    name: "הוק (האוס אוף קופי)",
    city: "תל אביב",
    address: "התבור 2, תל אביב",
    openingHours: "א'-ה': 07:30–19:30, ו': 07:30–15:00, שבת: סגור",
    description: "מקדש של מינימליזם נורדי-יפני. קפה המיובא בלעדית מבית הקלייה La Cabra (דנמרק), עם דגש על דיוק קיצוני ואסתטיקה.",
    brewMethods: "פילטר, אספרסו, קולד ברו",
    vibeTags: ["נורדי", "יוקרתי", "שקט", "מוקפד", "מינימליסטי"],
    instagramHandle: "@hoc.telaviv",
    website: "https://www.hoctelaviv.com",
    coordinates: { lat: 32.064999, lng: 34.766621 },
    heroImage: "/images/House of coffee.jpg"
  },
  {
    id: 15,
    name: "ווייקאפ",
    city: "תל אביב",
    address: "יוחנן הסנדלר 23, תל אביב",
    openingHours: "א'-ה': 06:30–20:00, ו': 06:30–16:00, שבת: סגור",
    description: "מוסד תל אביבי אהוב לקפה של בוקר. בית קלייה מקומי עם אווירה חמה, לא מתיימר ומלא באנשים שמבינים קפה.",
    brewMethods: "פילטר, אספרסו, קולד ברו",
    vibeTags: ["שכונתי", "הומה", "חמים", "נגיש", "יומיומי"],
    instagramHandle: "@waycup.coffee.tlv",
    website: "https://www.waycuptlv.com",
    coordinates: { lat: 32.070430, lng: 34.773571 },
    heroImage: "/images/WayCup_Yohannan.jpg"
  },
  {
    id: 16,
    name: "טלק",
    city: "חיפה",
    address: "סירקין 21, חיפה (שוק תלפיות)",
    openingHours: "א'-ה': 07:30–19:00, ו': 07:30–16:00, שבת: סגור",
    description: "בית קלייה וקפה בלב שוק תלפיות המתחדש. שילוב של חספוס חיפאי, קלייה טרייה במקום ומאפים מעולים.",
    brewMethods: "פילטר, אספרסו, Turkish",
    vibeTags: ["שוק", "מחוספס", "חיפאי", "אותנטי", "צעיר"],
    instagramHandle: "@talekcafe",
    website: "",
    coordinates: { lat: 32.809812, lng: 35.000567 },
    heroImage: "/images/ezgif.com-webp-to-jpg-converter.jpg"
  },
  {
    id: 17,
    name: "רוסטרס (באר שבע)",
    city: "באר שבע",
    address: "קק\"ל 23, באר שבע",
    openingHours: "א'-ה': 07:00–21:00, ו': 07:00–16:00, שבת: 09:00–23:00",
    description: "השלוחה הדרומית של בית הקלייה הירושלמי. מציעים חוויית קפה אורבנית ושוקקת בלב באר שבע, פתוחים גם במוצ\"ש.",
    brewMethods: "פילטר, אספרסו, קולד ברו",
    vibeTags: ["צעיר", "אורבני", "תוסס", "מרכזי", "ישיבה בפנים"],
    instagramHandle: "@roasters_coffeebar",
    website: "https://roastersjlm.co.il",
    coordinates: { lat: 31.254514, lng: 34.797517 },
    heroImage: "/images/Roasters_B7.jpg"
  },
  {
    id: 18,
    name: "בירמה קפה",
    city: "ירושלים",
    address: "עמק רפאים 20, ירושלים",
    openingHours: "א'-ה': 07:00–19:00, ו': 07:00–16:00, שבת: סגור",
    description: "בית קלייה ומאפייה שכונתי בלב המושבה הגרמנית. משלב אווירה אירופאית קלאסית עם פולי ספשלטי.",
    brewMethods: "פילטר, אספרסו, קולד ברו",
    vibeTags: ["קלאסי", "אירופאי", "שכונתי", "נעים", "משפחתי"],
    instagramHandle: "@birmacoffee",
    website: "https://birmacoffee.co.il",
    coordinates: { lat: 31.765234, lng: 35.221258 },
    heroImage: "/images/Birma Coffee.jpg"
  },
  {
    id: 19,
    name: "קפה 51 (תל אביב)",
    city: "תל אביב",
    address: "אחד העם 40, תל אביב",
    openingHours: "א'-ה': 07:00–19:00, ו': 07:00–15:00, שבת: סגור",
    description: "הסניף התל אביבי המרכזי של בית הקלייה המוביל. מקום פונקציונלי ומעוצב, מושלם לעצירת קפה איכותית במרכז העסקים.",
    brewMethods: "פילטר, אספרסו, קולד ברו",
    vibeTags: ["מודרני", "עסקי", "מהיר", "מעוצב", "מוקפד"],
    instagramHandle: "@coffeeshop51",
    website: "https://www.coffeeshop51.com",
    coordinates: { lat: 32.056566, lng: 34.793438 },
    heroImage: "/images/CoffeeShop_51_TLV.jpg"
  },
  {
    id: 20,
    name: "קנופי קפה",
    city: "ירושלים",
    address: "יד חרוצים 22, ירושלים",
    openingHours: "א'-ה': 09:00–16:00, ו': סגור, שבת: סגור",
    description: "בית קלייה מוביל ועתיר פרסים. מתמחה בפולי קפה נדירים ובשיטות חליטה מדויקות. המקום פועל בעיקר כמרכז הפצה וקניית פולים **בתיאום מראש בלבד**.",
    brewMethods: "פילטר, אספרסו, קולד ברו",
    vibeTags: ["בוטיק", "מדעי", "מוקפד", "טכני", "לומד", "תעשייתי"],
    instagramHandle: "@coffee.canopy",
    website: "https://www.canopycoffee.co.il",
    coordinates: { lat: 31.779744, lng: 35.216387 },
    heroImage: "/images/Canopy_Roatery.jpg"
  },
  {
    id: 21,
    name: "ויזיני",
    city: "רמת השרון",
    address: "אוסישקין 76, רמת השרון",
    openingHours: "א'-ה': 07:00–18:00, ו': 07:00–15:00, שבת: סגור",
    description: "בית קלייה וקפה ותיק בלב רמת השרון. ידועים בקלייה מדויקת ובאווירה שכונתית רגועה. מציעים מגוון פולים ושיטות חליטה קלאסיות ומיוחדות.",
    brewMethods: "אספרסו",
    vibeTags: ["שכונתי", "רגוע", "ותיק", "קהילתי", "קלאסי"],
    instagramHandle: "@cafevizzini",
    website: "https://www.vizini.co.il",
    coordinates: { lat: 32.158863, lng: 34.903640 },
    heroImage: "/images/Vizzini.jpg"
  },
  {
    id: 22,
    name: "אילן שנהב חותם הקפה",
    city: "רמת השרון",
    address: "סוקולוב 104, רמת השרון",
    openingHours: "א'-ה': 07:00–18:00, ו': 07:00–14:30, שבת: סגור",
    description: "בית קלייה קלאסי ואינטימי הממוקם בלב רמת השרון. מתמקד בקלייה מדויקת ובאווירה שקטה ומקצועית, מוסד ותיק בסצנת הספשלטי המקומית.",
    brewMethods: "אספרסו",
    vibeTags: ["מקצועי", "שכונתי", "אינטימי", "ותיק", "בייתי"],
    instagramHandle: "@hotam_cafe",
    website: "",
    coordinates: { lat: 32.147617, lng: 34.839130 },
    heroImage: "/images/Hotam_HaCafe.jpg"
  },
  {
    id: 23,
    name: "קפה בלו",
    city: "תל אביב - יפו",
    address: "האנגר 2, נמל יפו",
    openingHours: "א'-ש': 08:00–20:00",
    description: "בית קפה פופולרי בלב נמל יפו עם נוף פתוח לים. מציע קפה איכותי ואווירה שלווה וקלילה, עם דגש על אירוח.",
    brewMethods: "פילטר, אספרסו, קולד ברו",
    vibeTags: ["נוף לים", "תיירותי", "קליל", "ים", "נמל"],
    instagramHandle: "@cafeblue.jaffa",
    website: "",
    coordinates: { lat: 32.052600, lng: 34.750500 },
    heroImage: "/images/Cafe_Blue.jpg"
  },
  {
    id: 24,
    name: "קפה מאה (שרונה)",
    city: "תל אביב",
    address: "רב אלוף דוד אלעזר 17",
    openingHours: "א'-ה': 08:00–17:00, ו': 08:00–14:00",
    description: "סניף ייחודי של בית הקלייה, השוכן בבית טמפלרי משופץ בלב פארק שרונה. מביא את בשורת הגל הרביעי ומתמקד בפולים המיובאים ישירות מקוסטה ריקה.",
    brewMethods: "פילטר, אספרסו, קולד ברו",
    vibeTags: ["מוקפד", "שלווה", "ירוק", "אסתטי", "גל רביעי"],
    instagramHandle: "@maecoffee",
    website: "https://www.maecafe.com",
    coordinates: { lat: 32.071956, lng: 34.788345 },
    heroImage: "/images/Sarona_Mae.jpg"
  },
  {
    id: 25,
    name: "צפון רוסטרס",
    city: "חיפה",
    address: "הנביאים 17",
    openingHours: "א'-ה': 08:30–20:00, ו': 08:30–15:00, שבת: 10:00–18:00",
    description: "בית קלייה ובית קפה המתמחה בספשלטי. ממוקם בלב הדר הכרמל, משמש כמרכז קהילתי ותרבותי ומדגיש קלייה מקומית וטכניקה.",
    brewMethods: "פילטר, אספרסו, קולד ברו",
    vibeTags: ["מקצועי", "אורבני", "מודרני", "טכני", "קהילתי"],
    instagramHandle: "@tsafon_roasters",
    website: "https://www.tsafonroasters.com",
    coordinates: { lat: 32.809500, lng: 34.997400 },
    heroImage: "/images/Tsafon_Roasters.jpg"
  },
  {
    id: 26,
    name: "צ'ופצ'יק",
    city: "בית יהושע",
    address: "הרימון 1, בית יהושע",
    openingHours: "א'-ה': 07:00–19:00, ו': 07:00–15:00, שבת: סגור",
    description: "עגלת קפה כפרית ואיכותית בלב השרון. מציעים קפה ספשלטי בקלייה עצמית ואירוח משפחתי ורגוע בטבע.",
    brewMethods: "פילטר, אספרסו, קולד ברו",
    vibeTags: ["עגלת קפה", "כפרי", "שלווה", "ירוק", "קהילתי"],
    instagramHandle: "@chupchik_cafe",
    website: "https://chupchik.co.il",
    coordinates: { lat: 32.258841, lng: 34.865598 },
    heroImage: "/images/ChupChik_Coffee.jpg"
  },
  {
    id: 27,
    name: "רוסטרס (בצלאל)",
    city: "ירושלים",
    address: "בצלאל 2, ירושלים",
    openingHours: "א'-ה': 07:30–20:00, ו': 07:30–15:00, שבת: 09:30–18:00",
    description: "הסניף החדש והמעוצב בכיכר בצלאל. מציע קפה ספשלטי, מאפים ומוצרים נלווים במיקום מרכזי. פתוח גם בשבת.",
    brewMethods: "פילטר, אספרסו, קולד ברו",
    vibeTags: ["מעוצב", "מרכזי", "עירוני", "צעיר", "נגיש"],
    instagramHandle: "@roasters_coffeebar",
    website: "https://roastersjlm.co.il",
    coordinates: { lat: 31.782800, lng: 35.215500 },
    heroImage: "/images/Roasters_JRLSM_2ND_BRANCH.jpg"
  },
  {
    id: 28,
    name: "טלק (טיקוטין)",
    city: "חיפה",
    address: "שדרות הנשיא 89, חיפה",
    openingHours: "א'-ה': 09:00–16:00, ו': 09:00–14:00, שבת: 10:00–16:00",
    description: "הסניף האומנותי הממוקם בתוך מוזיאון טיקוטין לאמנות יפנית. חוויית קפה שקטה באווירה תרבותית וייחודית.",
    brewMethods: "אספרסו, קולד ברו",
    vibeTags: ["מוזיאלי", "שקט", "יפני", "תרבותי", "איכותי"],
    instagramHandle: "@talekcafe",
    website: "https://www.talekcafe.co.il",
    coordinates: { lat: 32.809167, lng: 34.985278 },
    heroImage: "/images/ezgif.com-webp-to-jpg-converter.jpg"
  },
  {
    id: 29,
    name: "קפטיש",
    city: "תל אביב",
    address: "וולטר מוזס 10, תל אביב",
    openingHours: "א'-ה': 07:30–18:00, ו': 07:30–14:00, שבת: 09:00–16:00",
    description: "בית קפה אינטימי ונסתר באזור יגאל אלון. מציע קפה איכותי מאוד, מאפים ביתיים ואווירה שקטה ונעימה לעבודה או אתנחתא.",
    brewMethods: "פילטר, אספרסו, קולד ברו",
    vibeTags: ["אינטימי", "שקט", "איכותי", "עבודה", "מודרני"],
    instagramHandle: "@cafetish",
    website: "",
    coordinates: { lat: 32.072500, lng: 34.795200 },
    heroImage: "/images/Cafetish.jpg"
  },
  {
    id: 30,
    name: "צ'אצ'וס (גאולה)",
    city: "תל אביב",
    address: "גאולה 51, תל אביב",
    openingHours: "א'-ה': 07:00–19:00, ו': 07:00–17:00, שבת: 08:00–19:00",
    description: "מקום קטן ומלא באופי ליד הים. ידועים במשקאות קפה ומאצ'ה מיוחדים, קלייה עצמית במקום ואווירה שמחה.",
    brewMethods: "פילטר, אספרסו, קולד ברו",
    vibeTags: ["שכונתי", "ים", "צעיר", "קליל", "קליה"],
    instagramHandle: "@chachos.tlv",
    website: "https://chachos-cafe.com",
    coordinates: { lat: 32.071830, lng: 34.766350 },
    heroImage: "/images/ChaCho's Geula.jpg"
  },
  {
    id: 31,
    name: "קפה נעורים",
    city: "פרדס חנה-כרכור",
    address: "נעורים 54, פרדס חנה-כרכור",
    openingHours: "א'-ה': 07:30–17:00, ו': 07:30–14:00, שבת: סגור",
    description: "בית קלייה ובית קפה עם אווירה קהילתית. מקום קסום ורגוע בלב פרדס חנה עם קפה טרי שנקלה במקום.",
    brewMethods: "פילטר, אספרסו, קולד ברו",
    vibeTags: ["ירוק", "חופש", "קליה", "שקט", "טבע"],
    instagramHandle: "@cafe_neurim",
    website: "",
    coordinates: { lat: 32.471858, lng: 34.996795 },
    heroImage: "/images/Neurim Caffe.jpg"
  },
  {
    id: 32,
    name: "פהקפה",
    city: "תל אביב",
    address: "כפר גלעדי 48, תל אביב",
    openingHours: "א'-ה': 07:00–19:00, ו': 07:00–16:00, שבת: 08:00–21:00",
    description: "בית קפה ומאפייה בפלורנטין עם אווירה ביתית ועיצוב נקי. מגישים מאפים כפריים טריים וקפה ארטיזנלי מעולה.",
    brewMethods: "פילטר, אספרסו, קולד ברו",
    vibeTags: ["פלורנטין", "מאפים", "נעים", "שכונתי", "איכות"],
    instagramHandle: "@poc.cafe",
    website: "",
    coordinates: { lat: 32.057463, lng: 34.770295 },
    heroImage: "/images/p.o.c cafe.jpg"
  },
  {
    id: 33,
    name: "אדמונד קפה",
    city: "תל אביב",
    address: "יצחק שדה 32, תל אביב",
    openingHours: "א'-ה': 07:00–18:00, ו': 07:00–15:00, שבת: סגור",
    description: "פנינה נסתרת ביד אליהו עם חצר פנימית ירוקה וקסומה. קולים את הקפה במקום (Micro-roastery) ומציעים אווירה של חופש באמצע העיר.",
    brewMethods: "פילטר, אספרסו, קולד ברו",
    vibeTags: ["חצר", "ירוק", "קליה", "שקט", "נסתר"],
    instagramHandle: "@edmund_coffee",
    website: "",
    coordinates: { lat: 32.065176, lng: 34.787294 },
    heroImage: "/images/edmund cafe.jpg"
  },
  {
    id: 34,
    name: "קוהי",
    city: "תל אביב",
    address: "בן יהודה 155, תל אביב",
    openingHours: "א'-ש': 07:30–18:30",
    description: "בית קפה יפני מינימליסטי. עיצוב עץ נקי, מנות יפניות קטנות (סנדוויץ' טמאגו!) וקפה ספשלטי מוקפד (פולים של Jera).",
    brewMethods: "פילטר, אספרסו, מקינטה",
    vibeTags: ["יפני", "מינימליסטי", "נקי", "מיוחד", "שקט"],
    instagramHandle: "@kohi.tlv",
    website: "",
    coordinates: { lat: 32.089265, lng: 34.773207 },
    heroImage: "/images/Kohi.jpg"
  },
  {
    id: 35,
    name: "שאולה",
    city: "תל אביב",
    address: "שאול המלך 39, תל אביב",
    openingHours: "א'-ה': 07:30–20:00, ו': 07:30–16:00, שבת: 08:00–20:00",
    description: "בר קפה פתוח ומודרני בלובי של מלון לינק. מקום מושלם לפגישות או עבודה, עם פולי קפה של Blooms ואווירה אורבנית.",
    brewMethods: "פילטר, אספרסו, קולד ברו",
    vibeTags: ["עבודה", "מלון", "מודרני", "פגישות", "Blooms"],
    instagramHandle: "@shaula_cafe",
    website: "",
    coordinates: { lat: 32.078039, lng: 34.791048 },
    heroImage: "/images/Shaula.jpg"
  },
  {
    id: 36,
    name: "4t קפה",
    city: "תל אביב",
    address: "משה מאור 3, תל אביב",
    openingHours: "א'-ה': 08:00–20:00, ו': 08:00–15:00, שבת: סגור",
    description: "הלוקיישן החדש והמסקרן בבניין 'המבצר'. עיצוב תעשייתי, אומנות, וקפה מעולה מבית Blooms.",
    brewMethods: "פילטר, אספרסו",
    vibeTags: ["אומנות", "תעשייתי", "חדש", "Blooms", "מיוחד"],
    instagramHandle: "@4t.cafe",
    website: "",
    coordinates: { lat: 32.052275, lng: 34.768471 },
    heroImage: "/images/4t cafe.jpg"
  },
  {
    id: 37,
    name: "קפה אסתר",
    city: "תל אביב",
    address: "זמנהוף 1, תל אביב",
    openingHours: "א'-ש': 08:00–20:00",
    description: "האחות הקטנה של קפה נחת, במיקום אייקוני בלובי של מלון סינמה (כיכר דיזנגוף). קלאסיקה תל אביבית עם קפה משובח.",
    brewMethods: "פילטר, אספרסו",
    vibeTags: ["כיכר דיזנגוף", "מלון", "קלאסי", "נחת", "תיירים"],
    instagramHandle: "@cafe_esther_tlv",
    website: "",
    coordinates: { lat: 32.078230, lng: 34.774744 },
    heroImage: "/images/קפה אסתר.jpg"
  },
  {
    id: 38,
    name: "D298",
    city: "תל אביב",
    address: "דיזנגוף 298, תל אביב",
    openingHours: "א'-ה': 07:30–20:00, ו': 07:30–17:00, שבת: 08:00–20:00",
    description: "נקודה תל אביבית קלאסית בצפון דיזנגוף. קפה איכותי, מאפים טובים ואווירה של שכונה בלב העיר.",
    brewMethods: "פילטר, אספרסו, קולד ברו",
    vibeTags: ["דיזנגוף", "שכונתי", "רחוב", "קפה", "מאפים"],
    instagramHandle: "@d298_tlv",
    website: "",
    coordinates: { lat: 32.094180, lng: 34.776932 },
    heroImage: "/images/D298.jpeg"
  },
  {
    id: 39,
    name: "קפה בשוק",
    city: "תל אביב",
    address: "יום טוב 30, תל אביב",
    openingHours: "א'-ה': 07:30–19:00, ו': 07:30–16:00, שבת: סגור",
    description: "בלב שוק לוינסקי, מקום קטן עם נשמה גדולה. קפה מעולה שמשתלב בול עם האווירה הצבעונית של השוק.",
    brewMethods: "פילטר, אספרסו",
    vibeTags: ["שוק לוינסקי", "אותנטי", "תוסס", "רחוב", "קפה"],
    instagramHandle: "@cafebashuk",
    website: "",
    coordinates: { lat: 32.069352, lng: 34.769767 },
    heroImage: "/images/coffee bashuk.jpg"
  },
  {
    id: 40,
    name: "קפה ופרח",
    city: "ראשון לציון",
    address: "בן יהודה 6, ראשון לציון",
    openingHours: "א'-ה': 07:30–20:00, ו': 07:30–15:00, שבת: סגור",
    description: "שילוב קסום של בית קפה ודוכן פרחים. מקום פסטורלי ומעוצב שמציע קפה איכותי (פולים של בית הקלייה מאוריציו) באווירה פורחת ונעימה.",
    brewMethods: "פילטר, אספרסו",
    vibeTags: ["פרחים", "אסתטי", "רגוע", "ראשון לציון", "מיוחד"],
    instagramHandle: "@caffe.and.flower",
    website: "",
    coordinates: { lat: 31.960413, lng: 34.806189 },
    heroImage: "/images/caffe and flower.jpg"
  },
  {
    id: 41,
    name: "נומנה",
    city: "תל אביב",
    address: "אלנבי 54, תל אביב",
    openingHours: "א'-ה': 07:30–20:00, ו': 07:30–16:00, שבת: 09:00–20:00",
    description: "בית קפה שכונתי ונעים על רחוב אלנבי. קפה משובח, מאפים טריים ואווירה תל אביבית לא מתאמצת.",
    brewMethods: "פילטר, אספרסו, קולד ברו",
    vibeTags: ["רחוב", "קליל", "אורבני", "מאפים", "ספשלטי"],
    instagramHandle: "@nomena.tlv",
    website: "",
    coordinates: { lat: 32.070825, lng: 34.769615 },
    heroImage: "/images/Nomena.jpg"
  },
  {
    id: 42,
    name: "קפה מלבן (כצנלסון)",
    city: "גבעתיים",
    address: "כצנלסון 50, גבעתיים",
    openingHours: "א'-ה': 07:30–19:30, ו': 07:30–15:00, שבת: סגור",
    description: "קפה שכונתי אהוב בגבעתיים. עובדים עם Mix & Matcha ומציעים משקאות מאצ'ה איכותיים לצד כריכים מעולים.",
    brewMethods: "אספרסו",
    vibeTags: ["שכונתי", "משפחתי", "נעים", "מקומי", "גבעתיים"],
    instagramHandle: "@cafemalben",
    website: "",
    coordinates: { lat: 32.074500, lng: 34.808500 },
    heroImage: "/images/Malben_Katzenelson.jpg"
  },
  {
    id: 43,
    name: "קפה דייזי",
    city: "תל אביב",
    address: "אבן גבירול 114, תל אביב",
    openingHours: "א'-ה': 07:30–23:00, ו': 07:30–16:00, שבת: 08:30–23:00",
    description: "האחות הקטנה והצבעונית של קפה בוקה. מקום שמח עם עיצוב רטרו ומשקאות מאצ'ה (Mix & Matcha) מפנקים.",
    brewMethods: "אספרסו",
    vibeTags: ["רטרו", "צבעוני", "שכונתי", "שמח", "צעיר"],
    instagramHandle: "@daisy.tlv",
    website: "",
    coordinates: { lat: 32.085072, lng: 34.781892 },
    heroImage: "/images/Cafe_Daisy.jpg"
  },
  {
    id: 44,
    name: "צ'אצ'וס (גורדון)",
    city: "תל אביב",
    address: "גורדון 26, תל אביב",
    openingHours: "א'-ש': 07:00–23:00",
    description: "הסניף השני והתוסס של צ'אצ'וס. אותה איכות קלייה ואווירה שמחה, במיקום מרכזי ליד הים.",
    brewMethods: "פילטר, אספרסו, קולד ברו",
    vibeTags: ["שכונתי", "ים", "שמח", "ערב", "קליה"],
    instagramHandle: "@chachos.tlv",
    website: "https://chachos-cafe.com",
    coordinates: { lat: 32.082000, lng: 34.771000 },
    heroImage: "/images/Chacho's Gordon.jpg"
  }
];

// Transform CAFES to ROASTERIES format for compatibility
export const ROASTERIES: Roastery[] = CAFES.map((cafe): Roastery => ({
  id: generateId(cafe.name, cafe.city),
  name: cafe.name,
  city: cafe.city || null,
  address: cafe.address || null,
  openingHours: cafe.openingHours || null,
  description: cafe.description,
  brewMethods: parseBrewMethods(cafe.brewMethods),
  vibeTags: parseVibeTags(cafe.vibeTags),
  instagramHandle: cleanInstagramHandle(cafe.instagramHandle) || null,
  website: cafe.website && cafe.website.trim() !== "" ? cafe.website : null,
  latitude: cafe.coordinates.lat || null,
  longitude: cafe.coordinates.lng || null,
  heroImage: cafe.heroImage || null,
  reviews: [],
}));
