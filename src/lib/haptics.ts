/**
 * Tiny wrapper around the Vibration API for subtle tactile feedback on key
 * actions (favouriting, opening a place). A no-op on devices/browsers without
 * support (most desktops, iOS Safari) so call-sites don't need to guard.
 */
export function tapHaptic(duration = 10): void {
  if (typeof navigator === "undefined") return;
  const nav = navigator as Navigator & { vibrate?: (pattern: number | number[]) => boolean };
  if (typeof nav.vibrate !== "function") return;
  try {
    nav.vibrate(duration);
  } catch {
    // Some browsers throw if called outside a user gesture — ignore.
  }
}
