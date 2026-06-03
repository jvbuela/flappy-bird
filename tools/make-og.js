// Generates og-image.png (1200x630) — the social link-preview banner.
// Pure Node, no dependencies (built-in zlib only). Decodes the player photos
// and draws them as circular "bird" avatars, plus customizable title text.
//
//   Run:   node tools/make-og.js
//   Edit:  change CONFIG below (text lines + which photos appear), then re-run.
//
// =================== CONFIG (edit me, then re-run) ===================
const CONFIG = {
  // Title text — each entry is one centered line. Use UPPERCASE (the built-in
  // font is uppercase). Allowed: A-Z 0-9 space & ! ? . , ' - :
  lines: [
    { text: "PLAY FLAPPY BIRD", maxScale: 12, y: 44 },
    { text: "WITH ROC NETWORK & FRIENDS", maxScale: 7, y: 172 },
  ],
  // Birds shown in the scene. photo: a path under the repo, or null = the
  // classic drawn yellow bird. r = radius.
  birds: [
    { photo: "players/mlacu.png", x: 430, y: 392, r: 70 },
    { photo: null,                x: 620, y: 446, r: 46 },
    { photo: "players/jkdgu.png", x: 800, y: 392, r: 70 },
  ],
};
// ====================================================================

const zlib = require("zlib");
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");

const W = 1200, H = 630, GROUND_Y = 520;
const buf = Buffer.alloc(W * H * 3);

// ---- pixel helpers ----
function setpx(x, y, r, g, b) {
  x |= 0; y |= 0;
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3; buf[i] = r; buf[i + 1] = g; buf[i + 2] = b;
}
function rect(x0, y0, w, h, c) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) setpx(x, y, c[0], c[1], c[2]);
}
function disc(cx, cy, r, c) {
  for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
    const dx = x - cx, dy = y - cy; if (dx * dx + dy * dy <= r * r) setpx(x, y, c[0], c[1], c[2]);
  }
}
function ellipse(cx, cy, rx, ry, c) {
  for (let y = cy - ry; y <= cy + ry; y++) for (let x = cx - rx; x <= cx + rx; x++) {
    const dx = (x - cx) / rx, dy = (y - cy) / ry; if (dx * dx + dy * dy <= 1) setpx(x, y, c[0], c[1], c[2]);
  }
}
function ring(cx, cy, r, c) {
  for (let a = 0; a < 360; a += 0.4) { const rad = a * Math.PI / 180; setpx(cx + Math.cos(rad) * r, cy + Math.sin(rad) * r, c[0], c[1], c[2]); }
}
function tri(p, q, r, c) {
  const minX = Math.min(p[0], q[0], r[0]), maxX = Math.max(p[0], q[0], r[0]);
  const minY = Math.min(p[1], q[1], r[1]), maxY = Math.max(p[1], q[1], r[1]);
  const ar = (a, b, cc) => (b[0] - a[0]) * (cc[1] - a[1]) - (b[1] - a[1]) * (cc[0] - a[0]);
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
    const s = ar(p, q, [x, y]), t = ar(q, r, [x, y]), u = ar(r, p, [x, y]);
    if ((s >= 0 && t >= 0 && u >= 0) || (s <= 0 && t <= 0 && u <= 0)) setpx(x, y, c[0], c[1], c[2]);
  }
}
function lerp(a, b, t) { return Math.round(a + (b - a) * t); }

// ---- minimal PNG decoder (8-bit, non-interlaced; color types 0/2/3/4/6) ----
function decodePNG(file) {
  const b = fs.readFileSync(file);
  let pos = 8, width = 0, height = 0, bitDepth = 8, colorType = 2, interlace = 0;
  let palette = null, trns = null; const idat = [];
  while (pos < b.length) {
    const len = b.readUInt32BE(pos);
    const type = b.toString("ascii", pos + 4, pos + 8);
    const data = b.slice(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      bitDepth = data[8]; colorType = data[9]; interlace = data[12];
    } else if (type === "PLTE") palette = data;
    else if (type === "tRNS") trns = data;
    else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    pos += 12 + len;
  }
  if (bitDepth !== 8) throw new Error(file + ": only 8-bit PNGs supported (got " + bitDepth + ")");
  if (interlace !== 0) throw new Error(file + ": interlaced PNGs not supported");
  const ch = colorType === 0 ? 1 : colorType === 2 ? 3 : colorType === 3 ? 1 : colorType === 4 ? 2 : colorType === 6 ? 4 : 0;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * ch;
  const cur = Buffer.alloc(stride), prev = Buffer.alloc(stride);
  const out = Buffer.alloc(width * height * 4);
  const paeth = (a, b2, c) => { const p = a + b2 - c, pa = Math.abs(p - a), pb = Math.abs(p - b2), pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b2 : c; };
  let p = 0;
  for (let y = 0; y < height; y++) {
    const f = raw[p++];
    for (let i = 0; i < stride; i++) {
      const rb = raw[p++];
      const a = i >= ch ? cur[i - ch] : 0;
      const bb = prev[i];
      const c = i >= ch ? prev[i - ch] : 0;
      let v;
      if (f === 1) v = rb + a; else if (f === 2) v = rb + bb; else if (f === 3) v = rb + ((a + bb) >> 1); else if (f === 4) v = rb + paeth(a, bb, c); else v = rb;
      cur[i] = v & 0xFF;
    }
    for (let x = 0; x < width; x++) {
      let r, g, bl, al = 255;
      if (colorType === 2) { r = cur[x * 3]; g = cur[x * 3 + 1]; bl = cur[x * 3 + 2]; }
      else if (colorType === 6) { r = cur[x * 4]; g = cur[x * 4 + 1]; bl = cur[x * 4 + 2]; al = cur[x * 4 + 3]; }
      else if (colorType === 0) { r = g = bl = cur[x]; }
      else if (colorType === 4) { r = g = bl = cur[x * 2]; al = cur[x * 2 + 1]; }
      else { const idx = cur[x]; r = palette[idx * 3]; g = palette[idx * 3 + 1]; bl = palette[idx * 3 + 2]; if (trns && idx < trns.length) al = trns[idx]; }
      const o = (y * width + x) * 4; out[o] = r; out[o + 1] = g; out[o + 2] = bl; out[o + 3] = al;
    }
    cur.copy(prev);
  }
  return { width, height, data: out };
}

// circular focal crop (mirrors the game's drawCreature math)
function drawPhotoCircle(img, cx, cy, R, zoom, fx, fy) {
  zoom = zoom || 1.4; fx = fx == null ? 0.5 : fx; fy = fy == null ? 0.40 : fy;
  const cover = Math.max((2 * R) / img.width, (2 * R) / img.height);
  const scale = cover * zoom;
  const dw = img.width * scale, dh = img.height * scale;
  const ox = cx - fx * dw, oy = cy - fy * dh;
  for (let y = cy - R; y <= cy + R; y++) for (let x = cx - R; x <= cx + R; x++) {
    const dx = x - cx, dy = y - cy; if (dx * dx + dy * dy > R * R) continue;
    const sx = Math.floor((x - ox) / scale), sy = Math.floor((y - oy) / scale);
    if (sx < 0 || sy < 0 || sx >= img.width || sy >= img.height) continue;
    const o = (sy * img.width + sx) * 4;
    setpx(x, y, img.data[o], img.data[o + 1], img.data[o + 2]);
  }
  ring(cx, cy, R, [85, 56, 71]);
}

// ---- scene ----
for (let y = 0; y < GROUND_Y; y++) {
  const t = y / GROUND_Y, r = lerp(78, 180, t), g = lerp(192, 230, t), b = lerp(202, 243, t);
  for (let x = 0; x < W; x++) setpx(x, y, r, g, b);
}
function cloud(cx, cy, s) { const c = [255, 255, 255]; disc(cx, cy, 26 * s, c); disc(cx + 30 * s, cy - 12 * s, 32 * s, c); disc(cx + 64 * s, cy, 26 * s, c); disc(cx + 32 * s, cy + 10 * s, 30 * s, c); }
cloud(120, 300, 1.0); cloud(1010, 300, 1.2);
// a couple of pipes at the edges (keep the middle clear for the birds)
function pipe(x, gapY, gapH) {
  const body = [91, 191, 74], dark = [58, 125, 47], lip = [73, 168, 59], w = 90, lipH = 26, ov = 8;
  rect(x, 0, w, gapY, body); rect(x - ov, gapY - lipH, w + ov * 2, lipH, lip);
  rect(x, gapY + gapH, w, GROUND_Y - (gapY + gapH), body); rect(x - ov, gapY + gapH, w + ov * 2, lipH, lip);
  rect(x, 0, 10, gapY, dark); rect(x, gapY + gapH, 10, GROUND_Y - (gapY + gapH), dark);
}
pipe(40, 300, 200); pipe(1080, 300, 200);
// ground
rect(0, GROUND_Y, W, H - GROUND_Y, [222, 216, 149]);
rect(0, GROUND_Y, W, 18, [91, 191, 74]);
rect(0, GROUND_Y + 18, W, 6, [58, 125, 47]);

// ---- birds (with wings) ----
function wing(cx, cy, R) { ellipse(cx - R + 6, cy + R * 0.2, R * 0.42, R * 0.24, [255, 255, 255]); ring(cx - R + 6, cy + R * 0.2, R * 0.42, [85, 56, 71]); }
function classicBird(cx, cy, R) {
  disc(cx, cy, R, [242, 210, 46]); ring(cx, cy, R, [85, 56, 71]);
  disc(cx + R * 0.45, cy - R * 0.33, R * 0.34, [255, 255, 255]); // eye
  disc(cx + R * 0.58, cy - R * 0.33, R * 0.15, [0, 0, 0]);
  tri([cx + R - 4, cy - 6], [cx + R + 28, cy + 4], [cx + R - 4, cy + 16], [232, 112, 42]); // beak
}
for (const bd of CONFIG.birds) {
  wing(bd.x, bd.y, bd.r);
  if (bd.photo) {
    try { drawPhotoCircle(decodePNG(path.join(ROOT, bd.photo)), bd.x, bd.y, bd.r, bd.zoom, bd.fx, bd.fy); }
    catch (e) { console.warn("photo skipped:", bd.photo, e.message); classicBird(bd.x, bd.y, bd.r); }
  } else classicBird(bd.x, bd.y, bd.r);
}

// ---- text (5x7 bitmap font) ----
const FONT = {
  A: "01110 10001 10001 11111 10001 10001 10001", B: "11110 10001 11110 10001 10001 10001 11110",
  C: "01110 10001 10000 10000 10000 10001 01110", D: "11100 10010 10001 10001 10001 10010 11100",
  E: "11111 10000 10000 11110 10000 10000 11111", F: "11111 10000 10000 11110 10000 10000 10000",
  G: "01110 10001 10000 10111 10001 10001 01111", H: "10001 10001 10001 11111 10001 10001 10001",
  I: "11111 00100 00100 00100 00100 00100 11111", J: "00111 00010 00010 00010 00010 10010 01100",
  K: "10001 10010 10100 11000 10100 10010 10001", L: "10000 10000 10000 10000 10000 10000 11111",
  M: "10001 11011 10101 10101 10001 10001 10001", N: "10001 11001 10101 10011 10001 10001 10001",
  O: "01110 10001 10001 10001 10001 10001 01110", P: "11110 10001 10001 11110 10000 10000 10000",
  Q: "01110 10001 10001 10001 10101 10010 01101", R: "11110 10001 10001 11110 10100 10010 10001",
  S: "01111 10000 10000 01110 00001 00001 11110", T: "11111 00100 00100 00100 00100 00100 00100",
  U: "10001 10001 10001 10001 10001 10001 01110", V: "10001 10001 10001 10001 10001 01010 00100",
  W: "10001 10001 10001 10101 10101 11011 10001", X: "10001 10001 01010 00100 01010 10001 10001",
  Y: "10001 10001 01010 00100 00100 00100 00100", Z: "11111 00001 00010 00100 01000 10000 11111",
  "0": "01110 10011 10101 10101 11001 10001 01110", "1": "00100 01100 00100 00100 00100 00100 01110",
  "2": "01110 10001 00001 00110 01000 10000 11111", "3": "11111 00010 00100 00010 00001 10001 01110",
  "4": "00010 00110 01010 10010 11111 00010 00010", "5": "11111 10000 11110 00001 00001 10001 01110",
  "6": "00110 01000 10000 11110 10001 10001 01110", "7": "11111 00001 00010 00100 01000 01000 01000",
  "8": "01110 10001 10001 01110 10001 10001 01110", "9": "01110 10001 10001 01111 00001 00010 01100",
  "&": "01100 10010 10010 01100 10101 10010 01101", "!": "00100 00100 00100 00100 00100 00000 00100",
  "?": "01110 10001 00001 00010 00100 00000 00100", ".": "00000 00000 00000 00000 00000 00110 00110",
  ",": "00000 00000 00000 00000 00000 00100 01000", "'": "00100 00100 00000 00000 00000 00000 00000",
  "-": "00000 00000 00000 11111 00000 00000 00000", ":": "00000 00100 00100 00000 00100 00100 00000",
  " ": "00000 00000 00000 00000 00000 00000 00000",
};
function glyph(ch) { return (FONT[ch] || FONT[" "]).split(" "); }
function textWidth(text, s) { return text.length * 6 * s - s; }
function drawText(text, x, y, s, c) {
  let cx = x;
  for (const ch of text) {
    const g = glyph(ch);
    for (let row = 0; row < 7; row++) for (let col = 0; col < 5; col++) if (g[row][col] === "1") rect(cx + col * s, y + row * s, s, s, c);
    cx += 6 * s;
  }
}
function fitScale(text, maxW, maxS) { let s = maxS; while (s > 1 && textWidth(text, s) > maxW) s--; return s; }
for (const ln of CONFIG.lines) {
  const s = fitScale(ln.text, W - 100, ln.maxScale || 12);
  const x = Math.round((W - textWidth(ln.text, s)) / 2);
  drawText(ln.text, x + Math.max(2, s * 0.4), ln.y + Math.max(2, s * 0.4), s, [40, 28, 36]); // shadow
  drawText(ln.text, x, ln.y, s, [255, 255, 255]);
}

// ---- PNG encode (RGB) ----
const stride = 1 + W * 3, rawOut = Buffer.alloc(H * stride);
for (let y = 0; y < H; y++) { rawOut[y * stride] = 0; buf.copy(rawOut, y * stride + 1, y * W * 3, y * W * 3 + W * 3); }
const idatOut = zlib.deflateSync(rawOut, { level: 9 });
const crcTable = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(b) { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = crcTable[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0); const t = Buffer.from(type, "ascii"); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0); return Buffer.concat([len, t, data, crc]); }
const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2;
const png = Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idatOut), chunk("IEND", Buffer.alloc(0))]);
const out = path.join(ROOT, "og-image.png");
fs.writeFileSync(out, png);
console.log("wrote", out, png.length, "bytes");
