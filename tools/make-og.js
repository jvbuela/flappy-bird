// Generates og-image.png (1200x630) — the social link-preview banner.
// Pure Node, no dependencies (uses the built-in zlib for PNG encoding).
// Run:  node tools/make-og.js   (writes ../og-image.png)
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

const W = 1200, H = 630;
const buf = Buffer.alloc(W * H * 3);

function setpx(x, y, r, g, b) {
  x |= 0; y |= 0;
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  buf[i] = r; buf[i + 1] = g; buf[i + 2] = b;
}
function rect(x0, y0, w, h, c) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) setpx(x, y, c[0], c[1], c[2]);
}
function disc(cx, cy, r, c) {
  for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
    const dx = x - cx, dy = y - cy; if (dx * dx + dy * dy <= r * r) setpx(x, y, c[0], c[1], c[2]);
  }
}
function tri(p, q, r, c) { // filled triangle
  const minX = Math.min(p[0], q[0], r[0]), maxX = Math.max(p[0], q[0], r[0]);
  const minY = Math.min(p[1], q[1], r[1]), maxY = Math.max(p[1], q[1], r[1]);
  const area = (a, b, cc) => (b[0] - a[0]) * (cc[1] - a[1]) - (b[1] - a[1]) * (cc[0] - a[0]);
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
    const s = area(p, q, [x, y]), t = area(q, r, [x, y]), u = area(r, p, [x, y]);
    if ((s >= 0 && t >= 0 && u >= 0) || (s <= 0 && t <= 0 && u <= 0)) setpx(x, y, c[0], c[1], c[2]);
  }
}
function lerp(a, b, t) { return Math.round(a + (b - a) * t); }

// ---- Scene ----
const GROUND_Y = 520;
// sky gradient
for (let y = 0; y < GROUND_Y; y++) {
  const t = y / GROUND_Y;
  const r = lerp(78, 180, t), g = lerp(192, 230, t), b = lerp(202, 243, t);
  for (let x = 0; x < W; x++) setpx(x, y, r, g, b);
}
// clouds
function cloud(cx, cy, s) {
  const c = [255, 255, 255];
  disc(cx, cy, 26 * s, c); disc(cx + 30 * s, cy - 12 * s, 32 * s, c);
  disc(cx + 64 * s, cy, 26 * s, c); disc(cx + 32 * s, cy + 10 * s, 30 * s, c);
}
cloud(150, 120, 1.1); cloud(950, 90, 1.4); cloud(620, 160, 0.9);

// pipes
function pipe(x, gapY, gapH) {
  const body = [91, 191, 74], dark = [58, 125, 47], lip = [73, 168, 59];
  const w = 96, lipH = 26, lipOver = 8;
  // top
  rect(x, 0, w, gapY, body);
  rect(x - lipOver, gapY - lipH, w + lipOver * 2, lipH, lip);
  // bottom
  rect(x, gapY + gapH, w, GROUND_Y - (gapY + gapH), body);
  rect(x - lipOver, gapY + gapH, w + lipOver * 2, lipH, lip);
  // simple shading
  rect(x, 0, 10, gapY, dark); rect(x, gapY + gapH, 10, GROUND_Y - (gapY + gapH), dark);
}
pipe(760, 250, 190);
pipe(1010, 170, 200);

// ground
rect(0, GROUND_Y, W, H - GROUND_Y, [222, 216, 149]);
rect(0, GROUND_Y, W, 18, [91, 191, 74]);
rect(0, GROUND_Y + 18, W, 6, [58, 125, 47]);

// bird
(function bird() {
  const cx = 420, cy = 330, R = 60;
  disc(cx + 4, cy + 6, R, [0, 0, 0]); // soft shadow ring (drawn then body over)
  disc(cx, cy, R, [242, 210, 46]);    // body
  // outline ring
  for (let a = 0; a < 360; a += 1) { const rad = a * Math.PI / 180; setpx(cx + Math.cos(rad) * R, cy + Math.sin(rad) * R, 85, 56, 71); }
  disc(cx - 14, cy + 14, 26, [255, 255, 255]); // wing
  disc(cx + 26, cy - 20, 20, [255, 255, 255]); // eye white
  disc(cx + 34, cy - 20, 9, [0, 0, 0]);        // pupil
  tri([cx + R - 6, cy - 8], [cx + R + 34, cy + 2], [cx + R - 6, cy + 14], [232, 112, 42]); // beak
})();

// ---- Title text (5x7 bitmap font, only the glyphs we need) ----
const FONT = {
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  D: ["11100", "10010", "10001", "10001", "10001", "10010", "11100"],
};
function textWidth(text, s) { return text.length * 6 * s - s; }
function drawText(text, x, y, s, c) {
  let cx = x;
  for (const ch of text) {
    if (ch === " ") { cx += 6 * s; continue; }
    const g = FONT[ch];
    for (let row = 0; row < 7; row++) for (let col = 0; col < 5; col++) {
      if (g[row][col] === "1") rect(cx + col * s, y + row * s, s, s, c);
    }
    cx += 6 * s;
  }
}
const title = "FLAPPY BIRD";
const s = 15;
const tx = Math.round((W - textWidth(title, s)) / 2);
const ty = 70;
drawText(title, tx + 6, ty + 6, s, [40, 28, 36]);   // shadow
drawText(title, tx, ty, s, [255, 255, 255]);          // white
drawText(title, tx, ty, 1, [255, 255, 255]);          // (noop overlay)

// ---- PNG encode (RGB, 8-bit) ----
const stride = 1 + W * 3;
const raw = Buffer.alloc(H * stride);
for (let y = 0; y < H; y++) { raw[y * stride] = 0; buf.copy(raw, y * stride + 1, y * W * 3, y * W * 3 + W * 3); }
const idat = zlib.deflateSync(raw, { level: 9 });

const crcTable = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(b) { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = crcTable[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
const png = Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);

const out = path.join(__dirname, "..", "og-image.png");
fs.writeFileSync(out, png);
console.log("wrote", out, png.length, "bytes");
