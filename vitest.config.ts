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
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
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
        // React components — no jsdom/RTL setup yet, so they're
        // structurally uncoverable from these tests. Coverage of components
        // is a separate roadmap item.
        "src/components/**",
        "src/app/**/page.tsx",
        "src/app/**/layout.tsx",
        // Next.js routes and supabase client get integration coverage, not
        // unit coverage — already tested under src/app/api/.
        "src/supabaseClient.ts",
        // Static data files.
        "src/data/**",
      ],
    },
  },
});
