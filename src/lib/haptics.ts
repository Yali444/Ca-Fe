/**
 * Tiny wrapper around the Vibration API for subtle tactile feedback on key
 * actions (favouriting, opening a place, a sheet snapping closed). A no-op on
 * devices/browsers without support (most desktops, iOS Safari) so call-sites
 * don't need to guard.
 *
 * A haptic pulse is a physical motion cue, so it's suppressed for anyone who
 * asked their OS for reduced motion (Apple design §13/§14) — the visual
 * feedback still carries the action.
 */
export function tapHaptic(duration = 10): void {
  if (typeof window === "undefined" || typeof navigator === "undefined") return;
  const nav = navigator as Navigator & { vibrate?: (pattern: number | number[]) => boolean };
  if (typeof nav.vibrate !== "function") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  try {
    nav.vibrate(duration);
  } catch {
    // Some browsers throw if called outside a user gesture — ignore.
  }
}
