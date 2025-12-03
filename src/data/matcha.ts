// @/data/matcha.ts

export interface MatchaPlace {
  id: string;
  name: string;
  city: string;
  address: string;
  openingHours: string;
  description: string;
  matchaOrigin?: string;
  milkOptions?: string[];
  vibeTags: string[];
  instagramHandle?: string;
  website?: string;
  latitude: number;
  longitude: number;
  heroImage?: string;
}

// Helper: Generate ID (Consistent with Roasteries)
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

// Helper: Parse comma-separated strings to arrays
const parseList = (str: string): string[] => {
  return str.split(",").map((s) => s.trim()).filter(Boolean);
};

// Helper: Clean Instagram
const cleanInstagramHandle = (handle: string | undefined): string | undefined => {
  if (!handle || handle.trim() === "") return undefined;
  return handle.replace(/^@/, "");
};

// New MATCHA_PLACES format - raw data
type MatchaPlaceRaw = {
  id: number;
  name: string;
  city: string;
  address: string;
  openingHours: string;
  description: string;
  vibeTags: string[];
  instagramHandle: string;
  website: string;
  coordinates: { lat: number; lng: number };
  heroImage: string;
};

export const MATCHA_PLACES_RAW: MatchaPlaceRaw[] = [
  {
    id: 1,
    name: "פיטהאוס",
    city: "תל אביב",
    address: "התערוכה 3, נמל תל אביב",
    openingHours: "א'-ה': 07:00–21:00, ו': 07:00–16:00, שבת: 08:00–21:00",
    description: "בר בריאות בתוך מתחם כושר. מגישים מאצ'ה של Matchaeologist. המקום המושלם למאצ'ה קרה לפני או אחרי אימון מול הים.",
    vibeTags: ["בריאות", "ספורטיבי", "ים", "אנרגטי", "נמל"],
    instagramHandle: "@fithouse_tlv",
    website: "https://www.fithouse.co.il",
    coordinates: { lat: 32.099208, lng: 34.776271 },
    heroImage: "/images/FitHouse.jpeg"
  },
  {
    id: 2,
    name: "מלה (מקווה ישראל)",
    city: "תל אביב",
    address: "מקווה ישראל 23, תל אביב",
    openingHours: "א'-ה': 08:00–18:00, ו': 08:00–15:00, שבת: סגור",
    description: "בית קפה שכונתי חמים. עובדים עם המותג Mix & Matcha ומגישים משקאות מאצ'ה עשירים ומדויקים.",
    vibeTags: ["שכונתי", "חמים", "בייתי", "ותיק", "טעים"],
    instagramHandle: "@melacafe_tlv",
    website: "",
    coordinates: { lat: 32.062938, lng: 34.777374 },
    heroImage: "/images/Mela_Mikve.jpg"
  },
  {
    id: 3,
    name: "מלה (הצפון הישן)",
    city: "תל אביב",
    address: "אשתורי הפרחי 20, תל אביב",
    openingHours: "א'-ה': 07:30–20:00, ו': 07:30–16:00, שבת: סגור",
    description: "הסניף הצפוני והמעוצב של מלה. מציע את אותה איכות מאצ'ה (Mix & Matcha) באווירה צפון-תל אביבית רגועה.",
    vibeTags: ["שכונתי", "צפוני", "רגוע", "ישיבה בחוץ"],
    instagramHandle: "@melacafe_tlv",
    website: "",
    coordinates: { lat: 32.090594, lng: 34.780382 },
    heroImage: "/images/Mela_Ashtori.jpg"
  },
  {
    id: 4,
    name: "הוק (התבור)",
    city: "תל אביב",
    address: "התבור 2, תל אביב",
    openingHours: "א'-ה': 07:30–19:30, ו': 07:30–15:00, שבת: סגור",
    description: "מקדש של דיוק. משתמשים ב-Matchaeologist ומכינים את המאצ'ה בטקס יפני מסורתי ומוקפד.",
    vibeTags: ["מינימליסטי", "יוקרתי", "שקט", "יפני", "מדויק"],
    instagramHandle: "@hoc.telaviv",
    website: "https://www.hoctelaviv.com",
    coordinates: { lat: 32.064999, lng: 34.766621 },
    heroImage: "/images/House of coffee.jpg"
  },
  {
    id: 6,
    name: "הוק (טרומפלדור)",
    city: "תל אביב",
    address: "טרומפלדור 6, תל אביב",
    openingHours: "א'-ה': 07:30–19:30, ו': 07:30–15:00, שבת: סגור",
    description: "הסניף הקרוב לים. עצירה מושלמת למאצ'ה קרה (Matchaeologist) באווירה מינימליסטית ומרגיעה.",
    vibeTags: ["ים", "מרכז העיר", "שקט", "מעוצב", "איכות"],
    instagramHandle: "@hoc.telaviv",
    website: "https://www.hoctelaviv.com",
    coordinates: { lat: 32.075526, lng: 34.766480 },
    heroImage: "/images/hoc_trumpeldor.jpg"
  },
  {
    id: 7,
    name: "קפה בלו",
    city: "תל אביב - יפו",
    address: "האנגר 2, נמל יפו",
    openingHours: "א'-ש': 08:00–20:00",
    description: "לשתות מאצ'ה קרה מול הים. בלו מציעים חוויית מאצ'ה מרעננת באווירת הנמל של יפו.",
    vibeTags: ["נוף לים", "תיירותי", "קליל", "ים", "נמל"],
    instagramHandle: "@cafeblue.jaffa",
    website: "",
    coordinates: { lat: 32.052600, lng: 34.750500 },
    heroImage: "/images/Cafe_Blue.jpg"
  },
  {
    id: 8,
    name: "צ'אצ'וס",
    city: "תל אביב",
    address: "גאולה 51, תל אביב",
    openingHours: "א'-ה': 07:00–19:00, ו': 07:00–16:00",
    description: "מקום קטן ומלא באופי ליד הים. ידועים במשקאות המאצ'ה הקרים והמיוחדים שלהם ובאווירה השמחה.",
    vibeTags: ["שכונתי", "ים", "צעיר", "קליל", "קיצי"],
    instagramHandle: "@chachos.tlv",
    website: "",
    coordinates: { lat: 32.071264, lng: 34.769569 },
    heroImage: "/images/ChaCho's Geula.jpg"
  },
  {
    id: 9,
    name: "קאפס",
    city: "תל אביב",
    address: "יהודה הלוי 59, תל אביב",
    openingHours: "א'-ה': 07:30–17:00, ו': 07:30–14:00",
    description: "אספרסו בר ומיקרו-רוסטרי שמגיש גם מאצ'ה ברמה גבוהה מאוד. מקום של מקצוענים שמעריכים חומרי גלם.",
    vibeTags: ["מקצועי", "אורבני", "מודרני", "מוקפד", "עבודה"],
    instagramHandle: "@cups_tlv",
    website: "",
    coordinates: { lat: 32.063780, lng: 34.776520 },
    heroImage: "/images/Cups.jpg"
  },
  {
    id: 10,
    name: "קפה פקטורי 54",
    city: "תל אביב",
    address: "האנגר 9, נמל תל אביב",
    openingHours: "א'-ש': 09:00–21:00",
    description: "בית קפה בתוך חנות האופנה, עובדים עם Mix & Matcha. מציעים חוויית שתייה אסתטית ויוקרתית מאוד.",
    vibeTags: ["אופנה", "יוקרתי", "שקט", "מעוצב", "נמל"],
    instagramHandle: "@factory54cafe",
    website: "https://www.factory54.co.il",
    coordinates: { lat: 32.097560, lng: 34.773850 },
    heroImage: "/images/Factory_54_port_matcha.jpg"
  },
  {
    id: 11,
    name: "בר",
    city: "תל אביב",
    address: "וולפסון 42, תל אביב",
    openingHours: "א'-ה': 07:30–19:00, ו': 08:30–16:00, שבת: 09:30–16:00",
    description: "בית קפה שכונתי בפלורנטין עם אופי מיוחד. מגישים מאצ'ה תחת מותג פרטי המגיעה ממחוז מיא (Mie) ביפן.",
    vibeTags: ["פלורנטין", "שכונתי", "קליל", "צעיר", "חיות מחמד"],
    instagramHandle: "@bar_wild_cafe",
    website: "",
    coordinates: { lat: 32.057744, lng: 34.773649 },
    heroImage: "/images/wild_bar_cafe.jpeg"
  },
  {
    id: 12,
    name: "נורדיניו",
    city: "תל אביב",
    address: "נחלת בנימין 27, תל אביב",
    openingHours: "א'-ה': 07:00–20:00, ו': 07:00–16:00, שבת: סגור",
    description: "המאפייה של קפה נורדוי. מפורסמים במאפים המעולים ובמשקאות מאצ'ה (Mix & Matcha) איכותיים בחלון לרחוב.",
    vibeTags: ["מאפייה", "רחוב", "איכותי", "עומס", "פריזאי"],
    instagramHandle: "@nordinyo",
    website: "",
    coordinates: { lat: 32.064500, lng: 34.770500 },
    heroImage: "/images/Nordiniyo.jpeg"
  },
  {
    id: 13,
    name: "אנסטסיה",
    city: "תל אביב",
    address: "פרישמן 54, תל אביב",
    openingHours: "א'-ש': 08:00–23:00",
    description: "בית הקפה הטבעוני המוביל בתל אביב. מציעים תפריט סופר-פוד עשיר ומאצ'ה טקסית עם מגוון חלבי צמחיים מעולים.",
    vibeTags: ["טבעוני", "בריאות", "הומה", "תל אביבי", "אוכל"],
    instagramHandle: "@anastasiatlv",
    website: "https://anastasiatlv.co.il",
    coordinates: { lat: 32.078800, lng: 34.773200 },
    heroImage: "/images/Anastasia.jpg"
  },
  {
    id: 14,
    name: "הקפה בבימה",
    city: "תל אביב",
    address: "שדרות תרס\"ט 2, תל אביב",
    openingHours: "א'-ש': 07:30–23:00",
    description: "הבוטקה הכי מפורסם בעיר. ישיבה בכיכר הבימה עם מאצ'ה (Mix & Matcha) מול השקיעה או התרבות.",
    vibeTags: ["בוטקה", "כיכר", "שמש", "אווירה", "חוץ"],
    instagramHandle: "@welikeyoutoo_tlv",
    website: "",
    coordinates: { lat: 32.072500, lng: 34.779500 },
    heroImage: "/images/wlyt_habima.jpg"
  },
  {
    id: 15,
    name: "הקפה בבן גוריון",
    city: "תל אביב",
    address: "שדרות בן גוריון 39, תל אביב",
    openingHours: "א'-ש': 07:30–21:00",
    description: "האחות הקטנה והירוקה בשדרה. קפה ומאצ'ה (Mix & Matcha) מתחת לעצים בשדרות בן גוריון.",
    vibeTags: ["שדרה", "ירוק", "שכונתי", "שקט", "חוץ"],
    instagramHandle: "@welikeyoutoo_tlv",
    website: "",
    coordinates: { lat: 32.083500, lng: 34.773500 },
    heroImage: "/images/WLTY_BG.jpg"
  },
  {
    id: 16,
    name: "הקפה באריה עקיבא",
    city: "תל אביב",
    address: "אריה עקיבא 2, תל אביב",
    openingHours: "א'-ש': 07:30–21:00",
    description: "הסניף השכונתי והשקט של WLYT ליד כיכר המדינה. מאצ'ה איכותית (Mix & Matcha) ואווירה רגועה.",
    vibeTags: ["שכונתי", "שקט", "ירוק", "איכותי", "קליל"],
    instagramHandle: "@welikeyoutoo_tlv",
    website: "",
    coordinates: { lat: 32.086100, lng: 34.782500 },
    heroImage: "/images/WLYT_akiva.jpg"
  },
  {
    id: 17,
    name: "נולה",
    city: "תל אביב",
    address: "דיזנגוף 197, תל אביב",
    openingHours: "א'-ה': 07:30–22:00, ו': 07:30–16:00, שבת: 09:00–22:00",
    description: "מאפייה אמריקאית קלאסית. מגישים מאצ'ה של Mix & Matcha שמשתלבת נהדר עם העוגיות והאווירה הביתית.",
    vibeTags: ["אמריקאי", "נעים", "מתוקים", "בראנץ'", "דיזנגוף"],
    instagramHandle: "@nolatlv",
    website: "https://www.nola-b.co.il",
    coordinates: { lat: 32.087500, lng: 34.775500 },
    heroImage: "/images/nola.jpg"
  },
  {
    id: 18,
    name: "בוטי (דיזנגוף)",
    city: "תל אביב",
    address: "כיכר דיזנגוף 4, תל אביב",
    openingHours: "א'-ה': 07:30–20:00, ו': 07:30–17:00, שבת: 08:00–20:00",
    description: "בוטיק מאפים בכיכר. מקום אסתטי שמגיש מאצ'ה איכותית (Mix & Matcha) ומאפים יפהפיים מול המזרקה.",
    vibeTags: ["כיכר דיזנגוף", "אסתטי", "מאפים", "שיקי", "עיר"],
    instagramHandle: "@butiandco",
    website: "",
    coordinates: { lat: 32.077800, lng: 34.774200 },
    heroImage: "/images/Buti_Dizi.jpg"
  },
  {
    id: 19,
    name: "ליבא קפה",
    city: "ירושלים",
    address: "ש\"ץ 4, ירושלים",
    openingHours: "א'-ה': 07:30–19:00, ו': 07:30–14:00, שבת: סגור",
    description: "בית קפה בוטיק ירושלמי עם עיצוב מוקפד. מגישים מאצ'ה של Mix & Matcha באווירה שקטה ואיכותית במרכז העיר.",
    vibeTags: ["ירושלמי", "בוטיק", "שקט", "איכותי", "עיצוב"],
    instagramHandle: "@libacafe",
    website: "",
    coordinates: { lat: 31.780500, lng: 35.216800 },
    heroImage: "/images/liba.jpg"
  },
  {
    id: 20,
    name: "קפה נעורים",
    city: "פרדס חנה-כרכור",
    address: "נעורים 54, פרדס חנה-כרכור",
    openingHours: "א'-ה': 07:30–17:00, ו': 07:30–14:00, שבת: סגור",
    description: "פנינה מקומית בלב פרדס חנה. בית קפה עם אווירה קהילתית, חצר נעימה ומאצ'ה איכותית (Mix & Matcha) באווירה כפרית ורגועה.",
    vibeTags: ["כפרי", "ירוק", "שכונתי", "רוגע", "קהילתי"],
    instagramHandle: "@cafe_neurim",
    website: "",
    coordinates: { lat: 32.471858, lng: 34.996795 },
    heroImage: "/images/Neurim Caffe.jpg"
  },
  {
    id: 21,
    name: "קפה דייזי",
    city: "תל אביב",
    address: "אבן גבירול 114, תל אביב",
    openingHours: "א'-ה': 07:30–23:00, ו': 07:30–16:00, שבת: 08:30–23:00",
    description: "האחות הקטנה והצבעונית של קפה בוקה. מקום שמח עם עיצוב רטרו ומשקאות מאצ'ה (Mix & Matcha) מפנקים.",
    vibeTags: ["רטרו", "צבעוני", "שכונתי", "שמח", "צעיר"],
    instagramHandle: "@daisy.tlv",
    website: "",
    coordinates: { lat: 32.089500, lng: 34.782200 },
    heroImage: "/images/Cafe_Daisy.jpg"
  },
  {
    id: 22,
    name: "קפה מלבן (כצנלסון)",
    city: "גבעתיים",
    address: "כצנלסון 50, גבעתיים",
    openingHours: "א'-ה': 07:30–19:30, ו': 07:30–15:00, שבת: סגור",
    description: "קפה שכונתי אהוב בגבעתיים. עובדים עם Mix & Matcha ומציעים משקאות מאצ'ה איכותיים לצד כריכים מעולים.",
    vibeTags: ["שכונתי", "משפחתי", "נעים", "מקומי", "גבעתיים"],
    instagramHandle: "@cafemalben",
    website: "",
    coordinates: { lat: 32.074500, lng: 34.808500 },
    heroImage: "/images/Malben_Katzenelson.jpg"
  },
  {
    id: 23,
    name: "בר קפה 58 (רוקח)",
    city: "רמת גן",
    address: "רוקח 58, רמת גן",
    openingHours: "א'-ה': 07:30–22:00, ו': 07:30–15:30, שבת: 08:00–16:00",
    description: "בית קפה פסטורלי מול פארק הירקון. מגישים מאצ'ה (Mix & Matcha) באווירה ירוקה ושקטה.",
    vibeTags: ["פארק", "ירוק", "שקט", "רמת גן", "משפחתי"],
    instagramHandle: "@barcafe_58",
    website: "",
    coordinates: { lat: 32.098500, lng: 34.805500 },
    heroImage: "/images/Bar_Cafe_58.jpg"
  },
  {
    id: 24,
    name: "בר קפה (רש\"י)",
    city: "רמת גן",
    address: "רש\"י 23, רמת גן",
    openingHours: "א'-ה': 07:30–20:00, ו': 07:30–15:30, שבת: 08:00–16:00",
    description: "הסניף השכונתי במרכז רמת גן. אותה איכות מאצ'ה (Mix & Matcha) באווירה אורבנית ונעימה.",
    vibeTags: ["שכונתי", "עירוני", "נעים", "רמת גן", "קפה"],
    instagramHandle: "@barcafe_58",
    website: "",
    coordinates: { lat: 32.082500, lng: 34.813500 },
    heroImage: "/images/barcafe_rashi.jpg"
  },
  {
    id: 25,
    name: "אורבן שמאן",
    city: "תל אביב",
    address: "דיזנגוף 210, תל אביב",
    openingHours: "א'-ה': 09:00–22:00, ו': 09:00–16:00, שבת: 10:00–22:00",
    description: "מקדש של בריאות ו-Wellness. מגישים מאצ'ה טקסית אורגנית, משקאות סופר-פוד ואוכל צמחי ברמה הגבוהה ביותר.",
    vibeTags: ["בריאות", "רוחני", "קהילתי", "טבעוני", "יוקרתי"],
    instagramHandle: "@urbanshaman_tlv",
    website: "https://urbanshaman.co.il",
    coordinates: { lat: 32.086500, lng: 34.776200 },
    heroImage: "/images/Urban_Shaman.jpg"
  },
  {
    id: 26,
    name: "קפה סוהו",
    city: "תל אביב",
    address: "בן יהודה 73, תל אביב",
    openingHours: "א'-ו': 08:00–16:00, שבת: 08:00–16:00",
    description: "מוסד תל אביבי עם ניחוח בינלאומי. ידועים בבראנץ' המושחת ובמאצ'ה לאטה המעולה שלהם (מומלץ עם Oatly).",
    vibeTags: ["בינלאומי", "תיירים", "בראנץ'", "חופשי", "שמח"],
    instagramHandle: "@cafexoho",
    website: "https://www.cafexoho.com",
    coordinates: { lat: 32.081500, lng: 34.771800 },
    heroImage: "/images/Cafe_Xoho.jpg"
  },
  {
    id: 27,
    name: "אופן",
    city: "תל אביב",
    address: "ה' באייר 48, תל אביב",
    openingHours: "א'-ה': 07:45–18:00, ו': 07:45–15:00, שבת: סגור",
    description: "האח הגדול של נורדיניו בכיכר המדינה. עיצוב מוקפד, מאפים ברמה עולמית ומאצ'ה (Mix & Matcha) איכותית.",
    vibeTags: ["כיכר המדינה", "יוקרתי", "מאפים", "איכות", "שקט"],
    instagramHandle: "@open.tlv",
    website: "",
    coordinates: { lat: 32.086800, lng: 34.781500 },
    heroImage: "/images/Open.jpg"
  },
  {
    id: 28,
    name: "קפטיש",
    city: "תל אביב",
    address: "וולטר מוזס 10, תל אביב",
    openingHours: "א'-ה': 07:30–18:00, ו': 07:30–14:00, שבת: 09:00–16:00",
    description: "פינה שקטה המציעה מאצ'ה לאטה איכותית ומוקפדת, לצד עוגיות פיסטוק ומאפים מצוינים.",
    vibeTags: ["אינטימי", "שקט", "איכותי", "עבודה", "מודרני"],
    instagramHandle: "@cafetish",
    website: "",
    coordinates: { lat: 32.072500, lng: 34.795200 },
    heroImage: "/images/Cafetish.jpg"
  },
  {
    id: 29,
    name: "בוטי (שרונה)",
    city: "תל אביב",
    address: "ארניה אוסוולדו 9, תל אביב",
    openingHours: "א'-ה': 07:30–18:30, ו': 07:30–15:00, שבת: 08:30–18:30",
    description: "סניף שרונה של בוטיק המאפים. מציע מאצ'ה איכותית (Mix & Matcha) ומאפים מוקפדים בלב מתחם שרונה.",
    vibeTags: ["שרונה", "מאפים", "מודרני", "איכותי", "שוקק"],
    instagramHandle: "@butiandco",
    website: "",
    coordinates: { lat: 32.071800, lng: 34.788500 },
    heroImage: "/images/Buti_Sarona.jpg"
  },
  {
    id: 30,
    name: "קפה מלבן (ויצמן)",
    city: "גבעתיים",
    address: "ויצמן 51, גבעתיים",
    openingHours: "א'-ה': 08:00–19:00, ו': 08:00–16:00",
    description: "הסניף הנוסף של קפה מלבן, שמביא את אותה איכות קפה ומאצ'ה (Mix & Matcha) לאזור ויצמן.",
    vibeTags: ["שכונתי", "משפחתי", "כריכים", "גבעתיים"],
    instagramHandle: "@cafemalben",
    website: "",
    coordinates: { lat: 32.078500, lng: 34.811200 },
    heroImage: "/images/Malben_weizzman.jpg"
  },
  {
    id: 31,
    name: "מלה (דיזנגוף)",
    city: "תל אביב",
    address: "דיזנגוף 164, תל אביב",
    openingHours: "א'-ה': 07:30–20:00, ו': 07:30–16:00, שבת: סגור",
    description: "הבוטקה של מלה על דיזנגוף. נקודה מושלמת לעצירה עם מאצ'ה איכותית (Mix & Matcha) והמולה תל אביבית.",
    vibeTags: ["רחוב", "תוסס", "קטן", "איכותי", "דיזנגוף"],
    instagramHandle: "@melacafe_tlv",
    website: "",
    coordinates: { lat: 32.086200, lng: 34.775500 },
    heroImage: "/images/Mela_Dizi.jpg"
  }
];

// Transform MATCHA_PLACES_RAW to MATCHA_PLACES format for compatibility
export const MATCHA_PLACES: MatchaPlace[] = MATCHA_PLACES_RAW.map((place): MatchaPlace => ({
  id: generateId(place.name, place.city),
  name: place.name,
  city: place.city,
  address: place.address,
  openingHours: place.openingHours,
  description: place.description,
  vibeTags: place.vibeTags,
  instagramHandle: cleanInstagramHandle(place.instagramHandle) || undefined,
  website: place.website && place.website.trim() !== "" ? place.website : undefined,
  latitude: place.coordinates.lat,
  longitude: place.coordinates.lng,
  heroImage: place.heroImage || undefined,
}));
