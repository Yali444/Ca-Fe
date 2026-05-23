import type { OpeningHours } from "@/types/place";

export const instagramUrl = (handle?: string | null) =>
  handle ? `https://instagram.com/${handle.replace(/^@/, "")}` : null;

// Day mappings - Hebrew to day keys
const HEBREW_DAY_MAP: Record<string, keyof OpeningHours> = {
  'א': 'sunday',
  'ב': 'monday',
  'ג': 'tuesday',
  'ד': 'wednesday',
  'ה': 'thursday',
  'ו': 'friday',
  'ש': 'saturday',
  'שבת': 'saturday',
  'מוצש': 'saturday',
  'מוצ"ש': 'saturday',
  'מוצ\'ש': 'saturday',
  'ראשון': 'sunday',
  'שני': 'monday',
  'שלישי': 'tuesday',
  'רביעי': 'wednesday',
  'חמישי': 'thursday',
  'שישי': 'friday',
};

// English day mappings
const ENGLISH_DAY_MAP: Record<string, keyof OpeningHours> = {
  'sun': 'sunday',
  'mon': 'monday',
  'tue': 'tuesday',
  'wed': 'wednesday',
  'thu': 'thursday',
  'fri': 'friday',
  'sat': 'saturday',
  'sunday': 'sunday',
  'monday': 'monday',
  'tuesday': 'tuesday',
  'wednesday': 'wednesday',
  'thursday': 'thursday',
  'friday': 'friday',
  'saturday': 'saturday',
};

// Day indices (0 = Sunday, 6 = Saturday)
const DAY_KEYS: Array<keyof OpeningHours> = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'
];

const DAY_INDICES: Record<keyof OpeningHours, number> = {
  'sunday': 0,
  'monday': 1,
  'tuesday': 2,
  'wednesday': 3,
  'thursday': 4,
  'friday': 5,
  'saturday': 6,
};

// Normalize time format (handle en-dash, em-dash, regular dash)
function normalizeTime(timeStr: string): string {
  return timeStr
    .replace(/[–—]/g, '-')  // Replace en-dash and em-dash with regular dash
    .trim();
}

// Parse a day range like "א-ה", "ב-ה", "Mon-Sat", "Sun-Thu"
function parseDayRange(rangeStr: string): number[] {
  const parts = rangeStr.split(/[-־]/); // Handle both regular dash and Hebrew dash
  if (parts.length !== 2) return [];
  
  const start = parts[0].trim().replace(/['''״"]/g, '').toLowerCase();
  const end = parts[1].trim().replace(/['''״"]/g, '').toLowerCase();
  
  // Try Hebrew first
  let startDay = HEBREW_DAY_MAP[start];
  let endDay = HEBREW_DAY_MAP[end];
  
  // If not found, try English
  if (!startDay) {
    startDay = ENGLISH_DAY_MAP[start];
  }
  if (!endDay) {
    endDay = ENGLISH_DAY_MAP[end];
  }
  
  if (!startDay || !endDay) {
    return [];
  }
  
  const startIndex = DAY_INDICES[startDay];
  const endIndex = DAY_INDICES[endDay];
  
  const indices: number[] = [];
  for (let i = startIndex; i <= endIndex; i++) {
    indices.push(i);
  }
  return indices;
}

// Parse a single day like "א", "שבת", "Mon", "Saturday"
function parseSingleDay(dayStr: string): number | null {
  const clean = dayStr.trim().replace(/['''״"]/g, '').toLowerCase();
  
  // Try Hebrew first
  let dayKey = HEBREW_DAY_MAP[clean];
  
  // If not found, try English
  if (!dayKey) {
    dayKey = ENGLISH_DAY_MAP[clean];
  }
  
  if (!dayKey) {
    return null;
  }
  return DAY_INDICES[dayKey];
}

// Check if string means "closed"
function isClosed(str: string): boolean {
  const closed = str.toLowerCase();
  return closed.includes('סגור') || closed.includes('closed') || closed === 'סגור' || closed.trim() === '';
}

/**
 * Parses Hebrew opening hours string into structured OpeningHours object
 * Format examples:
 * - "א'-ה': 07:00–19:00, ו': 07:00–16:00, שבת: 08:00–21:00"
 * - "א'-ה': 08:00–18:00, ו': 08:00–15:00, שבת: סגור"
 * 
 * @param hoursString - Hebrew opening hours string
 * @returns OpeningHours object or null if parsing fails
 */
export function parseOpeningHoursString(hoursString: string): OpeningHours | null {
  const result: OpeningHours = {};
  
  // Normalize the string - handle מוצ"ש with quotes and Hebrew quotes  
  let normalized = hoursString.trim();
  normalized = normalized.replace(/מוצ"ש/g, 'מוצש');
  normalized = normalized.replace(/מוצ'ש/g, 'מוצש');
  
  // Split by comma to get different day groups
  const parts = normalized.split(',').map(p => p.trim());
  
  for (const part of parts) {
    // Match pattern like "א'-ה': 07:00–19:00" or "שבת: סגור" or "Mon-Sat: 07:00-19:00"
    const match = part.match(/^(.+?):\s*(.+)$/);
    if (!match) {
      // Try without colon (e.g., "Mon-Sat 07:00-19:00")
      const matchNoColon = part.match(/^(.+?)\s+(\d{1,2}:\d{2}\s*[–-]\s*\d{1,2}:\d{2})$/);
      if (matchNoColon) {
        const dayPart = matchNoColon[1].trim();
        const timePart = matchNoColon[2].trim();
        
        if (!isClosed(timePart)) {
          const normalizedTime = normalizeTime(timePart);
          if (/\d/.test(normalizedTime) && normalizedTime.includes('-')) {
            // Check for all week pattern
            const allWeekMatch = dayPart.match(/^א'[\s-־]*ש'?$/i);
            if (allWeekMatch) {
              for (let i = 0; i < 7; i++) {
                result[DAY_KEYS[i]] = normalizedTime;
              }
              continue;
            }
            
            // Try range or single day
            const cleanDayPart = dayPart.replace(/['''״"]/g, '').trim();
            if (cleanDayPart.includes('-') || cleanDayPart.includes('־')) {
              const indices = parseDayRange(cleanDayPart);
              if (indices.length > 0) {
                for (const index of indices) {
                  result[DAY_KEYS[index]] = normalizedTime;
                }
                continue;
              }
            } else {
              const index = parseSingleDay(cleanDayPart);
              if (index !== null) {
                result[DAY_KEYS[index]] = normalizedTime;
                continue;
              }
            }
          }
        }
      }
      continue;
    }
    
    const dayPart = match[1].trim();
    const timePart = match[2].trim();
    
    // Check if closed
    if (isClosed(timePart)) {
      // Skip - we don't set anything, meaning it's closed
      continue;
    }
    
    // Normalize time first to handle en-dash/em-dash
    const normalizedTime = normalizeTime(timePart);
    
    // Check for time range (must contain digits and dash)
    if (!/\d/.test(normalizedTime) || !normalizedTime.includes('-')) {
      // Invalid time format
      continue;
    }
    
    // Check for "א'-ש'" or "א'-ש" pattern (all week) - check BEFORE cleaning quotes
    const allWeekMatch = dayPart.match(/^א'[\s-־]*ש'?$/i);
    if (allWeekMatch) {
      // Apply to all days
      for (let i = 0; i < 7; i++) {
        result[DAY_KEYS[i]] = normalizedTime;
      }
      continue;
    }
    
    // Check for English "Mon-Sat" or "Sun-Thu" patterns
    const englishAllWeekMatch = dayPart.match(/^(mon|sun|tue|wed|thu|fri|sat)[\s-]+(mon|sun|tue|wed|thu|fri|sat)$/i);
    if (englishAllWeekMatch) {
      const indices = parseDayRange(dayPart);
      if (indices.length > 0) {
        for (const index of indices) {
          result[DAY_KEYS[index]] = normalizedTime;
        }
        continue;
      }
    }
    
    // Parse day part - remove quotes first
    const cleanDayPart = dayPart.replace(/['''״"]/g, '').trim();
    
    if (cleanDayPart.includes('-') || cleanDayPart.includes('־')) {
      // Range like "א-ה" or "ב-ה" or "Mon-Sat"
      const indices = parseDayRange(cleanDayPart);
      if (indices.length > 0) {
        for (const index of indices) {
          result[DAY_KEYS[index]] = normalizedTime;
        }
      }
    } else {
      // Single day like "א" or "שבת" or "Mon" or "Saturday"
      const index = parseSingleDay(cleanDayPart);
      if (index !== null) {
        result[DAY_KEYS[index]] = normalizedTime;
      }
    }
  }
  
  // If we didn't parse anything, return null
  if (Object.keys(result).length === 0) {
    return null;
  }
  
  return result;
}

/**
 * Checks if a place is currently open based on opening hours
 * Supports both structured object format and legacy string format
 * 
 * @param openingHours - Opening hours as object or string
 * @returns boolean - true if open, false if closed
 */
export function isPlaceOpen(openingHours: string | OpeningHours | null | undefined): boolean {
  // Default to closed if no hours provided (safer assumption)
  if (!openingHours) {
    return false;
  }

  try {
    // Use client-side time only (ensures browser timezone is used)
    if (typeof window === "undefined") {
      // Server-side: default to closed to avoid hydration mismatches
      return false;
    }

    // Handle structured object format (preferred)
    if (typeof openingHours === "object" && openingHours !== null) {
      const now = new Date();
      const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      const dayKeys: Array<keyof OpeningHours> = [
        'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'
      ];
      const dayKey = dayKeys[currentDay];
      const hoursForDay = openingHours[dayKey];

      if (!hoursForDay) {
        return false; // No hours specified for this day
      }

      // Parse time range (e.g., "07:00-19:00")
      const timeRangeMatch = hoursForDay.match(/(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})/);
      if (!timeRangeMatch) {
        return false; // Invalid time format
      }

      const openHour = parseInt(timeRangeMatch[1], 10);
      const openMinute = parseInt(timeRangeMatch[2], 10);
      const closeHour = parseInt(timeRangeMatch[3], 10);
      const closeMinute = parseInt(timeRangeMatch[4], 10);

      const currentTime = currentHour * 60 + currentMinute;
      const openTime = openHour * 60 + openMinute;
      const closeTime = closeHour * 60 + closeMinute;

      // Handle ranges that cross midnight (e.g., "22:00-02:00")
      if (closeTime <= openTime) {
        // Range crosses midnight
        return currentTime >= openTime || currentTime < closeTime;
      } else {
        // Normal range within same day
        return currentTime >= openTime && currentTime <= closeTime;
      }
    }

    // Handle legacy string format (fallback)
    if (typeof openingHours === "string") {
      return isPlaceOpenFromString(openingHours);
    }

    return false;
  } catch (error) {
    // On any parsing error, default to closed (safer assumption)
    console.warn("Error parsing opening hours:", error);
    return false;
  }
}

/**
 * Formats opening hours for display
 * Handles both string format and OpeningHours object format
 * 
 * @param openingHours - Opening hours as string, object, or null
 * @returns string - Formatted opening hours for display
 */
export function formatOpeningHoursForDisplay(openingHours: string | OpeningHours | null | undefined): string {
  if (!openingHours) {
    return "";
  }

  // If it's already a string, return it as-is
  if (typeof openingHours === "string") {
    return openingHours;
  }

  // If it's an object, format it
  const dayLabels: Record<keyof OpeningHours, string> = {
    sunday: "א'",
    monday: "ב'",
    tuesday: "ג'",
    wednesday: "ד'",
    thursday: "ה'",
    friday: "ו'",
    saturday: "שבת",
  };
  
  const parts: string[] = [];
  const dayKeys: Array<keyof OpeningHours> = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  
  for (const day of dayKeys) {
    if (openingHours[day]) {
      parts.push(`${dayLabels[day]}: ${openingHours[day]}`);
    }
  }
  
  return parts.join(", ");
}

/**
 * Parses Hebrew opening hours string and checks if the place is currently open
 * Format examples:
 * - "א'-ה': 07:00–21:00, ו': 07:00–16:00, שבת: 08:00–21:00"
 * - "א'-ה': 08:00–18:00, ו': 08:00–15:00, שבת: סגור"
 * 
 * @param openingHoursString - Hebrew opening hours string
 * @returns boolean - true if open, false if closed
 */
function isPlaceOpenFromString(openingHoursString: string): boolean {
  if (!openingHoursString || openingHoursString.trim() === "") {
    return false;
  }

  try {
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
    const currentTime = now.getHours() * 100 + now.getMinutes(); // HHMM format for easy comparison

    // Normalize quotes/apostrophes to standard apostrophe for consistent matching
    // Handles: geresh (׳), right single quote ('), left single quote ('), etc.
    const normalizedHours = openingHoursString.replace(/[׳''`´]/g, "'");

    // Day mappings (using normalized apostrophes)
    const dayRanges: { [key: string]: number[] } = {
      "א'-ש'": [0, 1, 2, 3, 4, 5, 6], // Sunday-Saturday (all week)
      "א-ש": [0, 1, 2, 3, 4, 5, 6], // Sunday-Saturday (all week)
      "א'-ה'": [0, 1, 2, 3, 4], // Sunday-Thursday
      "א-ה": [0, 1, 2, 3, 4],
      "א'-ו'": [0, 1, 2, 3, 4, 5], // Sunday-Friday
      "א-ו": [0, 1, 2, 3, 4, 5],
      "א'-ד'": [0, 1, 2, 3], // Sunday-Wednesday
      "א-ד": [0, 1, 2, 3],
      "ב'-ה'": [1, 2, 3, 4], // Monday-Thursday
      "ב-ה": [1, 2, 3, 4],
      "ב'-ו'": [1, 2, 3, 4, 5], // Monday-Friday
      "ב-ו": [1, 2, 3, 4, 5],
      "א'": [0], // Sunday
      "א": [0],
      "ב'": [1], // Monday
      "ב": [1],
      "ג'": [2], // Tuesday
      "ג": [2],
      "ד'": [3], // Wednesday
      "ד": [3],
      "ה'": [4], // Thursday
      "ה": [4],
      "ו'": [5], // Friday
      "ו": [5],
      "שבת": [6], // Saturday
      "ש'": [6],
      "ש": [6],
      "מוצ\"ש": [6], // Saturday night (treat as Saturday)
    };

    // Split by comma to get different day ranges
    const parts = normalizedHours.split(",").map(p => p.trim());

    for (const part of parts) {
      // Find which day range this part refers to
      let dayNumbers: number[] | null = null;
      let timeString = "";

      for (const [dayKey, days] of Object.entries(dayRanges)) {
        if (part.startsWith(dayKey)) {
          dayNumbers = days;
          // Extract time part after the colon
          const colonIndex = part.indexOf(":");
          if (colonIndex !== -1) {
            timeString = part.substring(colonIndex + 1).trim();
          }
          break;
        }
      }

      // If this day range matches today and we found time info
      if (dayNumbers && dayNumbers.includes(currentDay) && timeString) {
        // Check if closed
        if (timeString.toLowerCase().includes("סגור") || timeString.toLowerCase().includes("closed")) {
          return false;
        }

        // Parse time range (e.g., "07:00–21:00")
        const timeRangeMatch = timeString.match(/(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})/);
        if (timeRangeMatch) {
          const openHour = parseInt(timeRangeMatch[1], 10);
          const openMinute = parseInt(timeRangeMatch[2], 10);
          const closeHour = parseInt(timeRangeMatch[3], 10);
          const closeMinute = parseInt(timeRangeMatch[4], 10);

          const openTime = openHour * 100 + openMinute;
          const closeTime = closeHour * 100 + closeMinute;

          // Handle ranges that cross midnight (e.g., "22:00-02:00")
          if (closeTime <= openTime) {
            return currentTime >= openTime || currentTime < closeTime;
          }
          return currentTime >= openTime && currentTime <= closeTime;
        }
      }
    }

    // If no match found for today, default to closed (safer assumption)
    return false;
  } catch (error) {
    // On any parsing error, default to closed (safer assumption)
    console.warn("Error parsing opening hours string:", error);
    return false;
  }
}
