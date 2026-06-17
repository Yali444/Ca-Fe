// One-off maintenance script: re-encode the cafe hero images in
// public/images/*.avif at their CURRENT dimensions with an efficient AVIF
// setting. Many of the source files were exported with a wasteful encoder, so
// re-encoding at the same resolution and a visually-transparent quality shrinks
// them dramatically without changing dimensions or perceived quality.
//
// Safety rules:
//   • Never resizes — dimensions are preserved exactly.
//   • Keeps the new file only when it is meaningfully smaller (< 95% of the
//     original), so already-efficient files are left untouched and nothing
//     ever grows.
//   • Only touches top-level *.avif (the cafe heroes); the emojis/ subfolder
//     and every other asset are ignored.
//
// Usage: node scripts/reencode-hero-images.mjs [quality]   (default 80)

import { readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const DIR = "public/images";
const QUALITY = Number(process.argv[2] || 80);
const EFFORT = 4; // higher = smaller/slower; 4 is a good one-off balance
const KEEP_IF_BELOW = 0.95; // only replace when new file is < 95% of original

const files = readdirSync(DIR).filter((f) => f.toLowerCase().endsWith(".avif"));

let origTotal = 0;
let newTotal = 0;
let replaced = 0;
let skipped = 0;

for (const file of files) {
  const path = join(DIR, file);
  const origSize = statSync(path).size;
  origTotal += origSize;

  // Re-encode the decoded pixels at the same size (no .resize() call).
  const buf = await sharp(path).avif({ quality: QUALITY, effort: EFFORT }).toBuffer();

  if (buf.length < origSize * KEEP_IF_BELOW) {
    writeFileSync(path, buf);
    newTotal += buf.length;
    replaced += 1;
  } else {
    newTotal += origSize; // kept original
    skipped += 1;
  }
}

const mb = (n) => (n / 1048576).toFixed(2);
console.log(
  `q${QUALITY}: ${files.length} files | replaced ${replaced}, kept ${skipped} | ` +
    `${mb(origTotal)}MB -> ${mb(newTotal)}MB (${Math.round((100 * newTotal) / origTotal)}%)`
);
