"use client";

import { useEffect } from "react";
import Link from "next/link";

const aran = { fontFamily: "var(--font-aran), sans-serif" } as const;

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-surface p-8 dark:bg-[#0B1120]"
    >
      <div className="max-w-md text-center">
        <h1 className="mb-4 text-2xl font-bold text-foreground" style={aran}>
          משהו השתבש
        </h1>
        <p className="mb-6 text-muted-foreground" style={aran}>
          אירעה שגיאה בטעינת העמוד. אפשר לנסות שוב או לחזור למפה.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-[#0071E3] px-6 py-3 text-white transition-colors hover:bg-[#0062c4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3]"
            style={aran}
          >
            נסה שוב
          </button>
          <Link
            href="/"
            className="rounded-lg border border-black/10 px-6 py-3 text-foreground transition-colors hover:bg-white dark:border-slate-700 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3]"
            style={aran}
          >
            חזרה למפה
          </Link>
        </div>
      </div>
    </main>
  );
}
