'use client';

import { useMemo, useState, useEffect } from "react";
import { QuickFilters } from "@/components/QuickFilters";
import { RoasteryCard } from "@/components/RoasteryCard";
import { RoasteryMap } from "@/components/map/RoasteryMap";
import { transformCafeToRoastery, type CafeRaw } from "@/data/roasteries";
import type { QuickFilterKey, Roastery } from "@/types/roastery";

export function RoasteryExplorer() {
  const [searchQuery, setSearchQuery] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilterKey>("all");
  const [roasteries, setRoasteries] = useState<Roastery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch cafes data from JSON file
        const response = await fetch("/data/cafes.json");
        if (!response.ok) {
          throw new Error(`Failed to fetch cafes data: ${response.statusText}`);
        }

        const cafesRaw: CafeRaw[] = await response.json();

        if (cancelled) return;

        // Transform cafes to roasteries format using the helper function
        const transformed = cafesRaw.map(transformCafeToRoastery);

        if (!cancelled) {
          setRoasteries(transformed);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error loading roasteries:", err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load roasteries");
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (loading || roasteries.length === 0) return [];
    const ROASTERIES = roasteries;
    const bySearch = (roastery: Roastery) => {
      if (!searchQuery.trim()) return true;
      const term = searchQuery.toLowerCase();
      return [
        roastery.name,
        roastery.city ?? "",
        roastery.description,
        roastery.brewMethods.join(" "),
        roastery.vibeTags.join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    };

    const byQuickFilter = (roastery: Roastery) => {
      switch (quickFilter) {
        case "filter":
          return roastery.brewMethods.some((method) => method.toLowerCase().includes("filter"));
        case "espresso":
          return roastery.brewMethods.some((method) => method.toLowerCase().includes("espresso"));
        default:
          return true;
      }
    };

    return ROASTERIES.filter((roastery) => bySearch(roastery) && byQuickFilter(roastery));
  }, [quickFilter, searchQuery, roasteries, loading]);

  return (
    <div className="space-y-16">
      <section className="space-y-6">
        <p className="text-sm uppercase tracking-[0.4em] text-coffee-ink/60">Israel Specialty Coffee</p>
        <h1 className="text-4xl font-semibold text-coffee-ink sm:text-5xl">
          מדריך ביתי לרוסטריות עצמאיות וקפה ספשיילטי בישראל
        </h1>
        <p className="max-w-2xl text-lg text-coffee-ink/80">
          מתחילים בתל אביב–יפו, רמת גן וערד, ומתרחבים לכל הארץ. סינון לפי שיטות חליטה ו-Vibe
          כדי למצוא את המקום הבא לקפה מעולה.
        </p>
      </section>

      <section className="space-y-4 rounded-3xl bg-white/60 p-6 shadow-lg shadow-black/5">
        <label className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-inner focus-within:ring-2 focus-within:ring-coffee-accent/40">
          <span aria-hidden className="text-xl">🔍</span>
          <input
            type="search"
            placeholder="חפשו לפי שם, עיר או vibe"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="w-full bg-transparent text-base text-coffee-ink placeholder:text-coffee-ink/40 focus:outline-none"
          />
        </label>
        <QuickFilters active={quickFilter} onSelect={setQuickFilter} />
        <p className="text-sm text-coffee-ink/60">
          {filtered.length} רוסטריות מתאימות לסינון הנוכחי
        </p>
      </section>

      {loading ? (
        <section className="rounded-3xl bg-white/60 p-6 text-center">
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="h-8 w-8 border-4 border-coffee-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-coffee-ink/60 text-sm">טוען נתונים...</p>
          </div>
        </section>
      ) : error ? (
        <section className="rounded-3xl bg-white/60 p-6 text-center">
          <p className="text-red-600 mb-2">שגיאה בטעינת הנתונים</p>
          <p className="text-coffee-ink/60 text-sm">{error}</p>
        </section>
      ) : (
        <section className="grid gap-6 md:grid-cols-2">
          {filtered.map((roastery) => (
            <RoasteryCard key={roastery.id} roastery={roastery} />
          ))}
          {filtered.length === 0 && (
            <p className="rounded-3xl bg-white/60 p-6 text-center text-coffee-ink/60">
              אין תוצאות. נסו לשנות את החיפוש או לבטל את הפילטר.
            </p>
          )}
        </section>
      )}

      {!loading && (
        <section className="space-y-4">
          <div>
            <p className="text-sm uppercase tracking-[0.4em] text-coffee-ink/60">Map</p>
            <h2 className="text-3xl font-semibold text-coffee-ink">מפה חיה (בקרוב)</h2>
            <p className="text-sm text-coffee-ink/70">
              נוסיף קואורדינטות לכל רוסטריה בהמשך כדי לאפשר חיפוש מרחבי ולראות מה פתוח סביבך.
            </p>
          </div>
          <RoasteryMap roasteries={filtered} />
        </section>
      )}

      <section className="space-y-4 rounded-3xl bg-coffee-card/60 p-8 shadow-lg shadow-black/5">
        <h3 className="text-2xl font-semibold text-coffee-ink">שאלו אותנו / הציעו מקום</h3>
        <p className="text-coffee-ink/80">
          האפליקציה במצב בטא וגדלה בזכות הקהילה. שלחו לנו רוסטריות חדשות, שעות מעודכנות או צילומים
          לכתובת <a className="text-coffee-accent underline" href="mailto:hello@cafe.guide">hello@cafe.guide</a>.
        </p>
      </section>
    </div>
  );
}
