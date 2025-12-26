import fs from 'fs';
import path from 'path';

// Day mappings - Hebrew to day keys
const HEBREW_DAY_MAP: Record<string, 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday'> = {
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
const ENGLISH_DAY_MAP: Record<string, 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday'> = {
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
const DAY_KEYS: Array<'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday'> = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'
];

const DAY_INDICES: Record<string, number> = {
  'sunday': 0,
  'monday': 1,
  'tuesday': 2,
  'wednesday': 3,
  'thursday': 4,
  'friday': 5,
  'saturday': 6,
};

type OpeningHoursObject = {
  sunday?: string;
  monday?: string;
  tuesday?: string;
  wednesday?: string;
  thursday?: string;
  friday?: string;
  saturday?: string;
};

interface Cafe {
  id: number | string;
  openingHours?: string | OpeningHoursObject | null;
  name?: string;
  [key: string]: any;
}

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

// Parse opening hours string
function parseOpeningHours(hoursString: string): OpeningHoursObject | null {
  const result: OpeningHoursObject = {};
  
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

// Main migration function
function migrateOpeningHours(inputPath: string, outputPath?: string): { converted: string[]; failed: Array<{ id: string; name: string; hours: string }> } {
  const filePath = path.resolve(inputPath);
  const output = outputPath ? path.resolve(outputPath) : filePath;
  
  console.log(`Reading ${filePath}...`);
  const data: Cafe[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  
  const converted: string[] = [];
  const failed: Array<{ id: string; name: string; hours: string }> = [];
  
  for (const cafe of data) {
    const cafeId = typeof cafe.id === 'number' ? cafe.id.toString() : cafe.id || 'unknown';
    const cafeName = cafe.name || 'Unknown';
    
    // Skip if already an object
    if (typeof cafe.openingHours === 'object' && cafe.openingHours !== null) {
      continue;
    }
    
    // Skip if null or undefined
    if (cafe.openingHours === null || cafe.openingHours === undefined) {
      continue;
    }
    
    // Skip if not a string
    if (typeof cafe.openingHours !== 'string') {
      continue;
    }
    
    // Try to parse
    const parsed = parseOpeningHours(cafe.openingHours);
    
    if (parsed && Object.keys(parsed).length > 0) {
      cafe.openingHours = parsed;
      converted.push(cafeId);
    } else {
      failed.push({ id: cafeId, name: cafeName, hours: cafe.openingHours });
    }
  }
  
  // Write back to file
  console.log(`Writing to ${output}...`);
  fs.writeFileSync(output, JSON.stringify(data, null, 2), 'utf-8');
  
  return { converted, failed };
}

// Run migration
const inputFile = path.join(process.cwd(), 'public/data/cafes.json');

console.log('Starting smart opening hours migration...\n');
const result = migrateOpeningHours(inputFile);

console.log('\n=== Migration Results ===');
console.log(`✅ Successfully converted: ${result.converted.length} entries`);
if (result.converted.length > 0) {
  console.log(`   IDs: ${result.converted.slice(0, 20).join(', ')}${result.converted.length > 20 ? '...' : ''}`);
}

console.log(`\n❌ Failed to convert: ${result.failed.length} entries`);
if (result.failed.length > 0) {
  console.log('\nFailed entries (first 10):');
  result.failed.slice(0, 10).forEach(({ id, name, hours }) => {
    console.log(`   ID ${id} (${name}): "${hours.substring(0, 60)}${hours.length > 60 ? '...' : ''}"`);
  });
  if (result.failed.length > 10) {
    console.log(`   ... and ${result.failed.length - 10} more`);
  }
}

console.log('\n✅ Migration complete!');











