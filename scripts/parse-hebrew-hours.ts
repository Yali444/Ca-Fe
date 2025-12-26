// Script to parse Hebrew opening hours strings into structured format

interface OpeningHours {
  sunday?: string;
  monday?: string;
  tuesday?: string;
  wednesday?: string;
  thursday?: string;
  friday?: string;
  saturday?: string;
}

// Hebrew day abbreviations mapping
const dayMap: Record<string, keyof OpeningHours> = {
  "א'": "sunday",
  "ב'": "monday",
  "ג'": "tuesday",
  "ד'": "wednesday",
  "ה'": "thursday",
  "ו'": "friday",
  "ש'": "saturday",
  "שבת": "saturday",
};

const dayOrder = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function parseHebrewHours(hoursString: string): OpeningHours {
  const result: OpeningHours = {};
  
  // Split by comma to get individual day ranges
  const parts = hoursString.split(",").map(p => p.trim());
  
  for (const part of parts) {
    // Check if it's a closed day
    if (part.includes("סגור")) {
      const dayMatch = part.match(/(א'|ב'|ג'|ד'|ה'|ו'|ש'|שבת)/);
      if (dayMatch) {
        const dayKey = dayMap[dayMatch[1]];
        if (dayKey) {
          result[dayKey] = "";
        }
      }
      continue;
    }
    
    // Match pattern like "א'-ה': 08:00–19:00" or "ו': 08:00–15:00"
    const rangeMatch = part.match(/([א-ת']+)(?:-([א-ת']+))?:\s*(\d{2}:\d{2})[–-](\d{2}:\d{2})/);
    if (rangeMatch) {
      const startDay = rangeMatch[1];
      const endDay = rangeMatch[2] || startDay;
      const startTime = rangeMatch[3];
      const endTime = rangeMatch[4];
      const timeRange = `${startTime}-${endTime}`;
      
      const startDayKey = dayMap[startDay];
      const endDayKey = dayMap[endDay];
      
      if (startDayKey && endDayKey) {
        const startIdx = dayOrder.indexOf(startDayKey);
        const endIdx = dayOrder.indexOf(endDayKey);
        
        if (startIdx !== -1 && endIdx !== -1) {
          for (let i = startIdx; i <= endIdx; i++) {
            result[dayOrder[i] as keyof OpeningHours] = timeRange;
          }
        }
      }
    }
  }
  
  return result;
}

// Test the function
const testCases = [
  "א'-ה': 08:00–19:00, ו': 08:00–15:00, שבת: סגור",
  "א'-ה': 07:30–19:00, ו': 07:30–14:00, שבת: סגור",
  "א'-ה': 07:30–20:00, ו': 07:30–15:30, שבת: 08:00–16:00",
  "א'-ה': 07:45–18:00, ו': 07:45–15:00, שבת: סגור",
  "א'-ה': 09:00–21:00, ו': 09:00–15:00, שבת: סגור",
  "א'-ה': 08:30–22:30, ו': 08:30–16:30, שבת: 10:00–16:00",
  "א'-ה': 07:30–22:00, ו': 07:30–16:00, שבת: 08:00–22:00",
  "א'-ה': 07:30–20:30, ו': 07:30–16:00, שבת: 08:15–22:00",
  "א'-ה': 08:00–18:30, ו': 09:00–14:30, שבת: 09:30–15:30",
  "א'-ה': 07:30–21:00, ו': 07:30–16:00, שבת: 08:00–21:00",
  "א'-ה': 07:30–21:00, ו': 08:00–18:00, שבת: 08:00–21:00",
  "א'-ה': 07:30–20:00, ו': 07:30–16:00, שבת: 08:00–20:00",
  "א'-ה': 07:30–20:00, ו': 07:30–16:00, שבת: סגור",
  "א'-ה': 07:30–19:30, ו': 07:30–17:00, שבת: סגור",
  "א'-ה': 07:30–22:00, ו': 07:30–16:00, שבת: 09:00–22:00",
  "א'-ה': 07:00–19:00, ו': 07:00–17:00, שבת: סגור",
  "א'-ה': 07:00–21:00, ו': 07:00–16:00, שבת: 08:00–21:00",
  "א'-ו': 08:00–16:00, שבת: סגור",
  "א'-ש': 09:00–21:00",
];

console.log("Testing parseHebrewHours function:");
testCases.forEach((test, idx) => {
  console.log(`\nTest ${idx + 1}: "${test}"`);
  console.log(JSON.stringify(parseHebrewHours(test), null, 2));
});

export { parseHebrewHours };









