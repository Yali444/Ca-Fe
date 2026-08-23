# Test coverage audit

_Generated 2026-08-22. Suite state at time of writing: **318 tests / 30 files, all passing, ~9s**._

> **Status update (2026-08-23).** The whole first pass is done — **P1, P3, P4, P5, P7,
> P8** — plus the `useFavorites` data-loss bug from **P6**. The suite is **436 tests /
> 36 files** (from 318), coverage is **42.13%** statements and enforced in CI, and the
> floor has been raised once as the ratchet intends. Remaining: **P2** (extract the
> filter pipeline) and the rest of **P6** (eight hooks still at 0%). Items below are
> left as written, with outcomes noted inline.

The suite is green and `src/lib` is genuinely well tested. But the headline coverage
number is measured against a denominator that leaves out roughly two-fifths of the app —
and the code it leaves out includes the filtering logic the whole product is built around.

---

## 1. The measurement gap: 60% reported, 36% actual

`vitest.config.ts` excludes `src/components/**` from coverage, explaining that there is
"no jsdom/RTL setup yet, so they're structurally uncoverable."

**That premise is out of date.** `src/components/OpeningHoursDisplay.test.tsx` already
renders with jsdom and Testing Library via a `// @vitest-environment jsdom` docblock, and
four hook tests do the same. The infrastructure exists — the components simply aren't
tested, which is a different problem, and one the exclusion hides.

|                          | Statements | Branches | Functions | Lines  |
| ------------------------ | ---------- | -------- | --------- | ------ |
| Reported (before)        | 60.41%     | 60.77%   | 53.90%    | 61.80% |
| Actual (before)          | 35.63%     | 30.26%   | 25.81%    | 36.30% |
| After the first commit   | 39.82%     | 33.48%   | 30.85%    | 40.45% |
| **Reported now**         | **42.13%** | 35.34%   | 34.39%    | 42.67% |

The reported and actual figures are now the same number — that was the point of P1. The
"actual (before)" row counted server components too; the enforced config still excludes
those, which is why the current figure isn't simply the old actual plus the new tests.

Per area (statements), before → after the first pass:

| Area                    | Before | After  | Notes                                    |
| ----------------------- | ------ | ------ | ---------------------------------------- |
| `src/app/api`           | ~90.5% | ~98%   | Every rejection branch now covered       |
| `src/lib`               | 80.5%  | 87.1%  | Strong                                   |
| `src/hooks`             | 38.1%  | 44.9%  | 8 of 14 hooks still at 0%                |
| `src/app` (pages, SEO)  | ~0%    | 50%    | sitemap/robots/manifest done; OG at 0%   |
| `src/components`        | 2.4%   | 2.4%   | 5,507 lines, 24 files, 1 has a test      |

### What's already solid

- `opening-hours.ts` at 98% — the hardest logic in the repo
- `israel-areas.ts` at 100%, the `geocode` route at 96%
- 18 of 26 `src/lib` modules have a dedicated test file
- Crawler middleware fully covered, including the negative cases
- CI runs lint, `tsc --noEmit`, dataset validation, tests, and build
- `validate:data` covers the dataset itself, not just the code

---

## 2. Findings, prioritised by risk × effort

### P1 — Stop excluding components, and put a floor under the number ✅ DONE

_measurement · ~1 hour_

> `vitest.config.ts` — `exclude: ["src/components/**", "src/app/**/page.tsx", …]`
> No `thresholds` block. CI runs `npm test`, never `npm run coverage`.

Two problems compound: the denominator hides the gap, and nothing stops it widening. Drop
the `src/components/**` exclusion, accept the honest 36%, then set `coverage.thresholds`
just under current actuals and run coverage in CI. A ratchet that only moves up is worth
more than any single test below — it makes every later item stick.

### P2 — The filtering pipeline is the product, and it has no tests

_correctness · ~1 day_

> `src/components/IsraelCoffeeGuide.tsx:681–760` — inside a 1,222-line component, 0% covered.
> 7 predicates · brew-method aliasing · region & hidden rules · 2 sort modes.

`shopsMatchingNonRegionFilters` and `filteredShops` are pure functions of
(shops, filters, favorites, userLocation) — trivially unit-testable, but currently
unreachable because they're inline `useMemo` bodies. They encode real domain rules no type
checker can guard: selecting פילטר must also match V60, קולד ברו must also match חליטה
קרה, workshops bypass the open-now check, online-only places ignore the region filter.

The code's own comment notes this logic "had already drifted between the two" copies before
being consolidated — the exact regression a test would have caught.

While extracting, note a **latent inconsistency**: the region chip counts
(`availableRegions`) iterate `shopsMatchingNonRegionFilters`, which never applies
`!shop.hidden`, while the visible list (`filteredShops`) does. Counts will overstate the
moment anyone hides a cafe. Dormant today — the dataset has zero hidden rows across 153
places.

**Proposed**

- Extract to `src/lib/shop-filters.ts` as `applyFilters()` and `regionCounts()`
- Table-driven tests per predicate, plus the alias pairs and the workshops exemptions
- Assert list and chip counts stay consistent when a shop is hidden
- Cover both sort modes: distance when GPS is known, Hebrew collation otherwise

### P3 — `jsonLdScript` escapes six injection sites and is untested ✅ DONE

_security-adjacent · ~30 min_

> `src/lib/structured-data.ts:17` — `JSON.stringify(data).replace(/</g, "\\u003c")`
> Feeds 6 `dangerouslySetInnerHTML` sites across `page.tsx`, `cafe/`, `city/`, `theme/`.

This one-liner is the only thing preventing a `</script>` in string data from breaking out
of a JSON-LD tag, and no test pins its behaviour. Its docstring says "the data here is
build-time/static today" — **that is no longer true**: `/cafe/[id]` now passes
user-submitted Supabase reviews into `cafeJsonLd`, so attacker-controlled author names and
review bodies reach the escape. Worth both a test and a docstring correction.

**Proposed**

- Round-trip a review whose author and text contain `</script><img onerror=…>`
- Assert no raw `<` survives, and that the output still `JSON.parse`s back to the input
- Cover the four untested builders alongside it: `breadcrumbJsonLd`,
  `namedItemListJsonLd`, `cityItemListJsonLd`, `itemListJsonLd`

### P4 — The review path is tested on success and untested on every failure ✅ DONE

_correctness · ~half day_

> `src/app/api/reviews/route.ts` — 85% stmts; uncovered lines **39, 48, 63, 79, 98**
> = invalid JSON · bad cafe id · 503 unconfigured · 502 insert failed · 502 network throw
> `src/lib/reviews-server.ts` — **0%**, 93 lines, the SSR read path

Every uncovered line in the write route is an error branch, and this is the one place in
the app that accepts untrusted input. The server-side reader is worse: entirely untested,
despite carrying an 8-second `AbortSignal` timeout whose whole purpose is to stop a slow
Supabase from failing the static build of all 153 cafe pages — a guard that only ever runs
in the failure case nobody exercises.

**Proposed**

- One test per rejection branch in the POST route, asserting status and body
- `fetchCafeReviews`: unset env, placeholder/non-http URL, non-OK response, thrown fetch,
  and timeout — each must degrade to `[]`, never throw
- `mapRow` fallbacks: null author → אנונימי, null rating → 5, null id → dropped

### P5 — The rate limiter has no test of its own ✅ DONE

_correctness · ~30 min_

> `src/lib/rate-limit.ts` — 82% stmts, line 27 (the eviction sweep) uncovered.
> Exercised only incidentally, through two route tests.

A shared anti-abuse primitive used by both API routes, verified only as a side effect of
testing something else. The behaviours that matter most are the ones no route test reaches:

- The window actually **resets** after `windowMs` (a limiter that never releases is as
  broken as one that never limits)
- The `maxKeys` sweep bounds memory on a warm serverless instance
- `clientIp` takes the first entry of a comma-separated `x-forwarded-for` before falling
  back to `x-real-ip` then `"unknown"` — get that precedence wrong and every visitor
  shares one bucket

### P6 — Nine of fourteen hooks sit at 0%, including one with a confirmed bug ⚠️ PARTIAL

_correctness · ~1 day — the `useFavorites` bug is fixed; the other hooks remain untested_

> 0%: `useReviews` (165 lines) · `useOfflineSupport` (117) · `useMapLifecycle` (112) ·
> `useMapSelection` (90) · `useFavorites` · `useRatings` · `useOnlineStatus` ·
> `useReducedMotion` · `useIsMobileSafari`
> Precedent exists: `usePlaceData.hook.test.tsx`, `useGeolocation.test.tsx`

`useReviews` is the priciest gap — it merges fetched reviews with seeded ones, dedupes by
id, cancels in-flight requests, invalidates a per-shop cache on retry, and maps a 429 to a
specific Hebrew message. All of that is stateful, all of it is user-visible, none of it is
tested.

**A confirmed bug found while auditing.** `useFavorites` writes an empty array over the
stored favorites before hydrating them. Mounting the hook with `["a","b"]` in storage
produces the write sequence `["[]", "[\"a\",\"b\"]"]` — the persist effect
(`useFavorites.ts:27-29`) runs against the initial state before the hydrate effect's
re-render lands. It self-heals within the same commit, so it's invisible in normal use, but
a page teardown inside that window silently wipes the user's saved cafes.

**Fixed.** The persist effect is now gated on a `hydrated` flag, and
`src/hooks/useFavorites.test.tsx` pins it — the regression test fails against the previous
implementation. The same commit wraps both storage calls in `try`/`catch`, so a private-mode
browser no longer throws out of the hook (two of the new tests covered that gap too).

### P7 — The SEO surface generates 160+ URLs with nothing checking them ✅ DONE

_correctness · ~2 hours_

> `src/app/sitemap.ts`, `robots.ts`, `manifest.ts` — all 0%.
> AI crawler list duplicated: `robots.ts` (11 names) vs `middleware.ts` (14).

The sitemap emits an entry per cafe, city and theme, with Hebrew city names passed through
`encodeURIComponent` and `lastModified` read from the dataset. Nothing asserts the URLs are
unique, absolute, correctly encoded, or that a malformed `_last_updated` doesn't produce an
`Invalid Date` — which would ship a broken sitemap silently, since the build won't complain.

Separately, the two crawler lists have drifted apart. That may well be deliberate (robots
welcomes citation crawlers; middleware logs a wider set including Bytespider and
Amazonbot), but nothing records the intent, so the next edit to either list is a guess. A
test asserting the intended relationship turns that into documentation.

### P8 — The filter reducer is well tested; its wiring isn't ✅ DONE

_correctness · ~20 min_

> `src/hooks/useFilters.ts` — 61% stmts but only 35.7% of functions.
> Uncovered: lines 127–136, the ten action creators.

`filterReducer` has thorough tests, but the ten dispatchers that connect the UI to it
don't. A copy-paste slip — `toggleNoMatcha` dispatching `TOGGLE_ONLINE_ONLY` — passes the
type checker, passes every existing test, and breaks two filters in production. Ten
one-line assertions close it.

---

## 3. Suggested sequencing

**First pass (~1 day)** — closes the highest risk per hour spent

1. ~~Drop the components exclusion, add thresholds, run coverage in CI~~ ✅ (P1)
2. ~~`jsonLdScript` escaping + the four untested JSON-LD builders~~ ✅ (P3)
3. ~~Direct `rate-limit` tests, window reset included~~ ✅ (P5)
4. ~~The five error branches in the reviews POST route~~ ✅ (P4)
5. ~~`useFilters` dispatchers~~ ✅ (P8)
6. ~~Sitemap invariants: unique, absolute, encoded, valid dates~~ ✅ (P7)

The first pass is complete.

**Second pass (~2–3 days)** — the structural work

1. Extract the filter pipeline to `src/lib/shop-filters.ts` and test it properly (P2)
2. `useReviews` — the client half of the review round trip; `reviews-server` is done (P6)
4. Render tests for `ShopCard`, `FilterChip`, `ErrorBoundary` — small, high-traffic, easy
   wins now that the exclusion is gone

**One thing to _not_ test:** `generateBlurPlaceholder` in `src/lib/image-utils.ts` has zero
call sites anywhere in `src`. It's the reason that module sits at 35%. Delete it rather
than write a canvas mock for it.

---

## Appendix: how these numbers were produced

Reported figures come from `npm run coverage` as configured. The actual figures come from
re-running the same 318 tests against a temporary config that keeps the `src/types/**`,
`src/data/**` and test-file exclusions but removes the component and page exclusions — same
tests, honest denominator. The temporary config was deleted afterwards.

The `useFavorites` bug in P6 was verified empirically, not inferred: a throwaway test spied
on `Storage.prototype.setItem` during `renderHook` and recorded the write sequence. That
probe was removed too — the finding is reproducible from the description in P6.
