// Farmer Bram, the chaser. He never leaves the screen's left edge: what the player sees is
// the gap between him and the turkey, which grows and shrinks with how the run is going.
// He gains when the turkey is hit, dawdles or is spotted out of a haystack; he loses ground
// when the turkey eats corn, hides well, or simply runs clean. At a zero gap he catches the
// turkey. His mood (chasing, searching, cornering) is drawn from the gap.

import { FARMER } from './config.js';

export const MOOD_CHASE = 'chase';
export const MOOD_SEARCH = 'search';
export const MOOD_CORNER = 'corner';

export function createFarmer() {
  const farmer = {
    /** Pixels behind the turkey; 0 means caught. */
    gap: FARMER.startGap,
    mood: MOOD_CHASE,
    /** Animation clock for his run cycle. */
    runCycle: 0,
    /** Seconds since the turkey was last spotted, for the searching mood. */
    lastSeen: 0,
  };

  function reset() {
    farmer.gap = FARMER.startGap;
    farmer.mood = MOOD_CHASE;
    farmer.runCycle = 0;
    farmer.lastSeen = 0;
  }

  function update(dt, turkey, events) {
    farmer.runCycle += dt * 10;
    farmer.lastSeen += dt;

    // A clean run slowly opens the gap; dawdling lets him creep closer.
    const turkeySpeed = turkey.dashing ? 1 : 0;
    farmer.gap += (5 + turkeySpeed * 6) * dt;
    farmer.gap -= FARMER.creepPerSecond * dt;

    if (events.hit) {
      farmer.gap -= FARMER.hitLoss;
      farmer.lastSeen = 0;
    }
    if (events.corn) farmer.gap += FARMER.cornGain * events.corn;
    if (events.hide) farmer.gap += FARMER.hideGain;

    farmer.gap = Math.max(0, Math.min(420, farmer.gap));

    if (turkey.hidden) {
      farmer.mood = MOOD_SEARCH;
      farmer.lastSeen = 0;
    } else if (farmer.gap < 60) {
      farmer.mood = MOOD_CORNER;
    } else {
      farmer.mood = MOOD_CHASE;
    }
  }

  /** True once the farmer has closed the gap. */
  function caught() {
    return farmer.gap <= FARMER.catchGap;
  }

  return { farmer, reset, update, caught };
}
