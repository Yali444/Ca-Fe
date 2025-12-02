// @/data/matcha.ts

export interface MatchaPlace {
  id: string;
  name: string;
  city: string;
  address: string;
  openingHours: string;
  description: string;
  matchaOrigin: string;
  milkOptions: string[];
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

export const MATCHA_PLACES: MatchaPlace[] = [
  {
    id: generateId("פיטהאוס", "תל אביב"),
    name: "פיטהאוס",
    city: "תל אביב",
    address: "התערוכה 3, נמל תל אביב",
    openingHours: "א'-ה': 07:00–21:00, ו': 07:00–16:00, שבת: 08:00–21:00",
    description: "בר בריאות בתוך מתחם כושר. מגישים מאצ'ה של Matchaeologist. המקום המושלם למאצ'ה קרה לפני או אחרי אימון מול הים.",
    matchaOrigin: "Uji, Kyoto",
    milkOptions: parseList("Oat, Almond, Soy"),
    vibeTags: parseList("בריאות, ספורטיבי, ים, אנרגטי, נמל"),
    instagramHandle: cleanInstagramHandle("@fithouse_tlv"),
    website: "https://www.fithouse.co.il",
    latitude: 32.096320,
    longitude: 34.773530,
    heroImage: "/images/FitHouse.jpeg"
  },
  {
    id: generateId("מלה (מקווה ישראל)", "תל אביב"),
    name: "מלה (מקווה ישראל)",
    city: "תל אביב",
    address: "מקווה ישראל 23, תל אביב",
    openingHours: "א'-ה': 08:00–18:00, ו': 08:00–15:00, שבת: סגור",
    description: "בית קפה שכונתי חמים. עובדים עם המותג Mix & Matcha ומגישים משקאות מאצ'ה עשירים ומדויקים.",
    matchaOrigin: "Uji, Kyoto",
    milkOptions: parseList("Oat, Almond, Cow"),
    vibeTags: parseList("שכונתי, חמים, בייתי, ותיק, טעים"),
    instagramHandle: cleanInstagramHandle("@melacafe_tlv"),
    latitude: 32.062590,
    longitude: 34.776120,
    heroImage: "/images/Mela_Mikve.jpg"
  },
  {
    id: generateId("מלה (הצפון הישן)", "תל אביב"),
    name: "מלה (הצפון הישן)",
    city: "תל אביב",
    address: "אשתורי הפרחי 20, תל אביב",
    openingHours: "א'-ה': 07:30–20:00, ו': 07:30–16:00, שבת: סגור",
    description: "הסניף הצפוני והמעוצב של מלה. מציע את אותה איכות מאצ'ה (Mix & Matcha) באווירה צפון-תל אביבית רגועה.",
    matchaOrigin: "Uji, Kyoto",
    milkOptions: parseList("Oat, Almond, Cow"),
    vibeTags: parseList("שכונתי, צפוני, רגוע, ישיבה בחוץ"),
    instagramHandle: cleanInstagramHandle("@melacafe_tlv"),
    latitude: 32.094500,
    longitude: 34.778800,
    heroImage: "/images/Mela_Ashtori.jpg"
  },
  {
    id: generateId("הוק (התבור)", "תל אביב"),
    name: "הוק (התבור)",
    city: "תל אביב",
    address: "התבור 2, תל אביב",
    openingHours: "א'-ה': 07:30–19:30, ו': 07:30–15:00, שבת: סגור",
    description: "מקדש של דיוק. משתמשים ב-Matchaeologist ומכינים את המאצ'ה בטקס יפני מסורתי ומוקפד.",
    matchaOrigin: "Uji, Kyoto",
    milkOptions: parseList("Oat, Cow"),
    vibeTags: parseList("מינימליסטי, יוקרתי, שקט, יפני, מדויק"),
    instagramHandle: cleanInstagramHandle("@hoc.telaviv"),
    website: "https://www.hoctelaviv.com",
    latitude: 32.064999,
    longitude: 34.766621,
    heroImage: "/images/House of coffee.jpg"
  },
  {
    id: generateId("הוק (פלורנטין)", "תל אביב"),
    name: "הוק (פלורנטין)",
    city: "תל אביב",
    address: "הרבי מבכרך 3, תל אביב",
    openingHours: "א'-ה': 08:00–18:00, ו': 08:00–15:00, שבת: סגור",
    description: "הסניף הדרומי והמחוספס יותר, אך עם אותו דיוק במאצ'ה (Matchaeologist) ועיצוב נקי להפליא.",
    matchaOrigin: "Uji, Kyoto",
    milkOptions: parseList("Oat, Cow"),
    vibeTags: parseList("פלורנטין, מודרני, בטון, שקט, עבודה"),
    instagramHandle: cleanInstagramHandle("@hoc.telaviv"),
    website: "https://www.hoctelaviv.com",
    latitude: 32.058500,
    longitude: 34.771200,
    heroImage: ""
  },
  {
    id: generateId("הוק (טרומפלדור)", "תל אביב"),
    name: "הוק (טרומפלדור)",
    city: "תל אביב",
    address: "טרומפלדור 6, תל אביב",
    openingHours: "א'-ה': 07:30–19:00, ו': 07:30–15:00, שבת: סגור",
    description: "הסניף הקרוב לים. עצירה מושלמת למאצ'ה קרה (Matchaeologist) באווירה מינימליסטית ומרגיעה.",
    matchaOrigin: "Uji, Kyoto",
    milkOptions: parseList("Oat, Cow"),
    vibeTags: parseList("ים, מרכז העיר, שקט, מעוצב, איכות"),
    instagramHandle: cleanInstagramHandle("@hoc.telaviv"),
    website: "https://www.hoctelaviv.com",
    latitude: 32.073500,
    longitude: 34.768800,
    heroImage: ""
  },
  {
    id: generateId("קפה בלו", "תל אביב - יפו"),
    name: "קפה בלו",
    city: "תל אביב - יפו",
    address: "האנגר 2, נמל יפו",
    openingHours: "א'-ש': 08:00–20:00",
    description: "לשתות מאצ'ה קרה מול הים. בלו מציעים חוויית מאצ'ה מרעננת באווירת הנמל של יפו.",
    matchaOrigin: "Japan (Premium)",
    milkOptions: parseList("Oat, Almond"),
    vibeTags: parseList("נוף לים, תיירותי, קליל, ים, נמל"),
    instagramHandle: cleanInstagramHandle("@cafeblue.jaffa"),
    latitude: 32.052600,
    longitude: 34.750500,
    heroImage: "/images/Cafe_Blue.jpg"
  },
  {
    id: generateId("צ'אצ'וס", "תל אביב"),
    name: "צ'אצ'וס",
    city: "תל אביב",
    address: "גאולה 51, תל אביב",
    openingHours: "א'-ה': 07:00–19:00, ו': 07:00–16:00",
    description: "מקום קטן ומלא באופי ליד הים. ידועים במשקאות המאצ'ה הקרים והמיוחדים שלהם ובאווירה השמחה.",
    matchaOrigin: "Japan (Premium)",
    milkOptions: parseList("Oat, Almond"),
    vibeTags: parseList("שכונתי, ים, צעיר, קליל, קיצי"),
    instagramHandle: cleanInstagramHandle("@chachos.tlv"),
    latitude: 32.071830,
    longitude: 34.766350,
    heroImage: "/images/ChaCho's Geula.jpg"
  },
  {
    id: generateId("קאפס", "תל אביב"),
    name: "קאפס",
    city: "תל אביב",
    address: "יהודה הלוי 59, תל אביב",
    openingHours: "א'-ה': 07:30–17:00, ו': 07:30–14:00",
    description: "אספרסו בר ומיקרו-רוסטרי שמגיש גם מאצ'ה ברמה גבוהה מאוד. מקום של מקצוענים שמעריכים חומרי גלם.",
    matchaOrigin: "Japan (Ceremonial)",
    milkOptions: parseList("Oat, Cow"),
    vibeTags: parseList("מקצועי, אורבני, מודרני, מוקפד, עבודה"),
    instagramHandle: cleanInstagramHandle("@cups.tlv"),
    latitude: 32.063780,
    longitude: 34.776520,
    heroImage: ""
  },
  {
    id: generateId("קפה פקטורי 54", "תל אביב"),
    name: "קפה פקטורי 54",
    city: "תל אביב",
    address: "האנגר 9, נמל תל אביב",
    openingHours: "א'-ש': 09:00–21:00",
    description: "בית קפה בתוך חנות האופנה, עובדים עם Mix & Matcha. מציעים חוויית שתייה אסתטית ויוקרתית מאוד.",
    matchaOrigin: "Uji, Kyoto",
    milkOptions: parseList("Oat, Almond, Cow"),
    vibeTags: parseList("אופנה, יוקרתי, שקט, מעוצב, נמל"),
    instagramHandle: cleanInstagramHandle("@factory54"),
    website: "https://www.factory54.co.il",
    latitude: 32.097560,
    longitude: 34.773850,
    heroImage: ""
  },
  {
    id: generateId("בר", "תל אביב"),
    name: "בר",
    city: "תל אביב",
    address: "וולפסון 42, תל אביב",
    openingHours: "א'-ה': 07:30–19:00, ו': 08:30–16:00, שבת: 09:30–16:00",
    description: "בית קפה שכונתי בפלורנטין עם אופי מיוחד. מגישים מאצ'ה תחת מותג פרטי המגיעה ממחוז מיא (Mie) ביפן.",
    matchaOrigin: "Mie Prefecture, Japan",
    milkOptions: parseList("Oat, Almond, Cow"),
    vibeTags: parseList("פלורנטין, שכונתי, קליל, צעיר, חיות מחמד"),
    instagramHandle: cleanInstagramHandle("@bar_wild_cafe"),
    latitude: 32.057744,
    longitude: 34.773649,
    heroImage: ""
  },
  {
    id: generateId("נורדיניו", "תל אביב"),
    name: "נורדיניו",
    city: "תל אביב",
    address: "נחלת בנימין 27, תל אביב",
    openingHours: "א'-ה': 07:00–20:00, ו': 07:00–16:00, שבת: סגור",
    description: "המאפייה של קפה נורדוי. מפורסמים במאפים המעולים ובמשקאות מאצ'ה (Mix & Matcha) איכותיים בחלון לרחוב.",
    matchaOrigin: "Uji, Kyoto",
    milkOptions: parseList("Oat, Almond, Cow"),
    vibeTags: parseList("מאפייה, רחוב, איכותי, עומס, פריזאי"),
    instagramHandle: cleanInstagramHandle("@nordinyo"),
    latitude: 32.064500,
    longitude: 34.770500,
    heroImage: "/images/Nordiniyo.jpeg"
  },
  {
    id: generateId("אנסטסיה", "תל אביב"),
    name: "אנסטסיה",
    city: "תל אביב",
    address: "פרישמן 54, תל אביב",
    openingHours: "א'-ש': 08:00–23:00",
    description: "בית הקפה הטבעוני המוביל בתל אביב. מציעים תפריט סופר-פוד עשיר ומאצ'ה טקסית עם מגוון חלבי צמחיים מעולים.",
    matchaOrigin: "Japan (Ceremonial)",
    milkOptions: parseList("Almond, Oat, Soy"),
    vibeTags: parseList("טבעוני, בריאות, הומה, תל אביבי, אוכל"),
    instagramHandle: cleanInstagramHandle("@anastasiatlv"),
    website: "https://anastasiatlv.co.il",
    latitude: 32.078800,
    longitude: 34.773200,
    heroImage: "/images/Anastasia.jpg"
  },
  {
    id: generateId("הקפה בבימה", "תל אביב"),
    name: "הקפה בבימה",
    city: "תל אביב",
    address: "שדרות תרס\"ט 2, תל אביב",
    openingHours: "א'-ש': 07:30–23:00",
    description: "הבוטקה הכי מפורסם בעיר. ישיבה בכיכר הבימה עם מאצ'ה (Mix & Matcha) מול השקיעה או התרבות.",
    matchaOrigin: "Uji, Kyoto",
    milkOptions: parseList("Oat, Almond, Cow"),
    vibeTags: parseList("בוטקה, כיכר, שמש, אווירה, חוץ"),
    instagramHandle: cleanInstagramHandle("@welikeyoutoo_tlv"),
    latitude: 32.072500,
    longitude: 34.779500,
    heroImage: "/images/wlyt_habima.jpg"
  },
  {
    id: generateId("הקפה בבן גוריון", "תל אביב"),
    name: "הקפה בבן גוריון",
    city: "תל אביב",
    address: "שדרות בן גוריון 39, תל אביב",
    openingHours: "א'-ש': 07:30–21:00",
    description: "האחות הקטנה והירוקה בשדרה. קפה ומאצ'ה (Mix & Matcha) מתחת לעצים בשדרות בן גוריון.",
    matchaOrigin: "Uji, Kyoto",
    milkOptions: parseList("Oat, Almond, Cow"),
    vibeTags: parseList("שדרה, ירוק, שכונתי, שקט, חוץ"),
    instagramHandle: cleanInstagramHandle("@welikeyoutoo_tlv"),
    latitude: 32.083500,
    longitude: 34.773500,
    heroImage: "/images/WLTY_BG.jpg"
  },
  {
    id: generateId("הקפה באריה עקיבא", "תל אביב"),
    name: "הקפה באריה עקיבא",
    city: "תל אביב",
    address: "אריה עקיבא 2, תל אביב",
    openingHours: "א'-ש': 07:30–21:00",
    description: "הסניף השכונתי והשקט של WLYT ליד כיכר המדינה. מאצ'ה איכותית (Mix & Matcha) ואווירה רגועה.",
    matchaOrigin: "Uji, Kyoto",
    milkOptions: parseList("Oat, Almond, Cow"),
    vibeTags: parseList("שכונתי, שקט, ירוק, איכותי, קליל"),
    instagramHandle: cleanInstagramHandle("@welikeyoutoo_tlv"),
    latitude: 32.086100,
    longitude: 34.782500,
    heroImage: "/images/WLYT_akiva.jpg"
  },
  {
    id: generateId("נולה", "תל אביב"),
    name: "נולה",
    city: "תל אביב",
    address: "דיזנגוף 197, תל אביב",
    openingHours: "א'-ה': 07:30–22:00, ו': 07:30–16:00, שבת: 09:00–22:00",
    description: "מאפייה אמריקאית קלאסית. מגישים מאצ'ה של Mix & Matcha שמשתלבת נהדר עם העוגיות והאווירה הביתית.",
    matchaOrigin: "Uji, Kyoto",
    milkOptions: parseList("Oat, Almond, Cow"),
    vibeTags: parseList("אמריקאי, נעים, מתוקים, בראנץ', דיזנגוף"),
    instagramHandle: cleanInstagramHandle("@nolatlv"),
    website: "https://www.nola-b.co.il",
    latitude: 32.087500,
    longitude: 34.775500,
    heroImage: ""
  },
  {
    id: generateId("בוטי (דיזנגוף)", "תל אביב"),
    name: "בוטי (דיזנגוף)",
    city: "תל אביב",
    address: "כיכר דיזנגוף 4, תל אביב",
    openingHours: "א'-ה': 07:30–20:00, ו': 07:30–17:00, שבת: 08:00–20:00",
    description: "בוטיק מאפים בכיכר. מקום אסתטי שמגיש מאצ'ה איכותית (Mix & Matcha) ומאפים יפהפיים מול המזרקה.",
    matchaOrigin: "Uji, Kyoto",
    milkOptions: parseList("Oat, Almond, Cow"),
    vibeTags: parseList("כיכר דיזנגוף, אסתטי, מאפים, שיקי, עיר"),
    instagramHandle: cleanInstagramHandle("@butiandco"),
    latitude: 32.077800,
    longitude: 34.774200,
    heroImage: "/images/Buti_Dizi.jpg"
  },
  {
    id: generateId("ליבא קפה", "ירושלים"),
    name: "ליבא קפה",
    city: "ירושלים",
    address: "ש\"ץ 4, ירושלים",
    openingHours: "א'-ה': 07:30–19:00, ו': 07:30–14:00, שבת: סגור",
    description: "בית קפה בוטיק ירושלמי עם עיצוב מוקפד. מגישים מאצ'ה של Mix & Matcha באווירה שקטה ואיכותית במרכז העיר.",
    matchaOrigin: "Uji, Kyoto",
    milkOptions: parseList("Oat, Almond, Cow"),
    vibeTags: parseList("ירושלמי, בוטיק, שקט, איכותי, עיצוב"),
    instagramHandle: cleanInstagramHandle("@libacafe"),
    latitude: 31.780500,
    longitude: 35.216800,
    heroImage: ""
  },
  {
    id: generateId("קפה נעורים", "פרדס חנה-כרכור"),
    name: "קפה נעורים",
    city: "פרדס חנה-כרכור",
    address: "נעורים 54, פרדס חנה-כרכור",
    openingHours: "א'-ה': 07:30–17:00, ו': 07:30–14:00, שבת: סגור",
    description: "פנינה מקומית בלב פרדס חנה. בית קפה עם אווירה קהילתית, חצר נעימה ומאצ'ה איכותית (Mix & Matcha) באווירה כפרית ורגועה.",
    matchaOrigin: "Uji, Kyoto",
    milkOptions: parseList("Oat, Almond, Cow"),
    vibeTags: parseList("כפרי, ירוק, שכונתי, רוגע, קהילתי"),
    instagramHandle: cleanInstagramHandle("@cafe_neurim"),
    latitude: 32.471800,
    longitude: 34.975500,
    heroImage: "/images/Neurim Caffe.jpg"
  },
  {
    id: generateId("קפה דייזי", "תל אביב"),
    name: "קפה דייזי",
    city: "תל אביב",
    address: "אבן גבירול 114, תל אביב",
    openingHours: "א'-ה': 07:30–23:00, ו': 07:30–16:00, שבת: 08:30–23:00",
    description: "האחות הקטנה והצבעונית של קפה בוקה. מקום שמח עם עיצוב רטרו ומשקאות מאצ'ה (Mix & Matcha) מפנקים.",
    matchaOrigin: "Uji, Kyoto",
    milkOptions: parseList("Oat, Almond, Soy"),
    vibeTags: parseList("רטרו, צבעוני, שכונתי, שמח, צעיר"),
    instagramHandle: cleanInstagramHandle("@daisy.tlv"),
    latitude: 32.089500,
    longitude: 34.782200,
    heroImage: "/images/Cafe_Daisy.jpg"
  },
  {
    id: generateId("קפה מלבן (כצנלסון)", "גבעתיים"),
    name: "קפה מלבן (כצנלסון)",
    city: "גבעתיים",
    address: "כצנלסון 50, גבעתיים",
    openingHours: "א'-ה': 07:30–19:30, ו': 07:30–15:00, שבת: סגור",
    description: "קפה שכונתי אהוב בגבעתיים. עובדים עם Mix & Matcha ומציעים משקאות מאצ'ה איכותיים לצד כריכים מעולים.",
    matchaOrigin: "Uji, Kyoto",
    milkOptions: parseList("Oat, Almond, Cow"),
    vibeTags: parseList("שכונתי, משפחתי, נעים, מקומי, גבעתיים"),
    instagramHandle: cleanInstagramHandle("@cafemalben"),
    latitude: 32.074500,
    longitude: 34.808500,
    heroImage: "/images/Malben_Katzenelson.jpg"
  },
  {
    id: generateId("בר קפה 58 (רוקח)", "רמת גן"),
    name: "בר קפה 58 (רוקח)",
    city: "רמת גן",
    address: "רוקח 58, רמת גן",
    openingHours: "א'-ה': 07:30–22:00, ו': 07:30–15:30, שבת: 08:00–16:00",
    description: "בית קפה פסטורלי מול פארק הירקון. מגישים מאצ'ה (Mix & Matcha) באווירה ירוקה ושקטה.",
    matchaOrigin: "Uji, Kyoto",
    milkOptions: parseList("Oat, Almond, Cow"),
    vibeTags: parseList("פארק, ירוק, שקט, רמת גן, משפחתי"),
    instagramHandle: cleanInstagramHandle("@barcafe_58"),
    latitude: 32.098500,
    longitude: 34.805500,
    heroImage: "/images/Bar_Cafe_58.jpg"
  },
  {
    id: generateId("בר קפה (רש\"י)", "רמת גן"),
    name: "בר קפה (רש\"י)",
    city: "רמת גן",
    address: "רש\"י 23, רמת גן",
    openingHours: "א'-ה': 07:30–20:00, ו': 07:30–15:30, שבת: 08:00–16:00",
    description: "הסניף השכונתי במרכז רמת גן. אותה איכות מאצ'ה (Mix & Matcha) באווירה אורבנית ונעימה.",
    matchaOrigin: "Uji, Kyoto",
    milkOptions: parseList("Oat, Almond, Cow"),
    vibeTags: parseList("שכונתי, עירוני, נעים, רמת גן, קפה"),
    instagramHandle: cleanInstagramHandle("@barcafe_58"),
    latitude: 32.082500,
    longitude: 34.813500,
    heroImage: ""
  },
  {
    id: generateId("אורבן שמאן", "תל אביב"),
    name: "אורבן שמאן",
    city: "תל אביב",
    address: "דיזנגוף 210, תל אביב",
    openingHours: "א'-ה': 09:00–22:00, ו': 09:00–16:00, שבת: 10:00–22:00",
    description: "מקדש של בריאות ו-Wellness. מגישים מאצ'ה טקסית אורגנית, משקאות סופר-פוד ואוכל צמחי ברמה הגבוהה ביותר.",
    matchaOrigin: "Japan (Ceremonial Organic)",
    milkOptions: parseList("Almond (Housemade), Oat, Soy"),
    vibeTags: parseList("בריאות, רוחני, קהילתי, טבעוני, יוקרתי"),
    instagramHandle: cleanInstagramHandle("@urbanshaman_tlv"),
    website: "https://urbanshaman.co.il",
    latitude: 32.086500,
    longitude: 34.776200,
    heroImage: "/images/Urban_Shaman.jpg"
  },
  {
    id: generateId("קפה סוהו", "תל אביב"),
    name: "קפה סוהו",
    city: "תל אביב",
    address: "בן יהודה 73, תל אביב",
    openingHours: "א'-ו': 08:00–16:00, שבת: 08:00–16:00",
    description: "מוסד תל אביבי עם ניחוח בינלאומי. ידועים בבראנץ' המושחת ובמאצ'ה לאטה המעולה שלהם (מומלץ עם Oatly).",
    matchaOrigin: "Japan",
    milkOptions: parseList("Oat, Almond, Cow"),
    vibeTags: parseList("בינלאומי, תיירים, בראנץ', חופשי, שמח"),
    instagramHandle: cleanInstagramHandle("@cafexoho"),
    website: "https://www.cafexoho.com",
    latitude: 32.081500,
    longitude: 34.771800,
    heroImage: "/images/Cafe_Xoho.jpg"
  },
  {
    id: generateId("אופן", "תל אביב"),
    name: "אופן",
    city: "תל אביב",
    address: "ה' באייר 48, תל אביב",
    openingHours: "א'-ה': 07:45–18:00, ו': 07:45–15:00, שבת: סגור",
    description: "האח הגדול של נורדיניו בכיכר המדינה. עיצוב מוקפד, מאפים ברמה עולמית ומאצ'ה (Mix & Matcha) איכותית.",
    matchaOrigin: "Uji, Kyoto",
    milkOptions: parseList("Oat, Almond, Cow"),
    vibeTags: parseList("כיכר המדינה, יוקרתי, מאפים, איכות, שקט"),
    instagramHandle: cleanInstagramHandle("@open.tlv"),
    latitude: 32.086800,
    longitude: 34.781500,
    heroImage: "/images/Open.jpg"
  },
  {
    id: generateId("קפטיש", "תל אביב"),
    name: "קפטיש",
    city: "תל אביב",
    address: "וולטר מוזס 10, תל אביב",
    openingHours: "א'-ה': 07:30–18:00, ו': 07:30–14:00, שבת: 09:00–16:00",
    description: "פינה שקטה המציעה מאצ'ה לאטה איכותית ומוקפדת, לצד עוגיות פיסטוק ומאפים מצוינים.",
    matchaOrigin: "Japan",
    milkOptions: parseList("Oat, Almond, Cow"),
    vibeTags: parseList("אינטימי, שקט, איכותי, עבודה, מודרני"),
    instagramHandle: cleanInstagramHandle("@cafetish"),
    latitude: 32.072500,
    longitude: 34.795200,
    heroImage: "/images/Cafetish.jpg"
  },
  {
    id: generateId("בוטי (שרונה)", "תל אביב"),
    name: "בוטי (שרונה)",
    city: "תל אביב",
    address: "ארניה אוסוולדו 9, תל אביב",
    openingHours: "א'-ה': 07:30–18:30, ו': 07:30–15:00, שבת: 08:30–18:30",
    description: "סניף שרונה של בוטיק המאפים. מציע מאצ'ה איכותית (Mix & Matcha) ומאפים מוקפדים בלב מתחם שרונה.",
    matchaOrigin: "Uji, Kyoto",
    milkOptions: parseList("Oat, Almond, Cow"),
    vibeTags: parseList("שרונה, מאפים, מודרני, איכותי, שוקק"),
    instagramHandle: cleanInstagramHandle("@butiandco"),
    latitude: 32.071800,
    longitude: 34.788500,
    heroImage: "/images/Buti_Sarona.jpg"
  },
  {
    id: generateId("קפה מלבן (ויצמן)", "גבעתיים"),
    name: "קפה מלבן (ויצמן)",
    city: "גבעתיים",
    address: "ויצמן 51, גבעתיים",
    openingHours: "א'-ה': 08:00–19:00, ו': 08:00–16:00",
    description: "הסניף הנוסף של קפה מלבן, שמביא את אותה איכות קפה ומאצ'ה (Mix & Matcha) לאזור ויצמן.",
    matchaOrigin: "Uji, Kyoto",
    milkOptions: parseList("Oat, Almond, Cow"),
    vibeTags: parseList("שכונתי, משפחתי, כריכים, גבעתיים"),
    instagramHandle: cleanInstagramHandle("@cafemalben"),
    latitude: 32.078500,
    longitude: 34.811200,
    heroImage: "/images/Malben_weizzman.jpg"
  }
];
