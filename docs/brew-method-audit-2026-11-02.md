# Brew-method repair — 2026-11-02

## Implemented

Five selectable methods, OR matching, counts after other filters, shared desktop/mobile state and URL support. Empty or unknown menus do not match a selected method. Zero counts remain visible. Existing responsive next/image sizes are retained; the configured source-width candidates now include 800 and 1200 pixels.

## Data evidence and remaining gaps

- IDs 84, 85, 86, 87, 88, 90, 91, 92, 93, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104: matcha is explicitly recorded in each existing description in public/data/cafes.json. Restore this known tag without assuming the rest of their menus. This is migration of existing evidence, NOT independent verification of all 19 current menus.
- ID 100: espresso also evidenced by the drink menu at https://wolt.com/he/isr/tel-aviv/restaurant/nolabakery (accessed 2026-11-02).
- IDs 97–99: espresso across Mela branches evidenced by https://www.shotim.co.il/coffee/dopo-florentin-tlv/ (accessed 2026-11-02).
- ID 115: remove the bean-sales label and preserve it in description. The existing record says roastery only, with no drinks served. https://chiccodicaffe.co.il/ lists beans and equipment, which does not establish a served-drink menu. No replacement brewing methods asserted.
- ID 136: https://brewbrothersco.com/ confirms a bean/equipment business, not a served-drink menu. Leave methods unknown.
- ID 143: https://concept-coffee.com/en confirms workshops by arrangement, not a walk-in cafe menu. Leave methods unknown.
- ID 7: Turkish → טורקי, retained in source.
- ID 60: מקינטה retained and now available as a filter.
- ID 124: שחור unchanged pending clarification; do not infer equivalence to טורקי.
- ID 160: deduplicate batch brew into פילטר.

The remaining espresso/filter/cold-brew availability for the imported matcha locations is unresolved. Missing tags mean unverified availability, not verified absence. Attempts to retrieve official menus at wlyt.co.il, anastasiatlv.co.il and the XOHO linked menu were unsuccessful; barcafe.co.il exposed no readable menu. Do not copy methods across branches without evidence.

## Image maintenance

Run `node scripts/optimize-cafe-heroes.mjs`. It uses referenced hero images only, limits width to 1200 without enlargement, encodes AVIF to <=150 KiB, updates JSON references and writes a per-image size report. Originals remain available for old cached pages. New content-hashed filenames avoid the existing immutable cache serving outdated files. next/image generates responsive variants on request; CSS `sizes` describes display width, not physical screen pixels.

## Validation

522 tests passed and TypeScript passed before generation of Next.js route types. Production webpack compilation passed, but the full build fails on the existing `size` export in src/app/opengraph-image/route.tsx (not changed in this patch). Browser QA has not been performed.
