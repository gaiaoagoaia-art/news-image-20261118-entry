// font.ts — a hand-drawn 5x7 block font for the news poster.
//
// Every glyph is seven rows of five pixels, written as strings where
// '#' is a lit pixel and '.' is dark. The table below was drawn for
// this entry; text is rendered by stamping scaled blocks, so a glyph
// is always crisp at any integer scale.

export const GLYPH_W = 5;
export const GLYPH_H = 7;

const G = (rows: string[]): string[] => rows;

export const GLYPHS: Record<string, string[]> = {
  A: G([".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"]),
  B: G(["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."]),
  C: G([".####", "#....", "#....", "#....", "#....", "#....", ".####"]),
  D: G(["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."]),
  E: G(["#####", "#....", "#....", "####.", "#....", "#....", "#####"]),
  F: G(["#####", "#....", "#....", "####.", "#....", "#....", "#...."]),
  G: G([".####", "#....", "#....", "#.###", "#...#", "#...#", ".###."]),
  H: G(["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"]),
  I: G(["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"]),
  J: G(["..###", "...#.", "...#.", "...#.", "...#.", "#..#.", ".##.."]),
  K: G(["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"]),
  L: G(["#....", "#....", "#....", "#....", "#....", "#....", "#####"]),
  M: G(["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"]),
  N: G(["#...#", "##..#", "##..#", "#.#.#", "#..##", "#..##", "#...#"]),
  O: G([".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."]),
  P: G(["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."]),
  Q: G([".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"]),
  R: G(["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"]),
  S: G([".####", "#....", "#....", ".###.", "....#", "....#", "####."]),
  T: G(["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."]),
  U: G(["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."]),
  V: G(["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."]),
  W: G(["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"]),
  X: G(["#...#", ".#.#.", "..#..", "..#..", "..#..", ".#.#.", "#...#"]),
  Y: G(["#...#", ".#.#.", ".#.#.", "..#..", "..#..", "..#..", "..#.."]),
  Z: G(["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"]),
  "0": G([".###.", "#..##", "#.#.#", "##..#", "#...#", "#...#", ".###."]),
  "1": G(["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."]),
  "2": G([".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"]),
  "3": G(["####.", "....#", "....#", ".###.", "....#", "....#", "####."]),
  "4": G(["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."]),
  "5": G(["#####", "#....", "####.", "....#", "....#", "#...#", ".###."]),
  "6": G([".###.", "#....", "#....", "####.", "#...#", "#...#", ".###."]),
  "7": G(["#####", "....#", "...#.", "..#..", "..#..", "..#..", "..#.."]),
  "8": G([".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."]),
  "9": G([".###.", "#...#", "#...#", ".####", "....#", "....#", ".###."]),
  " ": G([".....", ".....", ".....", ".....", ".....", ".....", "....."]),
  "-": G([".....", ".....", ".....", "#####", ".....", ".....", "....."]),
  ":": G([".....", "..#..", "..#..", ".....", "..#..", "..#..", "....."]),
  ".": G([".....", ".....", ".....", ".....", ".....", ".##..", ".##.."]),
  ",": G([".....", ".....", ".....", ".....", ".##..", ".##..", ".#..."]),
  "'": G(["..#..", "..#..", ".#...", ".....", ".....", ".....", "....."]),
  "!": G(["..#..", "..#..", "..#..", "..#..", "..#..", ".....", "..#.."]),
  "/": G(["....#", "....#", "...#.", "..#..", "..#..", ".#...", "#...."]),
  "+": G([".....", "..#..", "..#..", "#####", "..#..", "..#..", "....."]),
  "\u00B7": G([".....", ".....", ".....", ".##..", ".##..", ".....", "....."]),
};

// Anything not drawn falls back to a hollow block so a typo in a
// headline is visible on the render instead of silently vanishing.
const FALLBACK: string[] = G(["#####", "#...#", "#...#", "#...#", "#...#", "#...#", "#####"]);

export function glyphFor(ch: string): string[] {
  const g = GLYPHS[ch.toUpperCase()];
  return g === undefined ? FALLBACK : g;
}

// Width in pixels of a string at an integer scale: each glyph takes
// GLYPH_W blocks plus one block of tracking, except the last.
export function textWidth(text: string, scale: number): number {
  if (text.length === 0) return 0;
  return text.length * (GLYPH_W + 1) * scale - scale;
}

export function textHeight(scale: number): number {
  return GLYPH_H * scale;
}

// A pixel sink: the renderer hands over a function that paints one
// device pixel, and drawText stamps every lit block of every glyph
// through it. Keeping the sink a callback leaves this module free of
// any framebuffer type.
export type PutPixel = (px: number, py: number) => void;

export function drawText(
  put: PutPixel,
  x: number,
  y: number,
  text: string,
  scale: number,
): void {
  let cursor = x;
  for (const ch of text) {
    const glyph = glyphFor(ch);
    for (let row = 0; row < GLYPH_H; row++) {
      const line = glyph[row];
      for (let col = 0; col < GLYPH_W; col++) {
        if (line[col] !== "#") continue;
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            put(cursor + col * scale + dx, y + row * scale + dy);
          }
        }
      }
    }
    cursor += (GLYPH_W + 1) * scale;
  }
}

export function drawTextCentered(
  put: PutPixel,
  cx: number,
  y: number,
  text: string,
  scale: number,
): void {
  const w = textWidth(text, scale);
  drawText(put, Math.round(cx - w / 2), y, text, scale);
}
