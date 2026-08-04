import type { Metadata } from "next";
import Link from "next/link";

import { getThemesWithCounts } from "@/lib/themes";
import { themeUrl } from "@/lib/structured-data";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.ca-fe.xyz";
const aran = { fontFamily: "var(--font-aran), sans-serif" } as const;

export const metadata: Metadata = {
  title: "בתי קפה לפי נושא",
  description:
    "גלו בתי קפה לפי נושא — בתי קלייה, מקומות שמוכרים פולי קפה, ובארים למאצ׳ה.",
  alternates: { canonical: `${siteUrl}/themes` },
};

export default function ThemesPage() {
  const themes = getThemesWithCounts();

  return (
    <main
      id="main"
      dir="rtl"
      className="min-h-screen bg-surface dark:bg-[#0B1120]"
      style={aran}
    >
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <nav className="mb-4 text-sm text-muted-foreground">
          <Link href="/" className="font-medium text-[#0071E3] hover:underline dark:text-blue-300">
            בתי קפה ספיישלטי
          </Link>
          <span> / בתי קפה לפי נושא</span>
        </nav>

        <header className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">בתי קפה לפי נושא</h1>
          <p className="mt-1 text-base text-slate-600 dark:text-zinc-400">
            בחרו נושא כדי לגלות את המקומות המתאימים.
          </p>
        </header>

        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {themes.map(({ theme, count }) => (
            <li key={theme.slug}>
              <Link
                href={themeUrl("", theme.slug)}
                className="flex h-full flex-col gap-1 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3] dark:border-zinc-800 dark:bg-zinc-900"
              >
                <span className="text-lg font-bold text-foreground">
                  {theme.heading}
                </span>
                <span className="text-sm text-muted-foreground">{count} מקומות</span>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-8 text-sm text-muted-foreground">
          מחפשים לפי מיקום?{" "}
          <Link href="/cities" className="font-medium text-[#0071E3] hover:underline dark:text-blue-300">
            בתי קפה לפי עיר
          </Link>
        </p>
      </div>
    </main>
  );
}
