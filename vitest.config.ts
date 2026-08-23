import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}", "scripts/**/*.{test,spec}.{ts,tsx}"],
    globals: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        // Don't count tests themselves as code under test.
        "src/**/*.{test,spec}.{ts,tsx}",
        // Type-only declarations have no executable lines.
        "src/types/**",
        // Server components: they compose data helpers that are unit-tested on
        // their own, and rendering them needs a Next request context rather
        // than jsdom. Client components ARE counted — jsdom + RTL works via a
        // `// @vitest-environment jsdom` docblock (see OpeningHoursDisplay).
        "src/app/**/page.tsx",
        "src/app/**/layout.tsx",
        // Next.js routes and supabase client get integration coverage, not
        // unit coverage — already tested under src/app/api/.
        "src/supabaseClient.ts",
        // Static data files.
        "src/data/**",
      ],
      // A ratchet, not a target: CI fails when a change lowers coverage, not
      // when it misses some aspirational number.
      //
      // These sit ~2 points under the current actuals (42.13 / 35.34 / 34.39 /
      // 42.67). That headroom is deliberate. At 1 point the functions floor had
      // room for five uncovered functions, so a small untested helper on an
      // unrelated PR would redden the build — and the usual response to a
      // nuisance gate is to lower it, which defeats the whole thing. Two points
      // still trips on anything substantial (~50 uncovered lines) while letting
      // a small addition through.
      //
      // Raise them as coverage improves — that is the ratchet turning. Lower
      // them only as a deliberate, explained decision, never to green a build.
      thresholds: {
        statements: 40,
        branches: 33,
        functions: 32,
        lines: 40,
      },
    },
  },
});
