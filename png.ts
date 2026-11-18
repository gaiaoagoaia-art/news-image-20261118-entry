// png.ts — an RGB framebuffer and a from-scratch PNG encoder.
//
// The encoder writes the PNG signature, one IHDR, one IDAT and one
// IEND chunk. Chunk CRCs use a table-driven CRC-32 written here; the
// image data is raw scanlines (filter byte 0 per row) compressed with
// node:zlib's deflate at a fixed level, so the same frame always
// encodes to the same bytes.

import { deflateSync } from "node:zlib";

export type Rgb = [number, number, number];

export class Frame {
  readonly w: number;
  readonly h: number;
  readonly data: Uint8Array;

  constructor(w: number, h: number, bg: Rgb) {
    this.w = w;
    this.h = h;
    this.data = new Uint8Array(w * h * 3);
    for (let i = 0; i < w * h; i++) {
      this.data[i * 3] = bg[0];
      this.data[i * 3 + 1] = bg[1];
      this.data[i * 3 + 2] = bg[2];
    }
  }

  setPx(x: number, y: number, c: Rgb): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 3;
    this.data[i] = c[0];
    this.data[i + 1] = c[1];
    this.data[i + 2] = c[2];
  }

  getPx(x: number, y: number): Rgb {
    const i = (y * this.w + x) * 3;
    return [this.data[i], this.data[i + 1], this.data[i + 2]];
  }

  fillRect(x: number, y: number, w: number, h: number, c: Rgb): void {
    const x0 = Math.max(0, x);
    const y0 = Math.max(0, y);
    const x1 = Math.min(this.w, x + w);
    const y1 = Math.min(this.h, y + h);
    for (let yy = y0; yy < y1; yy++) {
      let i = (yy * this.w + x0) * 3;
      for (let xx = x0; xx < x1; xx++) {
        this.data[i] = c[0];
        this.data[i + 1] = c[1];
        this.data[i + 2] = c[2];
        i += 3;
      }
    }
  }

  // Paint a pixel only where the mask function accepts the point;
  // handy for discs, arcs and other shaped fills.
  fillWhere(x0: number, y0: number, x1: number, y1: number, fn: (x: number, y: number) => Rgb | null): void {
    for (let y = Math.max(0, y0); y < Math.min(this.h, y1); y++) {
      for (let x = Math.max(0, x0); x < Math.min(this.w, x1); x++) {
        const c = fn(x, y);
        if (c !== null) this.setPx(x, y, c);
      }
    }
  }
}

// ---- CRC-32 (PNG polynomial 0xEDB88320), table built once ----

const CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  const crcInput = new Uint8Array(4 + data.length);
  for (let i = 0; i < 4; i++) crcInput[i] = type.charCodeAt(i);
  crcInput.set(data, 4);
  view.setUint32(8 + data.length, crc32(crcInput));
  return out;
}

export function encodePNG(frame: Frame): Uint8Array {
  const signature = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = new Uint8Array(13);
  const ihdrView = new DataView(ihdr.buffer);
  ihdrView.setUint32(0, frame.w);
  ihdrView.setUint32(4, frame.h);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const stride = frame.w * 3;
  const raw = new Uint8Array((stride + 1) * frame.h);
  for (let y = 0; y < frame.h; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    raw.set(frame.data.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });

  const ihdrChunk = chunk("IHDR", ihdr);
  const idatChunk = chunk("IDAT", new Uint8Array(idat));
  const iendChunk = chunk("IEND", new Uint8Array(0));

  const png = new Uint8Array(
    signature.length + ihdrChunk.length + idatChunk.length + iendChunk.length,
  );
  let off = 0;
  for (const part of [signature, ihdrChunk, idatChunk, iendChunk]) {
    png.set(part, off);
    off += part.length;
  }
  return png;
}
