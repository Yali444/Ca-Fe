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
    coordinates: { lat: 32.0972827, lng: 34.7754171 },
    heroImage: "/images/FitHouse.jpeg"
  },
  {
    id: 2,
    name: "מלה (מקווה ישראל)",
    city: "תל אביב",
    address: "מקווה ישראל 23, תל אביב",
    openingHours: "א'-ה': 07:30–19:30, ו': 07:30–17:00, שבת: סגור",
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
    openingHours: "א'-ה': 08:00–18:00, ו': 08:00–14:00, שבת: סגור",
    description: "מקדש של דיוק. משתמשים ב-Matchaeologist ומכינים את המאצ'ה בטקס יפני מסורתי ומוקפד.",
    vibeTags: ["מינימליסטי", "יוקרתי", "שקט", "יפני", "מדויק"],
    instagramHandle: "@hoc.telaviv",
    website: "https://www.hoctelaviv.com",
    coordinates: { lat: 32.064999, lng: 34.766621 },
    heroImage: "/images/House of coffee.jpg"
  },
  {
    id: 5,
    name: "הוק (פלורנטין)",
    city: "תל אביב",
    address: "הרבי מבכרך 3, תל אביב",
    openingHours: "א'-ו': 08:00–18:00, שבת: 08:00–14:00",
    description: "הסניף הדרומי והמחוספס יותר, אך עם אותו דיוק במאצ'ה (Matchaeologist) ועיצוב נקי להפליא.",
    vibeTags: ["פלורנטין", "מודרני", "בטון", "שקט", "עבודה"],
    instagramHandle: "@hoc.telaviv",
    website: "https://www.hoctelaviv.com",
    coordinates: { lat: 32.0581153, lng: 34.7667918 },
    heroImage: "/images/hoc_florentin.jpg"
  },
  {
    id: 6,
    name: "הוק (טרומפלדור)",
    city: "תל אביב",
    address: "טרומפלדור 6, תל אביב",
    openingHours: "א'-ש': 08:00–16:00",
    description: "הסניף הקרוב לים. עצירה מושלמת למאצ'ה קרה (Matchaeologist) באווירה מינימליסטית ומרגיעה.",
    vibeTags: ["ים", "מרכז העיר", "שקט", "מעוצב", "איכות"],
    instagramHandle: "@hoc.telaviv",
    website: "https://www.hoctelaviv.com",
    coordinates: { lat: 32.075526, lng: 34.766480 },
    heroImage: "/images/HOC_Trumpeldor.jpg"
  },
  {
    id: 7,
    name: "קפה בלו",
    city: "תל אביב - יפו",
    address: "האנגר 2, נמל יפו",
    openingHours: "א'-ג': 07:45–18:00, ד': 07:45–18:00, ה': 07:45–22:00, ו': 07:45–16:00, שבת: 07:45–18:00",
    description: "אספרסו-בר צבעוני במתחם 'בית המכולות'. קפה גל שלישי משובח, מאצ'ה מרעננת ומאפים של 'אפוי' מול הים של יפו",
    vibeTags: ["נוף לים", "תיירותי", "קליל", "ים", "נמל"],
    instagramHandle: "@cafeblue.jaffa",
    website: "",
    coordinates: { lat: 32.0520082, lng: 34.74970090000001 },
    heroImage: "/images/Cafe_Blue.jpg"
  },
  {
    id: 8,
    name: "צ'אצ'וס",
    city: "תל אביב",
    address: "גאולה 51, תל אביב",
    openingHours: "א'-ה': 07:00–19:00, ו': 07:00–17:00, שבת: 08:00–19:00",
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
    openingHours: "א'-ה': 07:30–17:00, ו': 07:30–15:00, שבת: סגור",
    description: "אספרסו בר ומיקרו-רוסטרי שמגיש גם מאצ'ה ברמה גבוהה מאוד. מקום של מקצוענים שמעריכים חומרי גלם.",
    vibeTags: ["מקצועי", "אורבני", "מודרני", "מוקפד", "עבודה"],
    instagramHandle: "@cups_tlv",
    website: "",
    coordinates: { lat: 32.0631101, lng: 34.7752364 },
    heroImage: "/images/cups.jpg"
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
    openingHours: "א'-ה': 08:00–18:30, ו': 09:00–14:30, שבת: 09:30–15:30",
    description: "בית קפה שכונתי בפלורנטין עם אופי מיוחד. מגישים מאצ'ה תחת מותג פרטי המגיעה ממחוז מיא (Mie) ביפן.",
    vibeTags: ["פלורנטין", "שכונתי", "קליל", "צעיר", "חיות מחמד"],
    instagramHandle: "@bar_wild_cafe",
    website: "",
    coordinates: { lat: 32.057744, lng: 34.773649 },
    heroImage: "/images/Wild_bar_cafe.jpeg"
  },
  {
    id: 12,
    name: "נורדיניו",
    city: "תל אביב",
    address: "נחלת בנימין 27, תל אביב",
    openingHours: "א'-ה': 07:00–19:00, ו': 07:00–17:00, שבת: סגור",
    description: "המאפייה של קפה נורדוי. מפורסמים במאפים המעולים ובמשקאות מאצ'ה (Mix & Matcha) איכותיים בחלון לרחוב.",
    vibeTags: ["מאפייה", "רחוב", "איכותי", "עומס", "פריזאי"],
    instagramHandle: "@nordinyo",
    website: "",
    coordinates: { lat: 32.0665427, lng: 34.77038599999999 },
    heroImage: "/images/Nordiniyo.jpeg"
  },
  {
    id: 13,
    name: "אנסטסיה",
    city: "תל אביב",
    address: "פרישמן 54, תל אביב",
    openingHours: "א'-ה': 08:30–22:30, ו': 08:30–16:30, שבת: 10:00–16:00",
    description: "בית הקפה הטבעוני המוביל בתל אביב. מציעים תפריט סופר-פוד עשיר ומאצ'ה טקסית עם מגוון חלבי צמחיים מעולים.",
    vibeTags: ["טבעוני", "בריאות", "הומה", "תל אביבי", "אוכל"],
    instagramHandle: "@anastasiatlv",
    website: "https://anastasiatlv.co.il",
    coordinates: { lat: 32.0795241, lng: 34.7748992 },
    heroImage: "/images/Anastasia.jpg"
  },
  {
    id: 14,
    name: "הקפה בבימה",
    city: "תל אביב",
    address: "שדרות תרס\"ט 2, תל אביב",
    openingHours: "א'-ה': 07:30–21:00, ו': 08:00–18:00, שבת: 08:00–21:00",
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
    openingHours: "א'-ה': 07:30–20:00, ו': 07:30–16:00, שבת: 08:00–20:00",
    description: "האחות הקטנה והירוקה בשדרה. קפה ומאצ'ה (Mix & Matcha) מתחת לעצים בשדרות בן גוריון.",
    vibeTags: ["שדרה", "ירוק", "שכונתי", "שקט", "חוץ"],
    instagramHandle: "@welikeyoutoo_tlv",
    website: "",
    coordinates: { lat: 32.0847868, lng: 34.7737657 },
    heroImage: "/images/WLTY_BG.jpg"
  },
  {
    id: 16,
    name: "הקפה באריה עקיבא",
    city: "תל אביב",
    address: "אריה עקיבא 2, תל אביב",
    openingHours: "א'-ה': 07:30–21:00, ו': 07:30–16:00, שבת: 08:00–21:00",
    description: "הסניף השכונתי והשקט של WLYT ליד כיכר המדינה. מאצ'ה איכותית (Mix & Matcha) ואווירה רגועה.",
    vibeTags: ["שכונתי", "שקט", "ירוק", "איכותי", "קליל"],
    instagramHandle: "@welikeyoutoo_tlv",
    website: "",
    coordinates: { lat: 32.0874706, lng: 34.7911689 },
    heroImage: "/images/WLYT_akiva.jpg"
  },
  {
    id: 17,
    name: "נולה",
    city: "תל אביב",
    address: "דיזנגוף 197, תל אביב",
    openingHours: "א'-ה': 07:30–22:00, ו': 07:30–16:00, שבת: 09:00–22:00",
    description: "מאפייה אמריקאית קלאסית. מגישים מאצ'ה של Mix & Matcha שמשתלבת נהדר עם העוגיות והאווירה הביתית. מקום נהדר לארוחות בוקר.",
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
    openingHours: "א'-ה': 07:30–22:00, ו': 07:30–16:00, שבת: 08:00–22:00",
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
    coordinates: { lat: 31.7800851, lng: 35.2154968 },
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
    coordinates: { lat: 32.0849725, lng: 34.7818814 },
    heroImage: "/images/Cafe_Daisy.jpg"
  },
  {
    id: 22,
    name: "קפה מלבן (כצנלסון)",
    city: "גבעתיים",
    address: "כצנלסון 50, גבעתיים",
    openingHours: "א'-ה': 07:30–19:00, ו': 07:30–16:00, שבת: סגור",
    description: "קפה שכונתי אהוב בגבעתיים. עובדים עם Mix & Matcha ומציעים משקאות מאצ'ה איכותיים לצד כריכים מעולים.",
    vibeTags: ["שכונתי", "משפחתי", "נעים", "מקומי", "גבעתיים"],
    instagramHandle: "@cafemalben",
    website: "",
    coordinates: { lat: 32.0750577, lng: 34.8075414 },
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
    coordinates: { lat: 32.0926917, lng: 34.8093015 },
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
    coordinates: { lat: 32.0920666, lng: 34.8180365 },
    heroImage: "/images/bar_cafe_58_rashi.jpeg"
  },
  {
    id: 25,
    name: "אורבן שמאן",
    city: "תל אביב",
    address: "דיזנגוף 210, תל אביב",
    openingHours: "א'-ה': 09:00–21:00, ו': 09:00–15:00, שבת: סגור",
    description: "מקדש של בריאות ו-Wellness. מגישים מאצ'ה טקסית אורגנית, משקאות סופר-פוד ואוכל צמחי ברמה הגבוהה ביותר.",
    vibeTags: ["בריאות", "רוחני", "קהילתי", "טבעוני", "יוקרתי"],
    instagramHandle: "@urbanshaman_tlv",
    website: "https://urbanshaman.co.il",
    coordinates: { lat: 32.087214, lng: 34.7751938 },
    heroImage: "/images/Urban_Shaman.jpg"
  },
  {
    id: 26,
    name: "קפה סוהו",
    city: "תל אביב",
    address: "בן יהודה 73, תל אביב",
    openingHours: "א'-ו': 08:00–16:00, שבת: סגור",
    description: "מוסד תל אביבי עם ניחוח בינלאומי. ידועים בבראנץ' המושחת ובמאצ'ה לאטה המעולה שלהם (מומלץ עם Oatly).",
    vibeTags: ["בינלאומי", "תיירים", "בראנץ'", "חופשי", "שמח"],
    instagramHandle: "@cafexoho",
    website: "https://www.cafexoho.com",
    coordinates: { lat: 32.0809187, lng: 34.7702554 },
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
    coordinates: { lat: 32.0874274, lng: 34.7911915 },
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
    coordinates: { lat: 32.0685885, lng: 34.7954377 },
    heroImage: "/images/Cafetish.jpg"
  },
  {
    id: 29,
    name: "בוטי (שרונה)",
    city: "תל אביב",
    address: "ארניה אוסוולדו 9, תל אביב",
    openingHours: "א'-ה': 07:30–20:30, ו': 07:30–16:00, שבת: 08:15–22:00",
    description: "סניף שרונה של בוטיק המאפים. מציע מאצ'ה איכותית (Mix & Matcha) ומאפים מוקפדים בלב מתחם שרונה.",
    vibeTags: ["שרונה", "מאפים", "מודרני", "איכותי", "שוקק"],
    instagramHandle: "@butiandco",
    website: "",
    coordinates: { lat: 32.0723707, lng: 34.7861785 },
    heroImage: "/images/Buti_Sarona.jpg"
  },
  {
    id: 30,
    name: "קפה מלבן (ויצמן)",
    city: "גבעתיים",
    address: "ויצמן 51, גבעתיים",
    openingHours: "א'-ה': 08:00–19:00, ו': 08:00–15:00, שבת: סגור",
    description: "הסניף הנוסף של קפה מלבן, שמביא את אותה איכות קפה ומאצ'ה (Mix & Matcha) לאזור ויצמן.",
    vibeTags: ["שכונתי", "משפחתי", "כריכים", "גבעתיים"],
    instagramHandle: "@cafemalben",
    website: "",
    coordinates: { lat: 32.0708425, lng: 34.8087859 },
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
    coordinates: { lat: 32.0840091, lng: 34.7743665 },
    heroImage: "/images/Mela_Dizi.jpg"
  },
  {
    id: 32,
    name: "קפה 14",
    city: "תל אביב",
    address: "נחל הבשור 1, תל אביב",
    openingHours: "א'-ה': 06:00–17:00, ו': 06:00–16:00, שבת: 07:00–16:00",
    description: "בית קפה תל אביבי עם אווירה נעימה. מתמחה בקפה איכותי ומשקאות מאצ'ה.",
    vibeTags: ["תל אביבי", "נעים", "איכותי", "מאצ'ה"],
    instagramHandle: "",
    website: "",
    coordinates: { lat: 32.0397693, lng: 34.7569686 },
    heroImage: "/images/cafe_14.jpg"
  },
  {
    id: 33,
    name: "בירמה קפה",
    city: "ירושלים",
    address: "עמק רפאים 20, ירושלים",
    openingHours: "א'-ה': 07:00–19:00, ו': 07:00–16:00, שבת: סגור",
    description: "בית קלייה ומאפייה שכונתי בלב המושבה הגרמנית. מגישים גם משקאות מאצ'ה איכותיים באווירה אירופאית קלאסית.",
    vibeTags: ["קלאסי", "אירופאי", "שכונתי", "נעים", "משפחתי"],
    instagramHandle: "@birmacoffee",
    website: "https://birmacoffee.co.il",
    coordinates: { lat: 31.76523, lng: 35.221257 },
    heroImage: "/images/Birma Coffee.jpg"
  },
  {
    id: 34,
    name: "קאסה לביא",
    city: "ירושלים",
    address: "בית לחם 41, ירושלים",
    openingHours: "א'-ה': 08:00–16:30, ו': 08:00–13:00, שבת: סגור",
    description: "בית קפה ייחודי בירושלים עם עיצוב המשלב אלמנטים ירושלמיים עם נגיעות יווניות. מגיש קפה איכותי מבית הקלייה הירושלמי 'לב' ומשקאות מאצ'ה איכותיים לצד תפריט טבעוני מגוון.",
    vibeTags: ["ירושלמי", "טבעוני", "ייחודי", "איכותי", "נעים", "מאצ'ה"],
    instagramHandle: "",
    website: "",
    coordinates: { lat: 31.7582913, lng: 35.2217868 },
    heroImage: "/images/casa_lavi.jpg"
  },
  {
    id: 35,
    name: "מטאפורה ארט קפה",
    city: "ירושלים",
    address: "יפו 31, ירושלים",
    openingHours: "א'-ה': 08:15–15:00, שבת: סגור",
    description: "בית קפה ייחודי המשלב אווירה ביתית עם קפה משובח ויצירות אמנות. מגיש גם משקאות מאצ'ה איכותיים.",
    vibeTags: ["ירושלמי", "אמנות", "ייחודי", "ביתי", "מאצ'ה"],
    instagramHandle: "",
    website: "",
    coordinates: { lat: 31.7813366, lng: 35.2208843 },
    heroImage: "/images/metaphora_art.jpg"
  },
  {
    id: 36,
    name: "טחנת הקפה",
    city: "ירושלים",
    address: "עמק רפאים 23, ירושלים",
    openingHours: "א'-ה': 07:30–20:00, ו': 07:30–14:00, שבת: סגור",
    description: "בית קפה שכונתי במושבה הגרמנית המציע מגוון סוגי קפה ותערובות הנטחנים במקום. מגיש גם משקאות מאצ'ה איכותיים לצד תפריט הכולל כריכים וסלטים.",
    vibeTags: ["ירושלמי", "שכונתי", "מושבה הגרמנית", "מאצ'ה", "נעים"],
    instagramHandle: "",
    website: "",
    coordinates: { lat: 31.7647571, lng: 35.2209543 },
    heroImage: "/images/tahanat_hacafe.jpg"
  },
  {
    id: 37,
    name: "ג'רה (תחנת דלק זאב שלנג)",
    city: "ראשון לציון",
    address: "זאב שלנג, ראשון לציון (תחנת דלק)",
    openingHours: "א'-ה': 07:00–19:00, ו': 07:00–16:00, שבת: סגור",
    description: "סניף ייחודי של בית הקלייה ג'רה בתחנת דלק. מציעים קפה איכותי ומשקאות מאצ'ה במסגרת נוחה ונגישה.",
    vibeTags: ["תחנת דלק", "נגיש", "מאצ'ה", "ראשון לציון", "נוח"],
    instagramHandle: "@jeracoffee",
    website: "https://www.jeracoffee.com",
    coordinates: { lat: 31.9867943, lng: 34.7693418 },
    heroImage: "/images/Jera_Rlshon_shlang.jpg"
  },
  {
    id: 38,
    name: "בלומס",
    city: "פרדס חנה-כרכור",
    address: "החרושת 1, פרדס חנה כרכור",
    openingHours: "א'-ו': 07:00–14:00, שבת: סגור",
    description: "פנינה של קפה ספשלטי בלב פרדס חנה. עגלת קפה ובית קלייה עם אווירה קהילתית, בתוך מתחם אמנים ירוק וקסום. מגישים מאצ'ה איכותית.",
    vibeTags: ["קהילתי", "ירוק", "אומנותי", "קליל", "ישיבה בחוץ"],
    instagramHandle: "@blooms_specialty_coffee",
    website: "https://bloomscoffeeroastery.com",
    coordinates: { lat: 32.4778225, lng: 34.9788785 },
    heroImage: "/images/BLooms.jpg"
  },
  {
    id: 39,
    name: "צ'אצ'וס (גורדון)",
    city: "תל אביב",
    address: "גורדון 26, תל אביב",
    openingHours: "א'-ש': 07:00–23:00",
    description: "הסניף השני והתוסס של צ'אצ'וס. אותה איכות מאצ'ה ואווירה שמחה, במיקום מרכזי ליד הים.",
    vibeTags: ["שכונתי", "ים", "שמח", "ערב", "קיצי"],
    instagramHandle: "@chachos.tlv",
    website: "https://chachos-cafe.com",
    coordinates: { lat: 32.082085, lng: 34.77155 },
    heroImage: "/images/Chacho's Gordon.jpg"
  },
  {
    id: 40,
    name: "קפה ופרח",
    city: "ראשון לציון",
    address: "בן יהודה 6, ראשון לציון",
    openingHours: "א'-ה': 07:30–20:00, ו': 07:30–15:00, שבת: סגור",
    description: "שילוב קסום של בית קפה ודוכן פרחים. מקום פסטורלי ומעוצב שמציע מאצ'ה איכותית באווירה פורחת ונעימה.",
    vibeTags: ["פרחים", "אסתטי", "רגוע", "ראשון לציון", "מיוחד"],
    instagramHandle: "@caffe.and.flower",
    website: "",
    coordinates: { lat: 31.960368, lng: 34.806162 },
    heroImage: "/images/caffe_and_flower.jpg"
  },
  {
    id: 41,
    name: "קפה ולב",
    city: "ראשון לציון",
    address: "הורוביץ 36, ראשון לציון",
    openingHours: "א'-ה': 08:00–19:00, ו': 08:00–14:00, שבת: סגור",
    description: "בית קפה של קפה ופרח. מציעים מאצ'ה איכותית ואווירה נעימה.",
    vibeTags: ["ראשון לציון", "נעים", "שכונתי", "איכותי"],
    instagramHandle: "@caffe.and.heart",
    website: "",
    coordinates: { lat: 31.9645, lng: 34.8006 },
    heroImage: "/images/cafe_and_heart.jpg"
  },
  {
    id: 42,
    name: "קוהי",
    city: "תל אביב",
    address: "בן יהודה 155, תל אביב",
    openingHours: "א'-ש': 07:30–18:30",
    description: "בית קפה יפני מינימליסטי. עיצוב עץ נקי, מנות יפניות קטנות ומאצ'ה איכותית בסגנון יפני אותנטי.",
    vibeTags: ["יפני", "מינימליסטי", "נקי", "מיוחד", "שקט"],
    instagramHandle: "@kohi.tlv",
    website: "",
    coordinates: { lat: 32.088286, lng: 34.773303 },
    heroImage: "/images/Kohi.jpg"
  },
  {
    id: 43,
    name: "שאולה",
    city: "תל אביב",
    address: "שאול המלך 39, תל אביב",
    openingHours: "א'-ה': 07:30–20:00, ו': 07:30–16:00, שבת: 08:00–20:00",
    description: "בר קפה פתוח ומודרני בלובי של מלון לינק. מקום מושלם לפגישות או עבודה, עם מאצ'ה איכותית ואווירה אורבנית.",
    vibeTags: ["עבודה", "מלון", "מודרני", "פגישות", "איכותי"],
    instagramHandle: "@shaula_cafe",
    website: "",
    coordinates: { lat: 32.077994, lng: 34.79108 },
    heroImage: "/images/Shaula.jpg"
  },
  {
    id: 44,
    name: "D298",
    city: "תל אביב",
    address: "דיזנגוף 298, תל אביב",
    openingHours: "א'-ה': 07:30–20:00, ו': 07:30–17:00, שבת: 08:00–20:00",
    description: "נקודה תל אביבית קלאסית בצפון דיזנגוף. מאצ'ה איכותית, מאפים טובים ואווירה של שכונה בלב העיר.",
    vibeTags: ["דיזנגוף", "שכונתי", "רחוב", "מאפים", "איכותי"],
    instagramHandle: "@d298_tlv",
    website: "",
    coordinates: { lat: 32.094154, lng: 34.776843 },
    heroImage: "/images/D298.jpeg"
  },
  {
    id: 45,
    name: "פאקינג סאנדיי",
    city: "תל אביב",
    address: "לוינסקי 61, תל אביב",
    openingHours: "א'-ש': 08:00–22:00",
    description: "בית קפה אורבני עם אווירה צעירה ותוססת. מציעים מאצ'ה איכותית ומאפים טריים.",
    vibeTags: ["אורבני", "צעיר", "תוסס", "שכונתי"],
    instagramHandle: "",
    website: "",
    coordinates: { lat: 32.0594712, lng: 34.7738223 },
    heroImage: "/images/fckn_sunday.jpg"
  },
  {
    id: 46,
    name: "קפה פיקולו",
    city: "תל אביב",
    address: "דרויאנוב 5, תל אביב",
    openingHours: "א'-ש': 07:00–19:00",
    description: "בית קפה קטן ואינטימי עם אווירה אירופית. מגישים מאצ'ה איכותית בסגנון קלאסי.",
    vibeTags: ["אינטימי", "אירופי", "קטן", "קלאסי"],
    instagramHandle: "",
    website: "",
    coordinates: { lat: 32.0768982, lng: 34.7719282 },
    heroImage: "/images/piccolo.jpg"
  },
  {
    id: 47,
    name: "לאביט",
    city: "תל אביב",
    address: "דיזנגוף 232, תל אביב",
    openingHours: "א'-ש': 08:00–22:00",
    description: "בית קפה מודרני עם עיצוב יוקרתי. מציעים מאצ'ה איכותית ומאפים מעולים.",
    vibeTags: ["יוקרתי", "מודרני", "דיזנגוף", "איכותי"],
    instagramHandle: "",
    website: "",
    coordinates: { lat: 32.0893574, lng: 34.7757839 },
    heroImage: "/images/loveat.jpg"
  },
  {
    id: 48,
    name: "קפה שכנים",
    city: "חיפה",
    address: "שדרות הנשיא 116, חיפה",
    openingHours: "א'-ש': 08:00–19:00",
    description: "בית קפה חיפאי עם אווירה שכונתית וחמימה. מגישים מאצ'ה איכותית ומאכלים ביתיים.",
    vibeTags: ["חיפאי", "שכונתי", "נעים", "ביתי"],
    instagramHandle: "",
    website: "",
    coordinates: { lat: 32.805635, lng: 34.9872333 },
    heroImage: "/images/shchenim.jpg"
  },
  {
    id: 49,
    name: "קפה טרה",
    city: "אשדוד",
    address: "רוגוזין 5, אשדוד",
    openingHours: "א'-ה': 08:00–22:00, ו': 08:00–15:00, שבת: 19:00–22:00",
    description: "בית קפה באשדוד המציע מאצ'ה איכותית ואווירה נעימה. מתמחה במשקאות עונתיים מיוחדים.",
    vibeTags: ["אשדוד", "נעים", "שכונתי", "איכותי"],
    instagramHandle: "@ter.a_coffee",
    website: "https://smile-service.fun/teracoffeestart",
    coordinates: { lat: 31.8072881, lng: 34.644348 },
    heroImage: "/images/tera_coffee.jpg"
  },
  {
    id: 50,
    name: "קפה ברזילי",
    city: "תל אביב",
    address: "ברזילי 1, תל אביב",
    openingHours: "א'-ש': 07:00–19:00",
    description: "בית קפה שכונתי עם אווירה נעימה. מגישים מאצ'ה איכותית ומאפים טריים.",
    vibeTags: ["שכונתי", "נעים", "איכותי", "מאפים"],
    instagramHandle: "",
    website: "",
    coordinates: { lat: 32.0622441, lng: 34.775321 },
    heroImage: "/images/barzilai.jpg"
  }
];

// Transform MATCHA_PLACES_RAW to MATCHA_PLACES format for compatibility
// Filter out temporarily closed places
export const MATCHA_PLACES: MatchaPlace[] = MATCHA_PLACES_RAW
  .filter((place) => {
    // CUPS is temporarily closed - exclude it
    // הוק (פלורנטין) is permanently closed - exclude it
    return place.id !== 9 && place.name !== 'קאפס' && place.id !== 5 && place.name !== 'הוק (פלורנטין)';
  })
  .map((place): MatchaPlace => ({
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
