// The screenshot scenes behind ?shot=start|play|kitchen|end. Each one plays the real rules
// forward from a fresh world for a fixed number of steps, steered by a simple autopilot that
// jumps over fences and flames, dodges knives and grabs corn, so the frame is what a real
// game looks like and the same seed always gives the same frame.

import { FIELD, STEP } from './config.js';
import { EVENT_OVER, KIND_FLAME, KIND_FENCE, KIND_KNIFE } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 14;
const KITCHEN_SECONDS = 40;
const END_LIMIT_SECONDS = 900;
const SAMPLE = 1 / 30;

/**
 * How close a ground hazard must be, in pixels, before the autopilot jumps: the jump's
 * airtime is about 0.75 s, and the fence needs about 0.4 s to pass under the turkey, so
 * jumping in this window keeps the turkey above the fence for the whole pass. While
 * airborne over a hazard it flaps once to stay up.
 */
const JUMP_GAP = 70;

/** The nearest ground hazard ahead of the turkey, within lookahead distance. */
function groundHazardAhead(state) {
  const turkey = state.turkey;
  let nearest = null;
  for (let index = 0; index < state.items.length; index += 1) {
    const item = state.items[index];
    if (!item.active) continue;
    if (item.kind !== KIND_FENCE && item.kind !== KIND_FLAME) continue;
    if (item.kind === KIND_FLAME && item.phase !== 1) continue;
    const gap = item.x - (turkey.x + turkey.width);
    if (gap < -60 || gap > 320) continue;
    if (nearest === null || gap < nearest.gap) nearest = { item, gap };
  }
  return nearest;
}

/** A knife about to land on the turkey's lane. */
function knifeThreat(state) {
  const turkey = state.turkey;
  for (let index = 0; index < state.items.length; index += 1) {
    const item = state.items[index];
    if (!item.active || item.kind !== KIND_KNIFE) continue;
    if (item.x + item.width < turkey.x - 10 || item.x > turkey.x + turkey.width + 10) continue;
    const fallTime = (turkey.y - item.y) / Math.max(1, item.speed);
    if (fallTime > 0 && fallTime < 0.45) return item;
  }
  return null;
}

/** Jump for a ground hazard, flap to stay over it, dash sideways from a knife. */
function autopilot(state) {
  const turkey = state.turkey;
  const actions = { jump: false, dash: false, hide: false };
  const hazard = groundHazardAhead(state);
  if (hazard) {
    if (turkey.grounded && hazard.gap < JUMP_GAP) {
      actions.jump = true;
    } else if (!turkey.grounded && turkey.flapsLeft > 0 && turkey.vy > 0 && hazard.gap < 40) {
      actions.jump = true; // flap once to stay above the fence or flame
    }
  }
  if (!hazard && knifeThreat(state)) {
    actions.dash = turkey.x < FIELD.width / 2;
    if (!actions.dash && turkey.grounded) actions.jump = true;
  }
  return { actions, direction: 0 };
}

/** Step the world with the autopilot until `stop` says enough, or the limit is hit. */
function playForward(world, seconds, stop) {
  const limit = Math.floor(seconds / STEP);
  for (let index = 0; index < limit; index += 1) {
    const { actions, direction } = autopilot(world.state);
    const events = world.step(STEP, direction, actions, false);
    if (events & EVENT_OVER) return true;
    if (stop && stop(world.state)) return false;
  }
  return false;
}

/**
 * Set `world` to the named scene (start, play, kitchen or end; any other name is start)
 * and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'play') {
    playForward(world, PLAY_SECONDS, null);
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'kitchen') {
    playForward(world, KITCHEN_SECONDS, (state) => state.stageIndex >= 1 && state.items.some((item) => item.active && item.kind === KIND_FLAME && item.phase === 1));
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'end') {
    const over = playForward(world, END_LIMIT_SECONDS, (state) => state.escaped);
    if (!over && !world.state.escaped) {
      // The autopilot ran out of road: nudge the run to the forest's end and let the
      // real escape rule fire, so the shot still shows the genuine end screen.
      world.state.distance = 1499;
    }
    for (let index = 0; index < 120; index += 1) {
      const { actions, direction } = autopilot(world.state);
      if (world.step(STEP, direction, actions, false) & EVENT_OVER) break;
    }
    return { screen: SCREEN_OVER, best: world.state.score };
  }
  for (let index = 0; index < START_SECONDS / STEP; index += 1) {
    world.step(STEP, 0, { jump: false, dash: false, hide: false }, true);
  }
  return { screen: SCREEN_TITLE, best: 0 };
}
