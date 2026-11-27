// All canvas drawing for Gobble Run: the three stages, the turkey, Farmer Bram, the
// hazards, the HUD and every screen. Nothing here changes game state; it paints what the
// world holds, scaled from the 1280x720 logical field to the window.

import { CORN, FIELD, FLAME, HAYSTACK, KNIFE, LIVES, PALETTE, STAGES } from './config.js';
import { KIND_CORN, KIND_FENCE, KIND_FLAME, KIND_HAY, KIND_KNIFE } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

function skyFor(stageIndex) {
  if (stageIndex === 1) return PALETTE.skyKitchen;
  if (stageIndex === 2) return PALETTE.skyForest;
  return PALETTE.skyFarm;
}

function groundFor(stageIndex) {
  if (stageIndex === 1) return PALETTE.groundKitchen;
  if (stageIndex === 2) return PALETTE.groundForest;
  return PALETTE.groundFarm;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(canvas.clientWidth * dpr);
    canvas.height = Math.floor(canvas.clientHeight * dpr);
  }
  window.addEventListener('resize', resize);
  resize();

  function drawSky(state) {
    const [top, bottom] = skyFor(state.stageIndex);
    const gradient = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    gradient.addColorStop(0, top);
    gradient.addColorStop(1, bottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    // A low autumn sun and drifting clouds.
    ctx.fillStyle = 'rgba(255, 236, 180, 0.9)';
    ctx.beginPath();
    ctx.arc(1080, 110, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 247, 230, 0.75)';
    for (let i = 0; i < 3; i += 1) {
      const cx = ((i * 430 + state.scroll[0] * -0.4) % 1500 + 1500) % 1500 - 110;
      ctx.beginPath();
      ctx.ellipse(cx, 90 + i * 46, 90, 22, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawHills(state) {
    ctx.fillStyle = state.stageIndex === 2 ? '#356b35' : '#a86a3c';
    for (let i = 0; i < 4; i += 1) {
      const x = ((i * 520 - state.scroll[1]) % 2080 + 2080) % 2080 - 260;
      ctx.beginPath();
      ctx.ellipse(x, FIELD.groundY + 30, 420, 130, 0, Math.PI, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawGround(state) {
    ctx.fillStyle = groundFor(state.stageIndex);
    ctx.fillRect(0, FIELD.groundY, FIELD.width, FIELD.height - FIELD.groundY);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.fillRect(0, FIELD.groundY, FIELD.width, 6);
    // Grass tufts and fallen leaves scrolling with the world.
    ctx.strokeStyle = state.stageIndex === 2 ? '#2f5d2c' : '#7a5a2e';
    ctx.lineWidth = 2;
    for (let i = 0; i < 40; i += 1) {
      const x = ((i * 97 - state.scroll[2]) % 1400 + 1400) % 1400 - 60;
      const y = FIELD.groundY + 18 + ((i * 37) % 70);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 4, y - 9);
      ctx.moveTo(x + 4, y);
      ctx.lineTo(x + 8, y - 8);
      ctx.stroke();
    }
    if (state.stageIndex === 1) {
      // Kitchen floorboards and a checkered mat under the barn kitchen.
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      for (let i = 0; i < 8; i += 1) ctx.fillRect(i * 170, FIELD.groundY + 60, 85, 42);
    }
  }

  function drawTurkey(turkey, time) {
    const { x, y, width, height } = turkey;
    if (turkey.hidden) return; // tucked inside a haystack, out of sight
    if (turkey.invulnerable > 0 && Math.floor(time * 12) % 2 === 0) return; // blink after a hit
    const bob = turkey.grounded ? Math.sin(turkey.runCycle * 2) * 2 : 0;
    const cy = y + bob;
    ctx.save();
    ctx.translate(x, cy);
    if (turkey.dashing) ctx.translate(6, 0);

    // Tail fan, fanned behind the body.
    for (let i = 0; i < 5; i += 1) {
      const angle = -0.9 + i * 0.45;
      const spread = turkey.grounded ? Math.sin(turkey.runCycle) * 0.06 : 0.25;
      ctx.save();
      ctx.translate(8, height * 0.55);
      ctx.rotate(angle + spread);
      ctx.fillStyle = PALETTE.turkeyTail[i % PALETTE.turkeyTail.length];
      ctx.beginPath();
      ctx.ellipse(-16, 0, 24, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // Body: a plump brown oval.
    ctx.fillStyle = PALETTE.turkeyBody;
    ctx.beginPath();
    ctx.ellipse(width * 0.5, height * 0.62, width * 0.48, height * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.turkeyDark;
    ctx.beginPath();
    ctx.ellipse(width * 0.5, height * 0.72, width * 0.34, height * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();
    // Wing, flapping while airborne.
    const wingLift = turkey.grounded ? Math.sin(turkey.runCycle * 2) * 3 : -14;
    ctx.fillStyle = PALETTE.turkeyDark;
    ctx.beginPath();
    ctx.ellipse(width * 0.48, height * 0.58 + wingLift, 18, 10, -0.4, 0, Math.PI * 2);
    ctx.fill();
    // Legs, running.
    ctx.strokeStyle = '#e8a33c';
    ctx.lineWidth = 4;
    const legSwing = turkey.grounded ? Math.sin(turkey.runCycle * 2) * 8 : 4;
    ctx.beginPath();
    ctx.moveTo(width * 0.42, height * 0.95);
    ctx.lineTo(width * 0.42 + legSwing, height + 8 - bob);
    ctx.moveTo(width * 0.58, height * 0.95);
    ctx.lineTo(width * 0.58 - legSwing, height + 8 - bob);
    ctx.stroke();
    // Neck and head.
    ctx.fillStyle = PALETTE.turkeyBody;
    ctx.fillRect(width * 0.74, height * 0.08, 12, height * 0.42);
    ctx.fillStyle = PALETTE.turkeyHead;
    ctx.beginPath();
    ctx.arc(width * 0.82, height * 0.14, 13, 0, Math.PI * 2);
    ctx.fill();
    // Beak, wattle and a worried eye.
    ctx.fillStyle = PALETTE.beak;
    ctx.beginPath();
    ctx.moveTo(width * 0.82 + 10, height * 0.12);
    ctx.lineTo(width * 0.82 + 24, height * 0.18);
    ctx.lineTo(width * 0.82 + 10, height * 0.22);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.wattle;
    ctx.beginPath();
    ctx.ellipse(width * 0.84, height * 0.26, 4, 7, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(width * 0.84, height * 0.11, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawFarmer(farmer, turkey, time) {
    const x = turkey.x - farmer.gap - 46;
    if (x < -90) return;
    const y = FIELD.groundY - 86;
    const swing = Math.sin(farmer.runCycle * 2) * 7;
    ctx.save();
    ctx.translate(x, y);
    // Legs and overalls.
    ctx.strokeStyle = '#2c2c34';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(18, 52);
    ctx.lineTo(18 + swing, 84);
    ctx.moveTo(30, 52);
    ctx.lineTo(30 - swing, 84);
    ctx.stroke();
    ctx.fillStyle = PALETTE.farmerOveralls;
    ctx.fillRect(10, 26, 30, 30);
    ctx.fillStyle = PALETTE.farmerShirt;
    ctx.fillRect(8, 14, 34, 16);
    // Arms reaching for the turkey.
    ctx.strokeStyle = PALETTE.farmerShirt;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(38, 22);
    ctx.lineTo(52, 14 + Math.sin(farmer.runCycle) * 3);
    ctx.moveTo(38, 30);
    ctx.lineTo(50, 30);
    ctx.stroke();
    // Head, straw hat and moustache.
    ctx.fillStyle = '#e8b98a';
    ctx.beginPath();
    ctx.arc(25, 8, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.farmerHat;
    ctx.beginPath();
    ctx.ellipse(25, 2, 20, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(16, -8, 18, 8);
    ctx.fillStyle = '#5a3a22';
    ctx.fillRect(18, 12, 14, 3);
    // A "!" when he is about to corner the turkey.
    if (farmer.mood === 'corner') {
      ctx.fillStyle = PALETTE.danger;
      ctx.font = 'bold 26px "Trebuchet MS", sans-serif';
      ctx.fillText('!', 44, -6);
    }
    if (farmer.mood === 'search') {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 22px "Trebuchet MS", sans-serif';
      ctx.fillText('?', 44, -6);
    }
    ctx.restore();
    // The catch-up meter: a red arrow showing how close he is.
    if (farmer.gap < 120) {
      ctx.fillStyle = 'rgba(229, 72, 77, 0.85)';
      ctx.font = 'bold 15px "Trebuchet MS", sans-serif';
      ctx.fillText('HE IS RIGHT BEHIND YOU!', 16, FIELD.groundY - 96);
    }
    void time;
  }

  function drawItem(item, time) {
    const { x, y, width, height } = item;
    if (item.kind === KIND_KNIFE) {
      const wobble = Math.sin(time * 6 + item.x * 0.01) * 3;
      ctx.save();
      ctx.translate(x + width / 2 + wobble, y + height / 2);
      ctx.rotate(0.35);
      ctx.fillStyle = PALETTE.knifeBlade;
      ctx.beginPath();
      ctx.moveTo(-6, -height / 2);
      ctx.lineTo(6, -height / 2);
      ctx.lineTo(6, 8);
      ctx.lineTo(0, 22);
      ctx.lineTo(-6, 8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = PALETTE.knifeHandle;
      ctx.fillRect(-7, -height / 2 - 14, 14, 16);
      ctx.restore();
    } else if (item.kind === KIND_CORN) {
      const bobY = Math.sin(time * 4 + item.x * 0.02) * 4;
      ctx.save();
      ctx.translate(x + width / 2, y + height / 2 + bobY);
      ctx.fillStyle = PALETTE.cornHusk;
      ctx.beginPath();
      ctx.ellipse(-10, 6, 8, 12, 0.5, 0, Math.PI * 2);
      ctx.ellipse(10, 6, 8, 12, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.corn;
      ctx.beginPath();
      ctx.ellipse(0, 0, 11, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d9a92e';
      for (let r = -1; r <= 1; r += 1) {
        ctx.fillRect(-8, r * 8, 16, 2);
      }
      ctx.restore();
    } else if (item.kind === KIND_FENCE) {
      ctx.fillStyle = PALETTE.fence;
      ctx.fillRect(x, y + 8, width, 8);
      ctx.fillRect(x, y + 30, width, 8);
      ctx.fillRect(x + 6, y, 8, height);
      ctx.fillRect(x + width - 14, y, 8, height);
    } else if (item.kind === KIND_FLAME) {
      if (item.phase === 0) {
        // Warning smoke from the oven vent.
        ctx.fillStyle = 'rgba(120, 120, 120, 0.55)';
        const puff = 1 - item.timer / FLAME.warn;
        for (let i = 0; i < 3; i += 1) {
          ctx.beginPath();
          ctx.arc(x + width / 2 + (i - 1) * 14, y + 10 - puff * 30 - i * 8, 8 + puff * 6, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#5a3a22';
        ctx.fillRect(x + 6, y + height - 12, width - 12, 12);
        ctx.fillStyle = '#e5484d';
        ctx.font = 'bold 18px "Trebuchet MS", sans-serif';
        ctx.fillText('!', x + width / 2 - 5, y - 6);
      } else {
        const flick = Math.sin(time * 22 + item.x) * 6;
        ctx.fillStyle = PALETTE.flameEdge;
        ctx.beginPath();
        ctx.moveTo(x, y + height);
        ctx.quadraticCurveTo(x + width / 2 + flick, y - 30, x + width / 2, y);
        ctx.quadraticCurveTo(x + width / 2 - flick, y - 30, x + width, y + height);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = PALETTE.flameMid;
        ctx.beginPath();
        ctx.moveTo(x + 12, y + height);
        ctx.quadraticCurveTo(x + width / 2 + flick, y + 10, x + width / 2, y + 30);
        ctx.quadraticCurveTo(x + width / 2 - flick, y + 10, x + width - 12, y + height);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = PALETTE.flameCore;
        ctx.beginPath();
        ctx.ellipse(x + width / 2, y + height - 34, 12, 26, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#5a3a22';
        ctx.fillRect(x + 6, y + height - 12, width - 12, 12);
      }
    } else if (item.kind === KIND_HAY) {
      ctx.fillStyle = PALETTE.hay;
      ctx.beginPath();
      ctx.ellipse(x + width / 2, y + height - 10, width / 2, height / 2 - 6, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#b8912a';
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i += 1) {
        ctx.beginPath();
        ctx.moveTo(x + 12 + i * 16, y + height - 14);
        ctx.lineTo(x + 18 + i * 16, y + 22 + (i % 2) * 8);
        ctx.stroke();
      }
      if (item.x < 700) {
        ctx.fillStyle = 'rgba(255, 247, 230, 0.9)';
        ctx.font = 'bold 14px "Trebuchet MS", sans-serif';
        ctx.fillText('HIDE — hold ↓', x + 4, y - 8);
      }
    }
    void KNIFE;
    void HAYSTACK;
    void CORN;
  }

  function drawHud(state, best) {
    ctx.fillStyle = PALETTE.panel;
    ctx.beginPath();
    ctx.roundRect(12, 12, 320, 92, 12);
    ctx.fill();
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 26px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Score ${Math.floor(state.score)}`, 26, 44);
    ctx.font = '18px "Trebuchet MS", sans-serif';
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText(`Distance ${Math.floor(state.distance)} m / ${1500} m`, 26, 72);
    ctx.fillText(`Best ${Math.floor(best)}`, 26, 94);
    // Hearts.
    for (let i = 0; i < LIVES; i += 1) {
      const hx = 360 + i * 40;
      ctx.fillStyle = i < state.lives ? PALETTE.wattle : 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.arc(hx, 30, 11, 0, Math.PI * 2);
      ctx.arc(hx + 14, 30, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(hx - 8, 34);
      ctx.lineTo(hx + 22, 34);
      ctx.lineTo(hx + 7, 52);
      ctx.closePath();
      ctx.fill();
    }
    // Stage badge.
    ctx.fillStyle = PALETTE.panel;
    ctx.beginPath();
    ctx.roundRect(960, 12, 308, 44, 12);
    ctx.fill();
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 20px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Stage ${state.stageIndex + 1}: ${state.stageName}`, 1114, 41);
    ctx.textAlign = 'left';
    // Farmer gap bar.
    ctx.fillStyle = PALETTE.panel;
    ctx.beginPath();
    ctx.roundRect(960, 64, 308, 40, 12);
    ctx.fill();
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '15px "Trebuchet MS", sans-serif';
    ctx.fillText('Farmer', 972, 90);
    const ratio = Math.max(0, Math.min(1, state.farmer.gap / 420));
    ctx.fillStyle = ratio > 0.4 ? PALETTE.good : ratio > 0.15 ? '#f2a33c' : PALETTE.danger;
    ctx.fillRect(1036, 76, 220 * ratio, 12);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.strokeRect(1036, 76, 220, 12);
    // Stage banner.
    if (state.stageBanner > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, state.stageBanner);
      ctx.fillStyle = 'rgba(43, 32, 24, 0.75)';
      ctx.beginPath();
      ctx.roundRect(390, 240, 500, 90, 16);
      ctx.fill();
      ctx.fillStyle = PALETTE.text;
      ctx.font = 'bold 34px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Stage ${state.stageIndex + 1}: ${state.stageName}`, 640, 282);
      ctx.font = '18px "Trebuchet MS", sans-serif';
      ctx.fillStyle = PALETTE.muted;
      ctx.fillText(state.stageIndex === 0 ? 'Run, turkey, run!' : state.stageIndex === 1 ? 'Mind the oven flames!' : 'Almost free — keep running!', 640, 314);
      ctx.restore();
      ctx.textAlign = 'left';
    }
  }

  function panel(x, y, width, height) {
    ctx.fillStyle = 'rgba(43, 32, 24, 0.88)';
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 18);
    ctx.fill();
    ctx.strokeStyle = 'rgba(232, 163, 60, 0.7)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  function drawTitle(state, best) {
    panel(290, 120, 700, 470);
    ctx.fillStyle = PALETTE.text;
    ctx.textAlign = 'center';
    ctx.font = 'bold 64px "Trebuchet MS", sans-serif';
    ctx.fillText('GOBBLE RUN', 640, 200);
    ctx.font = 'bold 28px "Trebuchet MS", sans-serif';
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText('The Great Turkey Escape', 640, 240);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '20px "Trebuchet MS", sans-serif';
    ctx.fillText('Thanksgiving is coming. Farmer Bram has the carving knife out.', 640, 300);
    ctx.fillText('Run the farmyard, the barn kitchen and the forest — and don\'t get caught.', 640, 330);
    ctx.fillStyle = '#f2c94c';
    ctx.font = 'bold 20px "Trebuchet MS", sans-serif';
    ctx.fillText('← → or A / D to run   •   Space / W to jump & flap   •   Shift to dash', 640, 380);
    ctx.fillText('Hold ↓ in a haystack to hide   •   P to pause   •   M to mute', 640, 410);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 26px "Trebuchet MS", sans-serif';
    ctx.fillText('Press SPACE or CLICK to start', 640, 470);
    if (best > 0) {
      ctx.font = '18px "Trebuchet MS", sans-serif';
      ctx.fillStyle = PALETTE.muted;
      ctx.fillText(`Best score: ${best}`, 640, 510);
    }
    ctx.fillStyle = 'rgba(255, 247, 230, 0.85)';
    ctx.font = '16px "Trebuchet MS", sans-serif';
    ctx.fillText('Corn +10  •  Dodge a knife +5  •  Hide +25  •  3 hearts  •  Escape at 1500 m', 640, 552);
    ctx.textAlign = 'left';
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(20, 14, 10, 0.55)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    panel(440, 260, 400, 180);
    ctx.fillStyle = PALETTE.text;
    ctx.textAlign = 'center';
    ctx.font = 'bold 40px "Trebuchet MS", sans-serif';
    ctx.fillText('Paused', 640, 330);
    ctx.font = '20px "Trebuchet MS", sans-serif';
    ctx.fillText('Press P or click to keep running', 640, 380);
    ctx.fillText('R restarts the run', 640, 410);
    ctx.textAlign = 'left';
  }

  function drawOver(state, best) {
    const escaped = state.escaped;
    panel(340, 130, 600, 440);
    ctx.textAlign = 'center';
    ctx.fillStyle = escaped ? PALETTE.good : PALETTE.danger;
    ctx.font = 'bold 54px "Trebuchet MS", sans-serif';
    ctx.fillText(escaped ? 'ESCAPED!' : 'CAUGHT!', 640, 210);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '22px "Trebuchet MS", sans-serif';
    ctx.fillText(
      escaped
        ? 'The turkey made it to the forest — Thanksgiving is cancelled!'
        : 'Farmer Bram got his turkey. Better luck next run!',
      640, 258,
    );
    ctx.font = 'bold 30px "Trebuchet MS", sans-serif';
    ctx.fillText(`Score ${Math.floor(state.score)}`, 640, 320);
    ctx.font = '20px "Trebuchet MS", sans-serif';
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText(`Distance ${Math.floor(state.distance)} m  •  Best ${Math.floor(best)}`, 640, 356);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 24px "Trebuchet MS", sans-serif';
    ctx.fillText('Press R or CLICK to run again', 640, 430);
    ctx.font = '18px "Trebuchet MS", sans-serif';
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText('Every run is a fresh escape — the farm never forgets.', 640, 500);
    ctx.textAlign = 'left';
  }

  function draw(state, screen, best) {
    const scaleX = canvas.width / FIELD.width;
    const scaleY = canvas.height / FIELD.height;
    const scale = Math.min(scaleX, scaleY);
    const offsetX = (canvas.width - FIELD.width * scale) / 2;
    const offsetY = (canvas.height - FIELD.height * scale) / 2;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#1b120c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);

    drawSky(state);
    drawHills(state);
    drawGround(state);
    for (let i = 0; i < state.items.length; i += 1) {
      const item = state.items[i];
      if (item.active) drawItem(item, state.time);
    }
    drawFarmer(state.farmer, state.turkey, state.time);
    drawTurkey(state.turkey, state.time);
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawHud(state, best);
    if (screen === SCREEN_TITLE) drawTitle(state, best);
    if (screen === SCREEN_PAUSED) drawPaused();
    if (screen === SCREEN_OVER) drawOver(state, best);
    void STAGES;
  }

  return { draw, resize };
}
