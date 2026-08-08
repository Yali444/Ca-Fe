/**
 * Generates the PWA icon set (192px and 512px) from the master logo so the web
 * app manifest (src/app/manifest.ts) has properly sized, installable icons.
 *
 * Idempotent and safe to run in `prebuild`: the source logo is committed, so
 * this needs no network or credentials. Run via `npm run build:icons`.
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";

const publicImages = path.join(process.cwd(), "public", "images");
const source = path.join(publicImages, "ca_fe_logo.png");

const SIZES = [192, 512] as const;

async function main() {
  if (!fs.existsSync(source)) {
    console.warn(`[build-icons] source logo missing at ${source} — skipping.`);
    return;
  }

  for (const size of SIZES) {
    const out = path.join(publicImages, `icon-${size}.png`);
    await sharp(source)
      .resize(size, size, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toFile(out);
    console.log(`[build-icons] wrote ${path.relative(process.cwd(), out)}`);
  }
}

main().catch((err) => {
  // Non-fatal: never break the build over icon generation.
  console.warn("[build-icons] failed:", err instanceof Error ? err.message : err);
});
