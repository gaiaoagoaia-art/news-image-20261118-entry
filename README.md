[![make.fun · news-image-20261118](https://make.fun/badge/news-image-20261118.svg)](https://make.fun/bounty/news-image-20261118?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261118)
[![rank](https://make.fun/badge/news-image-20261118/gaiaoagoaia-art/news-image-20261118-entry/rank.svg)](https://make.fun/bounty/news-image-20261118/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261118)
[![reward](https://make.fun/badge/news-image-20261118/gaiaoagoaia-art/news-image-20261118-entry/reward.svg)](https://make.fun/bounty/news-image-20261118?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261118)

# The World Logs On — 18 Nov 2026 in one image

A make.fun **news-image-20261118** entry: a program that draws one
1024×1024 poster summing up the world's news of Wednesday
18 November 2026.

**The story.** After a 13-year wait, Grand Theft Auto VI began its
global rollout (Reuters; Polygon, 18 Nov 2026). The game unlocked
first in New Zealand, and the unlock wave swept west through Sydney
and Tokyo while London and New York still counted down to midnight.
The poster renders that moment as a neon dusk over a Vice-City-style
skyline — a striped sun sinking into a shining sea, palm silhouettes,
a ticker of cities going live one time zone at a time — under the
headline "THE WORLD LOGS ON".

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Writes `out/entry.png`. The render is fully deterministic — fixed
seed, no clock, no network, no input files — so every run produces
byte-identical output.

## How it is made

- `main.ts` — the scene: banded-gradient sky, scanline-cut sun,
  two layers of procedurally placed towers with lit windows, palm
  silhouettes, a reflection-streaked sea, the city ticker, header
  and footer.
- `font.ts` — a hand-drawn 5×7 block font used for all poster text.
- `png.ts` — an RGB framebuffer plus a from-scratch PNG encoder
  (hand-rolled CRC-32; scanlines compressed with `node:zlib`).

Node standard library only; TypeScript in erasable syntax.
