# Gobble Run — The Great Turkey Escape

[![make.fun · turkey-run-game-01](https://make.fun/badge/turkey-run-game-01.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)
[![rank](https://make.fun/badge/turkey-run-game-01/Tiiashtf/makefun-turkey-run-game-01/rank.svg)](https://make.fun/bounty/turkey-run-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)
[![reward](https://make.fun/badge/turkey-run-game-01/Tiiashtf/makefun-turkey-run-game-01/reward.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)

A turkey escape game for the [make.fun "Make the best turkey escape game" bounty](https://make.fun/bounty/turkey-run-game-01).

Thanksgiving is coming, and Farmer Bram has the carving knife out. You are the
turkey. Run the farmyard, dodge the falling knives, slip past the oven flames of
the barn kitchen, hide in the haystacks — and reach the forest at 1500 m to
escape becoming dinner.

## How to play

- **← → or A / D** — run left and right (the turkey drifts back to its spot)
- **Space / W / ↑** — jump, and flap once more in the air
- **Shift / X** — dash forward
- **Hold ↓ / S in a haystack** — hide; the farmer loses your trail
- **P or Esc** — pause · **R** — restart · **M** — mute

Corn is worth +10, dodging a knife +5, a good hide +25. You have 3 hearts.
Farmer Bram chases from behind: every hit lets him close in, every corn and clean
stretch opens the gap. If he catches you — or your hearts run out — you are
caught. Reach 1500 m and you are free.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network requests, no audio files: all art is drawn on canvas
and all sound is synthesised with the Web Audio API. Screenshots are staged with
`?shot=start|play|kitchen|end&seed=1` (see `shots.json`).

## Files

- `game/src/config.js` — tuning, stages, palette
- `game/src/audio.js` — synthesised sounds and the title tune
- `game/src/input.js` — keyboard and mouse
- `game/src/world.js` — rules, spawning, collisions, stages
- `game/src/turkey.js` — the turkey's physics and animation
- `game/src/farmer.js` — Farmer Bram's chase
- `game/src/render.js` — all canvas drawing
- `game/src/shots.js` — deterministic screenshot staging
- `game/src/main.js` — the loop, screens and HUD
- `main.ts` — hands the game in: copies `game/` and `screenshots/` to `/output`
  and writes `dossier.json`
