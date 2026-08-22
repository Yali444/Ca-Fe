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
      // A ratchet, not a target. These sit just under the current actuals, so
      // CI fails when a change lowers coverage rather than when it fails to
      // hit some aspirational number. Raise them as coverage improves; never
      // lower them to make a red build green.
      thresholds: {
        statements: 39,
        branches: 32,
        functions: 30,
        lines: 39,
      },
    },
  },
});
