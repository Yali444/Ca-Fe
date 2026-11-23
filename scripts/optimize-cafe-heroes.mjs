// Optimize only referenced cafe heroes; retain originals for old cached pages.
// Content hashes avoid stale bytes under the immutable image cache policy.
import { readFile, writeFile, stat } from 'node:fs/promises';
import { basename, extname } from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
sharp.concurrency(2);
const path = 'public/data/cafes.json';
const cafes = JSON.parse(await readFile(path, 'utf8'));
const report = [];
for (const src of new Set(cafes.map(c => c.heroImage).filter(s => s?.startsWith('/images/')))) {
 const input = 'public' + src;
 const before = (await stat(input)).size;
 const meta = await sharp(input).metadata();
 if (before <= 150 * 1024 && meta.width <= 1200 && /\.avif$/i.test(src)) continue;
 let output, quality;
 for (quality of [75, 65, 55, 45]) {
  output = await sharp(input).rotate().resize({ width: 1200, withoutEnlargement: true }).avif({ quality, effort: 2 }).toBuffer();
  if (output.length <= 150 * 1024) break;
 }
 if (output.length > 150 * 1024) throw new Error(`Quality floor reached: ${src}`);
 const hash = createHash('sha256').update(output).digest('hex').slice(0, 10);
 const stem = basename(src, extname(src)).replace(/\s+/g, '_');
 const dest = `/images/${stem}.${hash}.avif`;
 await writeFile('public' + dest, output);
 for (const cafe of cafes) if (cafe.heroImage === src) cafe.heroImage = dest;
 report.push({src, dest, before, after: output.length, quality});
}
await writeFile(path, JSON.stringify(cafes, null, 2) + '\n');
await writeFile('scripts/cafe-hero-optimization-report.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({images: report.length, before: report.reduce((s,r)=>s+r.before,0), after:report.reduce((s,r)=>s+r.after,0)}));
