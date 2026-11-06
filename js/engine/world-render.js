// ── Tile-based world renderer (16-bit JRPG style) ────────────────────────
// 320×180 logical viewport, 16×16 tiles, nearest-neighbour pixels.
// Draw order: background ridge → ground tiles → y-sorted objects & characters
// (FFVI-style depth) → warm light pass → vignette.
import { state } from '../state.js';
import {
  PAL, TILE, VW, VH, hash2, TAU, drawText, pr, lineV, lineH, px, withAlpha,
} from './pixel.js';
import { drawPerson } from './art.js';

const T = TILE;
const tileCache = new Map();

// ── small geometry helpers ───────────────────────────────────────────────
function shade(hex, amt) {
  if (!hex || hex[0] !== '#') return hex;
  const n = parseInt(hex.slice(1), 16);
  const r = clamp((((n >> 16) & 255) + amt), 0, 255);
  const g = clamp((((n >> 8) & 255) + amt), 0, 255);
  const b = clamp(((n & 255) + amt), 0, 255);
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function fillCircle(t, cx, cy, r, c) {
  t.fillStyle = c;
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (dx * dx + dy * dy <= r * r) t.fillRect(cx + dx, cy + dy, 1, 1);
  }
}
function fillEllipse(t, cx, cy, rx, ry, c) {
  t.fillStyle = c;
  for (let dy = -ry; dy <= ry; dy++) for (let dx = -rx; dx <= rx; dx++) {
    if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1) t.fillRect(cx + dx, cy + dy, 1, 1);
  }
}
function fillPoly(t, pts, c) {
  t.fillStyle = c;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of pts) { minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]); minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
  for (let py = minY; py <= maxY; py++) {
    const xs = [];
    const n = pts.length;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > py) !== (yj > py)) xs.push((xj - xi) * (py - yi) / (yj - yi) + xi);
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k < xs.length; k += 2) {
      for (let sx = Math.ceil(xs[k]); sx <= Math.floor(xs[k + 1]); sx++) t.fillRect(sx, py, 1, 1);
    }
  }
}

const ambientPals = {
  village: { grass: PAL.grass, grassD: PAL.grassD, grassL: PAL.grassL, path: PAL.path, pathD: PAL.pathD, pathL: PAL.pathL, stone: PAL.stone, stoneD: PAL.stoneD, wall: PAL.timber, roof: PAL.roof, roof2: PAL.roofD, rock: PAL.stoneD, leaf: PAL.leaf, leaf2: PAL.leafL, trunk: '#4a3526', accent: PAL.amber },
  plains: { grass: PAL.grass, grassD: PAL.grassD, grassL: PAL.grassL, path: PAL.path, pathD: PAL.pathD, pathL: PAL.pathL, stone: PAL.stone, stoneD: PAL.stoneD, wall: PAL.timber, roof: PAL.roof, roof2: PAL.roofD, rock: PAL.stoneD, leaf: PAL.leaf, leaf2: PAL.leafL, trunk: '#4a3526', accent: '#f0b45e' },
  forest: { grass: '#3a5a32', grassD: '#283e2d', grassL: '#6a8a5a', path: '#5f523a', pathD: '#4a422e', pathL: '#8a7e5a', stone: '#5d6252', stoneD: '#4e5445', wall: '#756a51', roof: '#46322a', roof2: '#5a4033', rock: '#4c4f45', leaf: '#3a5d38', leaf2: '#548a4e', trunk: '#3f2e21', accent: '#78d5c0' },
  mire: { grass: '#3a4a44', grassD: '#31443a', grassL: '#5a7a6e', path: '#56513f', pathD: '#464234', pathL: '#8a7e6a', stone: '#555d54', stoneD: '#474f47', wall: '#5f5a48', roof: '#3d302b', roof2: '#4f3e33', rock: '#474d46', leaf: '#405a42', leaf2: '#5a7a5e', trunk: '#3c2f26', accent: '#8fd0b0' },
  peaks: { grass: '#443938', grassD: '#3a3130', grassL: '#6a5e5a', path: '#5e544c', pathD: '#4a423d', pathL: '#8a7e7a', stone: '#5a504a', stoneD: '#4a423d', wall: '#625046', roof: '#3f2c28', roof2: '#523832', rock: '#51443c', leaf: '#564139', leaf2: '#6a5a52', trunk: '#3a2b24', accent: '#ff9257' },
  citadel: { grass: '#30323c', grassD: '#292b34', grassL: '#5a5a72', path: '#3b3c46', pathD: '#33343d', pathL: '#6a6a82', stone: '#45464f', stoneD: '#383943', wall: '#3e3f49', roof: '#32323c', roof2: '#3e3e49', rock: '#3f4049', leaf: '#44454e', leaf2: '#5a5a72', trunk: '#2c2c32', accent: '#b79bea' },
};

// ── tile art (draws at canvas offset x,y) ────────────────────────────────
function tileGrass(t, x, y, tx, ty) {
  const n = hash2(tx, ty);
  pr(t, x, y, T, T, n > .5 ? PAL.grass : PAL.grassD);
  if (n > .65) {
    pr(t, x + 3 + (tx * 3 % 5), y + 10 + (ty * 2 % 4), 2, 2, PAL.grassL);
    pr(t, x + 10 + (ty * 3 % 4), y + 4 + (tx % 3), 1, 2, shade(PAL.grassD, -25));
  }
  if (n > .85) pr(t, x + 7 + (tx % 2), y + 12, 1, 2, PAL.grassD);
}
function tileTallGrass(t, x, y, tx, ty) {
  tileGrass(t, x, y, tx, ty);
  const n = hash2(tx * 2, ty);
  lineV(t, x + 6, y + 10, 4, shade(PAL.grassD, -15));
  lineV(t, x + 8, y + 11, 3, shade(PAL.grassD, -15));
}
function tileFlowers(t, x, y, tx, ty) {
  const n = hash2(tx * 5, ty);
  pr(t, x, y, T, T, PAL.grass);
  const heads = [];
  if (n > .4) heads.push([x + 4, y + 7]);
  if (n > .6) heads.push([x + 11, y + 5]);
  if (n > .8) heads.push([x + 7, y + 9]);
  for (const [fx, fy] of heads) {
    const hc = (fx + fy * 7) % 2 ? PAL.flower : PAL.flowerL;
    pr(t, fx, fy, 2, 2, hc);
    pr(t, fx + 1, fy + 1, 1, 1, '#5a3a2a');
  }
  pr(t, x + 3 + (tx % 3), y + 13, 1, 2, PAL.grassD);
}
function tileTree(t, x, y, tx, ty) {
  const n = hash2(tx * 1.3, ty * 1.7);
  pr(t, x, y, T, T, PAL.shadow);
  lineV(t, x + 7, y + 10, 6, '#4a3526');
  lineV(t, x + 8, y + 10, 6, '#3a2a22');
  pr(t, x + 6, y + 16, 4, 1, '#3a2a22');
  const leaf = shade(PAL.leaf, Math.round((n - .5) * 14));
  const leaf2 = shade(PAL.leafL, Math.round((n - .5) * 10));
  const cx = x + 8;
  fillCircle(t, cx, y + 4, 5, leaf);
  fillCircle(t, cx + 2, y + 5, 4, leaf);
  fillCircle(t, cx - 2, y + 6, 4, leaf2);
  fillCircle(t, cx, y + 2, 3, leaf2);
  pr(t, cx - 1, y, 2, 2, shade(PAL.leaf, -20));
}
function tileTreeBig(t, x, y, tx, ty) {
  const n = hash2(tx * 7, ty * 11);
  pr(t, x, y, T, T, PAL.shadowD);
  lineV(t, x + 7, y + 12, 4, '#4a3526');
  lineV(t, x + 8, y + 12, 4, '#3a2a22');
  pr(t, x + 6, y + 16, 4, 1, '#3a2a22');
  const leaf = shade(PAL.leaf, Math.round((n - .5) * 14));
  const cx = x + 8;
  fillCircle(t, cx, y + 3, 6, leaf);
  fillCircle(t, cx + 3, y + 4, 5, leaf);
  fillCircle(t, cx - 3, y + 4, 5, leaf);
  fillCircle(t, cx, y, 4, shade(PAL.leafL, 10));
  pr(t, cx - 1, y, 2, 1, shade(PAL.leaf, -20));
  pr(t, cx + 4, y + 3, 1, 1, PAL.leafL);
}
function tilePath(t, x, y, tx, ty) {
  const n = hash2(tx * 2, ty * 3);
  pr(t, x, y, T, T, PAL.pathD);
  const stones = [[1, 2], [5, 1], [9, 3], [13, 2], [3, 9], [7, 10], [11, 8], [14, 11], [1, 14], [8, 14], [12, 14]];
  for (const [sx, sy] of stones) {
    const w = 2 + (sx % 2), hh = 1 + (sy % 2);
    pr(t, x + sx, y + sy, w, hh, n > .45 ? PAL.path : PAL.pathL);
  }
  if (hash2(tx, ty) > .75) pr(t, x + 8 + (tx % 2), y + 14, 2, 1, shade(PAL.pathD, -30));
}
function tileStone(t, x, y, tx, ty) {
  const n = hash2(tx, ty);
  pr(t, x, y, T, T, PAL.stoneD);
  // subtle occasional cracks instead of rigid grid
  if (n > .72) lineH(t, x + 2, y + 6, 6, PAL.stone);
  if (n > .78) lineV(t, x + 10, y + 3, 5, PAL.stone);
  if (n > .84) lineH(t, x + 8, y + 12, 6, shade(PAL.stoneD, -25));
  pr(t, x, y, T, 1, PAL.stoneL);
  pr(t, x, y + T - 1, T, 1, shade(PAL.stoneD, -20));
  if (n > .6) pr(t, x + 7 + (tx % 2), y + 7 + (ty % 2), 1, 1, PAL.stoneL);
}
function tileSand(t, x, y, tx, ty) {
  pr(t, x, y, T, T, '#b8a488');
  pr(t, x + 2, y + 10, 1, 2, '#a89078');
  pr(t, x + 10, y + 6, 1, 2, '#c8b898');
}
function tileAsh(t, x, y, tx, ty) {
  pr(t, x, y, T, T, '#3a3330');
  for (let i = 0; i < 6; i++) pr(t, x + 1 + (i * 3 % 14), y + 6 + (i % 4), 1, 1, '#282220');
}
function tileBridge(t, x, y, tx, ty) {
  pr(t, x, y + 3, T, 10, '#4b3b2c');
  lineH(t, x, y + 3, T, '#3a2a1d');
  lineH(t, x, y + 12, T, '#3a2a1d');
  pr(t, x, y + 5, T, 1, 'rgba(255,255,255,.06)');
}
function tileWater(t, x, y, tx, ty, deep, now) {
  const base = deep ? PAL.waterD : PAL.water;
  const n = hash2(tx, ty);
  pr(t, x, y, T, T, base);
  const off = Math.sin(now / 700 + tx * 0.7 + ty * 0.5);
  lineH(t, x + 2, y + 6 + (off > 0 ? 0 : 1), 4, PAL.waterL);
  lineH(t, x + 9, y + 9 + (off < 0 ? 0 : 1), 4, shade(base, 25));
  pr(t, x + 13, y + 4 + (off > 0 ? 1 : 0), 1, 1, PAL.waterL);
  pr(t, x + 1, y + 12 + (off < 0 ? 1 : 0), 1, 1, PAL.waterL);
  if (deep) {
    pr(t, x + 4, y + 12, 2, 1, shade(base, -20));
    pr(t, x + 10, y + 7, 2, 1, shade(base, -20));
  }
}
function tileLava(t, x, y, now) {
  pr(t, x, y, T, T, '#2c1408');
  const f = Math.sin(now / 100);
  pr(t, x + 4, y + 8 + (f > 0 ? 0 : 1), 3, 1, '#f0774d');
  pr(t, x + 9, y + 11 + (f < 0 ? 0 : 1), 3, 1, '#ffb56a');
  pr(t, x + 2, y + 14, 1, 1, '#e0632c');
  pr(t, x + 13, y + 5, 1, 1, '#e0632c');
}
function tileWall(t, x, y, tx, ty) {
  pr(t, x, y, T, T, '#3a322a');
  lineV(t, x, y, T, '#28221c');
  lineV(t, x + T - 1, y, T, '#28221c');
  lineH(t, x, y, T, '#28221c');
  lineH(t, x, y + T - 1, T, '#14100a');
  lineV(t, x + 4, y, T, '#28221c');
  lineV(t, x + T - 5, y, T, '#28221c');
}
function tileHouseRoof(t, x, y, tx, ty) {
  const n = hash2(tx * 3, ty * 5);
  pr(t, x, y, T, T, PAL.roofD);
  for (let ry = 0; ry < T; ry += 3) {
    const row = hash2(tx, ty + ry) > .5 ? PAL.roofL : PAL.roof;
    lineH(t, x, y + ry, T, row);
  }
  lineH(t, x, y + 2, T, PAL.roofL);
  pr(t, x, y + T - 1, T, 1, '#1a1410');
}
function tileHouseWall(t, x, y, tx, ty, hasWindow) {
  const n = hash2(tx * 9, ty * 7);
  pr(t, x, y, T, T, PAL.timber);
  for (let bx = 0; bx < T; bx += 4) lineV(t, x + bx, y, T, PAL.timberD);
  lineH(t, x, y, T, PAL.timberD);
  lineH(t, x, y + T - 1, T, shade(PAL.timberD, -25));
  if (hasWindow) {
    const wx = x + 6, wy = y + 2;
    pr(t, wx, wy, 4, 4, '#171e24');
    lineV(t, wx + 2, wy, 4, '#d9b46a');
    lineH(t, wx, wy + 2, 4, '#d9b46a');
    pr(t, wx - 1, wy + 4, 6, 1, PAL.timberL);
    pr(t, wx + 1, wy + 1, 2, 2, '#ffcf8a');
  }
}
function tileHouseDoor(t, x, y) {
  pr(t, x, y, T, T, '#20150f');
  lineV(t, x + 1, y, T, '#3a2a1d');
  lineV(t, x + T - 2, y, T, '#3a2a1d');
  lineH(t, x, y, T, '#3a2a1d');
  lineH(t, x, y + T - 1, T, '#17100a');
  lineH(t, x + 1, y + 4, 6, '#2a1c12');
  lineH(t, x + 1, y + 9, 6, '#2a1c12');
  lineH(t, x + 1, y + 14, 6, '#2a1c12');
  pr(t, x + 10, y + 8, 1, 1, PAL.amber);
}
function tileBrazier(t, x, y, tx, ty, lit, now) {
  pr(t, x, y, T, T, PAL.shadow);
  const cx = x + 8, base = y + 14;
  fillEllipse(t, cx, base + 1, 3, 2, '#3f342b');
  pr(t, cx - 1, base - 2, 2, 1, '#4b3f33');
  fillEllipse(t, cx, base - 2, 2, 1, '#4b3f33');
  fillEllipse(t, cx, base - 3, 2, 1, '#2a2420');
  if (lit) {
    const f = Math.sin(now / 90 + tx) * .3;
    pr(t, cx - 1, base - 4, 1, 2, '#ffcf7a');
    pr(t, cx, base - 6, 1, 2, '#ffe0b0');
    pr(t, cx + 1, base - 4 - (f > 0 ? 1 : 0), 1, 2, '#ffcf7a');
    pr(t, cx, base - 7 + (f > 0 ? -1 : 0), 1, 1, '#fff8e0');
    if (Math.sin(now / 110 + tx) > .6) pr(t, cx - 2, base - 5, 1, 1, '#ffd08a');
    if (Math.sin(now / 110 + tx + 1) > .6) pr(t, cx + 2, base - 6, 1, 1, '#ffd08a');
  } else {
    fillEllipse(t, cx, base - 3, 2, 1, '#2a2420');
  }
}
function tileCrystal(t, x, y, now) {
  pr(t, x, y, T, T, PAL.shadow);
  const cx = x + 8, cy = y + 7 + Math.sin(now / 700) * 0.5;
  fillPoly(t, [[cx, cy - 4], [cx + 2, cy - 1], [cx + 1, cy + 3], [cx - 1, cy + 3], [cx - 2, cy - 1]], PAL.waterL);
  fillPoly(t, [[cx, cy - 3], [cx + 1, cy - 1], [cx, cy + 2], [cx - 1, cy - 1]], '#e0f4f0');
  pr(t, cx, cy - 4, 1, 1, '#ffffff');
  fillEllipse(t, cx, y + 14, 3, 1, 'rgba(0,0,0,.35)');
}
function tileChest(t, x, y, opened) {
  pr(t, x, y, T, T, PAL.shadow);
  const cx = x + 8, base = y + 14;
  fillEllipse(t, cx, base + 1, 3, 1, 'rgba(0,0,0,.35)');
  pr(t, cx - 4, base - 6, 8, 6, '#6b4a2c');
  pr(t, cx - 4, base - 4, 8, 2, '#4c321d');
  lineH(t, cx - 4, base - 6, 8, '#d9b46a');
  lineV(t, cx - 4, base - 6, 6, '#d9b46a');
  lineV(t, cx + 3, base - 6, 6, '#d9b46a');
  lineH(t, cx - 4, base - 1, 8, '#d9b46a');
  if (opened) {
    fillPoly(t, [[cx - 4, base - 6], [cx - 6, base - 7], [cx + 6, base - 7], [cx + 4, base - 6]], '#2a1c12');
    pr(t, cx - 4, base - 7, 8, 1, '#17100a');
  } else {
    pr(t, cx, base - 7, 1, 1, '#d9b46a');
    pr(t, cx, base - 8, 1, 1, '#ffcf7a');
  }
}
function tileSign(t, x, y) {
  pr(t, x, y, T, T, PAL.shadow);
  lineV(t, x + 8, y + 9, 5, '#4a3725');
  pr(t, x + 5, y + 3, 6, 4, '#6b5237');
  lineH(t, x + 5, y + 3, 6, '#c9a97a');
  lineH(t, x + 5, y + 6, 6, '#c9a97a');
  lineV(t, x + 5, y + 3, 4, '#c9a97a');
  lineV(t, x + 10, y + 3, 4, '#c9a97a');
  pr(t, x + 7, y + 5, 1, 1, '#e8ddc8');
  pr(t, x + 9, y + 5, 1, 1, '#e8ddc8');
}
function tileLamp(t, x, y, lit, now) {
  pr(t, x, y, T, T, PAL.shadow);
  lineV(t, x + 8, y + 10, 6, '#3e332a');
  pr(t, x + 7, y + 10, 2, 1, '#3e332a');
  const fy = y + 4;
  if (lit) {
    const gl = 0.7 + Math.sin(now / 90 + x) * 0.15;
    fillCircle(t, x + 8, fy, 3, `rgba(255,210,130,${gl})`);
    fillCircle(t, x + 8, fy, 2, '#ffe0b0');
    pr(t, x + 8, fy, 1, 1, '#fff8e0');
  } else {
    fillCircle(t, x + 8, fy, 2, '#3e332a');
  }
  fillEllipse(t, x + 8, y + 14, 2, 1, 'rgba(0,0,0,.35)');
}
function tileStall(t, x, y) { // market stall
  pr(t, x, y, T, T, PAL.shadow);
  const cx = x + 8, base = y + 14;
  fillEllipse(t, cx, base + 1, 3, 1, 'rgba(0,0,0,.35)');
  fillPoly(t, [[cx - 6, base], [cx, base - 7], [cx + 6, base]], '#b89a72');
  fillPoly(t, [[cx - 6, base], [cx - 2, base - 4], [cx + 2, base - 4], [cx + 6, base]], '#a67c5c');
  lineH(t, cx - 6, base - 2, 13, '#8a6544');
  pr(t, cx - 4, base - 5, 1, 1, PAL.amber);
  pr(t, cx + 2, base - 5, 1, 1, '#c78a8a');
  pr(t, cx - 1, base - 6, 1, 1, '#8fbf7a');
  pr(t, cx + 4, base - 4, 1, 1, PAL.violet);
}
function tileRock(t, x, y, tx, ty) {
  const n = hash2(tx * 5, ty * 3);
  pr(t, x, y, T, T, PAL.shadow);
  fillPoly(t, [[x + 5, y + 15], [x + 4, y + 10], [x + 6, y + 7], [x + 10, y + 5], [x + 13, y + 8], [x + 14, y + 11], [x + 12, y + 15]], shade(PAL.stoneD, -10));
  fillPoly(t, [[x + 6, y + 9], [x + 9, y + 7], [x + 11, y + 8], [x + 9, y + 10], [x + 7, y + 11]], '#b8b4a8');
}
function tileFence(t, x, y) {
  pr(t, x, y, T, T, PAL.shadow);
  pr(t, x, y + 12, T, 1, '#5b442e');
  lineV(t, x + 2, y + 4, 6, '#5b442e');
  lineV(t, x + 13, y + 4, 6, '#5b442e');
  lineH(t, x, y + 7, T, '#5b442e');
  lineH(t, x, y + 10, T, '#5b442e');
}
function tileAltar(t, x, y, active, now) {
  pr(t, x, y, T, T, PAL.shadow);
  fillEllipse(t, x + 8, y + 13, 3, 1, 'rgba(0,0,0,.35)');
  pr(t, x + 4, y + 9, 8, 3, '#5a564d');
  pr(t, x + 5, y + 11, 6, 1, '#6d685e');
  if (active) {
    const pulse = 0.6 + 0.4 * Math.sin(now / 600);
    fillCircle(t, x + 8, y + 7, 2, `rgba(240,170,100,${0.5 * pulse})`);
    pr(t, x + 8, y + 6, 1, 1, '#ffe0b0');
  } else {
    fillCircle(t, x + 8, y + 7, 1, '#5a564d');
  }
}
function tilePortal(t, x, y, accent, now) {
  pr(t, x, y, T, T, '#1a1218');
  const cx = x + 8, cy = y + 10;
  const r = 2 + Math.sin(now / 500) * 0.5;
  fillCircle(t, cx, cy, r, accent);
  fillCircle(t, cx, cy, r - 1, '#1a1218');
}
function tileGrave(t, x, y) {
  pr(t, x, y, T, T, PAL.shadow);
  fillPoly(t, [[x + 4, y + 15], [x + 4, y + 10], [x + 6, y + 8], [x + 8, y + 9], [x + 10, y + 8], [x + 12, y + 10], [x + 12, y + 15]], '#5f5c53');
  lineH(t, x + 6, y + 13, 2, 'rgba(255,255,255,.1)');
}
function tileStump(t, x, y) {
  pr(t, x, y, T, T, PAL.shadow);
  fillEllipse(t, x + 8, y + 11, 2, 2, '#4a3526');
  pr(t, x + 7, y + 11, 4, 1, '#3a2a1f');
  fillEllipse(t, x + 8, y + 9, 2, 1, '#6b4e35');
}
function tileBones(t, x, y) {
  pr(t, x, y, T, T, PAL.shadow);
  pr(t, x + 6, y + 12, 4, 1, '#b7ad95');
  pr(t, x + 5, y + 11, 1, 1, '#b7ad95');
  pr(t, x + 9, y + 11, 1, 1, '#b7ad95');
}

// ── tile dispatch ────────────────────────────────────────────────────────
const ANIMATED = new Set(['o', 'L', 'w', '~', 'v', 'P']);
export function drawTile(ctx, ch, x, y, ambient, now, litTiles) {
  const tx = Math.floor(x / T), ty = Math.floor(y / T);
  const lit = ch === 'o' ? litTiles.has(`${tx},${ty}`) : false;
  switch (ch) {
    case '.': tileGrass(ctx, x, y, tx, ty); break;
    case ',': tileTallGrass(ctx, x, y, tx, ty); break;
    case '"': tileFlowers(ctx, x, y, tx, ty); break;
    case '=': tileStone(ctx, x, y, tx, ty); break;
    case '_': tilePath(ctx, x, y, tx, ty); break;
    case 's': tileSand(ctx, x, y, tx, ty); break;
    case 'x': tileAsh(ctx, x, y, tx, ty); break;
    case 'b': tileBridge(ctx, x, y, tx, ty); break;
    case 'w': tileWater(ctx, x, y, tx, ty, false, now); break;
    case '~': tileWater(ctx, x, y, tx, ty, true, now); break;
    case 'v': tileLava(ctx, x, y, now); break;
    case 'H': tileWall(ctx, x, y, tx, ty); break;
    case 'h': tileHouseRoof(ctx, x, y, tx, ty); break;
    case 'D': tileHouseDoor(ctx, x, y); break;
    case 'W': tileWall(ctx, x, y, tx, ty); break;
    case 'L': tileLamp(ctx, x, y, true, now); break;
    case 'A': tileAltar(ctx, x, y, true, now); break;
    case 'S': tileCrystal(ctx, x, y, now); break;
    case 'C': tileChest(ctx, x, y, false); break;
    case 'o': tileBrazier(ctx, x, y, tx, ty, lit, now); break;
    case 'i': tileSign(ctx, x, y); break;
    case 'f': tileFence(ctx, x, y); break;
    case 'g': tileGrave(ctx, x, y); break;
    case 't': tileStump(ctx, x, y); break;
    case 'n': tileStall(ctx, x, y); break;
    case 'B': tileBones(ctx, x, y); break;
    case '#': tileTree(ctx, x, y, tx, ty); break;
    case 'T': tileTreeBig(ctx, x, y, tx, ty); break;
    case 'r': tileRock(ctx, x, y, tx, ty); break;
    case 'R': tileRock(ctx, x, y, tx, ty); break;
    case 'P': tilePortal(ctx, x, y, PAL.amber, now); break;
  }
}

// ── background ridge ─────────────────────────────────────────────────────
function drawDistantRidge(ctx, W, H, now) {
  const t = now / 2000;
  ctx.fillStyle = '#0c0e16';
  ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, H * 0.72);
  for (let x = 0; x <= W; x += 20) {
    const y = H * 0.72 - (Math.sin(x * 0.02 + t) * 14 + Math.cos(x * 0.03 - t) * 10);
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#141420';
  ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, H * 0.8);
  for (let x = 0; x <= W; x += 26) {
    const y = H * 0.8 - Math.sin(x * 0.015 - t * 0.5) * 8;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
}

// ── lights ───────────────────────────────────────────────────────────────
function drawLights(ctx, W, H, lights, now, cycle) {
  const brightness = 0.5 - 0.5 * Math.cos(cycle * TAU);
  const night = 1 - brightness;
  if (night < 0.03) return;
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = `rgba(0,0,0,${Math.min(0.7, night * 0.66)})`;
  ctx.fillRect(0, 0, W, H);
  for (const l of lights) {
    const r = l.r * (1 + Math.sin(now / 700 + l.x) * 0.02);
    const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, r);
    g.addColorStop(0, `rgba(0,0,0,${l.strength || 0.9})`);
    g.addColorStop(0.5, `rgba(0,0,0,${(l.strength || 0.9) * 0.4})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(l.x, l.y, r, 0, TAU); ctx.fill();
  }
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const l of lights) {
    if (!l.glow) continue;
    const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * 0.7);
    g.addColorStop(0, withAlpha(l.glow, 0.18 * night));
    g.addColorStop(1, withAlpha(l.glow, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(l.x, l.y, l.r * 0.7, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

// ── main renderer ────────────────────────────────────────────────────────
export function renderWorld(ctx, W, H, view) {
  const { zone, camx, camy, player, npcs, now, lights, timeCycle } = view;
  const ambient = zone.ambient || 'village';
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#06080c';
  ctx.fillRect(0, 0, W, H);

  const tx0 = Math.floor(camx / T) - 1;
  const ty0 = Math.floor(camy / T) - 1;
  const tx1 = Math.min(zone.map.w - 1, Math.ceil((camx + W) / T) + 1);
  const ty1 = Math.min(zone.map.h - 1, Math.ceil((camy + H) / T) + 1);

  if (ambient === 'village') drawDistantRidge(ctx, W, H, now);

  // ground tiles
  for (let ty = ty0; ty <= ty1; ty++) {
    const sy = ty * T - camy;
    for (let tx = tx0; tx <= tx1; tx++) {
      const ch = zone.map.g[ty][tx];
      if (ch === 'e') continue;
      drawTile(ctx, ch, tx * T - camx, sy, ambient, now, view.litTiles || new Set());
    }
  }

  // y-sorted dynamic drawables
  const list = [];
  const add = (yKey, draw) => list.push({ y: yKey, draw });
  const sx = (tx) => tx * T - camx;
  const sy = (ty) => ty * T - camy;

  for (const npc of npcs || []) {
    const dx = sx(npc.x), dy = sy(npc.y);
    if (dx < -32 || dx > W || dy < -32 || dy > H) continue;
    const walk = npc.walking ? now / 170 : 0;
    add((npc.y + 1) * T, () => {
      const pal = npc.pal || { skin: '#c9a07a', hair: '#5a3a2a', cloth: '#7a6a5a', pants: '#4a3a30', boots: '#282228', accent: '#c9bda6' };
      drawPerson(ctx, Math.round(dx + T / 2), Math.round(dy + T * 0.92), T, {
        palette: pal, facing: npc.facing || 'down', walk, time: now / 1000,
        role: npc.sprite, scale: npc.sprite === 'child' ? 0.85 : 1,
      });
      if (npc.marker) {
        const my = dy - T * 0.4 + Math.sin(now / 400) * T * 0.05;
        ctx.fillStyle = npc.marker === '!' ? '#ffd08a' : '#9fe0d2';
        ctx.fillRect(dx + T / 2 - 2, my, 4, 3);
        ctx.fillStyle = '#000';
        ctx.fillRect(dx + T / 2 - 1, my - 1, 1, 1);
        ctx.fillRect(dx + T / 2, my - 1, 1, 1);
      }
    });
  }

  add((player.py + 1) * T, () => {
    const px_ = Math.round(player.px * T + T / 2 - camx);
    const py_ = Math.round(player.py * T + T * 0.92 - camy);
    const hero = state.party.find((m) => m.id === 'hero');
    const pal = hero ? paletteFor(hero) : { skin: PAL.skin, hair: PAL.hair, cloth: PAL.cloth, accent: PAL.amber };
    drawPerson(ctx, px_, py_, T, {
      classId: player.classId, palette: pal, facing: player.facing,
      walk: player.moving ? now / 170 : 0, time: now / 1000, scale: 1,
    });
  });

  list.sort((a, b) => a.y - b.y);
  for (const d of list) d.draw();

  if (lights && lights.length) drawLights(ctx, W, H, lights, now, timeCycle != null ? timeCycle : 0.5);

  const edge = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.8);
  edge.addColorStop(0, 'rgba(0,0,0,0)');
  edge.addColorStop(1, 'rgba(2,4,8,0.4)');
  ctx.fillStyle = edge; ctx.fillRect(0, 0, W, H);
}

export function drawMinimap(canvas, zone, player, npcs = []) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#06080c';
  ctx.fillRect(0, 0, w, h);
  const map = zone.map;
  const s = Math.min((w - 8) / map.w, (h - 8) / map.h);
  const ox = (w - map.w * s) / 2, oy = (h - map.h * s) / 2;
  const pal = ambientPals[zone.ambient] || ambientPals.village;
  for (let y = 0; y < map.h; y++) {
    for (let x = 0; x < map.w; x++) {
      const ch = map.g[y][x];
      let col = pal.grass;
      if (ch === '~' || ch === 'w') col = '#2d4d54';
      else if (ch === '=' || ch === '_') col = pal.path;
      else if (ch === '#' || ch === 'T') col = '#1b2d20';
      else if (ch === 'H' || ch === 'h' || ch === 'D' || ch === 'W') col = '#5a4a3a';
      else if (ch === '.') col = '#3f5230';
      else if (ch === 'x') col = '#332d29';
      ctx.fillStyle = col;
      ctx.fillRect(ox + x * s, oy + y * s, s + 0.5, s + 0.5);
    }
  }
  for (const npc of npcs) {
    ctx.fillStyle = 'rgba(240,180,110,.75)';
    ctx.fillRect(ox + npc.x * s - 1, oy + npc.y * s - 1, 2.5, 2.5);
  }
  for (const c of zone.crystals || []) {
    ctx.fillStyle = '#7fe8d0';
    ctx.fillRect(ox + c.x * s - 1, oy + c.y * s - 1, 3, 3);
  }
  ctx.fillStyle = '#ffd08a';
  ctx.beginPath(); ctx.arc(ox + player.x * s + s / 2, oy + player.y * s + s / 2, 2.6, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(255,208,138,.5)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(ox + player.x * s + s / 2, oy + player.y * s + s / 2, 5, 0, TAU); ctx.stroke();
  ctx.strokeStyle = 'rgba(240,178,122,.2)'; ctx.lineWidth = 1; ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
}

export { paletteFor } from './art.js';
