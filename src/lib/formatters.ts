export const instagramUrl = (handle?: string | null) =>
  handle ? `https://instagram.com/${handle.replace(/^@/, "")}` : null;

/**
 * Parses Hebrew opening hours string and checks if the place is currently open
 * Format examples:
 * - "א'-ה': 07:00–21:00, ו': 07:00–16:00, שבת: 08:00–21:00"
 * - "א'-ה': 08:00–18:00, ו': 08:00–15:00, שבת: סגור"
 * 
 * @param openingHoursString - Hebrew opening hours string
 * @returns boolean - true if open, false if closed, true if parsing fails (defaults to open)
 */
export function isPlaceOpen(openingHoursString: string | null | undefined): boolean {
  // Default to closed if no hours provided (safer assumption)
  if (!openingHoursString || openingHoursString.trim() === "") {
    return false;
  }

  try {
    // Use client-side time only (ensures browser timezone is used)
    if (typeof window === "undefined") {
      // Server-side: default to closed to avoid hydration mismatches
      return false;
    }
    
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
    const currentTime = now.getHours() * 100 + now.getMinutes(); // HHMM format for easy comparison

    // Day mappings
    const dayRanges: { [key: string]: number[] } = {
      "א'-ש'": [0, 1, 2, 3, 4, 5, 6], // Sunday-Saturday (all week)
      "א-ש": [0, 1, 2, 3, 4, 5, 6], // Sunday-Saturday (all week)
      "א'-ה'": [0, 1, 2, 3, 4], // Sunday-Thursday
      "א-ה": [0, 1, 2, 3, 4],
      "א'-ו'": [0, 1, 2, 3, 4, 5], // Sunday-Friday
      "א-ו": [0, 1, 2, 3, 4, 5],
      "ו'": [5], // Friday
      "ו": [5],
      "שבת": [6], // Saturday
    };

    // Split by comma to get different day ranges
    const parts = openingHoursString.split(",").map(p => p.trim());

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

          // Check if current time is within opening hours
          return currentTime >= openTime && currentTime <= closeTime;
        }
      }
    }

    // If no match found for today, default to closed (safer assumption)
    return false;
  } catch (error) {
    // On any parsing error, default to closed (safer assumption)
    console.warn("Error parsing opening hours:", error);
    return false;
  }
}
