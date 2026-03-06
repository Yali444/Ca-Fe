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
  'מוצש': 'saturday', // מוצאי שבת (Saturday night)
  'מוצ"ש': 'saturday',
  'ראשון': 'sunday',
  'שני': 'monday',
  'שלישי': 'tuesday',
  'רביעי': 'wednesday',
  'חמישי': 'thursday',
  'שישי': 'friday',
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
  openingHours?: string | OpeningHoursObject;
  [key: string]: any;
}

// Normalize time format (handle en-dash, em-dash, regular dash)
function normalizeTime(timeStr: string): string {
  return timeStr
    .replace(/[–—]/g, '-')  // Replace en-dash and em-dash with regular dash
    .trim();
}

// Parse a day range like "א-ה" or "ב-ה"
function parseDayRange(rangeStr: string): number[] {
  const parts = rangeStr.split(/[-־]/); // Handle both regular dash and Hebrew dash
  if (parts.length !== 2) return [];
  
  const start = parts[0].trim().replace(/['''״"]/g, ''); // Remove all types of quotes
  const end = parts[1].trim().replace(/['''״"]/g, '');
  
  const startDay = HEBREW_DAY_MAP[start];
  const endDay = HEBREW_DAY_MAP[end];
  
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

// Parse a single day like "א" or "שבת" or "מוצש"
function parseSingleDay(dayStr: string): number | null {
  const clean = dayStr.trim().replace(/['''״"]/g, '');
  const dayKey = HEBREW_DAY_MAP[clean];
  if (!dayKey) {
    return null;
  }
  return DAY_INDICES[dayKey];
}

// Check if string means "closed"
function isClosed(str: string): boolean {
  const closed = str.toLowerCase();
  return closed.includes('סגור') || closed.includes('closed') || closed === 'סגור';
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
    // Match pattern like "א'-ה': 07:00–19:00" or "שבת: סגור"
    const match = part.match(/^(.+?):\s*(.+)$/);
    if (!match) {
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
    const allWeekMatch = dayPart.match(/^א'[\s-־]*ש'?$/);
    if (allWeekMatch) {
      // Apply to all days
      for (let i = 0; i < 7; i++) {
        result[DAY_KEYS[i]] = normalizedTime;
      }
      continue;
    }
    
    // Parse day part - remove quotes first
    const cleanDayPart = dayPart.replace(/['''״"]/g, '').trim();
    
    if (cleanDayPart.includes('-') || cleanDayPart.includes('־')) {
      // Range like "א-ה" or "ב-ה"
      const indices = parseDayRange(cleanDayPart);
      if (indices.length > 0) {
        for (const index of indices) {
          result[DAY_KEYS[index]] = normalizedTime;
        }
      }
    } else {
      // Single day like "א" or "שבת" or "מוצש"
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
function migrateOpeningHours(inputPath: string, outputPath?: string): { converted: string[]; failed: string[] } {
  const filePath = path.resolve(inputPath);
  const output = outputPath ? path.resolve(outputPath) : filePath;
  
  console.log(`Reading ${filePath}...`);
  const data: Cafe[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  
  const converted: string[] = [];
  const failed: string[] = [];
  
  for (const cafe of data) {
    const cafeId = typeof cafe.id === 'number' ? cafe.id.toString() : cafe.id || 'unknown';
    
    // Skip if already an object
    if (typeof cafe.openingHours === 'object' && cafe.openingHours !== null) {
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
      failed.push(cafeId);
      // Only log first few failures to avoid spam
      if (failed.length <= 5) {
        console.warn(`Failed to parse opening hours for ID ${cafeId}: "${cafe.openingHours.substring(0, 50)}..."`);
      }
    }
  }
  
  // Write back to file
  console.log(`Writing to ${output}...`);
  fs.writeFileSync(output, JSON.stringify(data, null, 2), 'utf-8');
  
  return { converted, failed };
}

// Run migration
const inputFile = path.join(process.cwd(), 'public/data/cafes.json');

console.log('Starting opening hours migration...\n');
const result = migrateOpeningHours(inputFile);

console.log('\n=== Migration Results ===');
console.log(`✅ Successfully converted: ${result.converted.length} entries`);
if (result.converted.length > 0) {
  console.log(`   IDs: ${result.converted.slice(0, 20).join(', ')}${result.converted.length > 20 ? '...' : ''}`);
}

console.log(`\n❌ Failed to convert: ${result.failed.length} entries`);
if (result.failed.length > 0) {
  console.log(`   IDs: ${result.failed.join(', ')}`);
}

console.log('\nMigration complete!');



















