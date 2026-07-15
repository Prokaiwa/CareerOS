// Generates the 1024x1024 source icon (src-tauri/app-icon.png) that
// `tauri icon` fans out into every platform size. Pure Node — no image
// libraries: a rounded emerald square with a white "C" ring, drawn
// per-pixel and encoded as a PNG by hand.
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SIZE = 1024;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// emerald-600 background, stone-50 mark — the app's own palette.
const BG = [5, 150, 105];
const FG = [250, 250, 249];

const cx = SIZE / 2;
const cy = SIZE / 2;
const cornerRadius = SIZE * 0.22;
const outerR = SIZE * 0.32;
const innerR = SIZE * 0.19;
// The "C": a ring with an angular gap opening to the right.
const gapHalfAngle = (55 * Math.PI) / 180;

function smoothstep(edge0, edge1, x) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// Signed distance to a rounded square centered at (cx, cy).
function roundedSquareDist(x, y) {
  const half = SIZE / 2 - 2;
  const dx = Math.abs(x - cx) - (half - cornerRadius);
  const dy = Math.abs(y - cy) - (half - cornerRadius);
  const ax = Math.max(dx, 0);
  const ay = Math.max(dy, 0);
  return Math.hypot(ax, ay) + Math.min(Math.max(dx, dy), 0) - cornerRadius;
}

const px = Buffer.alloc(SIZE * SIZE * 4);
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const i = (y * SIZE + x) * 4;
    const bgAlpha = 1 - smoothstep(-1.5, 1.5, roundedSquareDist(x, y));

    // Ring coverage
    const dx = x - cx;
    const dy = y - cy;
    const r = Math.hypot(dx, dy);
    const radial =
      smoothstep(innerR - 1.5, innerR + 1.5, r) *
      (1 - smoothstep(outerR - 1.5, outerR + 1.5, r));
    // Angular gap around angle 0 (pointing right), with rounded ends.
    const angle = Math.atan2(dy, dx); // -PI..PI, 0 = right
    // Ring is drawn OUTSIDE the gap; soften near the cut edges.
    const pastGap = Math.abs(angle) - gapHalfAngle;
    const angular = r > 1 ? smoothstep(0, 3 / r, pastGap) : 0;
    const fg = radial * angular;

    const rC = BG[0] * (1 - fg) + FG[0] * fg;
    const gC = BG[1] * (1 - fg) + FG[1] * fg;
    const bC = BG[2] * (1 - fg) + FG[2] * fg;
    px[i] = Math.round(rC);
    px[i + 1] = Math.round(gC);
    px[i + 2] = Math.round(bC);
    px[i + 3] = Math.round(bgAlpha * 255);
  }
}

// --- Minimal PNG encoder (RGBA8, no interlace) ---
function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // RGBA
// filter byte 0 per scanline
const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
for (let y = 0; y < SIZE; y++) {
  raw[y * (SIZE * 4 + 1)] = 0;
  px.copy(raw, y * (SIZE * 4 + 1) + 1, y * SIZE * 4, (y + 1) * SIZE * 4);
}
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);

const out = path.join(root, "src-tauri/app-icon.png");
writeFileSync(out, png);
console.log(`Wrote ${out} (${png.length} bytes)`);
