// Shown by next/dynamic's `loading` while the IsraelCoffeeGuide chunk (and
// everything it pulls in — SkeletonLoader included) is still downloading.
// Deliberately lives outside that chunk's import graph and imports nothing
// heavy (no next/image, no icon library) so it ships in the initial page JS
// and can paint the instant React hydrates — instead of the blank white
// screen that showed previously while ~900KB of JS was still in flight.
export function InitialLoading() {
  return (
    <div
      className="flex h-dvh w-screen items-center justify-center bg-surface dark:bg-[#0B1120]"
      role="status"
      aria-label="טוען"
    >
      <div className="flex items-center gap-2">
        <svg
          className="h-5 w-5 animate-spin text-muted-foreground"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="text-sm font-medium text-muted-foreground" style={{ fontFamily: "var(--font-aran), sans-serif" }}>
          טוען...
        </span>
      </div>
    </div>
  );
}
