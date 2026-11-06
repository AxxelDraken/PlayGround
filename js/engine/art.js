// ── Pixel-art characters, portraits & enemies ────────────────────────────
// 16×24 logical-pixel sprites, four directions, idle + two-step walk.
// Drawn with crisp pixel primitives; blitted unsmoothed in the render loop.
import { PAL, CHAR_PALS, px, pr, lineV, lineH, spriteCanvas } from './pixel.js';
import { CLASSES, PALETTES } from '../data/classes.js';

export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const hash = (x, y) => {
  let n = (x * 374761393 + y * 668265263) | 0;
  n = (n ^ (n >> 13)) * 1274126177;
  return ((n ^ (n >> 16)) >>> 0) / 4294967295;
};
export function rr(ctx, x, y, w, h, r) {
  r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.lineTo(x + r, y);
  ctx.closePath();
}
export function shade(hex, amt) {
  if (!hex || hex[0] !== '#') return hex;
  const n = parseInt(hex.slice(1), 16);
  const r = clamp(((n >> 16) & 255) + amt, 0, 255);
  const g = clamp(((n >> 8) & 255) + amt, 0, 255);
  const b = clamp((n & 255) + amt, 0, 255);
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}
export function withAlpha(hex, a) {
  if (!hex || hex[0] !== '#') return hex;
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
export const CLASS_COLORS = {
  vanguard: '#e2a15f', emberweaver: '#f0774d', shadowblade: '#a58ae0',
  warden: '#79c98b', stormcaller: '#76b8ec', ronin: '#e07a6b',
};
export function paletteFor(member) {
  if (!member) return PALETTES[0];
  const base = PALETTES[member.palette ?? 0] || PALETTES[0];
  const cls = CLASSES[member.classId];
  return { ...base, accent: cls?.color || base.accent };
}

// ── 16×24 pixel sprite ───────────────────────────────────────────────────
// (cx, cy) = feet centre. Natural height 24px, scaled by opt.scale.
const BODY = 9;   // tunic height
const LEGS = 5;   // leg length
const BOOT = 2;
const HEAD = 6;

function shadeC(c, amt) { return shade(c, amt); }

// head facing down: face + hair cap
function headDown(ctx, cx, hy, pal, style) {
  // face
  pr(ctx, cx - 3, hy, HEAD, HEAD, pal.skin);
  lineV(ctx, cx - 2, hy + 1, 2, '#1a1410'); // nose bridge hint
  // eyes
  px(ctx, cx - 2, hy + 2, '#241a18');
  px(ctx, cx + 1, hy + 2, '#241a18');
  px(ctx, cx - 2, hy + 3, '#241a18');
  px(ctx, cx + 1, hy + 3, '#241a18');
  // mouth
  px(ctx, cx, hy + 4, '#7a4a40');
  // hair cap
  const hair = pal.hair;
  if (style.hair === 'long') {
    lineH(ctx, cx - 4, hy - 2, 8, hair);
    lineH(ctx, cx - 4, hy - 1, 4, hair);
    lineH(ctx, cx, hy - 1, 4, hair);
    lineH(ctx, cx - 3, hy, 2, hair);
    lineH(ctx, cx + 1, hy, 2, hair);
    // back hair flows down shoulders
    lineV(ctx, cx - 5, hy + 1, 4, shadeC(hair, -20));
    lineV(ctx, cx + 4, hy + 1, 4, shadeC(hair, -20));
  } else if (style.hair === 'cap') {
    lineH(ctx, cx - 4, hy - 3, 8, hair);
    lineH(ctx, cx - 3, hy - 2, 6, hair);
    lineH(ctx, cx - 2, hy - 1, 4, hair);
    lineV(ctx, cx - 5, hy, 2, hair);
    lineV(ctx, cx + 4, hy, 2, hair);
  } else {
    // short: sides + top fringe
    lineH(ctx, cx - 4, hy - 2, 2, hair);
    lineH(ctx, cx + 2, hy - 2, 2, hair);
    lineH(ctx, cx - 3, hy - 1, 6, hair);
    lineV(ctx, cx - 4, hy, 2, hair);
    lineV(ctx, cx + 3, hy, 2, hair);
  }
}

function headUp(ctx, cx, hy, pal, style) {
  // back of head
  pr(ctx, cx - 3, hy - 1, HEAD, HEAD, shadeC(pal.skin, -15));
  const hair = pal.hair;
  if (style.hair === 'long') {
    lineH(ctx, cx - 4, hy + 4, 8, hair);
    lineH(ctx, cx - 4, hy + 3, 8, hair);
    lineH(ctx, cx - 4, hy + 2, 6, hair);
    lineV(ctx, cx - 4, hy - 2, 4, hair);
    lineV(ctx, cx + 3, hy - 2, 4, hair);
  } else if (style.hair === 'cap') {
    lineH(ctx, cx - 4, hy + 3, 8, hair);
    lineH(ctx, cx - 3, hy + 2, 6, hair);
    lineH(ctx, cx - 2, hy + 1, 4, hair);
  } else {
    lineH(ctx, cx - 4, hy + 3, 4, hair);
    lineH(ctx, cx, hy + 3, 4, hair);
    lineV(ctx, cx - 4, hy - 1, 2, hair);
    lineV(ctx, cx + 3, hy - 1, 2, hair);
  }
}

// side profile head
function headSide(ctx, cx, cy, dir, pal, style) {
  const h = dir > 0 ? 1 : -1;
  const ox = cx + h * 2;
  pr(ctx, ox - h * 2, cy - 2, 5, 4, pal.skin);
  px(ctx, ox + h, cy - 1, '#241a18');
  px(ctx, ox + h, cy, '#241a18');
  px(ctx, ox + h * 2, cy + 1, '#7a4a40');
  const hair = pal.hair;
  if (style.hair === 'long') {
    lineV(ctx, cx - h * 4, cy - 3, 6, hair);
    lineH(ctx, cx - h * 3, cy - 4, 3 * h > 0 ? 3 : -3, hair);
    lineH(ctx, cx - h * 3, cy + 2, 4 * h > 0 ? 4 : -4, hair);
  } else {
    lineV(ctx, cx - h * 3, cy - 3, 5, hair);
    lineH(ctx, cx - h * 2, cy - 4, 2 * h, hair);
  }
  if (style.hat === 'helm') {
    lineH(ctx, cx - h * 3, cy - 5, 5 * h, '#4a443a');
    pr(ctx, cx - h * 3, cy - 4, 5 * h > 0 ? 5 : -5, 1, '#8a8474');
  }
  if (style.hat === 'veil') {
    lineH(ctx, cx - h * 4, cy - 4, 6 * h, '#5a4a6a');
  }
}

function bodyDown(ctx, cx, by, pal, style) {
  const cloth = pal.cloth;
  // tunic
  pr(ctx, cx - 5, by, 10, BODY, cloth);
  pr(ctx, cx - 5, by + BODY - 1, 10, 1, shadeC(cloth, -25));
  // belt
  pr(ctx, cx - 5, by + BODY, 10, 2, style.accent || pal.accent || PAL.amber);
  pr(ctx, cx - 5, by + BODY + 1, 10, 1, shadeC(style.accent || pal.accent || PAL.amber, -40));
  // sleeves
  pr(ctx, cx - 6, by + 1, 2, 4, cloth);
  pr(ctx, cx + 4, by + 1, 2, 4, cloth);
  // arms at sides
  lineV(ctx, cx - 6, by + 5, 3, shadeC(cloth, -15));
  lineV(ctx, cx + 4, by + 5, 3, shadeC(cloth, -15));
}

function bodyUp(ctx, cx, by, pal, style) {
  pr(ctx, cx - 5, by, 10, BODY, shadeC(pal.cloth, -10));
  pr(ctx, cx - 5, by + BODY - 1, 10, 1, shadeC(pal.cloth, -35));
  pr(ctx, cx - 5, by + BODY, 10, 2, style.accent || pal.accent || PAL.amber);
  lineV(ctx, cx - 6, by + 2, 3, shadeC(pal.cloth, -25));
  lineV(ctx, cx + 4, by + 2, 3, shadeC(pal.cloth, -25));
}

function bodySide(ctx, cx, by, dir, pal, style) {
  const h = dir > 0 ? 1 : -1;
  const ox = cx + h * 3;
  pr(ctx, ox - h * 4, by, 6, BODY, pal.cloth);
  pr(ctx, ox - h * 4, by + BODY - 1, 6, 1, shadeC(pal.cloth, -25));
  pr(ctx, ox - h * 4, by + BODY, 6, 2, style.accent || pal.accent || PAL.amber);
  lineV(ctx, ox - h * 5, by + 2, 3, shadeC(pal.cloth, -15));
}

function legsDown(ctx, cx, footY, pal, style, step) {
  // step: -1 left leg forward (raised), 0 even, 1 right leg forward
  const lx = cx - 4, rx = cx + 1;
  let lh = LEGS, rh = LEGS;
  let ly = footY - BOOT - lh, ry = footY - BOOT - rh;
  if (step < 0) { ly += 1; lh -= 1; }
  if (step > 0) { ry += 1; rh -= 1; }
  pr(ctx, lx, ly, 3, lh, pal.pants);
  pr(ctx, rx, ry, 3, rh, pal.pants);
  pr(ctx, cx - 4, footY - BOOT, 8, BOOT, pal.boots);
  pr(ctx, cx - 3, footY - BOOT - 1, 6, 1, shadeC(pal.boots, 30));
}

function legsUp(ctx, cx, footY, pal, style, step) {
  const lx = cx - 4, rx = cx + 1;
  let lh = LEGS, rh = LEGS;
  let ly = footY - BOOT - lh, ry = footY - BOOT - rh;
  if (step < 0) { ly += 1; lh -= 1; }
  if (step > 0) { ry += 1; rh -= 1; }
  pr(ctx, lx, ly, 3, lh, shadeC(pal.pants, -15));
  pr(ctx, rx, ry, 3, rh, shadeC(pal.pants, -15));
  pr(ctx, cx - 4, footY - BOOT, 8, BOOT, shadeC(pal.boots, -15));
}

function legsSide(ctx, cx, footY, dir, pal, style, step) {
  const h = dir > 0 ? 1 : -1;
  const ox = cx + h * 3;
  let hgh = LEGS;
  let yy = footY - BOOT - hgh;
  if (step < 0) { yy += 1; hgh -= 1; }
  pr(ctx, ox - h * 2, yy, 2, hgh, pal.pants);
  // far leg hint
  pr(ctx, ox - h * 3, yy + 1, 1, hgh - 1, shadeC(pal.pants, -20));
  pr(ctx, ox - h * 2, footY - BOOT, 2, BOOT, pal.boots);
  pr(ctx, ox - h * 3, footY - BOOT, 1, BOOT, shadeC(pal.boots, -15));
}

function hatDown(ctx, cx, hy, pal, style) {
  if (!style.hat) return;
  if (style.hat === 'cap') {
    lineH(ctx, cx - 3, hy - 4, 6, p.hair);
    pr(ctx, cx - 3, hy - 3, 6, 1, shadeC(p.hair, -30));
    return;
  }
  if (style.hat === 'helm') {
    lineH(ctx, cx - 4, hy - 5, 8, '#4a443a');
    pr(ctx, cx - 4, hy - 4, 8, 1, '#8a8474');
    lineH(ctx, cx - 2, hy - 6, 4, '#6a6454');
  } else if (style.hat === 'veil') {
    lineH(ctx, cx - 5, hy - 5, 10, '#5a4a6a');
    lineV(ctx, cx - 5, hy - 4, 3, '#5a4a6a');
    lineV(ctx, cx + 4, hy - 4, 3, '#5a4a6a');
  }
}

// walk bob offset from phase 0..1
function bobOf(phase) { return Math.sin(phase * Math.PI) * 1.5; }

export function drawPerson(ctx, x, y, s, opt = {}) {
  const pal = opt.palette || PALETTES[opt.paletteIndex || 0] || PALETTES[0];
  const cls = CLASSES[opt.classId];
  const accent = opt.accent || cls?.color || pal.accent || PAL.amber;
  const role = opt.role || '';
  const facing = opt.facing || 'down';
  const walk = opt.walk || 0;
  const t = opt.time || 0;
  const scale = opt.scale || 1;
  const cpal = CHAR_PALS[role] || CHAR_PALS.villager;
  const p = { ...cpal, accent };
  if (opt.cloth) p.cloth = opt.cloth;
  if (opt.pants) p.pants = opt.pants;
  if (opt.boots) p.boots = opt.boots;
  if (opt.skin) p.skin = opt.skin;
  if (opt.hair) p.hair = opt.hair;
  const style = {
    hair: role === 'child' ? 'short' : role === 'elder' ? 'cap' : role === 'seer' ? 'veil' : role === 'witch' ? 'cap' : role === 'guard' ? 'helm' : 'short',
    hat: role === 'guard' ? 'helm' : role === 'seer' ? 'veil' : role === 'maro' ? 'cap' : null,
    accent,
  };

  ctx.save();
  const cx = Math.round(x);
  const footY = Math.round(y);
  const fx = cx - Math.round(8 * scale);
  const fy = footY - Math.round(24 * scale);

  // shadow under feet
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath(); ctx.ellipse(cx, footY + 1, 5 * scale, 1.5 * scale, 0, 0, TAU); ctx.fill();

  const phase = walk % 1;
  const step = Math.sin(phase * Math.PI * 2) > 0 ? (walk * 2) % 2 < 1 ? -1 : 1 : 0;
  const bob = walk ? bobOf(phase) : 0;
  const by = footY - BOOT - LEGS - BODY + Math.round(bob);
  const hy = by - HEAD - 2 + Math.round(bob);

  if (facing === 'down') {
    hatDown(ctx, cx, hy - 2, p, style);
    headDown(ctx, cx, hy, p, style);
    bodyDown(ctx, cx, by, p, style);
    legsDown(ctx, cx, footY + Math.round(bob), p, style, step);
  } else if (facing === 'up') {
    legsUp(ctx, cx, footY + Math.round(bob), p, style, step);
    bodyUp(ctx, cx, by, p, style);
    headUp(ctx, cx, hy, p, style);
  } else {
    const dir = facing === 'right' ? 1 : -1;
    legsSide(ctx, cx, footY + Math.round(bob), dir, p, style, step);
    bodySide(ctx, cx, by, dir, p, style);
    headSide(ctx, cx, hy, dir, p, style);
  }

  // role extras
  if (role === 'elder' || role === 'seer') {
    // staff held in left hand (down/side)
    lineV(ctx, cx - 7, hy + 2, 6, '#6a5238');
    px(ctx, cx - 7, hy + 7, accent);
  }
  if (role === 'witch') {
    lineV(ctx, cx - 6, hy + 4, 6, '#6a5238');
    px(ctx, cx - 6, hy + 9, accent);
  }
  if (role === 'smith') {
    px(ctx, cx + 5, by + 4, '#d9c290');
  }
  if (role === 'inn') {
    px(ctx, cx + 5, by + 5, PAL.amber);
  }
  if (cls?.id === 'vanguard' || role === 'guard' || role === 'envoy') {
    ctx.strokeStyle = '#b9c2c9'; ctx.lineWidth = scale;
    ctx.beginPath(); ctx.moveTo(cx + 5, footY - BOOT - 2); ctx.lineTo(cx + 7, hy + 2); ctx.stroke();
  }
  if (role === 'child') {
    // smaller head hint already via shorter body handled by scale
  }
  ctx.restore();
}

// ── pixel portraits (32×40 busts) ────────────────────────────────────────
export function drawPortrait(canvas, member, opts = {}) {
  const ctx = canvas.getContext('2d');
  const dpr = opts.dpr || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const W = canvas.width / dpr, H = canvas.height / dpr;
  const pal = paletteFor(member);
  const cls = CLASSES[member.classId];
  const accent = cls?.color || pal.accent;
  const role = (member.role || '') ;

  ctx.clearRect(0, 0, W, H);
  // background: deep shadow with amber rim
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#1c1824'); g.addColorStop(1, '#0f0d14');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // rim glow
  ctx.fillStyle = withAlpha(accent, .35);
  ctx.beginPath(); ctx.arc(W * .5, H * .3, W * .62, 0, TAU); ctx.fill();
  // shoulders
  ctx.fillStyle = pal.cloth;
  ctx.beginPath();
  ctx.moveTo(W * .16, H * .92);
  ctx.lineTo(W * .16, H * .62);
  ctx.lineTo(W * .42, H * .52);
  ctx.lineTo(W * .58, H * .52);
  ctx.lineTo(W * .84, H * .62);
  ctx.lineTo(W * .84, H * .92);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = shadeC(pal.cloth, -30);
  pr(ctx, W * .16, H * .86, W * .68, H * .06, shadeC(pal.cloth, -30)); // collar line
  // neck
  ctx.fillStyle = shadeC(pal.skin, -10);
  pr(ctx, W * .44, H * .42, W * .12, H * .14, shadeC(pal.skin, -10));
  // head
  const cx = W * .5, hy = H * .32, hr = W * .17;
  ctx.fillStyle = pal.skin;
  ctx.beginPath(); ctx.ellipse(cx, hy, hr * .82, hr, 0, 0, TAU); ctx.fill();
  // hair
  ctx.fillStyle = pal.hair;
  ctx.beginPath(); ctx.arc(cx, hy - hr * .18, hr * .9, Math.PI * 1.02, Math.PI * 1.98); ctx.fill();
  lineH(ctx, cx - hr * .85, hy - hr * .05, hr * 1.7 > 0 ? hr * 1.7 : -hr * 1.7, pal.hair); // sideburns hint
  // eyes
  ctx.fillStyle = '#221716';
  ctx.beginPath(); ctx.arc(cx - hr * .3, hy + hr * .06, Math.max(1, hr * .055), 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + hr * .3, hy + hr * .06, Math.max(1, hr * .055), 0, TAU); ctx.fill();
  ctx.fillStyle = withAlpha(accent, .9);
  ctx.beginPath(); ctx.arc(cx - hr * .27, hy + hr * .05, Math.max(1, hr * .018), 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + hr * .32, hy + hr * .05, Math.max(1, hr * .018), 0, TAU); ctx.fill();
  // mouth
  ctx.strokeStyle = 'rgba(60,30,25,.5)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(cx, hy + hr * .4, hr * .18, .25, Math.PI - .25); ctx.stroke();
  // class mark on forehead
  ctx.fillStyle = withAlpha(accent, .8);
  ctx.beginPath(); ctx.arc(cx, hy - hr * .45, Math.max(1, hr * .09), 0, TAU); ctx.fill();
  // lower fade
  const edge = ctx.createLinearGradient(0, H * .66, 0, H);
  edge.addColorStop(0, 'rgba(0,0,0,0)'); edge.addColorStop(1, 'rgba(0,0,0,.65)');
  ctx.fillStyle = edge; ctx.fillRect(0, 0, W, H);
  // name sigil
  ctx.fillStyle = withAlpha(accent, .5);
  ctx.font = `${Math.round(W * .12)}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.fillText(cls?.sigil || '✦', cx, H * .955);
}

export function drawEnemyFace(canvas, def, opts = {}) {
  const ctx = canvas.getContext('2d');
  const dpr = opts.dpr || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const W = canvas.width / dpr, H = canvas.height / dpr;
  ctx.clearRect(0, 0, W, H);
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, shade(def.color || '#5a4a3a', -10)); g.addColorStop(1, '#0a0d14');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.beginPath(); ctx.arc(W / 2, H / 2, W / 2, 0, TAU); ctx.clip();
  const halo = ctx.createRadialGradient(W / 2, H * .55, 0, W / 2, H * .55, W * .5);
  halo.addColorStop(0, withAlpha(def.accent || '#f0a15a', .22)); halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo; ctx.fillRect(0, 0, W, H);
  drawEnemy(ctx, def, W / 2, H * .94, H * .52, 0, {});
  ctx.restore();
}

export function drawFace(canvas, member, dpr = 1) {
  drawPortrait(canvas, member, { dpr });
}

// ── pixel enemies (battle) ───────────────────────────────────────────────
// Drawn facing the party. (x,y) = feet centre, s = height scale.
export function drawEnemy(ctx, def, x, y, s, t = 0, fx = {}) {
  const col = def.color || '#8a6a4a';
  const acc = def.accent || '#f0a15a';
  const scale = def.size || 1;
  const Hh = s * 1.5 * scale;
  const foot = y + (fx.bob || 0);
  const shake = fx.shake || 0;
  const alpha = fx.alpha ?? 1;
  const flash = fx.flash || 0;
  ctx.save();
  ctx.translate(Math.round(x + shake), Math.round(y));
  ctx.globalAlpha = alpha;
  const body = (c) => flash > 0 ? '#f0e8d0' : c;
  ctx.shadowColor = withAlpha(acc, .35); ctx.shadowBlur = s * .1 * scale;

  if (def.shape === 'wisp') {
    const fy = foot - Hh * .55;
    const g = ctx.createRadialGradient(0, fy, 0, 0, fy, Hh * .3);
    g.addColorStop(0, '#fff1cf'); g.addColorStop(.35, acc); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, fy, Hh * .32, 0, TAU); ctx.fill();
    ctx.fillStyle = body(col); ctx.beginPath(); ctx.arc(0, fy, Hh * .14, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2b1810';
    ctx.beginPath(); ctx.arc(-Hh * .06, fy - Hh * .02, s * .02, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(Hh * .06, fy - Hh * .02, s * .02, 0, TAU); ctx.fill();
  } else if (def.shape === 'wolf') {
    const by = foot - Hh * .34;
    ctx.fillStyle = body(col);
    ctx.beginPath(); ctx.ellipse(0, by, Hh * .3, Hh * .16, -.1, 0, TAU); ctx.fill();
    ctx.strokeStyle = shadeC(col, -30); ctx.lineWidth = s * .06; ctx.lineCap = 'round';
    for (const [ox, oy] of [[-.16, .13], [.15, .12], [-.05, .17], [.25, .17]]) {
      ctx.beginPath(); ctx.moveTo(ox * Hh, by + Hh * .1); ctx.lineTo(ox * Hh + oy * Hh * .7, foot); ctx.stroke();
    }
    ctx.fillStyle = body(shadeC(col, 12));
    ctx.beginPath(); ctx.ellipse(-Hh * .28, by - Hh * .12, Hh * .14, Hh * .12, -.3, 0, TAU); ctx.fill();
    ctx.fillStyle = shadeC(col, -20);
    ctx.beginPath(); ctx.moveTo(-Hh * .28, by - Hh * .22); ctx.lineTo(-Hh * .24, by - Hh * .36); ctx.lineTo(-Hh * .17, by - Hh * .23); ctx.fill();
    ctx.fillStyle = acc; ctx.shadowColor = acc; ctx.shadowBlur = s * .1;
    ctx.beginPath(); ctx.arc(-Hh * .36, by - Hh * .13, s * .02, 0, TAU); ctx.fill();
  } else if (def.shape === 'husk' || def.shape === 'human') {
    const h = Hh * .78;
    const wide = def.shape === 'husk' ? .4 : .34;
    ctx.fillStyle = body(col);
    rr(ctx, -Hh * wide * .55, foot - h, Hh * wide * 1.1, h * .72, s * .05); ctx.fill();
    ctx.fillStyle = shadeC(col, -35);
    rr(ctx, -Hh * .14, foot - h * .35, Hh * .11, h * .35, 2); ctx.fill();
    rr(ctx, Hh * .03, foot - h * .35, Hh * .11, h * .35, 2); ctx.fill();
    ctx.strokeStyle = shadeC(col, 8); ctx.lineWidth = s * .07; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-Hh * wide * .5, foot - h * .85); ctx.lineTo(-Hh * wide * .75, foot - h * .45); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(Hh * wide * .5, foot - h * .85); ctx.lineTo(Hh * wide * .7, foot - h * .5); ctx.stroke();
    ctx.fillStyle = def.shape === 'husk' ? '#c6b89c' : '#e0c8a8';
    ctx.beginPath(); ctx.arc(0, foot - h - s * .03, Hh * .1, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2b211c';
    if (def.shape === 'husk') {
      ctx.beginPath(); ctx.arc(-Hh * .03, foot - h - s * .03, s * .02, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(Hh * .03, foot - h - s * .03, s * .02, 0, TAU); ctx.fill();
    } else {
      ctx.fillStyle = shadeC(col, -35);
      ctx.beginPath(); ctx.arc(0, foot - h - s * .02, Hh * .12, Math.PI * 1.02, Math.PI * 1.98); ctx.fill();
      ctx.fillStyle = acc;
      ctx.beginPath(); ctx.arc(-Hh * .03, foot - h, s * .015, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(Hh * .03, foot - h, s * .015, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#cfc6b2'; ctx.lineWidth = s * .03;
      ctx.beginPath(); ctx.moveTo(-Hh * .28, foot - h * .7); ctx.lineTo(-Hh * .48, foot - h * .15); ctx.stroke();
    }
    ctx.fillStyle = withAlpha(acc, .8);
    rr(ctx, -Hh * wide * .5, foot - h * .42, Hh * wide * 1.1, s * .03, 2); ctx.fill();
  } else if (def.shape === 'plant') {
    const baseY = foot;
    ctx.fillStyle = body(shadeC(col, -18));
    ctx.beginPath(); ctx.moveTo(-Hh * .22, baseY); ctx.quadraticCurveTo(-Hh * .34, baseY - Hh * .7, 0, baseY - Hh * .85); ctx.quadraticCurveTo(Hh * .34, baseY - Hh * .7, Hh * .22, baseY); ctx.closePath(); ctx.fill();
    ctx.fillStyle = body(col);
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI + i * Math.PI / 5;
      ctx.beginPath(); ctx.ellipse(Math.cos(a) * Hh * .15, baseY - Hh * .8 + Math.sin(a) * Hh * .07, Hh * .1, Hh * .05, a, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = '#1d2a18'; ctx.beginPath(); ctx.arc(0, baseY - Hh * .8, Hh * .1, 0, TAU); ctx.fill();
  } else if (def.shape === 'toad') {
    const h = Hh * .5;
    ctx.fillStyle = body(col);
    ctx.beginPath(); ctx.ellipse(0, foot - h * .42, Hh * .34, h * .7, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = shadeC(col, 25);
    ctx.beginPath(); ctx.arc(-Hh * .25, foot - h * .95, Hh * .08, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(-Hh * .06, foot - h * .95, Hh * .08, 0, TAU); ctx.fill();
    ctx.fillStyle = '#10170f';
    ctx.beginPath(); ctx.arc(-Hh * .27, foot - h * .95, s * .03, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(-Hh * .04, foot - h * .95, s * .03, 0, TAU); ctx.fill();
  } else if (def.shape === 'wraith' || def.shape === 'witch') {
    const h = Hh * .8;
    const float = Math.sin(t * 1.4) * s * .03;
    ctx.fillStyle = body(col);
    ctx.globalAlpha = alpha * .9;
    ctx.beginPath();
    ctx.moveTo(-Hh * .3, foot - h * .15 + float);
    ctx.quadraticCurveTo(-Hh * .4, foot - h * .75 + float, 0, foot - h + float);
    ctx.quadraticCurveTo(Hh * .4, foot - h * .75 + float, Hh * .3, foot - h * .15 + float);
    ctx.lineTo(Hh * .22, foot - h * .02 + float);
    ctx.lineTo(Hh * .1, foot - h * .14 + float);
    ctx.lineTo(0, foot + float);
    ctx.lineTo(-Hh * .14, foot - h * .14 + float);
    ctx.lineTo(-Hh * .24, foot - h * .02 + float);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#171420';
    ctx.beginPath(); ctx.ellipse(-Hh * .02, foot - h * .78 + float, Hh * .12, Hh * .14, 0, 0, TAU); ctx.fill();
    if (def.shape === 'witch') {
      ctx.fillStyle = acc; ctx.shadowColor = acc; ctx.shadowBlur = s * .15;
      ctx.beginPath(); ctx.arc(-Hh * .06, foot - h * .77 + float, s * .025, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(Hh * .04, foot - h * .77 + float, s * .025, 0, TAU); ctx.fill();
      ctx.fillStyle = body(shadeC(col, -18));
      ctx.beginPath(); ctx.moveTo(-Hh * .22, foot - h * .85 + float); ctx.lineTo(0, foot - h * 1.2 + float); ctx.lineTo(Hh * .16, foot - h * .85 + float); ctx.closePath(); ctx.fill();
    } else {
      ctx.fillStyle = acc; ctx.shadowColor = acc; ctx.shadowBlur = s * .15;
      ctx.beginPath(); ctx.arc(-Hh * .04, foot - h * .79 + float, s * .02, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(Hh * .02, foot - h * .79 + float, s * .02, 0, TAU); ctx.fill();
    }
  } else if (def.shape === 'golem') {
    const h = Hh * .8;
    ctx.fillStyle = body(col);
    rr(ctx, -Hh * .28, foot - h, Hh * .56, h, s * .05); ctx.fill();
    ctx.fillStyle = shadeC(col, -18);
    rr(ctx, -Hh * .4, foot - h * .9, Hh * .16, h * .5, s * .04); ctx.fill();
    rr(ctx, Hh * .24, foot - h * .9, Hh * .16, h * .5, s * .04); ctx.fill();
    ctx.strokeStyle = acc; ctx.lineWidth = s * .025; ctx.shadowColor = acc; ctx.shadowBlur = s * .1;
    ctx.beginPath(); ctx.moveTo(-Hh * .18, foot - h * .9); ctx.lineTo(-Hh * .04, foot - h * .68); ctx.lineTo(-Hh * .12, foot - h * .48); ctx.lineTo(Hh * .04, foot - h * .28); ctx.stroke();
    ctx.fillStyle = acc;
    ctx.beginPath(); ctx.arc(-Hh * .06, foot - h - Hh * .02, s * .02, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(Hh * .06, foot - h - Hh * .02, s * .02, 0, TAU); ctx.fill();
  } else if (def.shape === 'knight' || def.shape === 'king') {
    const h = Hh * .82 * (def.shape === 'king' ? 1.1 : 1);
    const wide = def.shape === 'king' ? .42 : .36;
    ctx.fillStyle = withAlpha(shadeC(col, -35), .9);
    ctx.beginPath(); ctx.moveTo(-Hh * wide * .5, foot - h * .9); ctx.lineTo(-Hh * wide, foot - h * .02); ctx.lineTo(Hh * wide * .2, foot - h * .06); ctx.closePath(); ctx.fill();
    ctx.fillStyle = body(col);
    rr(ctx, -Hh * wide * .6, foot - h, Hh * wide * 1.2, h * .7, s * .05); ctx.fill();
    ctx.fillStyle = shadeC(col, 18);
    ctx.beginPath(); ctx.moveTo(-Hh * wide * .6, foot - h + s * .02); ctx.lineTo(0, foot - h * .78); ctx.lineTo(Hh * wide * .6, foot - h + s * .02); ctx.fill();
    ctx.fillStyle = shadeC(col, -25);
    rr(ctx, -Hh * .15, foot - h * .34, Hh * .12, h * .34, 2); ctx.fill();
    rr(ctx, Hh * .03, foot - h * .34, Hh * .12, h * .34, 2); ctx.fill();
    ctx.fillStyle = shadeC(col, 6);
    rr(ctx, -Hh * wide * .75, foot - h * .8, Hh * .14, h * .38, s * .03); ctx.fill();
    ctx.fillStyle = shadeC(col, 25);
    ctx.beginPath(); ctx.arc(0, foot - h - s * .02, Hh * .11, Math.PI, TAU); ctx.fill();
    rr(ctx, -Hh * .11, foot - h - s * .03, Hh * .22, Hh * .11, s * .02); ctx.fill();
    ctx.fillStyle = '#1a120e';
    rr(ctx, -Hh * .07, foot - h + Hh * .02, Hh * .14, s * .02, 1); ctx.fill();
    ctx.fillStyle = acc; ctx.shadowColor = acc; ctx.shadowBlur = s * .12;
    ctx.beginPath(); ctx.arc(-Hh * .04, foot - h + Hh * .035, s * .012, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(Hh * .04, foot - h + Hh * .035, s * .012, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#cfd6da'; ctx.lineWidth = s * .04;
    ctx.beginPath(); ctx.moveTo(-Hh * wide * .75, foot - h * .38); ctx.lineTo(-Hh * wide * .75 - Hh * .16, foot + s * .05); ctx.stroke();
    if (def.shape === 'king') {
      ctx.fillStyle = acc; ctx.shadowColor = acc; ctx.shadowBlur = s * .18;
      const cy = foot - h - Hh * .16;
      ctx.beginPath(); ctx.moveTo(-Hh * .12, cy); ctx.lineTo(-Hh * .1, cy - Hh * .07); ctx.lineTo(-Hh * .05, cy - Hh * .02); ctx.lineTo(0, cy - Hh * .1); ctx.lineTo(Hh * .05, cy - Hh * .02); ctx.lineTo(Hh * .1, cy - Hh * .07); ctx.lineTo(Hh * .12, cy); ctx.closePath(); ctx.fill();
    }
  } else {
    ctx.fillStyle = body(col);
    ctx.beginPath(); ctx.arc(0, foot - Hh * .4, Hh * .26, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

// ── class art for creation screen (pixel) ────────────────────────────────
export function drawClassArt(canvas, classId, paletteIdx, opts = {}) {
  const ctx = canvas.getContext('2d');
  const dpr = opts.dpr || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const W = canvas.width / dpr, H = canvas.height / dpr;
  const cls = CLASSES[classId];
  const pal = PALETTES[paletteIdx] || PALETTES[0];
  ctx.clearRect(0, 0, W, H);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, withAlpha(cls.color, .16)); g.addColorStop(1, 'rgba(8,11,17,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = withAlpha(cls.color, .18); ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath(); ctx.arc(W / 2, H * .55, H * (.2 + i * .11), 0, TAU); ctx.stroke();
  }
  const member = { classId, palette: paletteIdx, name: cls.name };
  drawPerson(ctx, W / 2, H * .94, H * .32, {
    classId, palette: pal, role: '', facing: 'down', time: opts.time || 0, scale: 1,
  });
}
