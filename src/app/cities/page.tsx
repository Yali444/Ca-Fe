import type { Metadata } from "next";
import Link from "next/link";

import { getAllCities } from "@/lib/cafe-lookup";
import { cityUrl } from "@/lib/structured-data";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.ca-fe.xyz";
const aran = { fontFamily: "var(--font-aran), sans-serif" } as const;

export const metadata: Metadata = {
  title: "בתי קפה לפי עיר",
  description:
    "רשימת הערים עם בתי קפה ספיישלטי בישראל — בחרו עיר כדי לגלות את בתי הקפה ובתי הקלייה המומלצים בה.",
  alternates: { canonical: `${siteUrl}/cities` },
};

export default function CitiesPage() {
  const cities = getAllCities();

  return (
    <main
      id="main"
      dir="rtl"
      className="min-h-screen bg-surface dark:bg-[#0B1120]"
      style={aran}
    >
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <nav className="text-sm text-muted-foreground">
            <Link href="/" className="font-medium text-[#0071E3] hover:underline dark:text-blue-300">
              בתי קפה ספיישלטי
            </Link>
            <span> / בתי קפה לפי עיר</span>
          </nav>
          <ThemeToggle />
        </div>

        <header className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">בתי קפה לפי עיר</h1>
          <p className="mt-1 text-base text-slate-600 dark:text-zinc-400">
            בחרו עיר כדי לגלות את בתי הקפה ובתי הקלייה המומלצים בה.
          </p>
        </header>

        <ul className="flex flex-wrap gap-3">
          {cities.map(({ city, count }) => (
            <li key={city}>
              <Link
                href={cityUrl("", city)}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              >
                {city}
                <span className="tabular-nums text-muted-foreground">{count}</span>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-8 text-sm text-muted-foreground">
          מחפשים לפי אופי המקום?{" "}
          <Link href="/themes" className="font-medium text-[#0071E3] hover:underline dark:text-blue-300">
            בתי קפה לפי נושא
          </Link>
        </p>
      </div>
    </main>
  );
}
