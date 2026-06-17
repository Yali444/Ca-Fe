/**
 * Conservative device-capability check, used to decide whether to opt into the
 * heavier-but-smoother map rendering path (redrawing tiles *during* a zoom
 * animation instead of only at the end).
 *
 * Deliberately biased toward `false`: we only return `true` when the available
 * signals clearly point to a capable device. The signals (deviceMemory,
 * hardwareConcurrency, Network Information) are coarse proxies and partly
 * non-standard — deviceMemory is Chromium-only, for instance — so a misread
 * should, at worst, leave the lighter default in place rather than make a weak
 * device worse. The only failure mode that hurts is a genuinely weak device
 * misdetected as strong, so the thresholds are kept high.
 */

interface NetworkInformation {
  saveData?: boolean;
  effectiveType?: string;
}

interface NavigatorWithHints extends Navigator {
  /** RAM in GB, rounded down to a power of two (Chromium only). */
  deviceMemory?: number;
  connection?: NetworkInformation;
}

export function isHighPerfDevice(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;

  // Honour explicit user / data-saving preferences — always stay light.
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return false;

  const nav = navigator as NavigatorWithHints;
  const conn = nav.connection;
  if (conn?.saveData) return false;
  if (conn?.effectiveType && /\b(slow-2g|2g|3g)\b/.test(conn.effectiveType)) return false;

  const cores = nav.hardwareConcurrency || 0;
  const mem = nav.deviceMemory;

  // When RAM is reported (Chromium), require strong signals on both axes.
  // When it isn't (Safari/Firefox), fall back to a high core count alone —
  // the only strong signal those browsers expose.
  if (typeof mem === "number") return mem >= 8 && cores >= 8;
  return cores >= 8;
}
