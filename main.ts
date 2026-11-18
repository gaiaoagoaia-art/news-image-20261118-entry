// main.ts — "The World Logs On": the news of Wednesday 18 November
// 2026 in one 1024x1024 poster, drawn procedurally at run time.
//
// The day's story (Reuters and Polygon, 18 Nov 2026): after a
// 13-year wait, Grand Theft Auto VI began its global rollout — the
// game unlocked first in New Zealand and the unlock wave swept west
// through Sydney and Tokyo while London and New York still counted
// down. The poster shows a neon Vice-City-style dusk — a striped sun
// sinking behind a lit skyline, palms, a shining sea — under the
// headline, with a ticker of cities going live one time zone at a
// time and a footer carrying the wait and the pre-sales.
//
// Everything is computed from a fixed seed: no clock, no network, no
// input files, so two runs write byte-identical PNGs.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Frame, encodePNG } from "./png.ts";
import type { Rgb } from "./png.ts";
import { drawText, drawTextCentered } from "./font.ts";

const W = 1024;
const H = 1024;

// ---- palette ----
const NAVY: Rgb = [13, 16, 48];
const CREAM: Rgb = [245, 238, 220];
const ORANGE: Rgb = [255, 158, 44];
const BACK_TOWERS: Rgb = [46, 18, 84];
const FRONT_TOWERS: Rgb = [16, 8, 30];
const PALM: Rgb = [10, 6, 22];
const LIVE_FILL: Rgb = [10, 56, 46];
const LIVE_INK: Rgb = [46, 255, 196];
const WAIT_FILL: Rgb = [22, 17, 48];
const WAIT_INK: Rgb = [140, 130, 200];
const FOOTER_BG: Rgb = [94, 16, 36];
const WINDOW_INKS: Rgb[] = [
  [255, 210, 60],
  [55, 224, 216],
  [255, 94, 168],
  [240, 240, 255],
];

// ---- small deterministic helpers ----

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

// Fill a vertical span with a stepped gradient: colours are quantised
// into bands of `band` rows so the sky keeps a pixel-poster feel.
function bandedGradient(
  f: Frame,
  y0: number,
  y1: number,
  stops: [number, Rgb][],
  band: number,
): void {
  for (let y = y0; y < y1; y += band) {
    const t = (y - y0) / Math.max(1, y1 - y0 - 1);
    let c = stops[stops.length - 1][1];
    for (let s = 0; s < stops.length - 1; s++) {
      const [t0, c0] = stops[s];
      const [t1, c1] = stops[s + 1];
      if (t >= t0 && t <= t1) {
        c = mix(c0, c1, (t - t0) / Math.max(0.0001, t1 - t0));
        break;
      }
    }
    f.fillRect(0, y, f.w, Math.min(band, y1 - y), c);
  }
}

// ---- scene pieces ----

function drawStars(f: Frame, rng: () => number): void {
  const inks: Rgb[] = [
    [255, 255, 255],
    [205, 214, 255],
    [255, 230, 190],
  ];
  for (let i = 0; i < 110; i++) {
    const x = Math.floor(rng() * W);
    const y = 300 + Math.floor(rng() * 190);
    const s = rng() < 0.22 ? 3 : 2;
    const c = inks[Math.floor(rng() * inks.length)];
    f.fillRect(x, y, s, s, c);
  }
}

function drawSun(f: Frame): void {
  const cx = 512;
  const cy = 662;
  const r = 156;
  const top: Rgb = [255, 213, 64];
  const bottom: Rgb = [255, 94, 98];
  f.fillWhere(cx - r, cy - r, cx + r + 1, cy + r + 1, (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    if (dx * dx + dy * dy > r * r) return null;
    // Retro scanline cuts across the lower half, widening downward.
    if (dy > 4) {
      const band = Math.floor((dy - 4) / 17);
      const pos = (dy - 4) % 17;
      const cut = Math.min(10, 2 + band * 2);
      if (pos < cut) return null;
    }
    return mix(top, bottom, (y - (cy - r)) / (2 * r));
  });
}

type Tower = { x: number; w: number; top: number };

function skyline(
  rng: () => number,
  baseline: number,
  minH: number,
  maxH: number,
): Tower[] {
  const towers: Tower[] = [];
  let x = -24;
  while (x < W + 24) {
    const w = 38 + Math.floor(rng() * 48);
    const h = minH + Math.floor(rng() * (maxH - minH));
    towers.push({ x, w, top: baseline - h });
    x += w + 4 + Math.floor(rng() * 14);
  }
  return towers;
}

function drawTowers(f: Frame, towers: Tower[], baseline: number, ink: Rgb, rng: () => number): void {
  for (const t of towers) {
    f.fillRect(t.x, t.top, t.w, baseline - t.top, ink);
    if (rng() < 0.3) {
      // antenna
      const ax = t.x + Math.floor(t.w / 2) - 1;
      const ah = 12 + Math.floor(rng() * 22);
      f.fillRect(ax, t.top - ah, 3, ah, ink);
      f.fillRect(ax - 1, t.top - ah - 3, 5, 4, [255, 94, 98]);
    }
  }
}

function drawWindows(f: Frame, towers: Tower[], baseline: number, rng: () => number): void {
  for (const t of towers) {
    for (let wy = t.top + 10; wy < baseline - 10; wy += 13) {
      for (let wx = t.x + 7; wx < t.x + t.w - 8; wx += 11) {
        if (rng() < 0.36) {
          const ink = WINDOW_INKS[Math.floor(rng() * WINDOW_INKS.length)];
          f.fillRect(wx, wy, 5, 7, ink);
        }
      }
    }
  }
}

// A palm: a curving trunk of stacked blocks and a fan of drooping
// fronds, all one silhouette colour.
function drawPalm(f: Frame, baseX: number, baseY: number, height: number, lean: number): void {
  let crownX = baseX;
  let crownY = baseY;
  const steps = Math.floor(height / 4);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const px = Math.round(baseX + lean * t * t);
    const py = baseY - i * 4;
    f.fillRect(px - 3, py - 4, 7, 6, PALM);
    crownX = px;
    crownY = py;
  }
  f.fillRect(crownX - 4, crownY - 2, 7, 7, PALM);
  f.fillRect(crownX + 4, crownY + 1, 6, 6, PALM);
  const fronds = 9;
  for (let k = 0; k < fronds; k++) {
    const ang = Math.PI * (0.08 + (0.84 * k) / (fronds - 1)); // fan over the top
    const len = height * (0.42 + 0.14 * Math.sin(ang));
    const dx = -Math.cos(ang);
    const dy = -Math.sin(ang);
    for (let s = 0; s < len; s += 3) {
      const px = Math.round(crownX + dx * s);
      const py = Math.round(crownY + dy * s + 0.0038 * s * s);
      f.fillRect(px - 2, py - 2, 5, 5, PALM);
    }
  }
}

function drawSea(f: Frame, rng: () => number): void {
  bandedGradient(
    f,
    736,
    884,
    [
      [0, [44, 20, 84]],
      [0.45, [26, 12, 58]],
      [1, [9, 6, 28]],
    ],
    4,
  );
  // The sun's reflection: a shimmering column of dashes under it.
  for (let y = 744; y < 878; y += 7) {
    const depth = (y - 744) / (878 - 744);
    const half = 56 + depth * 92;
    let x = 512 - half + rng() * 22;
    const ink = mix([255, 166, 88], [120, 52, 110], depth);
    while (x < 512 + half) {
      const len = 16 + rng() * 52;
      f.fillRect(Math.round(x), y, Math.round(len), 3, ink);
      x += len + 10 + rng() * 26;
    }
  }
  // Ambient streaks elsewhere on the water.
  for (let i = 0; i < 46; i++) {
    const x = Math.floor(rng() * (W - 70));
    const y = 742 + Math.floor(rng() * 132);
    const len = 18 + Math.floor(rng() * 44);
    f.fillRect(x, y, len, 2, [86, 48, 118]);
  }
}

function drawTicker(f: Frame): void {
  f.fillRect(0, 884, W, 62, [11, 9, 32]);
  const cities: { name: string; live: boolean }[] = [
    { name: "AUCKLAND", live: true },
    { name: "SYDNEY", live: true },
    { name: "TOKYO", live: true },
    { name: "LONDON", live: false },
    { name: "NEW YORK", live: false },
  ];
  const chipW = 176;
  const chipH = 42;
  const gap = 12;
  const x0 = Math.round((W - (cities.length * chipW + (cities.length - 1) * gap)) / 2);
  const y0 = 894;
  cities.forEach((city, i) => {
    const x = x0 + i * (chipW + gap);
    const fill = city.live ? LIVE_FILL : WAIT_FILL;
    const ink = city.live ? LIVE_INK : WAIT_INK;
    f.fillRect(x, y0, chipW, chipH, fill);
    f.fillRect(x, y0, chipW, 2, ink);
    f.fillRect(x, y0 + chipH - 2, chipW, 2, ink);
    f.fillRect(x + 12, y0 + 17, 8, 8, ink);
    drawText((px, py) => f.setPx(px, py, ink), x + 30, y0 + 14, city.name, 2);
    drawText(
      (px, py) => f.setPx(px, py, ink),
      x + chipW - 33,
      y0 + 18,
      city.live ? "LIVE" : "WAIT",
      1,
    );
  });
}

function drawHeader(f: Frame): void {
  drawTextCentered((px, py) => f.setPx(px, py, CREAM), 512, 36, "18 NOV 2026", 13);
  f.fillRect(60, 148, W - 120, 7, ORANGE);
  drawTextCentered((px, py) => f.setPx(px, py, ORANGE), 512, 170, "THE WORLD LOGS ON", 9);
  drawTextCentered(
    (px, py) => f.setPx(px, py, CREAM),
    512,
    246,
    "GTA VI BEGINS ITS GLOBAL ROLLOUT",
    5,
  );
}

function drawFooter(f: Frame): void {
  f.fillRect(0, 946, W, H - 946, FOOTER_BG);
  f.fillRect(0, 946, W, 4, ORANGE);
  drawTextCentered(
    (px, py) => f.setPx(px, py, CREAM),
    512,
    972,
    "13-YEAR WAIT ENDS \u00B7 16M PRE-SALES",
    4,
  );
}

// ---- compose ----

function render(): Frame {
  const f = new Frame(W, H, NAVY);
  const rng = mulberry32(0xc0ffee);

  bandedGradient(
    f,
    292,
    736,
    [
      [0, [40, 15, 80]],
      [0.38, [96, 26, 96]],
      [0.66, [178, 52, 96]],
      [0.86, [238, 92, 66]],
      [1, [255, 138, 66]],
    ],
    4,
  );
  drawStars(f, rng);
  drawSun(f);

  const back = skyline(rng, 718, 60, 175);
  drawTowers(f, back, 718, BACK_TOWERS, rng);
  const front = skyline(rng, 736, 42, 132);
  drawTowers(f, front, 736, FRONT_TOWERS, rng);
  drawWindows(f, front, 736, rng);

  drawSea(f, rng);

  drawPalm(f, 96, 752, 208, 58);
  drawPalm(f, 928, 756, 232, -62);

  drawTicker(f);
  drawHeader(f);
  drawFooter(f);
  return f;
}

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "entry.png"), encodePNG(render()));
