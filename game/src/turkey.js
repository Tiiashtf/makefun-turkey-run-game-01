// The turkey: its physics, its animation and its hide. The turkey runs at a home x and the
// player nudges it left or right; it jumps with gravity, flaps once more in the air, and can
// dash forward in a burst. Hiding ducks it into a haystack, where hazards pass it by.

import { FIELD, TURKEY } from './config.js';

export function createTurkey() {
  const turkey = {
    x: TURKEY.homeX,
    y: FIELD.groundY - TURKEY.height,
    width: TURKEY.width,
    height: TURKEY.height,
    vy: 0,
    grounded: true,
    flapsLeft: 1,
    /** Seconds of dash left, and its cooldown. */
    dashTime: 0,
    dashCooldown: 0,
    /** Seconds of hide left; 0 when not hiding. */
    hideTime: 0,
    /** Seconds of mercy left after a hit. */
    invulnerable: 0,
    /** Animation clock, advanced by the world. */
    runCycle: 0,
    /** 1 while dashing, for the renderer. */
    dashing: false,
    hidden: false,
  };

  function reset() {
    turkey.x = TURKEY.homeX;
    turkey.y = FIELD.groundY - TURKEY.height;
    turkey.vy = 0;
    turkey.grounded = true;
    turkey.flapsLeft = 1;
    turkey.dashTime = 0;
    turkey.dashCooldown = 0;
    turkey.hideTime = 0;
    turkey.invulnerable = 0;
    turkey.runCycle = 0;
    turkey.dashing = false;
    turkey.hidden = false;
  }

  function jump() {
    if (turkey.hideTime > 0) return false;
    if (turkey.grounded) {
      turkey.vy = TURKEY.jumpVelocity;
      turkey.grounded = false;
      turkey.flapsLeft = 1;
      return true;
    }
    if (turkey.flapsLeft > 0) {
      turkey.vy = TURKEY.flapVelocity;
      turkey.flapsLeft -= 1;
      return true;
    }
    return false;
  }

  function dash() {
    if (turkey.hideTime > 0 || turkey.dashCooldown > 0) return false;
    turkey.dashTime = 0.22;
    turkey.dashCooldown = 1.4;
    turkey.dashing = true;
    return true;
  }

  function startHide() {
    if (!turkey.grounded || turkey.hideTime > 0) return false;
    turkey.hideTime = TURKEY.hideTime;
    turkey.hidden = true;
    return true;
  }

  function update(dt, direction) {
    turkey.runCycle += dt * (turkey.grounded ? 11 : 4);
    if (turkey.invulnerable > 0) turkey.invulnerable -= dt;
    if (turkey.dashCooldown > 0) turkey.dashCooldown -= dt;

    if (turkey.hideTime > 0) {
      turkey.hideTime -= dt;
      if (turkey.hideTime <= 0) {
        turkey.hideTime = 0;
        turkey.hidden = false;
      }
      return;
    }

    // Horizontal nudge, drifting back toward home x when no key is held.
    const speed = TURKEY.runSpeed * (turkey.dashing ? 2.1 : 1);
    if (direction !== 0) {
      turkey.x += direction * speed * dt;
    } else {
      const drift = TURKEY.homeX - turkey.x;
      turkey.x += Math.max(-speed * dt, Math.min(speed * dt, drift));
    }
    turkey.x = Math.max(TURKEY.minX, Math.min(TURKEY.maxX, turkey.x));

    if (turkey.dashTime > 0) {
      turkey.dashTime -= dt;
      turkey.x = Math.min(TURKEY.maxX, turkey.x + TURKEY.runSpeed * 1.6 * dt);
      if (turkey.dashTime <= 0) turkey.dashing = false;
    }

    // Gravity and landing.
    turkey.vy += TURKEY.gravity * dt;
    turkey.y += turkey.vy * dt;
    const floor = FIELD.groundY - turkey.height;
    if (turkey.y >= floor) {
      turkey.y = floor;
      turkey.vy = 0;
      if (!turkey.grounded) turkey.flapsLeft = 1;
      turkey.grounded = true;
    } else {
      turkey.grounded = false;
    }
  }

  return { turkey, reset, jump, dash, startHide, update };
}
