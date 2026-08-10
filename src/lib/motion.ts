/**
 * Momentum projection (Apple design §6 — "animate to where the gesture is
 * going"). Given a release velocity, projects how far the value would coast
 * before friction stops it — the same exponential-decay model iOS uses for
 * scroll deceleration and bottom-sheet dismissal.
 *
 * This is what lets a quick flick dismiss a sheet even when the finger barely
 * moved: the projected endpoint lands far past the drag distance, so intent is
 * read from momentum, not just position.
 *
 * From the *Designing Fluid Interfaces* (WWDC 2018) sample code. Note this is
 * the exponential form, NOT the physics-textbook `v²/(2·decel)`.
 */

/**
 * Picking `decelerationRate`: the projection scales as `dr / (1 - dr)`, so the
 * value matters a lot. `0.998` (the scroll-deceleration default) multiplies
 * velocity by ~0.499 — right for "where would this coast to", but far too eager
 * as a *dismiss* gate, where it would fire on a ~240 px/s drift. Sheet dismissal
 * therefore passes `0.995` (~0.199x) explicitly, which puts a pure-velocity
 * dismiss back at ~600 px/s — the deliberate flick the sheets used before
 * projection existed.
 *
 * @param initialVelocity release velocity in px/s (e.g. framer-motion's
 *   `info.velocity.y`)
 * @param decelerationRate ~0.998 for a normal scroll feel; lower is snappier
 * @returns projected additional travel in px (same sign as the velocity)
 */
export function projectMomentum(initialVelocity: number, decelerationRate = 0.998): number {
  return (initialVelocity / 1000) * decelerationRate / (1 - decelerationRate);
}
