"use client";

import React, { useMemo } from "react";
import { Clock } from "lucide-react";
import type { OpeningHours } from "@/types/place";
import { parseOpeningHoursString } from "@/lib/formatters";

interface OpeningHoursDisplayProps {
  openingHours?: OpeningHours | string | null;
  className?: string;
}

// Day names in Hebrew
const DAYS: Array<{ key: keyof OpeningHours; label: string }> = [
  { key: "sunday", label: "ראשון" },
  { key: "monday", label: "שני" },
  { key: "tuesday", label: "שלישי" },
  { key: "wednesday", label: "רביעי" },
  { key: "thursday", label: "חמישי" },
  { key: "friday", label: "שישי" },
  { key: "saturday", label: "שבת" },
];

// Parse time string (e.g., "18:00-23:30") to hours and minutes
function parseTime(timeStr: string): { hour: number; minute: number } | null {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return {
    hour: parseInt(match[1], 10),
    minute: parseInt(match[2], 10),
  };
}

// Check if a time range includes the current time
function isTimeInRange(range: string, currentHour: number, currentMinute: number): boolean {
  // Handle ranges that cross midnight (e.g., "22:00-02:00" or "12:00-00:00")
  const parts = range.split("-");
  if (parts.length !== 2) return false;

  const start = parseTime(parts[0].trim());
  const end = parseTime(parts[1].trim());
  if (!start || !end) return false;

  const currentTime = currentHour * 60 + currentMinute;
  const startTime = start.hour * 60 + start.minute;
  const endTime = end.hour * 60 + end.minute;

  // Handle ranges that cross midnight (end time is earlier than or equal to start time)
  // Examples: "22:00-02:00", "12:00-00:00", "12:00-00:30"
  if (endTime <= startTime) {
    // Range crosses midnight
    // For "12:00-00:00": open from 12:00 to end of day (including midnight, which is 0 minutes = start of next day)
    // For "12:00-00:30": open from 12:00 to 00:30 next day
    // For "22:00-02:00": open from 22:00 to 02:00 next day
    return currentTime >= startTime || (endTime > 0 && currentTime < endTime);
  } else {
    // Normal range within same day
    return currentTime >= startTime && currentTime <= endTime;
  }
}

// Check if the cafe is currently open
function isCurrentlyOpen(openingHours: OpeningHours): boolean {
  const now = new Date();
  const dayIndex = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  const dayKey = DAYS[dayIndex].key;
  const hoursForDay = openingHours[dayKey];

  if (!hoursForDay) return false;

  return isTimeInRange(hoursForDay, currentHour, currentMinute);
}

// Group consecutive days with identical hours
type DayGroup = {
  startIndex: number;
  endIndex: number;
  hours: string;
};

function groupConsecutiveDays(openingHours: OpeningHours): DayGroup[] {
  const groups: DayGroup[] = [];
  let currentGroup: DayGroup | null = null;

  DAYS.forEach((day, index) => {
    const hours = openingHours[day.key];
    
    if (!hours) {
      // No hours for this day, finalize current group if exists
      if (currentGroup) {
        groups.push(currentGroup);
        currentGroup = null;
      }
      return;
    }

    if (currentGroup && currentGroup.hours === hours) {
      // Same hours as previous day, extend the group
      currentGroup.endIndex = index;
    } else {
      // Different hours or start of new group
      if (currentGroup) {
        groups.push(currentGroup);
      }
      currentGroup = {
        startIndex: index,
        endIndex: index,
        hours,
      };
    }
  });

  // Don't forget to add the last group
  if (currentGroup) {
    groups.push(currentGroup);
  }

  return groups;
}

// Format day group label (e.g., "ראשון", "ראשון - שני")
function formatDayGroupLabel(startIndex: number, endIndex: number): string {
  if (startIndex === endIndex) {
    return DAYS[startIndex].label;
  }
  return `${DAYS[startIndex].label} - ${DAYS[endIndex].label}`;
}

// Check if a day group contains the current day
function groupContainsCurrentDay(startIndex: number, endIndex: number): boolean {
  const now = new Date();
  const currentDayIndex = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  return currentDayIndex >= startIndex && currentDayIndex <= endIndex;
}

export function OpeningHoursDisplay({ openingHours, className = "" }: OpeningHoursDisplayProps) {
  // Parse string-based opening hours to structured format
  const parsedHours = useMemo(() => {
    if (!openingHours) {
      return null;
    }
    
    // If it's already an object, use it directly
    if (typeof openingHours === "object" && openingHours !== null) {
      return openingHours;
    }
    
    // If it's a string, try to parse it
    if (typeof openingHours === "string") {
      return parseOpeningHoursString(openingHours);
    }
    
    return null;
  }, [openingHours]);

  // Don't render if we couldn't parse the opening hours
  if (!parsedHours) {
    return null;
  }

  const isOpen = useMemo(() => isCurrentlyOpen(parsedHours), [parsedHours]);
  const dayGroups = useMemo(() => groupConsecutiveDays(parsedHours), [parsedHours]);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Open Now Badge */}
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-[#075985] dark:text-blue-300" />
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
            isOpen
              ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200"
              : "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200"
          }`}
          style={{ fontFamily: "var(--font-aran), sans-serif" }}
        >
          {isOpen ? "פתוח עכשיו" : "סגור עכשיו"}
        </span>
      </div>

      {/* Weekly Hours List - Grouped */}
      <div className="space-y-1.5">
        {dayGroups.map((group, index) => {
          const isCurrentDay = groupContainsCurrentDay(group.startIndex, group.endIndex);
          const label = formatDayGroupLabel(group.startIndex, group.endIndex);

          return (
            <div
              key={`${group.startIndex}-${group.endIndex}-${index}`}
              className={`flex items-center justify-between text-xs ${
                isCurrentDay
                  ? "font-bold text-yellow-400 dark:text-yellow-300"
                  : "text-[#075985] dark:text-blue-300"
              }`}
              style={{ fontFamily: "var(--font-aran), sans-serif" }}
            >
              <span className={isCurrentDay ? "font-bold" : "font-medium"}>{label}:</span>
              <span className={isCurrentDay ? "font-bold" : ""}>{group.hours}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
