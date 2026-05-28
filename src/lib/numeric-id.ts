/**
 * Convert a string place id (e.g. "cafe-12" or "matcha-shtrudel-tlv-abc123")
 * into a numeric id suitable for the `cafe_id` column on the reviews table.
 *
 * Strategy:
 *   - "cafe-<N>"   → N exactly. Preserves legacy row ids stored as integers.
 *   - anything else → 1_000_000 + (32-bit hash of the string) % 1_000_000.
 *     The offset keeps non-cafe ids well clear of the cafe-N range so the
 *     two never collide on the same row.
 *
 * This function is part of the database contract for the reviews table —
 * changing the algorithm orphans every existing review. The frozen outputs
 * are pinned by snapshot tests in numeric-id.test.ts.
 */
export function getNumericId(id: string): number {
  const cafeMatch = id.match(/^cafe-(\d+)$/);
  if (cafeMatch) {
    return parseInt(cafeMatch[1], 10);
  }

  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return 1000000 + Math.abs(hash % 1000000);
}
