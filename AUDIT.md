# Ca-Fe — Codebase & UI/UX Audit

**Date:** 2026-08-03 · **Scope:** full repository (`src/`, `public/`, `scripts/`, config) · **Method:** static analysis of every route, component, hook, and lib module; all cited `file:line` references verified against the working tree.

**What this product is:** a Hebrew-language, RTL, map-first directory of 151 specialty coffee shops and roasteries in Israel. Next.js 16 (App Router) + React 19 + Tailwind 4 (CSS-first) + Supabase (community reviews) + Leaflet/MarkerCluster, deployed on Vercel. The interactive app is a single client-side shell (`src/components/IsraelCoffeeGuide.tsx`) mounted with `ssr: false`, backed by a parallel statically-generated SEO layer (`/cafe/[id]`, `/city/[city]`, `/theme/[slug]`, sitemap, JSON-LD, dynamic OG images).

---

## 1. Executive Summary

Ca-Fe shows genuinely strong engineering instincts in specific places — a deliberate, well-commented SEO/SSG layer with JSON-LD and bidi-corrected dynamic OG images, correctly lazy-loaded Leaflet and Supabase bundles, a properly focus-trapped detail modal, and some of the best contextual empty states you'll see in an indie project. Those strengths are undermined by three systemic problems: **a 1,176-line client-only monolith** (`IsraelCoffeeGuide.tsx`) sitting on top of **two parallel data layers with three incompatible ID schemes**, a set of **systematic accessibility and dark-mode defects** (unlabeled forms, a tabbable off-screen drawer, contrast failures down to ~1.5:1, a light gradient that survives into dark mode), and **~2,300 lines of dead code** plus unused dependencies that inflate the bundle, the payload, and maintenance cost. On the product side, the coffee-domain data model is far thinner than the audience deserves — three canonical brew methods, zero structured data about origin, roast, process, or which roaster is on bar — which is the single biggest gap between "café list" and the world-class specialty guide this wants to be.

---

## 2. Critical Fixes (High Priority)

### 2.1 Accessibility — WCAG failures in the core journey

#### a) The primary search input has no accessible name

**Problem:** `src/components/Sidebar.tsx:337-346` — the app's main input has only a `placeholder` (`"חפש בית קפה או כתובת..."`). Placeholders are not accessible names (and disappear on input). The mobile overlay got this right (`MobileSearchOverlay.tsx:99` has `aria-label`); the desktop path was missed. Screen-reader users hear "edit text, blank" on the single most important control. — WCAG 4.1.2 / 3.3.2.

**Fix:**
```tsx
<input
  type="text"
  aria-label="חיפוש בית קפה או כתובת"
  placeholder="חפש בית קפה או כתובת..."
  ...
/>
```

#### b) Review-form labels are not associated with their fields

**Problem:** `src/components/DetailPanel.tsx:480-535` — three `<label>` elements (שם פרטי / דירוג / טקסט חופשי) have no `htmlFor`, and the `input`/`select`/`textarea` have no `id`. Labels are announced as plain text; the fields are anonymous; tapping a label doesn't focus its field (a real mobile usability loss, not just a screen-reader one).

**Fix (pattern, apply to all three):**
```tsx
<label htmlFor="review-name" className="...">שם פרטי</label>
<input id="review-name" type="text" ... />
```

#### c) `aria-hidden` on a still-focusable button

**Problem:** `src/components/Sidebar.tsx:176-184` — the hamburger gets `aria-hidden={menuButtonHidden}` plus `opacity-0 pointer-events-none`, but it stays in the tab order. `aria-hidden="true"` on a focusable element is a direct axe `aria-hidden-focus` violation: keyboard focus lands on an element assistive tech says doesn't exist.

**Fix:** use `inert` (or `tabIndex={-1}` + `disabled`) instead of `aria-hidden`:
```tsx
<LiquidButton
  onClick={onToggleOpen}
  aria-label={sidebarOpen ? "סגור תפריט" : "פתח תפריט"}
  aria-expanded={sidebarOpen}
  inert={menuButtonHidden || undefined}
  className={...}
>
```

#### d) The closed mobile drawer remains fully tabbable off-screen

**Problem:** `src/components/Sidebar.tsx:205-222` — the sidebar is hidden only by `transform: translateX(100%)` (framer-motion `animate={{ x: ... }}`). It is never unmounted, never `display:none`, never `inert`. With the drawer closed on mobile, ~15 interactive controls (search, clear, nav buttons, filter chips) remain in the tab order, off-screen. The drawer also has no `role="dialog"`, no `aria-modal`, no focus trap, and no focus restoration — unlike `DetailPanel`, `MobileFilterSheet` and `MobileSearchOverlay`, which all do at least part of this. — WCAG 2.4.3.

**Fix:** apply `inert` when closed on mobile, and mirror the `DetailPanel` dialog pattern:
```tsx
<motion.div
  role="dialog"
  aria-modal={isMobile ? true : undefined}
  aria-label="תפריט וסינון"
  inert={isMobile && !sidebarOpen ? true : undefined}
  ...
>
```

#### e) The search autocomplete has no combobox semantics

**Problem:** `src/components/IsraelCoffeeGuide.tsx:524-599` — the dropdown maintains a highlight index and handles ↑/↓/Enter, but there is no `role="combobox"`, `role="listbox"`, `role="option"`, `aria-expanded`, `aria-activedescendant` or `aria-autocomplete` anywhere (a repo-wide grep finds zero `aria-activedescendant`/`aria-controls`). Screen-reader users get no announcement that results appeared or which is highlighted.

**Fix:** ARIA 1.2 combobox pattern — on the input: `role="combobox" aria-expanded={open} aria-controls="search-listbox" aria-activedescendant={highlightedId} aria-autocomplete="list"`; wrap results in `<ul id="search-listbox" role="listbox">` with `<li role="option" id={...} aria-selected={...}>`.

#### f) No `<main>`, no visible `<h1>`, no skip link in the app shell

**Problem:** the interactive app (`IsraelCoffeeGuide.tsx:802` onward) is entirely `<div>`s — the semantic-element census across `src/` shows `<main>`/`<header>` only on the five static pages and `<footer>` nowhere. The only `<h1>` on `/` is inside a `sr-only` block (`src/app/page.tsx:55-62`), and `AboutView.tsx:29` adds a *second* `<h1>` when the About view is open. There is no skip link, and with ~15 sidebar controls before content, keyboard users have no bypass. — WCAG 1.3.1 / 2.4.1.

**Fix:** wrap the content area in `<main>`, make the bottom bar a `<nav aria-label="ניווט ראשי">`, demote the About heading to `<h2>`, and add as the first element in `layout.tsx`:
```tsx
<a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:right-2 focus:z-[10100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">
  דלג לתוכן
</a>
```

### 2.2 The mobile "Safari crash fix" destroys focus indicators on phones

**Problem:** `src/app/globals.css:818-831` applies to `.glass-input` (among others) at ≤768px:
```css
box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
```
`.glass-input:focus`'s ring (`globals.css:169-173`) is *not* `!important`, so on every phone the review-form fields (`DetailPanel.tsx:485`, `:524`) show **no focus indicator at all**. Separately, the rating `<select>` (`DetailPanel.tsx:502`) uses `focus:outline-none focus:border-[#38BDF8]` — a 1px border-color change as its only focus signal. — WCAG 2.4.7.

**Fix:** exclude inputs from the blanket rule and re-assert the ring:
```css
@media (max-width: 768px) {
  .glass, .glass-card, .glass-button,
  .leaflet-popup-content-wrapper, .leaflet-popup-tip { /* … unchanged … */ }

  .glass-input {
    backdrop-filter: none !important;
    background: rgba(255, 255, 255, 0.98) !important;
  }
  .glass-input:focus {
    box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.5) !important;
  }
}
```

### 2.3 Color-contrast failures on high-value content

**Problem (worst offenders, computed against their actual backgrounds):**

| Element | Colors | Approx. ratio | Location |
|---|---|---|---|
| **Today's opening hours** (the row users actually read) | `text-yellow-400` on near-white card | **~1.5:1** | `OpeningHoursDisplay.tsx:74` |
| "פתוח" active badge / open-now chips | white on `bg-green-500/90` | ~2.2:1 | `IsraelCoffeeGuide.tsx:1016`, `Sidebar.tsx:125` |
| Offline banner | white on `bg-amber-500` | ~1.9:1 | `OfflineIndicator.tsx:152` |
| Area counts, empty-state icons, "דווח על טעות" | `text-slate-400` on white | ~2.7:1 | `ShopsView.tsx:192`, `DetailPanel.tsx:551`, `cities/page.tsx:49` |
| Cluster bubbles / count badges | white on `#0ea5e9` | ~2.7:1 | `leaflet-helpers.tsx:41-53`, `MapView.tsx:113` |
| Sidebar micro-text | 10px Hebrew at `text-[10px]` | size + contrast | `Sidebar.tsx:362, 373, 385, 392` |

WCAG 1.4.3 requires 4.5:1 for body text, 3:1 for large text. The current-day hours row failing at ~1.5:1 is the most important line of text in the detail panel.

**Fix (drop-in swaps):**
- `text-yellow-400 dark:text-yellow-300` → `text-amber-600 dark:text-yellow-300` (amber-600 `#d97706` ≈ 4.5:1 on white).
- `bg-green-500/90` → `bg-green-600` (white on green-600 ≈ 4.0:1; or green-700 for 5.5:1).
- `bg-amber-500` banner → `bg-amber-600` with white text, or keep amber-500 with `text-amber-950`.
- `text-slate-400` in light mode → `text-slate-600` (leave `dark:text-slate-400`, which passes on `#0B1120`).
- Cluster/badge base `#0ea5e9` → `#0369a1` (sky-700).
- Eliminate `text-[10px]`/`text-[11px]` — minimum `text-xs` (12px) for Hebrew UI text.

### 2.4 Dark mode is broken on the first screens users see

**Problem:** four full-screen containers set a light gradient via `background-image` plus a dark `background-color`, and `background-image` always paints on top:
```tsx
// IsraelCoffeeGuide.tsx:802 — same pattern in SkeletonLoader.tsx:171,
// InitialLoading.tsx:10, ErrorBoundary.tsx:63
className="… bg-gradient-to-br from-[#E0F2FE] via-[#F0F9FF] to-[#DBEAFE] dark:bg-[#0B1120] …"
```
In dark mode the light-blue gradient remains fully visible — the initial load skeleton, the loading screen, and the crash screen are all light-themed for dark-mode users. The five static pages already solve this correctly with dark gradient stops (e.g. `cities/page.tsx:23`).

**Fix (one class per file):** add `dark:bg-none` (or mirror the static pages: `dark:from-[#0B1120] dark:via-[#0B1120] dark:to-[#0B1120]`):
```tsx
className="… bg-gradient-to-br from-[#E0F2FE] via-[#F0F9FF] to-[#DBEAFE] dark:bg-none dark:bg-[#0B1120] …"
```

Related, worth fixing in the same pass: `enableSystem={false}` + `defaultTheme="light"` (`layout.tsx:133-137`) means visitors with OS-level dark preference get light mode; the theme toggle exists **only** inside the expanded sidebar (`Sidebar.tsx:314`) — none of the static pages (`/cafe/[id]` etc.) offer any way to switch theme; and three different "dark backgrounds" coexist (`--background: oklch(0.08 0.02 240)` vs `dark:bg-black` in `layout.tsx:131`/`globals.css:604` vs `#0B1120` ×21).

### 2.5 The 768–1023px tablet dead zone

**Problem:** JavaScript defines mobile as `innerWidth < 1024` (`IsraelCoffeeGuide.tsx:332` uses `>= 1024` for desktop), but the mobile controls are hidden by CSS at `md:` (≥768px): the hamburger (`Sidebar.tsx:182` `md:hidden`), the filter button and the map/list toggle (`IsraelCoffeeGuide.tsx:1044, 1068`). Between 768 and 1023px the app is in JS-mobile mode — sidebar closed, overlaid — while CSS-desktop mode hides every control that opens it. **On an iPad portrait / small landscape window, filters and navigation are unreachable.** Four different "mobile" thresholds coexist (767 / 768 / 1024 in JS, 768 / 1024 in CSS).

**Fix:** pick one breakpoint system. Either move the JS threshold to 768 to match `md:`, or change the CSS to `lg:hidden` to match the JS. Then centralize:
```ts
// src/lib/breakpoints.ts — single source of truth
export const MOBILE_BREAKPOINT = 1024;           // matches Tailwind lg
export const MOBILE_MQ = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;
```
and replace every `innerWidth` check with one `useMediaQuery(MOBILE_MQ)` hook, and every `md:hidden` on those controls with `lg:hidden`.

### 2.6 The grid-density toggle silently does nothing on desktop

**Problem:** `src/components/ShopsView.tsx:199` (and `:261`):
```tsx
<div className={`grid ${gridColsClass} gap-6 md:grid-cols-2 lg:grid-cols-3 w-full`}>
```
`gridColsClass` is the user's 1/2-column choice, but `md:grid-cols-2 lg:grid-cols-3` overrides it at every width ≥768px. The toggle button (`IsraelCoffeeGuide.tsx:1084-1094`) is *not* `md:hidden` (unlike its siblings), so desktop users see a control that visibly does nothing — a broken-feeling interaction.

**Fix:** either scope the toggle to mobile (`className="… md:hidden"`, matching `:1044`/`:1068`) — the minimal, honest fix — or make the choice real on desktop:
```tsx
const gridClass = gridCols === 1
  ? "grid-cols-1 md:grid-cols-1 lg:grid-cols-2"
  : "grid-cols-2 md:grid-cols-2 lg:grid-cols-3";
```

### 2.7 Reviews: unbounded query, no error handling, `alert()` UX

**Problem:** `src/hooks/useReviews.ts:40-108` — when any detail panel opens, the hook fetches **every review for every café** (`.from('Cafe Reviews').select('*')` with no `.eq('cafe_id', …)`, no `.limit()`) and maps them client-side. There is no `try/catch`: `fetchReviews()` is invoked fire-and-forget at `:100`, so a rejected `getSupabase()` or query becomes an unhandled promise rejection; the query `error` at `:65` is silently swallowed (users see "אין ביקורות" — indistinguishable from truly empty). Submission failure surfaces as a blocking native `alert()` (`:135`). This gets worse linearly with review growth.

**Fix:**
```ts
const fetchReviews = async () => {
  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from('Cafe Reviews')
      .select('*')
      .eq('cafe_id', getNumericId(activeShopId))   // fetch this café only
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    // …map…
  } catch (err) {
    if (!cancelled) setReviewsError(err instanceof Error ? err.message : 'load-failed');
  }
};
```
Surface `reviewsError` in the panel ("לא הצלחנו לטעון ביקורות — נסו שוב") with a retry button, and replace both `alert()` sites with the toast pattern the app already has for sharing (`IsraelCoffeeGuide.tsx:471-482`).

### 2.8 A data-load failure masquerades as "no results"

**Problem:** `usePlaceData` exposes an `error`, but it's passed only to `MapView` (`IsraelCoffeeGuide.tsx:918`); `ShopsView`'s props have no error field. The default landing view on mobile is the **list** — so if `cafes.json` fails to load, users see the friendly "לא נמצאו בתי קפה / נסו לשנות את הסינון" empty state, which actively misdirects them toward fiddling with filters instead of reloading.

**Fix:** pass `error` into `ShopsView` and branch the empty state:
```tsx
if (error) return (
  <EmptyState icon="AlertTriangle" role="alert"
    title="שגיאה בטעינת הנתונים"
    body="בדקו את החיבור ונסו שוב"
    action={{ label: "נסה שוב", onClick: retry }} />
);
```

### 2.9 Pagination reset misses half the filters

**Problem:** `src/components/IsraelCoffeeGuide.tsx:784-786`:
```ts
useEffect(() => {
  setShopsToDisplay(12);
}, [selectedBrewMethods, sellsBeansFilter, showOpenNowOnly, userLocation, selectedRegionFilter]);
```
`favoritesFilter`, `openShabbatFilter`, `noMatchaFilter`, and `onlineOnlyFilter` are missing. Toggle "מועדפים" after having clicked "הצג עוד" a few times and the list renders up to the previous count at once instead of resetting — inconsistent, jumpy behavior.

**Fix:** include all eight (or key the effect on the whole filter state object from `useFilters`):
```ts
}, [selectedBrewMethods, sellsBeansFilter, showOpenNowOnly, userLocation,
    selectedRegionFilter, favoritesFilter, openShabbatFilter, noMatchaFilter, onlineOnlyFilter]);
```

### 2.10 Three ID schemes; renaming a café orphans its favorites and reviews

**Problem:** the same 151 records are keyed three ways:
1. the raw dataset id — used by `/cafe/[id]`, the sitemap, share URLs (`cafe-lookup.ts:70`);
2. `generatePlaceId(name, city)` — a content hash used as the client-side `CoffeeShop.id` and the **favorites** key (`place-id.ts:12-40`, `useFavorites.ts`);
3. `getNumericId(placeId)` — a 32-bit string hash of (2), used as the **Supabase `cafe_id`** (`numeric-id.ts:15-28`, documented as a frozen DB contract).

Fixing a typo in a café's name or normalizing a city string ("תל אביב-יפו" → "תל אביב") silently orphans every favorite and every review for that café. Hash collisions in (3) would silently attach reviews to the wrong café; nothing checks uniqueness. `IsraelCoffeeGuide.tsx:421` has to remember `shop.datasetId ?? shop.id` to build a working share link — an invitation for future bugs.

**Fix (incremental, no DB migration needed at first):**
1. Adopt the dataset `id` as the single client-side key (it's already stable and human-assigned).
2. Keep `getNumericId` reading/writing reviews for existing rows, but write **both** `cafe_id` (legacy hash) and a new `dataset_id` column going forward; backfill once; then flip reads.
3. Migrate favorites in `useFavorites` on first load: map legacy hashed ids → dataset ids via a one-time lookup, then store dataset ids.
4. Add a build-time uniqueness check (a 5-line script in CI) over `getNumericId` outputs while it still exists.

### 2.11 `supabaseClient`: a single failed chunk load bricks reviews forever

**Problem:** `src/supabaseClient.ts:61-72` caches the *promise*:
```ts
let clientPromise: Promise<SupabaseLike> | null = null;
export function getSupabase(): Promise<SupabaseLike> {
  if (!clientPromise) {
    clientPromise = isConfigured
      ? import('@supabase/supabase-js').then(...)
      : Promise.resolve(createMockClient() ...);
  }
  return clientPromise;
}
```
If the dynamic `import()` rejects once (flaky mobile network — precisely the audience for this app), every later call returns the same rejected promise until a full page reload. The mock client's hand-rolled thenable (`:27-52`) also violates the thenable contract (its `then` ignores the reject callback and returns `undefined`). Same family of bug: `useFavorites.ts:16` runs `JSON.parse(localStorage.getItem("favorites"))` with no `try/catch` — one corrupt key throws inside an effect and takes down the tree (`useRecentAddresses.ts:12-22` and `useFilters.ts:107-116` both guard correctly; this one was missed).

**Fix:**
```ts
export function getSupabase(): Promise<SupabaseLike> {
  if (!clientPromise) {
    clientPromise = (isConfigured
      ? import('@supabase/supabase-js').then(({ createClient }) => createClient(supabaseUrl!, supabaseAnonKey!))
      : Promise.resolve(createMockClient() as unknown as SupabaseClient)
    ).catch((err) => {
      clientPromise = null;   // allow retry on next call
      throw err;
    });
  }
  return clientPromise;
}
```
For favorites: `try { setFavorites(saved ? JSON.parse(saved) : []); } catch { setFavorites([]); }` — and make the mock a plain `async` object instead of a custom thenable.

### 2.12 `/api/geocode` is an unthrottled open proxy to Nominatim

**Problem:** `src/app/api/geocode/route.ts` forwards any `q` to `nominatim.openstreetmap.org` with `cache: "no-store"` (`:21`), no rate limit, no query-length cap, no origin check. Nominatim's usage policy is max 1 req/s per client; a single abusive caller (or your own users during a traffic spike) can get the deployment's egress IP blocked — killing address search for everyone. `robots.ts` disallowing `/api/` only stops polite crawlers.

**Fix:** cache aggressively (geocoding the same Hebrew address is deterministic) and bound input:
```ts
if (!q || !q.trim() || q.length > 120) {
  return NextResponse.json({ error: "Bad query" }, { status: 400 });
}
const response = await fetch(url, {
  headers: { "User-Agent": "Ca-Fe-Coffee-Guide/1.0 (contact: <site email>)" },
  next: { revalidate: 60 * 60 * 24 * 30 },   // 30-day server cache per query
});
```
Add a `Cache-Control: public, max-age=86400` response header, and (on Vercel) a simple per-IP token bucket via `@upstash/ratelimit` or middleware if abuse appears.

### 2.13 No `error.tsx` / `not-found.tsx` / `loading.tsx` anywhere

**Problem:** `notFound()` is called in three routes (`cafe/[id]/page.tsx:68`, `city/[city]/page.tsx:50`, `theme/[theme]/page.tsx:50-52`) but there is no `not-found.tsx`, so users get Next's default **English, LTR** 404 on a Hebrew RTL site. There is no route-level `error.tsx` either; the single `ErrorBoundary` wraps only the client app (`HomeClient.tsx:25`), and a render throw inside `DetailPanel`/`MapView` blanks the whole app rather than degrading.

**Fix:** add `src/app/not-found.tsx` and `src/app/error.tsx` in the site's visual language (Hebrew copy, RTL, a "חזרה למפה" link), and wrap `DetailPanel` and the map in small feature-level boundaries so a crash in one panel doesn't kill navigation.

### 2.14 No security headers, with 7 `dangerouslySetInnerHTML` call sites

**Problem:** `next.config.ts:16-53` sets only cache headers. There is no `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, `Strict-Transport-Security`, or `X-Frame-Options`/`frame-ancestors` — while the app injects JSON-LD via `dangerouslySetInnerHTML` in 7 places and accepts unmoderated user review text into Supabase (rendered as text today, but one future `innerHTML` away from stored XSS with no CSP backstop).

**Fix:** add to `headers()`:
```ts
{
  source: '/:path*',
  headers: [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
  ],
},
```
(CSP needs a careful allowlist — Carto tiles, Vercel analytics, Supabase — start with `Content-Security-Policy-Report-Only` to tune it.) Also serialize JSON-LD with `JSON.stringify(data).replace(/</g, '\\u003c')` to keep script-tag injection impossible even if data becomes user-influenced.

---

## 3. Quick Wins (Low Effort / High Impact)

### 3.1 Delete ~2,300 lines of dead code and three unused dependencies

**Problem:** verified zero importers for: `src/data/matcha.ts` (717 lines), `ScalingScrollArea.tsx` (295) + `ui/scroll-area.tsx` (51), `ui/PopularTimesDisplay.tsx` (225) + `lib/popular-times.ts` (178) **+ its 232-line test suite** (`generatePopularTimes` fabricates "popular times" with `Math.random()` — a landmine if ever wired up), `ReviewSection.tsx` (170 — a duplicate Supabase review UI whose submit button uses the non-existent class `bg-coffee-dark`, i.e. it renders with no background), `HanukkahDecorations.tsx` (151), `ui/LazyImage.tsx` (120), `ShopCardSkeleton.tsx` (77), `TagPill.tsx` (23), plus the never-imported `Button` and `MetalButton` (~250 lines, ~41 hardcoded hexes) inside `liquid-glass-button.tsx`. Unused deps: `@formspree/react`, `disqus-react` (both advertised as features in `README.md:9-10` — the README overstates the product), and devDep `puppeteer` (downloads Chromium on every `npm ci`).

**Fix:** delete the files, drop the three packages, correct the README. Zero behavior change, meaningfully smaller surface area, faster CI.

### 3.2 Slim the data payload (~9% free, plus a 156 KB stray file)

**Problem:** `public/data/cafes.json` (182 KB) ships `google_place_id`, `google_name`, `google_address`, `google_confidence`, `_geocode_verified`, `_manual_update`, `_updated_at` on every record — none read anywhere in `src/` (verified by grep; only `_last_updated` is used, server-side). `public/data/cafes.batch-backup.json` (156 KB) is a committed backup served from the CDN.

**Fix:** add a build step (or extend an existing script) that emits a client-only `cafes.json` stripped of internal keys; move the full file out of `public/`. Delete the backup from `public/` (git history already preserves it).

### 3.3 One-line dark-mode and effect-deps fixes

Covered in §2.4 and §2.9 — four `dark:bg-none` additions and one dependency-array edit. Minutes of work, immediately visible.

### 3.4 Take framer-motion out of the card render path

**Problem:** framer-motion is eagerly imported in 8 files. `ShopCard.tsx:42-46` uses `motion.div` for a one-shot 12px fade-in on **every card** — the list hot path — for an effect CSS does for free. (`ShopCard` is, to its credit, the only `React.memo` component in the tree.)

**Fix:**
```tsx
// ShopCard.tsx — replace motion.div with:
<div className="animate-card-in ..." onClick={...}>
```
```css
/* globals.css */
@keyframes card-in { from { opacity: 0; transform: translateY(12px); } }
.animate-card-in { animation: card-in 0.3s ease-out both; }
@media (prefers-reduced-motion: reduce) { .animate-card-in { animation: none; } }
```

### 3.5 Get Leaflet CSS off the critical path of non-map pages

**Problem:** `globals.css:3` imports `leaflet/dist/leaflet.css` globally (plus ~90 lines of Leaflet overrides at `:6-95`), so every static page — `/cafe/[id]`, `/cities`, `/themes`, none of which render a map — pays for it. `MapView.tsx:1` already imports it inside the lazy map chunk.

**Fix:** delete the import from `globals.css`; move the override rules into a `map.css` imported by `MapView.tsx`.

### 3.6 Fix the font pipeline (three tangled mechanisms)

**Problem:**
- `globals.css:494` puts raw `"TimeBurner"` first in the stack (with `!important`), so the manual `@font-face` at `:452-468` wins over next/font's optimized, hashed, preloaded copy — and that `@font-face` references `.woff` fallback files that don't exist in `public/fonts/`.
- **Inter is referenced but never loaded**: `fonts-helpers.ts:18` returns `var(--font-inter), "Inter", …` for Latin text and `globals.css:473,605` set `font-family: Inter, …` — but no `--font-inter` is defined anywhere. Every Latin café/roaster name silently renders in Arial.
- 56 inline `style={{ fontFamily: 'var(--font-aran), sans-serif' }}` declarations scattered across components bypass the cascade entirely.
- `adjustFontFallback: false` on TimeBurner (`fonts.ts:21`) disables the metric-matched fallback, reintroducing CLS on swap.

**Fix:** delete the manual `@font-face` block; either add Inter via `next/font/google` (subset `latin`) and define `--font-inter`, or remove Inter from `fonts-helpers.ts`/`globals.css` and embrace the actual stack; set `body { font-family: var(--font-aran), sans-serif; }` once and delete the 56 inline styles (keep `--font-timeburner` scoped to the logo); remove `adjustFontFallback: false`.

### 3.7 De-duplicate `globals.css`

**Problem:** `:root` appears at `:260` **and** `:711`; `@keyframes aurora` at `:96` **and** `:389`; `@theme inline` at `:308` **and** `:398`; `@layer base` at `:402` **and** `:599` — and the two `@layer base` blocks define conflicting `body` rules (`bg-background text-foreground` vs `bg-white dark:bg-black`); the later hardcoded one wins, which is why the design tokens are dead in practice.

**Fix:** merge each pair; keep the token-driven `body` rule (`@apply bg-background text-foreground`) and align `--background`'s dark value with the `#0B1120` the app actually uses.

### 3.8 Complete `.env.local.example`; remove personal fallbacks

**Problem:** the example file documents only `GOOGLE_MAPS_API_KEY` — which the app itself never reads (only `scripts/` do). Missing: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_BASE_URL`, `NEXT_PUBLIC_REPORT_EMAIL`. A fresh clone silently gets the mock Supabase client, `ca-fe.xyz` URL fallbacks (hardcoded in 9 files), and — worse — `report.ts:13` falls back to a personal Gmail address for user reports.

**Fix:** document all six vars with comments; make `NEXT_PUBLIC_REPORT_EMAIL` required (throw or hide the report CTA when unset); lift the site-URL fallback into one `src/lib/site.ts` constant imported by all 9 files.

### 3.9 Touch-target and micro-text pass

**Problem:** multiple controls are far under the 44×44px minimum (Apple HIG / WCAG 2.5.8): clear-search ~22px (`Sidebar.tsx:348-356`), map clear-address ~18px (`MapView.tsx:136-144`), bubble close 28px (`SelectionBubble.tsx:126-133`), region chips ~36px (`ShopsView.tsx:157-171`), recent-address chips ~22px at 10px font (`Sidebar.tsx:369-378`). The bottom bar already does this right (`min-h-[44px]` everywhere).

**Fix:** give small icon buttons an invisible hit area:
```tsx
className="relative p-1 after:absolute after:-inset-3 after:content-['']"
```
or simply `min-h-[44px] min-w-[44px] grid place-items-center`; bump region chips to `py-2.5`; raise all `text-[10px]`/`text-[11px]` to `text-xs`.

### 3.10 Viewport units and RTL-logical properties

**Problem:** `height: "100vh"` on the sidebar (`Sidebar.tsx:220`) and `max-h-[92vh]/[88vh]` on the detail panel (`DetailPanel.tsx:150-151`) clip under mobile browser chrome; physical properties (`mr-80`, `right-6`, `left-2`, `pr-16`…) are used throughout instead of logical ones (`me-*`, `end-*`, `ps-*`) — they work only because the site is RTL-only, and they'll all be bugs the day an English locale ships (only `cafe/[id]/page.tsx:161` uses a logical property today).

**Fix:** `100vh` → `100dvh`, `[92vh]` → `[92dvh]`; adopt logical utilities in touched files as you go (no big-bang rename needed).

### 3.11 Give the map an empty state; announce dynamic results

**Problem:** when filters produce zero matches in map view, users see a bare basemap with a "0 מקומות" chip (`MapView.tsx:112-129`) — no recovery path (the list view's four-way branched empty state at `ShopsView.tsx:317-372` is excellent; reuse it). Also, filter changes update result counts with no `aria-live` outside the map, and the geocoding error (`Sidebar.tsx:361-365`) has no `role="alert"`.

**Fix:** overlay the existing empty-state component on the map when `visibleShops.length === 0 && hasActiveFilters`, with the same "נקה את כל המסננים" CTA; add `role="status" aria-live="polite"` to the list's result count and `role="alert"` to error texts.

### 3.12 Stop fetching 182 KB per OG-image render

**Problem:** `src/app/opengraph-image/[cafe]/route.tsx:25-26` HTTP-fetches `/data/cafes.json` and linear-scans it on **every** card render, because `runtime = 'edge'` (`:4`) prevents the static import that `cafe-lookup.ts` already has.

**Fix:** drop the edge runtime (Node route handlers render `ImageResponse` fine on Vercel) and reuse the build-time lookup:
```tsx
// remove: export const runtime = 'edge';
import { findCafeMeta } from '@/lib/cafe-lookup';
const cafeData = findCafeMeta(cafe);
```

### 3.13 Surface "suggest a place" where contributors actually are

**Problem:** the community-growth CTA ("הוספת מקום חסר") exists only in the desktop sidebar (`Sidebar.tsx:438-448`) as a `mailto:` — invisible on mobile (most traffic), and a dead end on devices with no configured mail client. For a directory whose moat is coverage, this is the most under-placed CTA in the product.

**Fix (cheap version now):** add it to `MobileFilterSheet` and to the list empty state ("לא מצאתם? הוסיפו מקום חסר"); replace `mailto:` with a prefilled Google Form link — or wire up `@formspree/react`, which is already installed. (Full in-app form: §4.6.)

### 3.14 Fix hours-logic drift in one move

**Problem:** two independent opening-hours engines — `formatters.ts` (482 lines: `isPlaceOpen`, …) and `opening-hours.ts` (284 lines: `isOpenNow`, `getLiveOpeningStatus`, …) — each with its own day map and parser, are used **in the same render path**: the guide's "open now" filter uses `isPlaceOpen` (`IsraelCoffeeGuide.tsx:683`) while the map's marker dimming uses `isOpenNow` (`MapView.tsx:222`). Any parsing divergence makes the list and the map disagree about whether a café is open.

**Fix:** pick `opening-hours.ts` (the more focused module), re-export shims from `formatters.ts` for one release, port the 27 formatter tests over, delete the duplicate.

---

## 4. Long-term Enhancements

### 4.1 Unify the data layer (one dataset, one normalization, one ID)

**Problem:** the same 151 records flow through two disconnected pipelines — build-time `import cafesData` → `normalise()` → `CafeMeta` for the server/SEO pages (`cafe-lookup.ts`), and runtime `fetch("/data/cafes.json")` → `transformCafeToRoastery` → `normalizeCoffeePlace` → `mapPlaceToCoffeeShop` for the client (`usePlaceData.ts`, three transforms). Two type systems (`CafeMeta` vs `CoffeeShop`), plus the three-ID problem (§2.10). The client `useEffect` fetch also re-downloads data the server already had, papered over by a `<link rel="preload">` (`layout.tsx:124`).

**Recommendation:** one `src/lib/catalog.ts` that owns loading + normalizing into a single `Cafe` type keyed by dataset id, consumed by both server and client. Then go one step further: pass the (stripped, §3.2) catalog from the server component into the client shell as props — the JSON is already CDN-cached, and this removes the fetch waterfall and the skeleton flash on repeat visits. Long-term, consider server-rendering the list view itself (the map stays client-only) so the primary content is real HTML rather than an `sr-only` shadow copy — better SEO, better first paint, works without JS.

### 4.2 Decompose `IsraelCoffeeGuide.tsx`

**Problem:** 1,176 lines; 11 `useState`, 14 `useEffect`, 9 custom hooks; it is simultaneously the filter engine, URL-state manager, history/back-button manager, responsive-layout controller, scroll-lock owner, share handler, search-dropdown renderer, and bottom nav bar. Its filter engine (`:650-729`) — the core product logic — has **zero tests**. Downstream, `Sidebar` takes **41 props** and `MobileFilterSheet` 19 (mostly the same filter booleans + callbacks), every reducer action is re-wrapped in a fresh arrow each render (`:603-641`) so children can never memoize, and only `ShopCard` is memoized in the whole tree — every keystroke in the search box re-renders the sidebar, both sheets, and both views.

**Recommendation:**
1. Extract a `FilterProvider` (context exposing `useFilters`' state + stable dispatch wrappers via `useCallback`) — this alone deletes ~30 props from `Sidebar`/`MobileFilterSheet`.
2. Extract `useUrlFilterSync`, `useDetailHistory` (the `?cafe=` back-button logic), `useShare`, and a `BottomBar` component.
3. Extract the pure filter pipeline into `src/lib/filter-shops.ts` and give it the test suite it deserves (the reducer already has one; the engine doesn't).
4. Memoize `Sidebar`, `ShopsView`, `MapView`, `MobileFilterSheet` once their props are stable.
   Do this incrementally — each extraction is independently shippable.

### 4.3 Make the design system real

**Problem:** a full shadcn/Tailwind token system exists (`globals.css:260-352`) and is almost entirely unused: ~234 arbitrary hex values across 23 files (`#0C4A6E` ×61, `#0071E3` ×50, `#64748B` ×27, `#0B1120` ×21…), a five-stop gradient copy-pasted verbatim in 9 files, slate/zinc drift for the same semantic surfaces, 22 ad-hoc z-index values (`z-[10050]`…`z-[35]`), two parallel type scales between the app and the static pages, `uppercase`/`tracking-wider` applied to Hebrew (no-ops that signal copied Latin styles), and a global `button { hover: scale(1.03) }` (`globals.css:686-699`) that scales even the café-name text inside cards. `LiquidButton`'s default size is `xxl` (56px), so nearly every call site fights it with `className` overrides.

**Recommendation:** map the *actual* palette into the tokens (`--primary: #0071E3`, `--heading: #0C4A6E`, `--muted-foreground: #64748B`, `--surface-dark: #0B1120`), then migrate file-by-file to `text-primary`/`bg-card`/etc.; define a z-index scale (`--z-map`, `--z-bar`, `--z-drawer`, `--z-modal`, `--z-toast`); extract the hero gradient into one utility class; pick one neutral family (slate); scope the button scale effect to an opt-in class; change `LiquidButton`'s default size to `default`. This is the enabler for a future light rebrand — right now a palette change means editing 23 files.

### 4.4 Coffee-domain depth — the biggest product opportunity

**Problem:** for a specialty-coffee audience, the data model is thin: `brewMethods` is a comma-separated string reduced to a 3-value vocabulary (אספרסו/פילטר/קולד ברו) — `filterBrewMethods` (`brew-methods.ts:47-69`) **silently drops** Turkish, מקינטה and שחור that exist in the data; roaster names live only inside free-text descriptions ("פולים של MONK", "SCA 90+…") — unsearchable, unfilterable; there are **zero** structured fields for origin, roast level, process, tasting notes, water, equipment, or which roaster a café pours; `matchaOrigin`/`milkOptions` exist in the type but 0 of 151 records use them; the 14 `vibeTags` are all ambience, none coffee-quality ("great filter coffee", "single-origin espresso", "laptop-friendly" don't exist as facets); and cards show no rating aggregate even though reviews exist.

**Recommendation (in value order):**
1. **Structured roasters.** Promote roasters to first-class entities (`roasters.json`: name, city, Instagram, style) and give cafés `roasterIds` + `guestRotation: boolean`. Unlocks the killer filter for this audience — "who pours MONK?" — plus roaster profile pages (more SEO surface).
2. **Widen the brew vocabulary** instead of dropping data: add `טורקי`, `מקינטה`, and split פילטר into pour-over vs batch when known. Display unknown methods rather than hiding them.
3. **Aggregate ratings** on cards + `AggregateRating` JSON-LD on `/cafe/[id]` — the single biggest SEO gap: star snippets in Hebrew SERPs for "בית קפה ספיישלטי בתל אביב" are exactly this site's game to win, and the review data already exists in Supabase.
4. **Per-café specialty attributes** (nullable, fill over time): `servesFilterDaily`, `singleOrigin`, `decafAvailable`, `altMilk`, `laptopPolicy`, `outdoorSeating`. Each becomes a filter facet and a `/theme/*` landing page (only 3 exist today — roasters/beans/matcha).
5. **Brew guides / education layer**: even 3–5 static guide pages (V60, espresso at home, cold brew) interlinked from café pages ("מגישים פילטר? כך תשחזרו בבית") build topical authority and repeat visits.
6. **Merge the Tel Aviv city variants** ("תל אביב" / "תל אביב-יפו" / "תל אביב - יפו" are three separate `/city/*` pages today, splitting 93 cafés' worth of SEO equity), via a normalization map in `cafe-lookup.ts`.

### 4.5 Detail-page convergence

**Problem:** the in-app `DetailPanel` and the static `/cafe/[id]` page disagree: the panel has reviews + review form + favorites + share but no theme chips, no nearby-cafés module, no full week table; the static page has those but **no reviews, no favorite, no share** — and every shared link points to the static page (`share.ts:39-43`), so recipients land on the version with no social proof and no way to save the place. Neither shows a phone number, price signal, or menu link.

**Recommendation:** extract shared sections (hours table, brew chips, vibe chips, nearby-cafés) into components used by both; add the reviews list (server-fetched) + rating aggregate to the static page; add a "פתחו במפה" deep link that opens the app with `?cafe=<id>` (already supported) so shared links funnel back into the interactive experience.

### 4.6 Community pipeline v2

**Problem:** growth depends on coverage and trust, but: submissions are `mailto:` (§3.13); reviews are unmoderated anonymous inserts with the anon key — one spam wave and the "ביקורות מהשטח" section becomes a liability; favorites are device-local with no sync.

**Recommendation:** an in-app submission form (name, city, Instagram, "why is it specialty?") writing to a Supabase `submissions` table with a moderation flag; reviews gain `approved` defaulting per your tolerance + a simple admin view (even a Supabase dashboard saved filter works at this scale); rate-limit inserts (Supabase RLS + a per-IP edge check); later, optional magic-link auth to sync favorites — which also derisks the ID migration (§2.10) by making favorites server-side.

### 4.7 Testing where it counts

**Problem:** 270 tests exist but concentrate on leaf utilities; the filter engine, `useReviews`, `useFavorites`, and all view components have zero coverage; `vitest.config.ts:22-33` still *excludes* components from coverage with a stale "no jsdom setup yet" comment although jsdom is installed and 4 test files already use it; 19 of the tests exercise dead code (`popular-times`).

**Recommendation:** after extracting `filter-shops.ts` (§4.2), test it exhaustively (it's pure); add RTL tests for `DetailPanel` (focus trap, labeled form) and `ShopsView` (empty states, error state); set `environment: 'jsdom'` for `*.tsx` via `environmentMatchGlobs`; delete the dead-code tests; add a modest coverage threshold so it ratchets, not regresses. Also: fold the 62 one-off `scripts/` (20 geocoders, 9 Instagram fixers, 5 add-café scripts, 6 committed output JSONs) into 2–3 parameterized tools wired into `package.json`.

### 4.8 Finish the PWA story

**Problem:** README claims "PWA-ready"; a service worker exists (`public/sw.js`, sensible network-first/cache-first strategies) but there is **no `manifest.json`**, so the app isn't installable — the main thing users would notice. Also three overlapping offline treatments can stack on screen simultaneously (`OfflineBanner`, `OfflineIndicator`, and an inline banner — `IsraelCoffeeGuide.tsx:804-809`), and two independent online/offline listener hooks are mounted at once (`useOnlineStatus` + `useOfflineSupport`).

**Recommendation:** add `src/app/manifest.ts` (name, Hebrew `dir: "rtl"`, theme colors from the token system, icons); consolidate to one offline indicator and one online-status hook; then "הוסיפו למסך הבית" becomes a legitimate CTA for the repeat-visit audience a city guide lives on.

---

## Appendix — strengths worth protecting

- **SEO architecture** (`sitemap.ts`, `robots.ts`, `structured-data.ts`, per-café OG images with bidi-corrected Hebrew, the `sr-only` crawlable block, deliberate static-ness of `/` documented in `page.tsx:15-26`) — unusually thorough; several fixes above (ratings JSON-LD, city merge) compound it.
- **Performance instincts**: Leaflet and Supabase correctly code-split with written rationale (`supabaseClient.ts:56-60`, `HomeClient.tsx:13-17`); explicit 34-icon lucide registry (`ui/Icon.tsx`); cache headers with reasoning (`next.config.ts`); device-tier gating for map animations.
- **`DetailPanel`'s focus trap + focus restoration** (`DetailPanel.tsx:64-99`) — the model the drawer and sheets should copy.
- **The list empty states** (`ShopsView.tsx:317-372`) — four-way contextual branching with a single recovery CTA each; the mobile filter sheet previewing "הצג {N} תוצאות" on its button.
- **Viewport config** preserving pinch-zoom, with an explanatory comment (`layout.tsx:14-17`).
- **The comment culture** — non-obvious decisions (aurora media-query fix, skeleton-timing fix, id-contract warning in `numeric-id.ts`) are documented where they live. Keep that up; it made this audit tractable.
