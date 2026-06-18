import type { Metadata } from "next";
import Link from "next/link";

import { getAllCities } from "@/lib/cafe-lookup";
import { cityUrl } from "@/lib/structured-data";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.ca-fe.xyz";
const aran = { fontFamily: "var(--font-aran), sans-serif" } as const;

export const metadata: Metadata = {
  title: "בתי קפה לפי עיר | מדריך הקפה של ישראל",
  description:
    "רשימת הערים במדריך הקפה של ישראל — בחרו עיר כדי לגלות את בתי הקפה ובתי הקלייה המומלצים בה.",
  alternates: { canonical: `${siteUrl}/cities` },
};

export default function CitiesPage() {
  const cities = getAllCities();

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-gradient-to-br from-[#E0F2FE] via-[#F0F9FF] to-[#DBEAFE] dark:from-[#0B1120] dark:via-[#0B1120] dark:to-[#0B1120]"
      style={aran}
    >
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <nav className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          <Link href="/" className="font-medium text-[#0071E3] hover:underline dark:text-blue-300">
            מדריך הקפה
          </Link>
          <span> / בתי קפה לפי עיר</span>
        </nav>

        <header className="mb-6">
          <h1 className="text-3xl font-bold text-[#0C4A6E] dark:text-slate-100">בתי קפה לפי עיר</h1>
          <p className="mt-1 text-base text-slate-600 dark:text-zinc-400">
            בחרו עיר כדי לגלות את בתי הקפה ובתי הקלייה המומלצים בה.
          </p>
        </header>

        <ul className="flex flex-wrap gap-3">
          {cities.map(({ city, count }) => (
            <li key={city}>
              <Link
                href={cityUrl("", city)}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-[#0C4A6E] shadow-sm transition-colors hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-slate-200 dark:hover:bg-zinc-800"
              >
                {city}
                <span className="tabular-nums text-slate-400 dark:text-slate-500">{count}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
