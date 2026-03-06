// List of places that are MATCHA-ONLY (should not appear as coffee places)
// These places appear in both cafes.json and matcha.ts, but they only serve matcha
// Format: "name-city" (exact match required)

export const MATCHA_ONLY_PLACES: string[] = [
  "קפה דייזי-תל אביב",
  "קפה מלבן (כצנלסון)-גבעתיים",
  "קפה מלבן (ויצמן)-גבעתיים",
  "קפה ופרח-ראשון לציון",
  "קפה ולב-ראשון לציון",
  "ליבא-קיסריה",
  "טוני ואסתר-תל אביב",
  "נולה-תל אביב",
  "אורבן שמאן-תל אביב",
];

// Helper function to check if a place is matcha-only
export function isMatchaOnlyPlace(name: string, city: string | null): boolean {
  const key = `${name}-${city || ''}`;
  return MATCHA_ONLY_PLACES.includes(key);
}
