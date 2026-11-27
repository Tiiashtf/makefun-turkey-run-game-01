// The game's rules and state, with no drawing and no browser in it: the turkey, the farmer,
// the pool of knives, oven flames, fences, haystacks and corn, spawning, collisions, score,
// lives and the three stages. step() advances one fixed step and returns what happened as
// bit flags, so the caller can react without the world knowing about screens or sound.
// Nothing here allocates after createWorld returns.

import {
  CORN, ESCAPE_DISTANCE, FARMER, FENCE, FIELD, FLAME, HAYSTACK, KNIFE, LIVES,
  POOL_SIZE, SCORE, STAGES, TURKEY,
} from './config.js';
import { createTurkey } from './turkey.js';
import { createFarmer } from './farmer.js';

export const KIND_KNIFE = 0;
export const KIND_CORN = 1;
export const KIND_FENCE = 2;
export const KIND_FLAME = 3;
export const KIND_HAY = 4;

export const EVENT_HIT = 1;
export const EVENT_CORN = 2;
export const EVENT_OVER = 4;
export const EVENT_ESCAPED = 8;
export const EVENT_STAGE = 16;
export const EVENT_HIDE = 32;
export const EVENT_DODGE = 64;

function overlaps(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function createWorld(random) {
  const turkeyApi = createTurkey();
  const farmerApi = createFarmer();
  const turkey = turkeyApi.turkey;
  const farmer = farmerApi.farmer;

  const pool = [];
  for (let i = 0; i < POOL_SIZE; i += 1) {
    pool.push({ active: false, kind: KIND_KNIFE, x: 0, y: 0, width: 0, height: 0, speed: 0, timer: 0, phase: 0, passed: false });
  }

  const state = {
    turkey,
    farmer,
    items: pool,
    score: 0,
    distance: 0,
    lives: LIVES,
    stageIndex: 0,
    stageName: STAGES[0].name,
    over: false,
    escaped: false,
    reason: '',
    /** Distance in metres at the last stage change, for the stage banner. */
    stageAt: 0,
    /** Seconds the stage banner stays up. */
    stageBanner: 0,
    /** Parallax scroll offsets, one per layer. */
    scroll: [0, 0, 0],
    time: 0,
  };

  let spawnTimer = 1.2;
  let cornTimer = 0.8;
  let hayTimer = 6;
  let lastEvents = { hit: false, corn: 0, hide: false };

  function stage() {
    return STAGES[Math.min(state.stageIndex, STAGES.length - 1)];
  }

  function spawn(kind) {
    for (let i = 0; i < pool.length; i += 1) {
      const item = pool[i];
      if (item.active) continue;
      item.active = true;
      item.kind = kind;
      item.passed = false;
      item.timer = 0;
      item.phase = 0;
      if (kind === KIND_KNIFE) {
        item.width = KNIFE.width;
        item.height = KNIFE.height;
        item.x = random.range(FIELD.width + 40, FIELD.width + 320);
        item.y = -KNIFE.height - random.range(0, 120);
        item.speed = KNIFE.fallSpeed + KNIFE.fallSpeedPerStage * state.stageIndex + random.range(-40, 60);
      } else if (kind === KIND_CORN) {
        item.width = CORN.size;
        item.height = CORN.size;
        item.x = FIELD.width + 40;
        item.y = FIELD.groundY - CORN.size - random.range(30, CORN.arc);
        item.speed = 0;
      } else if (kind === KIND_FENCE) {
        item.width = FENCE.width;
        item.height = FENCE.height;
        item.x = FIELD.width + 40;
        item.y = FIELD.groundY - FENCE.height;
        item.speed = 0;
      } else if (kind === KIND_FLAME) {
        item.width = FLAME.width;
        item.height = FLAME.height;
        item.x = FIELD.width + 40;
        item.y = FIELD.groundY - FLAME.height;
        item.speed = 0;
        item.timer = FLAME.warn;
        item.phase = 0; // 0 = warning smoke, 1 = burning
      } else if (kind === KIND_HAY) {
        item.width = HAYSTACK.width;
        item.height = HAYSTACK.height;
        item.x = FIELD.width + 40;
        item.y = FIELD.groundY - HAYSTACK.height;
        item.speed = 0;
      }
      return item;
    }
    return null;
  }

  function spawnHazard() {
    const roll = random.next();
    const s = stage();
    if (roll < s.knife) spawn(KIND_KNIFE);
    else if (roll < s.knife + s.flame) spawn(KIND_FLAME);
    else spawn(KIND_FENCE);
  }

  function reset() {
    turkeyApi.reset();
    farmerApi.reset();
    for (let i = 0; i < pool.length; i += 1) pool[i].active = false;
    state.score = 0;
    state.distance = 0;
    state.lives = LIVES;
    state.stageIndex = 0;
    state.stageName = STAGES[0].name;
    state.over = false;
    state.escaped = false;
    state.reason = '';
    state.stageAt = 0;
    state.stageBanner = 2.5;
    state.scroll = [0, 0, 0];
    state.time = 0;
    spawnTimer = 1.2;
    cornTimer = 0.8;
    hayTimer = 6;
    lastEvents = { hit: false, corn: 0, hide: false };
  }

  function hitTurkey() {
    if (turkey.invulnerable > 0 || turkey.hidden) return 0;
    state.lives -= 1;
    turkey.invulnerable = TURKEY.invulnerable;
    lastEvents.hit = true;
    if (state.lives <= 0) {
      state.over = true;
      state.reason = 'caught';
      return EVENT_HIT | EVENT_OVER;
    }
    return EVENT_HIT;
  }

  /**
   * Advance one fixed step. `direction` is -1, 0 or 1; `actions` carries the one-shot
   * inputs for this step (jump, dash, hide). `attract` runs the title-screen demo, where
   * the turkey runs on its own and nothing can hurt it.
   */
  function step(dt, direction, actions, attract) {
    let events = 0;
    state.time += dt;
    const s = stage();
    const scrollSpeed = s.scroll;

    // The turkey and the farmer.
    if (actions.jump) turkeyApi.jump();
    if (actions.dash) turkeyApi.dash();
    if (actions.hide && !attract) {
      // Hiding only works while overlapping a haystack.
      for (let i = 0; i < pool.length; i += 1) {
        const item = pool[i];
        if (item.active && item.kind === KIND_HAY && overlaps(turkey, item)) {
          if (turkeyApi.startHide()) {
            lastEvents.hide = true;
            events |= EVENT_HIDE;
            state.score += SCORE.hide;
          }
          break;
        }
      }
    }
    turkeyApi.update(dt, attract ? 0 : direction);

    // Distance and score tick up with the run; the stage advances with distance.
    state.distance += (scrollSpeed * dt) / 10;
    state.score += SCORE.perMetre * (scrollSpeed * dt) / 10;
    if (state.stageIndex < STAGES.length - 1 && state.distance >= STAGES[state.stageIndex].end) {
      state.stageIndex += 1;
      state.stageName = STAGES[state.stageIndex].name;
      state.stageAt = state.distance;
      state.stageBanner = 2.5;
      events |= EVENT_STAGE;
    }
    if (state.stageBanner > 0) state.stageBanner -= dt;

    // Spawning: hazards, corn and the occasional haystack to hide in.
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnHazard();
      spawnTimer = s.spawn * random.range(0.75, 1.25);
    }
    cornTimer -= dt;
    if (cornTimer <= 0) {
      spawn(KIND_CORN);
      if (random.next() < 0.4) spawn(KIND_CORN);
      cornTimer = random.range(1.1, 2.1);
    }
    hayTimer -= dt;
    if (hayTimer <= 0) {
      spawn(KIND_HAY);
      hayTimer = random.range(9, 15);
    }

    // Move everything with the world, update flames, resolve collisions.
    for (let i = 0; i < pool.length; i += 1) {
      const item = pool[i];
      if (!item.active) continue;
      item.x -= scrollSpeed * dt;
      if (item.kind === KIND_KNIFE) {
        item.y += item.speed * dt;
        if (item.y > FIELD.height) {
          item.active = false;
          if (!item.passed && item.x + item.width > turkey.x && item.x < turkey.x + turkey.width) {
            // It fell past the turkey without hitting: a dodge.
            state.score += KNIFE.points;
            events |= EVENT_DODGE;
          }
          continue;
        }
      } else if (item.kind === KIND_FLAME) {
        item.timer -= dt;
        if (item.phase === 0 && item.timer <= 0) {
          item.phase = 1;
          item.timer = FLAME.burn;
        } else if (item.phase === 1 && item.timer <= 0) {
          item.active = false;
          continue;
        }
      }
      if (item.x + item.width < -80) {
        item.active = false;
        continue;
      }

      if (attract || turkey.hidden) continue;
      if (item.kind === KIND_CORN) {
        if (overlaps(turkey, item)) {
          item.active = false;
          state.score += CORN.points;
          lastEvents.corn += 1;
          events |= EVENT_CORN;
        }
        continue;
      }
      if (item.kind === KIND_HAY) continue;
      if (item.kind === KIND_FENCE) {
        // A fence only hurts when the turkey runs into it on the ground; the
        // hitbox is inset a little, so a jump that just clears it counts.
        const body = { x: turkey.x + 8, y: turkey.y + 10, width: turkey.width - 16, height: turkey.height - 10 };
        const rail = { x: item.x + 6, y: item.y, width: item.width - 12, height: item.height };
        if (overlaps(body, rail)) {
          item.active = false;
          events |= hitTurkey();
        }
        continue;
      }
      if (item.kind === KIND_FLAME) {
        if (item.phase !== 1) continue;
        const body = { x: turkey.x + 10, y: turkey.y + 6, width: turkey.width - 20, height: turkey.height - 6 };
        if (overlaps(body, item)) {
          events |= hitTurkey();
        }
        continue;
      }
      // Knife: a forgiving body box, so near misses feel fair.
      const body = { x: turkey.x + 10, y: turkey.y + 4, width: turkey.width - 20, height: turkey.height - 8 };
      if (overlaps(body, item)) {
        item.active = false;
        events |= hitTurkey();
      }
    }

    // The farmer, then the catch check.
    const farmerEvents = { hit: lastEvents.hit, corn: lastEvents.corn, hide: lastEvents.hide };
    farmerApi.update(dt, turkey, farmerEvents);
    lastEvents = { hit: false, corn: 0, hide: false };
    if (!attract && !state.over && farmerApi.caught()) {
      state.over = true;
      state.escaped = false;
      state.reason = 'caught';
      events |= EVENT_OVER;
    }

    // Escaped: the forest ends and the turkey is free.
    if (!attract && !state.over && state.distance >= ESCAPE_DISTANCE) {
      state.over = true;
      state.escaped = true;
      state.reason = 'escaped';
      events |= EVENT_ESCAPED | EVENT_OVER;
    }

    // Parallax: near ground scrolls fastest.
    state.scroll[0] += scrollSpeed * 0.15 * dt;
    state.scroll[1] += scrollSpeed * 0.45 * dt;
    state.scroll[2] += scrollSpeed * dt;

    if (state.over) return events | (state.escaped ? EVENT_ESCAPED : 0);
    return events;
  }

  reset();
  return { state, reset, step, stage, FARMER };
}
