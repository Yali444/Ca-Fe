"use client";

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
    openingHours: "א': 07:30–19:00, ב'-ה': 07:30–19:00, ו': 07:30–15:00, שבת: 08:00–19:00",
    description: "הסניף החדש והמעוצב. ממוקם מתחת לבנייני מגורים, והוא הבחירה המושלמת לעצירת בוקר מהירה עם אספרסו חזק ומאפים טריים.",
    brewMethods: "פילטר, אספרסו, קולד ברו",
    vibeTags: ["קז'ואל", "מהיר", "נגיש", "מינימליסטי", "שירותי"],
    instagramHandle: "@coffeeshop51",
    website: "https://www.coffeeshop51.com",
    coordinates: { lat: 32.080954, lng: 34.800126 },
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
    coordinates: { lat: 31.975656, lng: 34.774255 },
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
    coordinates: { lat: 32.064744, lng: 34.769251 },
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
    coordinates: { lat: 32.050907, lng: 34.773706 },
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
    coordinates: { lat: 31.247181, lng: 35.194071 },
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
    vibeTags: ["היפסטרי", "מינימליסטי", "מוקפד", "קהילתי"],
    instagramHandle: "@nahatcoffee",
    website: "https://nahat.co.il",
    coordinates: { lat: 32.079811, lng: 34.775418 },
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
    coordinates: { lat: 32.06013, lng: 34.772154 },
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
    coordinates: { lat: 32.0521, lng: 34.755472 },
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
    coordinates: { lat: 31.78476, lng: 35.212788 },
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
    coordinates: { lat: 31.773199, lng: 35.215171 },
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
    coordinates: { lat: 32.741532, lng: 35.076826 },
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
    coordinates: { lat: 31.675823, lng: 34.936216 },
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
    coordinates: { lat: 32.452308, lng: 34.970574 },
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
    coordinates: { lat: 32.064953, lng: 34.76661 },
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
    coordinates: { lat: 32.070368, lng: 34.773505 },
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
    coordinates: { lat: 32.809653, lng: 35.000817 },
    heroImage: "/images/ezgif.com-webp-to-jpg-converter.jpg"
  },
  {
    id: 17,
    name: "רוסטרס (באר שבע)",
    city: "באר שבע",
    address: "קק\"ל 23, באר שבע",
    openingHours: "א'-ה': 07:30–23:00, ו': 07:30–15:30, מוצ\"ש: 20:00–23:00",
    description: "השלוחה הדרומית של בית הקלייה הירושלמי. מציעים חוויית קפה אורבנית ושוקקת בלב באר שבע, פתוחים גם במוצ\"ש.",
    brewMethods: "פילטר, אספרסו, קולד ברו",
    vibeTags: ["צעיר", "אורבני", "תוסס", "מרכזי", "ישיבה בפנים"],
    instagramHandle: "@roasters_coffeebar",
    website: "https://roastersjlm.co.il",
    coordinates: { lat: 31.2374574, lng: 34.79218160000001 },
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
    coordinates: { lat: 31.76523, lng: 35.221257 },
    heroImage: "/images/Birma Coffee.jpg"
  },
  {
    id: 19,
    name: "קפה 51 (תל אביב)",
    city: "תל אביב",
    address: "שדרות החיל 12, תל אביב",
    openingHours: "א'-ה': 07:00–19:00, ו': 07:00–15:00, שבת: סגור",
    description: "הסניף התל אביבי המרכזי של בית הקלייה המוביל. מקום פונקציונלי ומעוצב, מושלם לעצירת קפה איכותית במרכז העסקים.",
    brewMethods: "פילטר, אספרסו, קולד ברו",
    vibeTags: ["מודרני", "עסקי", "מהיר", "מעוצב", "מוקפד"],
    instagramHandle: "@coffeeshop51",
    website: "https://www.coffeeshop51.com",
    coordinates: { lat: 32.0562851, lng: 34.7933461 },
    heroImage: "/images/CoffeeShop_51_TLV.jpg"
  },
  {
    id: 79,
    name: "קפה אחד העם",
    city: "תל אביב",
    address: "אחד העם 51, תל אביב",
    openingHours: "א'-ה': 07:00–19:00, ו': 07:00–15:00, שבת: סגור",
    description: "בית קפה איכותי במרכז תל אביב. מציע קפה משובח ואווירה נעימה.",
    brewMethods: "אספרסו, פילטר",
    vibeTags: ["תל אביבי", "מרכז העיר", "איכותי", "נעים"],
    instagramHandle: "cafe.ahad.haam",
    website: "",
    coordinates: { lat: 32.0663765, lng: 34.7764352 },
    heroImage: "/images/Cafe_Ehad_Haam.jpg"
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
    coordinates: { lat: 31.750315, lng: 35.215267 },
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
    coordinates: { lat: 32.144959, lng: 34.844655 },
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
    coordinates: { lat: 32.150379, lng: 34.841152 },
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
    coordinates: { lat: 32.0520082, lng: 34.74970090000001 },
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
    coordinates: { lat: 32.071833, lng: 34.788168 },
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
    coordinates: { lat: 32.813184, lng: 34.995724 },
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
    instagramHandle: "@chupchikcaffe",
    website: "https://chupchik.co.il",
    coordinates: { lat: 32.2583, lng: 34.868656 },
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
    coordinates: { lat: 31.780261, lng: 35.214676 },
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
    coordinates: { lat: 32.8093448, lng: 34.9853735 },
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
    coordinates: { lat: 32.068588, lng: 34.795438 },
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
    coordinates: { lat: 32.071182, lng: 34.769558 },
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
    coordinates: { lat: 32.471733, lng: 34.996811 },
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
    coordinates: { lat: 32.057367, lng: 34.770298 },
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
    coordinates: { lat: 32.065049, lng: 34.787316 },
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
    coordinates: { lat: 32.088286, lng: 34.773303 },
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
    coordinates: { lat: 32.077994, lng: 34.79108 },
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
    coordinates: { lat: 32.052193, lng: 34.768471 },
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
    coordinates: { lat: 32.077966, lng: 34.774844 },
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
    coordinates: { lat: 32.094154, lng: 34.776843 },
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
    coordinates: { lat: 32.068989, lng: 34.768695 },
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
    coordinates: { lat: 31.960368, lng: 34.806162 },
    heroImage: "/images/caffe_and_flower.jpg"
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
    coordinates: { lat: 32.070735, lng: 34.769702 },
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
    coordinates: { lat: 32.075074, lng: 34.807603 },
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
    coordinates: { lat: 32.084973, lng: 34.781881 },
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
    coordinates: { lat: 32.082085, lng: 34.77155 },
    heroImage: "/images/Chacho's Gordon.jpg"
  },
  {
    id: 47,
    name: "פאקינג סאנדיי",
    city: "תל אביב",
    address: "לוינסקי 61, תל אביב",
    openingHours: "א'-ש': 08:00–22:00",
    description: "בית קפה אורבני עם אווירה צעירה ותוססת. מציעים קפה איכותי ומאפים טריים.",
    brewMethods: "פילטר, אספרסו",
    vibeTags: ["אורבני", "צעיר", "תוסס", "שכונתי"],
    instagramHandle: "fckn_sunday",
    website: "",
    coordinates: { lat: 32.0594712, lng: 34.7738223 },
    heroImage: "/images/fckn_sunday.jpg"
  },
  {
    id: 48,
    name: "קופי אורגניזיישן",
    city: "תל אביב",
    address: "מקווה ישראל 3, תל אביב",
    openingHours: "א'-ש': 08:00–20:00",
    description: "סטודיו קפה מקצועי המתמחה בקלייה ובהכנת קפה איכותי. מקום של מקצוענים.",
    brewMethods: "פילטר, אספרסו, קולד ברו",
    vibeTags: ["מקצועי", "סטודיו", "איכותי", "שקט"],
    instagramHandle: "coffee_organization",
    website: "",
    coordinates: { lat: 32.0626756, lng: 34.7756166 },
    heroImage: "/images/coffee_organization.jpg"
  },
  {
    id: 49,
    name: "קפה אלג׳יר",
    city: "תל אביב",
    address: "ביאליק 26, תל אביב",
    openingHours: "א'-ש': 07:00–19:00",
    description: "בית קפה שכונתי חמים עם אווירה מזרחית. מציעים קפה טורקי מסורתי ומאכלים ביתיים.",
    brewMethods: "אספרסו, פילטר",
    vibeTags: ["שכונתי", "מזרחי", "חמים", "מסורתי"],
    instagramHandle: "cafealgier",
    website: "",
    coordinates: { lat: 32.0732688, lng: 34.7712202 },
    heroImage: "/images/cafe_algiers.jpg"
  },
  {
    id: 50,
    name: "טימותי",
    city: "תל אביב",
    address: "אבן גבירול 187, תל אביב",
    openingHours: "א'-ש': 07:00–22:00",
    description: "בית קפה מודרני עם עיצוב נקי ומינימליסטי. מתמחה בקפה איכותי ובמאפים טריים.",
    brewMethods: "פילטר, אספרסו, קולד ברו",
    vibeTags: ["מודרני", "מינימליסטי", "נקי", "איכותי"],
    instagramHandle: "timothycafetlv",
    website: "",
    coordinates: { lat: 32.094132, lng: 34.7832982 },
    heroImage: "/images/timothy.jpg"
  },
  {
    id: 51,
    name: "בונה",
    city: "תל אביב",
    address: "קלמן מגן 3, תל אביב (שרונה מרקט)",
    openingHours: "א'-ש': 09:00–21:00",
    description: "בית קפה בתוך שוק שרונה. מציעים קפה איכותי וסביבה שוקקת חיים.",
    brewMethods: "פילטר, אספרסו",
    vibeTags: ["שוק", "שוקק", "מרכזי", "איכותי"],
    instagramHandle: "bunasarona",
    website: "",
    coordinates: { lat: 32.049417, lng: 34.793313 },
    heroImage: "/images/buna_sarona.jpg"
  },
  {
    id: 52,
    name: "קפה פיקולו",
    city: "תל אביב",
    address: "דרויאנוב 5, תל אביב",
    openingHours: "א'-ש': 07:00–19:00",
    description: "בית קפה קטן ואינטימי עם אווירה אירופית. מתמחה בקפה איטלקי מסורתי.",
    brewMethods: "אספרסו, פילטר",
    vibeTags: ["אינטימי", "אירופי", "קטן", "מסורתי"],
    instagramHandle: "cafe.piccolo.il",
    website: "",
    coordinates: { lat: 32.0768982, lng: 34.7719282 },
    heroImage: "/images/piccolo.jpg"
  },
  {
    id: 53,
    name: "קפליקס (יפו)",
    city: "תל אביב-יפו",
    address: "סגולה 13, תל אביב-יפו",
    openingHours: "א'-ש': 07:00–20:00",
    description: "הסניף היפואי של קפליקס. אותה איכות קפה באווירה יפואית ייחודית.",
    brewMethods: "פילטר, אספרסו, קולד ברו",
    vibeTags: ["יפו", "שכונתי", "איכותי", "קליה"],
    instagramHandle: "cafelixcoffee",
    website: "",
    coordinates: { lat: 32.0565888, lng: 34.761111 },
    heroImage: "/images/cafelix_jaffa.jpg"
  },
  {
    id: 54,
    name: "קפליקס (לוינסקי)",
    city: "תל אביב",
    address: "מרחביה 6, תל אביב",
    openingHours: "א'-ש': 07:00–20:00",
    description: "הסניף הלוינסקי של קפליקס. בית קפה שכונתי עם קפה איכותי ואווירה חמה.",
    brewMethods: "פילטר, אספרסו, קולד ברו",
    vibeTags: ["שכונתי", "לוינסקי", "איכותי", "קליה"],
    instagramHandle: "cafelixcoffee",
    website: "",
    coordinates: { lat: 32.0601301, lng: 34.7721541 },
    heroImage: "/images/cafelix_levinsky.jpg"
  },
  {
    id: 55,
    name: "קפליקס (מרכז העיר)",
    city: "תל אביב",
    address: "שלמה המלך 12, תל אביב",
    openingHours: "א'-ש': 07:00–20:00",
    description: "הסניף המרכזי של קפליקס. בית קפה אורבני עם קפה איכותי וסביבה תוססת.",
    brewMethods: "פילטר, אספרסו, קולד ברו",
    vibeTags: ["מרכזי", "אורבני", "תוסס", "קליה"],
    instagramHandle: "cafelixcoffee",
    website: "",
    coordinates: { lat: 32.0774773, lng: 34.7767117 },
    heroImage: "/images/cafelix_center.jpg"
  },
  {
    id: 56,
    name: "בית חנה (סניף פלורנטין)",
    city: "תל אביב",
    address: "הרבי מבכרך 6, תל אביב",
    openingHours: "א'-ש': 07:00–19:00",
    description: "הסניף הפלורנטיני של בית חנה. בית קפה שכונתי עם אווירה חמה ומאכלים ביתיים.",
    brewMethods: "אספרסו, פילטר",
    vibeTags: ["שכונתי", "פלורנטין", "חמים", "ביתי"],
    instagramHandle: "beit_hanna_harabi",
    website: "",
    coordinates: { lat: 32.0581342, lng: 34.766079 },
    heroImage: "/images/beit_hanna_florentin.jpg"
  },
  {
    id: 57,
    name: "טוני ואסתר",
    city: "תל אביב",
    address: "לוינסקי 39, תל אביב",
    openingHours: "א'-ש': 07:00–20:00",
    description: "בית קפה שכונתי עם אווירה ביתית וחמה. מציעים קפה טוב ומאכלים ביתיים.",
    brewMethods: "אספרסו, פילטר",
    vibeTags: ["שכונתי", "ביתי", "חמים", "לוינסקי"],
    instagramHandle: "tonyveesther",
    website: "",
    coordinates: { lat: 32.0599213, lng: 34.7716146 },
    heroImage: "/images/tony_and_esther.jpg"
  },
  {
    id: 58,
    name: "קפה ברזילי",
    city: "תל אביב",
    address: "ברזילי 1, תל אביב",
    openingHours: "א'-ש': 07:00–19:00",
    description: "בית קפה שכונתי עם אווירה נעימה. מתמחה בקפה איכותי ומאפים טריים.",
    brewMethods: "פילטר, אספרסו",
    vibeTags: ["שכונתי", "נעים", "איכותי", "מאפים"],
    instagramHandle: "cafebarzilay",
    website: "",
    coordinates: { lat: 32.0622441, lng: 34.775321 },
    heroImage: "/images/barzilay.jpg"
  },
  {
    id: 59,
    name: "לאביט",
    city: "תל אביב",
    address: "דיזנגוף 232, תל אביב",
    openingHours: "א'-ש': 08:00–22:00",
    description: "בית קפה מודרני עם עיצוב יוקרתי. מציעים קפה איכותי ומאפים מעולים.",
    brewMethods: "פילטר, אספרסו, קולד ברו",
    vibeTags: ["יוקרתי", "מודרני", "דיזנגוף", "איכותי"],
    instagramHandle: "loveat.tlv",
    website: "https://coffeeorg.co/",
    coordinates: { lat: 32.0893574, lng: 34.7757839 },
    heroImage: "/images/loveat.jpg"
  },
  {
    id: 60,
    name: "תמוז",
    city: "תל אביב",
    address: "מזא\"ה 7, תל אביב",
    openingHours: "א'-ש': 07:00–20:00",
    description: "בית קפה שכונתי עם אווירה חמה. מתמחה בקפה איכותי ומאכלים ביתיים.",
    brewMethods: "אספרסו, פילטר",
    vibeTags: ["שכונתי", "חמים", "ביתי", "איכותי"],
    instagramHandle: "tamuz.tlv",
    website: "",
    coordinates: { lat: 32.0673282, lng: 34.7723707 },
    heroImage: "/images/tamuz.jpg"
  },
  {
    id: 61,
    name: "מיראג׳",
    city: "תל אביב",
    address: "דרך יפו 9 (בית רומנו), תל אביב",
    openingHours: "א'-ש': 08:00–20:00",
    description: "בית קפה עם אווירה מיוחדת. מציעים קפה איכותי וסביבה ייחודית.",
    brewMethods: "פילטר, אספרסו",
    vibeTags: ["מיוחד", "איכותי", "שקט", "אינטימי"],
    instagramHandle: "miragetelaviv",
    website: "",
    coordinates: { lat: 32.0608011, lng: 34.769231 },
    heroImage: "/images/mirage.jpg"
  },
  {
    id: 62,
    name: "קפה נעימה",
    city: "חיפה",
    address: "דרך יפו 49, חיפה",
    openingHours: "א'-ש': 07:00–19:00",
    description: "בית קפה חיפאי עם אווירה נעימה. מתמחה בקפה איכותי ומאכלים ביתיים.",
    brewMethods: "אספרסו, פילטר",
    vibeTags: ["חיפאי", "נעים", "ביתי", "איכותי"],
    instagramHandle: "cafenaima",
    website: "",
    coordinates: { lat: 32.8201905, lng: 34.9964979 },
    heroImage: "/images/naima.jpg"
  },
  {
    id: 63,
    name: "קפה מורן",
    city: "קיבוץ מורן",
    address: "קיבוץ מורן",
    openingHours: "א'-ש': 08:00–18:00",
    description: "בית קפה בקיבוץ מורן עם אווירה כפרית ושלווה. מתמחה בקפה איכותי ומאכלים טריים.",
    brewMethods: "פילטר, אספרסו",
    vibeTags: ["כפרי", "שלווה", "ירוק", "איכותי"],
    instagramHandle: "slowdining.moran/",
    website: "https://slow-ness.com/food//",
    coordinates: { lat: 32.921637, lng: 35.39481 },
    heroImage: "/images/cafe_moran.jpg"
  },
  {
    id: 64,
    name: "קאסה לביא",
    city: "ירושלים",
    address: "בית לחם 41, ירושלים",
    openingHours: "א'-ה': 08:00–16:30, ו': 08:00–13:00, שבת: סגור",
    description: "בית קפה ייחודי בירושלים עם עיצוב המשלב אלמנטים ירושלמיים עם נגיעות יווניות. מגיש קפה איכותי מבית הקלייה הירושלמי 'לב', משקאות מאצ'ה איכותיים ותפריט טבעוני מגוון.",
    brewMethods: "אספרסו, פילטר",
    vibeTags: ["ירושלמי", "טבעוני", "ייחודי", "איכותי", "נעים"],
    instagramHandle: "casalavicafe",
    website: "",
    coordinates: { lat: 31.7582913, lng: 35.2217868 },
    heroImage: "/images/casa_lavi.jpg"
  },
  {
    id: 65,
    name: "רובע קופי האוס",
    city: "ירושלים",
    address: "בית אל 8, ירושלים",
    openingHours: "א'-ש': 08:00–18:00",
    description: "בית קפה ירושלמי עם אווירה חמימה וקהילתית. מגיש קפה איכותי מבית הקלייה הירושלמי 'לב' ומציע חוויית קפה מיוחדת ברובע היהודי.",
    brewMethods: "אספרסו, פילטר",
    vibeTags: ["ירושלמי", "קהילתי", "חמים", "רובע יהודי", "איכותי"],
    instagramHandle: "@therovacoffeehouse",
    website: "",
    coordinates: { lat: 31.7749906, lng: 35.2315487 },
    heroImage: "/images/rova_coffee.jpg"
  },
  {
    id: 66,
    name: "פטאשו בוטיק",
    city: "ירושלים",
    address: "אגריפס 88, ירושלים",
    openingHours: "א'-ש': 08:00–19:00",
    description: "מאפיית בוטיק ירושלמית עם אווירה מעוצבת ואיכותית. מגיש קפה איכותי מבית הקלייה הירושלמי 'לב' ומציע חוויית קפה ומאפה יוקרתית במרכז העיר.",
    brewMethods: "אספרסו, פילטר",
    vibeTags: ["ירושלמי", "בוטיק", "יוקרתי", "מאפייה", "איכותי"],
    instagramHandle: "patachou_boutique",
    website: "",
    coordinates: { lat: 31.7853236, lng: 35.2100023 },
    heroImage: "/images/patachou.jpg"
  },
  {
    id: 67,
    name: "אורו",
    city: "תל אביב",
    address: "הכישור 1, תל אביב",
    openingHours: "א'-ש': 08:00–18:00",
    description: "בית קלייה מוביל המתמחה בקליית קפה איכותי. מציעים פולי קפה מיוחדים וקלייה מדויקת.",
    brewMethods: "פילטר, אספרסו, קולד ברו",
    vibeTags: ["בית קלייה", "איכותי", "מקצועי", "תעשייתי"],
    instagramHandle: "coffee.uru.heart",
    website: "",
    coordinates: { lat: 32.0512641, lng: 34.765314 },
    heroImage: "/images/uru_roastery.jpg"
  },
  {
    id: 68,
    name: "קפה שכנים",
    city: "חיפה",
    address: "שדרות הנשיא 116, חיפה",
    openingHours: "א'-ש': 08:00–19:00",
    description: "בית קפה חיפאי עם אווירה שכונתית וחמימה. מתמחה בקפה איכותי ומאכלים ביתיים.",
    brewMethods: "אספרסו, פילטר",
    vibeTags: ["חיפאי", "שכונתי", "נעים", "ביתי"],
    instagramHandle: "cafe.shchenim",
    website: "",
    coordinates: { lat: 32.805635, lng: 34.9872333 },
    heroImage: "/images/shchenim.jpg"
  },
  {
    id: 69,
    name: "יו ניד קופי",
    city: "ירושלים",
    address: "יפו 78, ירושלים",
    openingHours: "א'-ש': 08:00–18:00",
    description: "בית קלייה ירושלמי שהוקם בשנת 2011. מתמחה בקליית פולי קפה איכותיים ומציעים חוויית קפה מקצועית.",
    brewMethods: "פילטר, אספרסו, קולד ברו",
    vibeTags: ["ירושלמי", "בית קלייה", "מקצועי", "איכותי"],
    instagramHandle: "you_need_coffee",
    website: "https://www.youneedcoffee.co.il",
    coordinates: { lat: 31.78528, lng: 35.214438 },
    heroImage: "/images/you_need_coffee.jpg"
  },
  {
    id: 71,
    name: "ניחוח קפה",
    city: "זיכרון יעקב",
    address: "המייסדים 61, זיכרון יעקב",
    openingHours: "א'-ש': 08:00–18:00",
    description: "בית קפה במושבה עם אווירה כפרית ושלווה. מתמחה בקפה איכותי ומאכלים טריים.",
    brewMethods: "פילטר, אספרסו",
    vibeTags: ["כפרי", "שלווה", "ירוק", "איכותי"],
    instagramHandle: "cafebar.co.il",
    website: "",
    coordinates: { lat: 32.5745922, lng: 34.9538949 },
    heroImage: "/images/nihoach_cafe.jpg"
  },
  {
    id: 73,
    name: "סיג קפה",
    city: "תל אביב",
    address: "בית לחם 3, תל אביב",
    openingHours: "א'-ש': 08:00–19:00",
    description: "בית קפה תל אביבי עם אווירה מודרנית. מתמחה בקפה איכותי ומאכלים טריים.",
    brewMethods: "אספרסו, פילטר",
    vibeTags: ["תל אביבי", "מודרני", "איכותי", "שכונתי"],
    instagramHandle: "sigcafe",
    website: "",
    coordinates: { lat: 32.0706348, lng: 34.770767 },
    heroImage: "/images/sig_cafe.jpg"
  },
  {
    id: 74,
    name: "ג'רה (אבן גבירול)",
    city: "תל אביב",
    address: "שלמה אבן גבירול 54, תל אביב",
    openingHours: "א'-ה': 07:00–19:00, ו': 07:00–16:00, שבת: סגור",
    description: "הסניף התל אביבי של בית הקלייה ג'רה. מציעים את אותה איכות קפה ופולים מיוחדים במרכז העיר.",
    brewMethods: "פילטר, אספרסו, קולד ברו",
    vibeTags: ["תל אביבי", "בוטיק", "איכותי", "מרכז העיר"],
    instagramHandle: "@jeracoffee",
    website: "https://www.jeracoffee.com",
    coordinates: { lat: 32.0782475, lng: 34.7815186 },
    heroImage: "/images/jera_ibn_gabirol.jpg"
  },
  {
    id: 75,
    name: "קפה לואי",
    city: "תל אביב",
    address: "מלכי ישראל 4, תל אביב",
    openingHours: "א'-ש': 08:00–19:00",
    description: "בית קפה תל אביבי עם אווירה נעימה. מתמחה בקפה איכותי ומאכלים טריים.",
    brewMethods: "אספרסו, פילטר",
    vibeTags: ["תל אביבי", "נעים", "איכותי", "שכונתי"],
    instagramHandle: "louis.tlv",
    website: "",
    coordinates: { lat: 32.0793054, lng: 34.7805799 },
    heroImage: "/images/Louie_cafe.jpg"
  },
  {
    id: 76,
    name: "קפה 14",
    city: "תל אביב",
    address: "נחל הבשור 1, תל אביב",
    openingHours: "א'-ה': 06:00–17:00, ו': 06:00–16:00, שבת: 07:00–16:00",
    description: "בית קפה תל אביבי עם אווירה נעימה. מתמחה בקפה איכותי ומשקאות מאצ'ה.",
    brewMethods: "אספרסו, פילטר",
    vibeTags: ["תל אביבי", "נעים", "איכותי", "מאצ'ה"],
    instagramHandle: "cafe14jaffa",
    website: "",
    coordinates: { lat: 32.0397693, lng: 34.7569686 },
    heroImage: "/images/cafe_14.jpg"
  },
  {
    id: 77,
    name: "מטאפורה ארט קפה",
    city: "ירושלים",
    address: "יפו 31, ירושלים",
    openingHours: "א'-ה': 08:15–15:00, שבת: סגור",
    description: "בית קפה ייחודי המשלב אווירה ביתית עם קפה משובח ויצירות אמנות. מגיש גם משקאות מאצ'ה איכותיים.",
    brewMethods: "אספרסו, פילטר",
    vibeTags: ["ירושלמי", "אמנות", "ייחודי", "ביתי", "מאצ'ה"],
    instagramHandle: "metaphora_artcafe",
    website: "",
    coordinates: { lat: 31.7813366, lng: 35.2208843 },
    heroImage: "/images/metaphora_art.jpg"
  },
  {
    id: 78,
    name: "טחנת הקפה",
    city: "ירושלים",
    address: "עמק רפאים 23, ירושלים",
    openingHours: "א'-ה': 07:30–20:00, ו': 07:30–14:00, שבת: סגור",
    description: "בית קפה שכונתי במושבה הגרמנית המציע מגוון סוגי קפה ותערובות הנטחנים במקום. מגיש גם משקאות מאצ'ה איכותיים לצד תפריט הכולל כריכים וסלטים.",
    brewMethods: "אספרסו, פילטר",
    vibeTags: ["ירושלמי", "שכונתי", "מושבה הגרמנית", "מאצ'ה", "נעים"],
    instagramHandle: "thecoffeemillil",
    website: "",
    coordinates: { lat: 31.7647571, lng: 35.2209543 },
    heroImage: "/images/tahanat_hacafe.jpg"
  },
  {
    id: 80,
    name: "ג'רה (תחנת דלק זאב שלנג)",
    city: "ראשון לציון",
    address: "זאב שלנג, ראשון לציון (תחנת דלק)",
    openingHours: "א'-ה': 07:00–19:00, ו': 07:00–16:00, שבת: סגור",
    description: "סניף ייחודי של בית הקלייה ג'רה בתחנת דלק. מציעים קפה איכותי ומשקאות מאצ'ה במסגרת נוחה ונגישה.",
    brewMethods: "פילטר, אספרסו, קולד ברו",
    vibeTags: ["תחנת דלק", "נגיש", "מאצ'ה", "ראשון לציון", "נוח"],
    instagramHandle: "@jeracoffee",
    website: "https://www.jeracoffee.com",
    coordinates: { lat: 31.9867943, lng: 34.7693418 },
    heroImage: "/images/Jera_Rlshon_shlang.jpg"
  },
  {
    id: 81,
    name: "קפה ולב",
    city: "ראשון לציון",
    address: "הורוביץ 36, ראשון לציון",
    openingHours: "א'-ה': 08:00–19:00, ו': 08:00–14:00, שבת: סגור",
    description: "בית קפה של קפה ופרח, משתמשים בפולים של קפה מאורציו. מציעים קפה איכותי ואווירה נעימה.",
    brewMethods: "אספרסו, פילטר",
    vibeTags: ["ראשון לציון", "קפה ופרח", "מאורציו", "נעים", "שכונתי"],
    instagramHandle: "@caffe.and.heart",
    website: "",
    coordinates: { lat: 31.9645, lng: 34.8006 },
    heroImage: "/images/cafe_and_heart.jpg"
  },
  {
    id: 82,
    name: "קפה טרה",
    city: "אשדוד",
    address: "רוגוזין 5, אשדוד",
    openingHours: "א'-ה': 08:00–22:00, ו': 08:00–15:00, שבת: 19:00–22:00",
    description: "בית קפה באשדוד המציע קפה איכותי ואווירה נעימה. מתמחה במשקאות עונתיים מיוחדים כגון פאמפקין ספייס, לוונדר, ברולה וזעפרן.",
    brewMethods: "פילטר, אספרסו, קולד ברו",
    vibeTags: ["אשדוד", "נעים", "שכונתי", "איכותי"],
    instagramHandle: "@ter.a_coffee",
    website: "https://smile-service.fun/teracoffeestart",
    coordinates: { lat: 31.8072881, lng: 34.644348 },
    heroImage: "/images/tera_coffee.jpg"
  },
  {
    id: 83,
    name: "ווייקאפ (מקווה ישראל)",
    city: "תל אביב",
    address: "מקווה ישראל 17, תל אביב",
    openingHours: "א'-ה': 07:00–20:00, ו': 07:00–14:30, שבת: סגור",
    description: "הסניף השני של בית הקלייה האהוב. אותה איכות קפה ואווירה חמה במיקום מרכזי בלב תל אביב.",
    brewMethods: "פילטר, אספרסו, קולד ברו",
    vibeTags: ["שכונתי", "חמים", "נגיש", "יומיומי", "מרכזי"],
    instagramHandle: "@waycup.coffee.tlv",
    website: "https://www.waycuptlv.com",
    coordinates: { lat: 32.063, lng: 34.775 },
    heroImage: "/images/waycup_mikve.jpg"
  },
  {
    id: 84,
    name: "קפה מושיץ",
    city: "קיבוץ מחניים",
    address: "אזור תעשייה, קיבוץ מחניים",
    openingHours: "א', ב', ג', ה': 08:00–14:00, ד': 08:00–22:00, ו': 08:00–13:00, שבת: סגור",
    description: "בית קלייה וקפה בוטיק באווירה גלילית פסטורלית. המקום הוקם בהשראת תרבות הקפה של מלבורן ומציע תערובות ייחודיות (כמו 'יער' ו'אגוז') וקפה חד-זני בקלייה מקומית. במקום גם מאפייה נהדרת בשם אירמה.",
    brewMethods: "אספרסו, פילטר",
    vibeTags: ["קיבוץ", "בית קלייה", "גלילי", "פסטורלי", "מאפייה"],
    instagramHandle: "@moshytzcoffee",
    website: "https://moshytz.co.il",
    coordinates: { lat: 32.9867, lng: 35.5539 },
    heroImage: "/images/moshytz_mahanaim.jpg"
  }
];

// Transform CAFES to ROASTERIES format for compatibility
// Use lazy getter to prevent synchronous execution on import
let _roasteriesCache: Roastery[] | null = null;

function getROASTERIES(): Roastery[] {
  if (_roasteriesCache === null) {
    _roasteriesCache = CAFES.map((cafe): Roastery => ({
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
  }
  return _roasteriesCache;
}

// Export as getter function for lazy loading
// This prevents the map from running on import - data is only processed when getROASTERIES() is called
export { getROASTERIES };
