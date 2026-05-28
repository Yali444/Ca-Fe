import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "cafe-guide-web__archived/**",
    // Ad-hoc CLI scripts (data migrations, one-off fixes). These use Node
    // CJS, aren't shipped to production, and don't need to satisfy the
    // production tsconfig/eslint contract.
    "scripts/**",
    // Service worker — third-party-style code that uses globals we don't
    // type. Linted by the browser, not the Next bundler.
    "public/**",
  ]),
]);

export default eslintConfig;
