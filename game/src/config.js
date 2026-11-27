// Every tuning number and colour in one place for Gobble Run: The Great Turkey Escape.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the window,
// so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720, groundY: 618 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const TURKEY = {
  width: 64,
  height: 58,
  /** Home x the turkey drifts back toward while running. */
  homeX: 250,
  minX: 70,
  maxX: 560,
  runSpeed: 300,
  jumpVelocity: -1050,
  flapVelocity: -760,
  gravity: 2800,
  /** Seconds of mercy after a hit. */
  invulnerable: 1.6,
  /** Seconds a haystack hide lasts. */
  hideTime: 2.2,
};

export const FARMER = {
  /** Gap in pixels behind the turkey when a run starts. */
  startGap: 150,
  /** How close the farmer may get before the turkey is caught. */
  catchGap: 26,
  /** Gap the farmer loses (gains ground) every second the turkey dawdles. */
  creepPerSecond: 3,
  /** Gap lost on a hit; gap gained per corn; gap gained by hiding. */
  hitLoss: 46,
  cornGain: 7,
  hideGain: 55,
};

export const LIVES = 3;

/** Three stages: the farmyard, the barn kitchen, the forest. Distance is in metres. */
export const STAGES = [
  { name: 'Farmyard', end: 500, scroll: 250, spawn: 0.95, knife: 0.55, flame: 0, fence: 0.3, hay: 0.15 },
  { name: 'Barn Kitchen', end: 1100, scroll: 300, spawn: 0.8, knife: 0.45, flame: 0.35, fence: 0.2, hay: 0.12 },
  { name: 'Forest Freedom', end: 1500, scroll: 350, spawn: 0.66, knife: 0.5, flame: 0.15, fence: 0.25, hay: 0.18 },
];

export const ESCAPE_DISTANCE = 1500;

export const KNIFE = {
  width: 26,
  height: 74,
  fallSpeed: 430,
  fallSpeedPerStage: 70,
  points: 5,
};

export const FLAME = {
  width: 70,
  height: 150,
  /** Seconds of telegraph smoke before the jet erupts, then seconds it burns. */
  warn: 0.7,
  burn: 1.1,
};

export const FENCE = { width: 40, height: 44 };

export const HAYSTACK = { width: 96, height: 84 };

export const CORN = {
  size: 30,
  points: 10,
  /** Corn bobs in an arc above the ground when it spawns. */
  arc: 150,
};

export const SCORE = { perMetre: 1, dodge: 5, hide: 25 };

/** How many hazards and pickups can exist at once; the pool is allocated once, at boot. */
export const POOL_SIZE = 96;

/** Seeded random numbers, so ?seed=N always plays the same run. */
export function createRandom(seed) {
  let state = seed >>> 0;
  return {
    next() {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    range(min, max) {
      return min + this.next() * (max - min);
    },
    pick(list) {
      return list[Math.floor(this.next() * list.length)];
    },
  };
}

export const PALETTE = {
  skyFarm: ['#f7b267', '#f4845f'],
  skyKitchen: ['#e07856', '#8c4a3c'],
  skyForest: ['#7fb069', '#3e6b3a'],
  groundFarm: '#b08954',
  groundKitchen: '#6b4a3a',
  groundForest: '#4c7a45',
  turkeyBody: '#8a5230',
  turkeyDark: '#6b3d22',
  turkeyTail: ['#a0522d', '#d2691e', '#e8a33c', '#c96f2e'],
  turkeyHead: '#d9c7a7',
  wattle: '#e5534b',
  beak: '#f2a33c',
  farmerOveralls: '#3a6ea5',
  farmerShirt: '#c94f43',
  farmerHat: '#e8d27a',
  knifeBlade: '#d7dce3',
  knifeHandle: '#7a4a26',
  flameCore: '#ffd23f',
  flameMid: '#ff7b2f',
  flameEdge: '#e5484d',
  corn: '#f2c94c',
  cornHusk: '#7fb069',
  hay: '#e3b505',
  fence: '#8a5a2b',
  panel: 'rgba(43, 32, 24, 0.82)',
  text: '#fff7e6',
  muted: '#e8cfa8',
  danger: '#e5484d',
  good: '#7fb069',
};

export const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'gobble-run.best';
