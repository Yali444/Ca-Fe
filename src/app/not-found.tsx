import Link from "next/link";

const aran = { fontFamily: "var(--font-aran), sans-serif" } as const;

export default function NotFound() {
  return (
    <main
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-surface p-8 dark:bg-[#0B1120]"
    >
      <div className="max-w-md text-center">
        <h1 className="mb-4 text-3xl font-bold text-foreground" style={aran}>
          העמוד לא נמצא
        </h1>
        <p className="mb-6 text-muted-foreground" style={aran}>
          נראה שהקישור שגוי או שהעמוד הוזז. אפשר לחזור למפת בתי הקפה.
        </p>
        <Link
          href="/"
          className="inline-block rounded-lg bg-[#0071E3] px-6 py-3 text-white transition-colors hover:bg-[#0062c4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3]"
          style={aran}
        >
          חזרה למפה
        </Link>
      </div>
    </main>
  );
}
