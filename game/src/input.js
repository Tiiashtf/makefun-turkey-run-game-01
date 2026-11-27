// Keyboard and mouse input for Gobble Run. Keys are read as held state every frame and as
// one-shot actions (jump, dash, confirm, pause, restart, hide) that the loop consumes once.
// Clicks and taps on the canvas count as confirm, and as a jump while playing.

export const ACTION_JUMP = 1;
export const ACTION_DASH = 2;
export const ACTION_CONFIRM = 4;
export const ACTION_PAUSE = 8;
export const ACTION_RESTART = 16;
export const ACTION_HIDE = 32;
export const ACTION_MUTE = 64;

const JUMP_KEYS = new Set(['ArrowUp', 'KeyW', 'Space']);
const LEFT_KEYS = new Set(['ArrowLeft', 'KeyA']);
const RIGHT_KEYS = new Set(['ArrowRight', 'KeyD']);
const DOWN_KEYS = new Set(['ArrowDown', 'KeyS']);
const DASH_KEYS = new Set(['ShiftLeft', 'ShiftRight', 'KeyX']);

export function createInput(canvas) {
  let queued = 0;
  const held = new Set();
  /** The last pointer position, so menus can highlight what the mouse hovers. */
  const pointer = { x: 0, y: 0, inside: false };

  function queue(action) {
    queued |= action;
  }

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    held.add(event.code);
    if (JUMP_KEYS.has(event.code)) {
      queue(ACTION_JUMP);
      event.preventDefault();
    } else if (DASH_KEYS.has(event.code)) {
      queue(ACTION_DASH);
      event.preventDefault();
    } else if (event.code === 'Enter') {
      queue(ACTION_CONFIRM);
    } else if (event.code === 'Escape' || event.code === 'KeyP') {
      queue(ACTION_PAUSE);
    } else if (event.code === 'KeyR') {
      queue(ACTION_RESTART);
    } else if (event.code === 'KeyM') {
      queue(ACTION_MUTE);
    } else if (DOWN_KEYS.has(event.code)) {
      queue(ACTION_HIDE);
    }
    if (event.code === 'Space' || event.code.startsWith('Arrow')) event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    held.delete(event.code);
  });
  window.addEventListener('blur', () => {
    held.clear();
  });

  function trackPointer(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = event.clientX - rect.left;
    pointer.y = event.clientY - rect.top;
    pointer.inside = true;
  }
  canvas.addEventListener('pointermove', trackPointer);
  canvas.addEventListener('pointerdown', (event) => {
    trackPointer(event);
    queue(ACTION_CONFIRM);
  });
  canvas.addEventListener('pointerleave', () => {
    pointer.inside = false;
  });

  return {
    pointer,
    /** -1, 0 or 1 from the keys currently held down. */
    direction() {
      const left = [...LEFT_KEYS].some((code) => held.has(code));
      const right = [...RIGHT_KEYS].some((code) => held.has(code));
      if (left && !right) return -1;
      if (right && !left) return 1;
      return 0;
    },
    hiding() {
      return [...DOWN_KEYS].some((code) => held.has(code));
    },
    /** Take and clear every action queued since the last call. */
    takeActions() {
      const actions = queued;
      queued = 0;
      return actions;
    },
  };
}
