import { NextResponse } from "next/server";
import {
  getIsraelToday,
  getIsraelTomorrow,
  isRelevantSpecialDay,
  type SpecialDay,
} from "@/lib/special-days";

/**
 * Server-side proxy to the public Hebcal calendar API. Returns the relevant
 * Israeli special days (holidays / memorial days) for today and tomorrow so the
 * client can show an "hours may differ" notice. No API key is required.
 *
 * Mirrors the geocode route: the upstream call is cached, and any failure
 * degrades gracefully to empty arrays so a Hebcal outage never breaks the app.
 */

type HebcalItem = {
  title?: string;
  date?: string;
  category?: string;
  subcat?: string;
};

export async function GET() {
  const today = getIsraelToday();
  const tomorrow = getIsraelTomorrow();

  // maj/min/mod = major/minor/modern holidays; i=on → Israel scheme;
  // lg=he → Hebrew titles. Window is just today..tomorrow.
  const url =
    `https://www.hebcal.com/hebcal?v=1&cfg=json&maj=on&min=on&mod=on&i=on&lg=he` +
    `&start=${today}&end=${tomorrow}`;

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      // Revalidate hourly — the calendar changes at most once a day.
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return NextResponse.json({ today: [], tomorrow: [] }, { status: 200 });
    }

    const data = (await response.json()) as { items?: HebcalItem[] };
    const items = Array.isArray(data?.items) ? data.items : [];

    const relevant: SpecialDay[] = items
      .filter((item): item is Required<Pick<HebcalItem, "title" | "date">> & HebcalItem =>
        Boolean(item?.title && item?.date),
      )
      .map((item) => ({
        title: item.title!,
        date: item.date!.slice(0, 10),
        category: item.category ?? "",
        subcat: item.subcat,
      }))
      .filter(isRelevantSpecialDay);

    // De-duplicate by title within each day (Hebcal can emit paired markers).
    const dedupe = (days: SpecialDay[]) => {
      const seen = new Set<string>();
      return days.filter((d) => {
        if (seen.has(d.title)) return false;
        seen.add(d.title);
        return true;
      });
    };

    return NextResponse.json(
      {
        today: dedupe(relevant.filter((item) => item.date === today)),
        tomorrow: dedupe(relevant.filter((item) => item.date === tomorrow)),
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      },
    );
  } catch {
    return NextResponse.json({ today: [], tomorrow: [] }, { status: 200 });
  }
}
