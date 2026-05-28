/**
 * Mapping from raw city strings (as stored on places) into the six broad
 * geographic regions we surface in the UI. Anything not mapped falls back to
 * "אחר" ("other") so the rest of the app doesn't have to guard for null.
 */

export const MAIN_AREAS = [
  "תל אביב וגוש דן",
  "ירושלים והסביבה",
  "השרון",
  "השפלה",
  "הדרום והנגב",
  "חיפה והצפון",
] as const;

export type MainArea = (typeof MAIN_AREAS)[number];

export const AREA_MAPPINGS: Record<string, MainArea> = {
  // Tel Aviv metropolitan area (Gush Dan)
  "תל אביב": "תל אביב וגוש דן",
  "תל אביב - יפו": "תל אביב וגוש דן",
  "תל אביב-יפו": "תל אביב וגוש דן",
  "גבעתיים": "תל אביב וגוש דן",
  "רמת גן": "תל אביב וגוש דן",
  "יפו": "תל אביב וגוש דן",
  // Jerusalem and surroundings
  "ירושלים": "ירושלים והסביבה",
  "שריגים": "ירושלים והסביבה",
  // Sharon and coastal area
  "רמת השרון": "השרון",
  "בית יהושע": "השרון",
  "פרדס חנה-כרכור": "השרון",
  "זיכרון יעקב": "השרון",
  "הוד השרון": "השרון",
  // Shfela (center-south)
  "רחובות": "השפלה",
  "ראשון לציון": "השפלה",
  "אשדוד": "השפלה",
  "נס ציונה": "השפלה",
  "מודיעין": "השפלה",
  // South & Negev
  "באר שבע": "הדרום והנגב",
  "ערד": "הדרום והנגב",
  "פארק תעשיות ראם": "הדרום והנגב",
  // Haifa and North (merged)
  "חיפה": "חיפה והצפון",
  "קיבוץ יגור": "חיפה והצפון",
  "קיבוץ מורן": "חיפה והצפון",
  "קיבוץ מחניים": "חיפה והצפון",
  "זרזיר": "חיפה והצפון",
  "קריית טבעון": "חיפה והצפון",
  "קיבוץ מגל": "חיפה והצפון",
  "עוספיא": "חיפה והצפון",
  "כפר תבור": "חיפה והצפון",
};

export const MAIN_AREA_SET = new Set<MainArea>(MAIN_AREAS);

/** Returns the broad region for a city, or "אחר" if unmapped/null. */
export const getAreaForCity = (city: string | null): MainArea | "אחר" => {
  if (!city) return "אחר";
  return AREA_MAPPINGS[city] || "אחר";
};

/**
 * Group shops by their region (via getAreaForCity), sort the shops
 * inside each group alphabetically (Hebrew collation), then sort the
 * groups by shop count descending so the most-populated regions come
 * first.
 */
export const groupShopsByArea = <T extends { location: string; name: string }>(
  shops: T[],
): { area: string; shops: T[] }[] => {
  const areaMap = new Map<string, T[]>();

  shops.forEach((shop) => {
    const area = getAreaForCity(shop.location);
    const existing = areaMap.get(area) || [];
    existing.push(shop);
    areaMap.set(area, existing);
  });

  return Array.from(areaMap.entries())
    .map(([area, group]) => ({
      area,
      shops: group.sort((a, b) => {
        const nameA = a.name || "";
        const nameB = b.name || "";
        return nameA.localeCompare(nameB, "he");
      }),
    }))
    .sort((a, b) => b.shops.length - a.shops.length);
};
