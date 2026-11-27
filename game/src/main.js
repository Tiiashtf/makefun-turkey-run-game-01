// Boot and the one loop for Gobble Run: input is read once per frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the renderer paints
// what is there. The game moves between five screens: title, play, paused, and the two end
// screens, caught and escaped, which share the over screen.
//
// ?seed=N fixes the run's pattern. ?shot=start|play|kitchen|end (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets window.__shotReady for a
// screenshot. window.__game exposes the live state for play-testing.

import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './config.js';
import { createWorld, EVENT_CORN, EVENT_HIDE, EVENT_HIT, EVENT_OVER, EVENT_STAGE } from './world.js';
import { ACTION_CONFIRM, ACTION_DASH, ACTION_JUMP, ACTION_MUTE, ACTION_PAUSE, ACTION_RESTART, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  window.__game = {
    get screen() { return screen; },
    get state() { return world.state; },
    get best() { return best; },
  };

  // Screen readers (and anyone watching the page's text) hear the screen changes and each hit.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.unlock();
    audio.startMusic();
    audio.gobble();
    announce('Playing. Three hearts. Escape at 1500 metres.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    audio.stopMusic();
    if (world.state.escaped) audio.escaped();
    else audio.caught();
    if (world.state.score > best) {
      best = Math.floor(world.state.score);
      saveBest(best);
    }
    announce(world.state.escaped
      ? `Escaped! Score ${Math.floor(world.state.score)}. Best ${best}.`
      : `Caught. Score ${Math.floor(world.state.score)}. Best ${best}.`);
  }

  /** Screen-level actions, taken once per frame from the queued input. */
  function handleActions(actions) {
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Muted.' : 'Sound on.');
    }
    if (actions & ACTION_RESTART && screen !== SCREEN_TITLE) {
      startGame();
      return;
    }
    if (actions & (ACTION_CONFIRM | ACTION_JUMP)) {
      audio.unlock();
      if (screen === SCREEN_TITLE || screen === SCREEN_OVER) {
        startGame();
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
      return;
    }
    if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
  }

  /** One fixed step of play; `first` is true for the first step of this frame, which is the
   * only one that consumes the frame's one-shot jump and dash. */
  function step(actions, first) {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, 0, { jump: false, dash: false, hide: false }, true);
      return;
    }
    const worldActions = {
      jump: first && (actions & ACTION_JUMP) !== 0,
      dash: first && (actions & ACTION_DASH) !== 0,
      // Holding Down tries to hide whenever a haystack is under the turkey.
      hide: input.hiding(),
    };
    // A click also jumps while playing, so the mouse can play too.
    if (first && (actions & ACTION_CONFIRM) !== 0) worldActions.jump = true;
    if (worldActions.jump) audio.jump();
    if (worldActions.dash) audio.dash();

    const events = world.step(STEP, input.direction(), worldActions, false);
    if (events & EVENT_HIT) {
      audio.hit();
      announce(world.state.lives === 1 ? 'Hit. 1 heart left.' : `Hit. ${world.state.lives} hearts left.`);
    }
    if (events & EVENT_CORN) audio.corn();
    if (events & EVENT_HIDE) {
      audio.hide();
      announce('Hidden in the haystack. The farmer lost your trail.');
    }
    if (events & EVENT_STAGE) {
      audio.stageUp();
      announce(`Stage ${world.state.stageIndex + 1}: ${world.state.stageName}.`);
    }
    if (events & EVENT_OVER) endGame();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = input.takeActions();
    handleActions(actions);
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      let first = true;
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step(actions, first);
        first = false;
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best);
  }

  // Leaving the tab pauses a running game rather than letting knives fall unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Gobble Run. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
