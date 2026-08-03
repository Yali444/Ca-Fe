"use client";

import { useMemo } from "react";
import { Icon } from "@/components/ui/Icon";
import type { OpeningHours } from "@/types/place";
import { parseOpeningHoursString } from "@/lib/formatters";
import {
  formatDayGroupLabel,
  groupConsecutiveDays,
  groupContainsCurrentDay,
  isCurrentlyOpen,
} from "@/lib/opening-hours";

interface OpeningHoursDisplayProps {
  openingHours?: OpeningHours | string | null;
  className?: string;
}

export function OpeningHoursDisplay({ openingHours, className = "" }: OpeningHoursDisplayProps) {
  // Parse string-based opening hours to structured format
  const parsedHours = useMemo(() => {
    if (!openingHours) {
      return null;
    }
    if (typeof openingHours === "object") {
      return openingHours;
    }
    return parseOpeningHoursString(openingHours);
  }, [openingHours]);

  // Hooks must run unconditionally, so derive these even when `parsedHours`
  // is null — the early return happens after all hooks have been called.
  const isOpen = useMemo(
    () => (parsedHours ? isCurrentlyOpen(parsedHours) : false),
    [parsedHours],
  );
  const dayGroups = useMemo(
    () => (parsedHours ? groupConsecutiveDays(parsedHours) : []),
    [parsedHours],
  );

  if (!parsedHours) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Open Now Badge */}
      <div className="flex items-center gap-2">
        <Icon name="Clock" className="h-4 w-4 text-[#075985] dark:text-blue-300" />
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
                  ? "font-bold text-amber-600 dark:text-yellow-300"
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
