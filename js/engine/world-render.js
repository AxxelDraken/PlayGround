import { state } from '../state.js';
import { CLASSES } from '../data/classes.js';
import { ITEMS } from '../data/items.js';
import { drawPerson, drawEnemy, TAU, clamp, hash, rr, shade, withAlpha, paletteFor } from './art.js';

const P = {
  village: {
    grass: '#3c5335', grass2: '#45613a', detail: '#5d7a48', path: '#7a6a4d', path2: '#6c5d44',
    stone: '#6c6a5b', stone2: '#5c5a4d', water: '#2b4f5c', water2: '#3c6a72', wall: '#8a7a60',
    roof: '#5a3830', roof2: '#70463a', rock: '#5d5a50', leaf: '#37522f', leaf2: '#4d6f3b',
    trunk: '#4a3526', accent: '#efab6a',
  },
  plains: {
    grass: '#4f5d35', grass2: '#5b683b', detail: '#7a8349', path: '#806e4c', path2: '#716043',
    stone: '#6c6655', stone2: '#5b5748', water: '#375c62', water2: '#4b7477', wall: '#8b7a5c',
    roof: '#5f3b30', roof2: '#764837', rock: '#665f50', leaf: '#3f5c32', leaf2: '#5b7a3e',
    trunk: '#4a3526', accent: '#f0b45e',
  },
  forest: {
    grass: '#283e2d', grass2: '#314934', detail: '#4d7042', path: '#5f523a', path2: '#554a36',
    stone: '#5d6252', stone2: '#4e5445', water: '#2a4848', water2: '#3c6660', wall: '#756a51',
    roof: '#46322a', roof2: '#5a4033', rock: '#4c4f45', leaf: '#24412c', leaf2: '#3a5d38',
    trunk: '#3f2e21', accent: '#78d5c0',
  },
  mire: {
    grass: '#31443a', grass2: '#3a5044', detail: '#577a5e', path: '#56513f', path2: '#4b4738',
    stone: '#555d54', stone2: '#474f47', water: '#263f44', water2: '#33585b', wall: '#5f5a48',
    roof: '#3d302b', roof2: '#4f3e33', rock: '#474d46', leaf: '#2c4033', leaf2: '#405a42',
    trunk: '#3c2f26', accent: '#8fd0b0',
  },
  peaks: {
    grass: '#3a3130', grass2: '#443938', detail: '#594a45', path: '#5e544c', path2: '#524941',
    stone: '#5a504a', stone2: '#4a423d', water: '#2f3b43', water2: '#44555c', wall: '#625046',
    roof: '#3f2c28', roof2: '#523832', rock: '#51443c', leaf: '#3c312b', leaf2: '#564139',
    trunk: '#3a2b24', accent: '#ff9257',
  },
  citadel: {
    grass: '#292b34', grass2: '#30323c', detail: '#40434f', path: '#3b3c46', path2: '#33343d',
    stone: '#45464f', stone2: '#383943', water: '#283540', water2: '#384c5a', wall: '#3e3f49',
    roof: '#32323c', roof2: '#3e3e49', rock: '#3f4049', leaf: '#33343c', leaf2: '#44454e',
    trunk: '#2c2c32', accent: '#b79bea',
  },
};

const BLOCKED_OBJECTS = new Set(['#', 'T', '^', 'r', 'R', 'f', 'g', 'H', 'h', 'D', 'W', 'L', 'A', 'i', 't', 'n', 'B', 'C', 'o', 'S']);

// ── ground ─────────────────────────────────────────────────────
function drawGround(ctx, ch, x, y, T, p, now, tx, ty) {
  const h = hash(tx, ty);
  let base = p.grass;
  if (ch === ',' ) base = shade(p.grass2, 6);
  else if (ch === '"') base = p.grass2;
  else if (ch === '=') base = p.stone;
  else if (ch === '_') base = p.path;
  else if (ch === 's') base = '#8a7552';
  else if (ch === 'x') base = '#3a3330';
  else if (ch === 'b') base = '#554636';
  else if (ch === 'w') base = p.water;
  else if (ch === '~') base = p.water;
  else if (ch === 'v') base = '#431d15';
  else if (ch === 'H' || ch === 'h' || ch === 'D' || ch === 'W') base = p.stone2;
  else if (ch === 'A' || ch === 'S' || ch === 'o' || ch === 'C' || ch === 'i' || ch === 'f') base = p.grass;
  else if (ch === 'P') base = p.stone;
  if (!['=', '_', 'b', 'H', 'h', 'D', 'W', 'A', 'P', 'S', 'L'].includes(ch)) {
    base = shade(base, Math.round((h - .5) * 12));
  }
  ctx.fillStyle = base;
  ctx.fillRect(x, y, T + 1, T + 1);

  if (ch === '.' || ch === ',' || ch === '"' || ch === 'x' || ch === 's') {
    // speckle
    if (h > .55) {
      ctx.fillStyle = withAlpha(p.detail, ch === 'x' ? .18 : .3);
      const n = ch === ',' ? 4 : 2;
      for (let i = 0; i < n; i++) {
        const hx = hash(tx * 7 + i, ty * 13);
        const hy = hash(tx * 3, ty * 17 + i);
        ctx.fillRect(x + hx * T, y + hy * T, Math.max(1, T * .045), Math.max(1, T * .045));
      }
    }
    if (ch === ',') {
      const sway = Math.sin(now / 700 + tx * .8 + ty * .4) * T * .03;
      ctx.strokeStyle = withAlpha(shade(p.detail, 15), .85);
      ctx.lineWidth = Math.max(1, T * .04);
      for (let i = 0; i < 3; i++) {
        const bx = x + T * (.18 + i * .28) + (h - .5) * T * .12;
        const by = y + T * .82;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(bx + sway, by - T * .22, bx + sway * 1.4 + T * .04, by - T * .4);
        ctx.stroke();
      }
    }
    if (ch === '"') {
      const cols = ['#d9c07a', '#c98f9a', '#b7c9e0'];
      ctx.fillStyle = cols[Math.floor(h * cols.length)];
      ctx.beginPath();
      ctx.arc(x + T * .35, y + T * .4, T * .05, 0, TAU);
      ctx.arc(x + T * .55, y + T * .35, T * .04, 0, TAU);
      ctx.arc(x + T * .62, y + T * .55, T * .045, 0, TAU);
      ctx.fill();
    }
    if (ch === 'x' && h > .7) {
      ctx.strokeStyle = 'rgba(20,16,16,.35)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x + T * .2, y + T * .7); ctx.lineTo(x + T * .5, y + T * .6); ctx.lineTo(x + T * .8, y + T * .72); ctx.stroke();
    }
    return;
  }
  if (ch === '=' || ch === '_') {
    // subtle tiled path
    ctx.strokeStyle = ch === '=' ? withAlpha(p.stone2, .55) : withAlpha(p.path2, .5);
    ctx.lineWidth = 1;
    if (ch === '=') {
      ctx.strokeRect(x + .5, y + .5, T - 1, T - 1);
      if (h > .8) { ctx.beginPath(); ctx.moveTo(x + T * .3, y + T * .35); ctx.lineTo(x + T * .46, y + T * .52); ctx.stroke(); }
    } else if (h > .7) {
      ctx.beginPath(); ctx.arc(x + T * .3, y + T * .65, T * .025, 0, TAU);
      ctx.arc(x + T * .7, y + T * .3, T * .02, 0, TAU); ctx.stroke();
    }
    return;
  }
  if (ch === 'b') {
    ctx.fillStyle = '#4b3b2c';
    ctx.fillRect(x, y + T * .18, T, T * .64);
    ctx.strokeStyle = 'rgba(25,18,12,.5)'; ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath(); ctx.moveTo(x, y + T * (.18 + i * .16)); ctx.lineTo(x + T, y + T * (.18 + i * .16)); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,.06)';
    ctx.fillRect(x, y + T * .2, T, 1);
    return;
  }
  if (ch === 'w' || ch === '~') {
    const deep = ch === '~';
    ctx.fillStyle = deep ? p.water : p.water2;
    ctx.fillRect(x, y, T + 1, T + 1);
    ctx.fillStyle = withAlpha(deep ? p.water2 : '#7fb4b0', deep ? .25 : .35);
    const off = Math.sin(now / 900 + tx * .9 + ty * .6);
    ctx.globalAlpha = deep ? .3 : .5;
    ctx.fillRect(x + T * .15 + off * 3, y + T * .35, T * .4, Math.max(1, T * .035));
    ctx.fillRect(x + T * .45 - off * 2, y + T * .68, T * .3, Math.max(1, T * .03));
    ctx.globalAlpha = 1;
    if (!deep) {
      ctx.strokeStyle = withAlpha('#93b87e', .5); ctx.lineWidth = Math.max(1, T * .03);
      const sw = Math.sin(now / 800 + tx) * 2;
      ctx.beginPath(); ctx.moveTo(x + T * .2, y + T * .85); ctx.lineTo(x + T * .22 + sw, y + T * .6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + T * .75, y + T * .8); ctx.lineTo(x + T * .74 + sw, y + T * .58); ctx.stroke();
    }
    return;
  }
  if (ch === 'v') {
    const glow = .55 + .25 * Math.sin(now / 340 + tx * 1.7);
    ctx.fillStyle = '#e0632c';
    ctx.globalAlpha = glow;
    ctx.fillRect(x + T * .08, y + T * .08, T * .84, T * .84);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffd08a';
    ctx.globalAlpha = .7;
    ctx.beginPath(); ctx.arc(x + T * .4, y + T * .5, T * .07, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
    return;
  }
  if (ch === 'H' || ch === 'h' || ch === 'D' || ch === 'W') {
    ctx.fillStyle = ch === 'W' ? shade(p.wall, -45) : p.wall;
    ctx.fillRect(x, y, T + 1, T + 1);
    if (ch === 'W') {
      ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 1;
      for (let i = 0; i < 2; i++) {
        ctx.beginPath(); ctx.moveTo(x, y + T * (.3 + i * .4)); ctx.lineTo(x + T, y + T * (.3 + i * .4)); ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(x + T * .55, y); ctx.lineTo(x + T * .55, y + T * .3); ctx.stroke();
    }
  }
}

// ── object drawing ─────────────────────────────────────────────
function drawTree(ctx, x, y, T, p, opts = {}) {
  const big = opts.big;
  const h = hash(x * .017, y * .013);
  const cx = x + T * .5 + (h - .5) * T * .12;
  const baseY = y + T * .95;
  const th = T * (big ? .52 : .36);
  ctx.fillStyle = 'rgba(0,0,0,.22)';
  ctx.beginPath(); ctx.ellipse(cx, baseY, T * (big ? .42 : .3), T * .1, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = p.trunk;
  ctx.fillRect(cx - T * .045, baseY - th, T * .09, th);
  const sway = Math.sin(performance.now() / 2600 + h * 8) * T * .025;
  const leaf = shade(p.leaf, Math.round((h - .5) * 18));
  const leaf2 = shade(p.leaf2, Math.round((h - .5) * 16));
  const r = T * (big ? .46 : .34);
  const top = baseY - th - r * .5;
  ctx.fillStyle = leaf;
  ctx.beginPath(); ctx.arc(cx - r * .42, top + r * .3, r * .58, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + r * .42, top + r * .32, r * .56, 0, TAU); ctx.fill();
  ctx.fillStyle = leaf2;
  ctx.beginPath(); ctx.arc(cx - r * .1 + sway, top - r * .18, r * .7, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + r * .28 + sway, top + r * .02, r * .48, 0, TAU); ctx.fill();
  ctx.fillStyle = withAlpha(p.detail, .3);
  ctx.beginPath(); ctx.arc(cx - r * .3 + sway, top - r * .28, r * .22, 0, TAU); ctx.fill();
}

function drawMountain(ctx, x, y, T, p, tx, ty) {
  const h = hash(tx, ty);
  ctx.fillStyle = shade(p.rock, Math.round((h - .5) * 20));
  ctx.beginPath();
  ctx.moveTo(x - T * .25, y + T * 1.05);
  ctx.lineTo(x + T * (.35 + h * .3), y - T * .3);
  ctx.lineTo(x + T * 1.2, y + T * 1.05);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.07)';
  ctx.beginPath();
  ctx.moveTo(x + T * (.35 + h * .3), y - T * .3);
  ctx.lineTo(x + T * .66, y + T * .2);
  ctx.lineTo(x + T * .45, y + T * .12);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x + T * .48, y + T * .4); ctx.lineTo(x + T * .56, y + T * .62); ctx.stroke();
}

function drawRock(ctx, x, y, T, p, tx, ty) {
  const h = hash(tx, ty);
  const cx = x + T * .5, cy = y + T * .72;
  ctx.fillStyle = 'rgba(0,0,0,.2)';
  ctx.beginPath(); ctx.ellipse(cx, y + T * .9, T * .3, T * .08, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = shade(p.rock, Math.round((h - .5) * 24));
  ctx.beginPath();
  ctx.moveTo(cx - T * .3, cy + T * .1);
  ctx.lineTo(cx - T * .2, cy - T * .25);
  ctx.lineTo(cx + T * .06, cy - T * .35);
  ctx.lineTo(cx + T * .29, cy - T * .12);
  ctx.lineTo(cx + T * .25, cy + T * .15);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.1)';
  ctx.beginPath(); ctx.moveTo(cx - T * .15, cy - T * .2); ctx.lineTo(cx + T * .03, cy - T * .3); ctx.lineTo(cx - T * .02, cy - T * .1); ctx.closePath(); ctx.fill();
}

function drawHouseTile(ctx, ch, x, y, T, p, tx, ty) {
  if (ch === 'h') {
    const topRow = true;
    ctx.fillStyle = '#1b1410';
    ctx.fillRect(x, y, T + 1, T + 1);
    ctx.fillStyle = shade(p.roof, Math.round((hash(tx, ty) - .5) * 10));
    ctx.fillRect(x, y, T + 1, T + .5);
    ctx.strokeStyle = withAlpha('#1a1210', .5); ctx.lineWidth = 1;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(x, y + T * i / 3); ctx.lineTo(x + T, y + T * i / 3); ctx.stroke();
    }
    for (let i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.moveTo(x + T * (i * .28 + .1), y + T * .1); ctx.lineTo(x + T * (i * .28 + .3), y + T * .55); ctx.stroke();
    }
    ctx.fillStyle = withAlpha(p.roof2, .24);
    ctx.fillRect(x, y + T * .55, T, T * .45);
    // shingle speckle
    if (hash(tx * 3, ty * 5) > .5) {
      ctx.fillStyle = 'rgba(255,255,255,.05)';
      ctx.fillRect(x + T * .2, y + T * .2, T * .3, 1);
    }
  } else if (ch === 'H' || ch === 'D') {
    ctx.fillStyle = '#2e241b';
    ctx.fillRect(x, y, T + 1, T + 1);
    ctx.fillStyle = shade(p.wall, -18);
    ctx.fillRect(x + T * .03, y, T * .94, T + 1);
    // timber beams
    ctx.fillStyle = '#3a2a1d';
    ctx.fillRect(x, y, T * .08, T);
    ctx.fillRect(x + T * .92, y, T * .08, T);
    if (ch === 'D') {
      const dx = x + T * .18, dw = T * .64;
      ctx.fillStyle = '#20150f';
      ctx.beginPath();
      ctx.moveTo(dx, y + T);
      ctx.lineTo(dx, y + T * .3);
      ctx.quadraticCurveTo(dx + dw * .5, y - T * .05, dx + dw, y + T * .3);
      ctx.lineTo(dx + dw, y + T);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = withAlpha(p.accent, .35); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(dx + dw * .5, y + T * .38, T * .09, Math.PI, 0); ctx.stroke();
      ctx.fillStyle = '#d9b46a';
      ctx.beginPath(); ctx.arc(dx + dw * .78, y + T * .66, T * .025, 0, TAU); ctx.fill();
    } else {
      if (hash(tx, ty) > .35) {
        ctx.fillStyle = '#171e24';
        ctx.fillRect(x + T * .28, y + T * .25, T * .18, T * .22);
        ctx.fillRect(x + T * .58, y + T * .25, T * .18, T * .22);
        ctx.fillStyle = withAlpha('#ffcf8a', .18);
        ctx.fillRect(x + T * .3, y + T * .27, T * .14, T * .12);
        ctx.fillRect(x + T * .6, y + T * .27, T * .14, T * .12);
        ctx.strokeStyle = 'rgba(40,28,18,.5)'; ctx.lineWidth = 1;
        ctx.strokeRect(x + T * .27, y + T * .24, T * .2, T * .24);
        ctx.strokeRect(x + T * .57, y + T * .24, T * .2, T * .24);
      }
    }
    ctx.fillStyle = 'rgba(0,0,0,.22)';
    ctx.fillRect(x, y + T * .92, T, T * .08);
  }
}

function drawFence(ctx, x, y, T, p) {
  ctx.fillStyle = 'rgba(0,0,0,.16)';
  ctx.fillRect(x, y + T * .75, T, T * .08);
  ctx.strokeStyle = '#5b442e'; ctx.lineWidth = Math.max(1, T * .07);
  ctx.beginPath();
  ctx.moveTo(x + T * .1, y + T * .25); ctx.lineTo(x + T * .1, y + T * .85);
  ctx.moveTo(x + T * .9, y + T * .25); ctx.lineTo(x + T * .9, y + T * .85);
  ctx.stroke();
  ctx.lineWidth = Math.max(1, T * .05);
  ctx.beginPath();
  ctx.moveTo(x, y + T * .42); ctx.lineTo(x + T, y + T * .42);
  ctx.moveTo(x, y + T * .66); ctx.lineTo(x + T, y + T * .66);
  ctx.stroke();
}

function drawCrystal(ctx, x, y, T, now) {
  const cx = x + T * .5, cy = y + T * .5 + Math.sin(now / 900) * T * .04;
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, T * .8);
  glow.addColorStop(0, 'rgba(120,235,210,.28)'); glow.addColorStop(1, 'rgba(120,235,210,0)');
  ctx.fillStyle = glow; ctx.fillRect(x - T * .4, y - T * .4, T * 1.8, T * 1.8);
  ctx.save(); ctx.translate(cx, cy); ctx.shadowColor = '#7fe8d0'; ctx.shadowBlur = T * .35;
  ctx.fillStyle = '#a8f0dc';
  ctx.beginPath();
  ctx.moveTo(0, -T * .32); ctx.lineTo(T * .18, -T * .05); ctx.lineTo(T * .1, T * .3);
  ctx.lineTo(-T * .12, T * .32); ctx.lineTo(-T * .19, -T * .02); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.65)';
  ctx.beginPath(); ctx.moveTo(0, -T * .3); ctx.lineTo(T * .06, T * .05); ctx.lineTo(-T * .06, T * .12); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  ctx.beginPath(); ctx.ellipse(cx, y + T * .86, T * .28, T * .06, 0, 0, TAU); ctx.fill();
}

function drawChest(ctx, x, y, T, opened) {
  const cx = x + T * .5, base = y + T * .82;
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  ctx.beginPath(); ctx.ellipse(cx, base + T * .05, T * .27, T * .07, 0, 0, TAU); ctx.fill();
  const w = T * .56, h = T * .38;
  ctx.fillStyle = '#6b4a2c';
  rr(ctx, cx - w / 2, base - h, w, h, T * .04); ctx.fill();
  ctx.fillStyle = '#4c321d';
  rr(ctx, cx - w / 2, base - h * .55, w, h * .18, 2); ctx.fill();
  ctx.strokeStyle = '#d9b46a'; ctx.lineWidth = Math.max(1, T * .025);
  ctx.strokeRect(cx - w / 2 + 1, base - h + 1, w - 2, h - 2);
  ctx.fillStyle = opened ? '#2a2018' : '#d9b46a';
  if (opened) {
    ctx.fillStyle = '#2a1c12';
    ctx.beginPath();
    ctx.moveTo(cx - w / 2, base - h);
    ctx.lineTo(cx - w / 2 - T * .06, base - h - T * .2);
    ctx.lineTo(cx + w / 2 + T * .06, base - h - T * .2);
    ctx.lineTo(cx + w / 2, base - h);
    ctx.closePath(); ctx.fill();
  } else {
    ctx.fillRect(cx - T * .03, base - h * .6, T * .06, T * .1);
  }
}

function drawBrazier(ctx, x, y, T, lit, now) {
  const cx = x + T * .5, base = y + T * .82;
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.beginPath(); ctx.ellipse(cx, base + 2, T * .22, T * .06, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#3f342b'; ctx.lineWidth = T * .05;
  ctx.beginPath(); ctx.moveTo(cx - T * .12, base); ctx.lineTo(cx - T * .06, base - T * .28); ctx.moveTo(cx + T * .12, base); ctx.lineTo(cx + T * .06, base - T * .28); ctx.stroke();
  ctx.fillStyle = '#4b3f33';
  ctx.beginPath(); ctx.ellipse(cx, base - T * .3, T * .2, T * .07, 0, 0, TAU); ctx.fill();
  if (lit) {
    const flick = .8 + Math.sin(now / 90 + x) * .2;
    const glow = ctx.createRadialGradient(cx, base - T * .4, 0, cx, base - T * .4, T * .55);
    glow.addColorStop(0, 'rgba(255,170,80,.4)'); glow.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = glow; ctx.fillRect(cx - T * .7, base - T * 1.1, T * 1.4, T * 1.4);
    ctx.fillStyle = '#ffcf7a';
    ctx.beginPath();
    ctx.moveTo(cx - T * .09, base - T * .32);
    ctx.quadraticCurveTo(cx - T * .14, base - T * .55, cx + Math.sin(now / 140) * T * .03, base - T * .58 * flick);
    ctx.quadraticCurveTo(cx + T * .13, base - T * .52, cx + T * .09, base - T * .32);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,120,50,.8)';
    ctx.beginPath(); ctx.arc(cx, base - T * .38, T * .06, 0, TAU); ctx.fill();
  } else {
    ctx.fillStyle = '#2a2420';
    ctx.beginPath(); ctx.ellipse(cx, base - T * .31, T * .15, T * .05, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(120,70,50,.5)';
    ctx.beginPath(); ctx.arc(cx - T * .04, base - T * .33, T * .02, 0, TAU); ctx.fill();
  }
}

function drawPortal(ctx, x, y, T, now, accent) {
  const cx = x + T * .5, base = y + T * .85;
  const g = ctx.createRadialGradient(cx, base - T * .2, 0, cx, base - T * .2, T * .65);
  g.addColorStop(0, withAlpha(accent, .35)); g.addColorStop(1, withAlpha(accent, 0));
  ctx.fillStyle = g; ctx.fillRect(cx - T, base - T * 1.1, T * 2, T * 1.6);
  ctx.strokeStyle = shade(accent, -40); ctx.lineWidth = T * .07;
  ctx.beginPath(); ctx.moveTo(cx - T * .3, base); ctx.lineTo(cx - T * .3, base - T * .38);
  ctx.quadraticCurveTo(cx, base - T * .72, cx + T * .3, base - T * .38);
  ctx.lineTo(cx + T * .3, base); ctx.stroke();
  ctx.fillStyle = withAlpha(accent, .28 + Math.sin(now / 500) * .08);
  ctx.beginPath(); ctx.ellipse(cx, base - T * .2, T * .23, T * .28, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  ctx.beginPath(); ctx.ellipse(cx, base + T * .02, T * .33, T * .08, 0, 0, TAU); ctx.fill();
}

function drawSign(ctx, x, y, T, p) {
  const cx = x + T * .5, base = y + T * .9;
  ctx.fillStyle = 'rgba(0,0,0,.22)';
  ctx.beginPath(); ctx.ellipse(cx, base, T * .2, T * .05, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#4a3725';
  ctx.fillRect(cx - T * .03, base - T * .55, T * .06, T * .55);
  ctx.fillStyle = '#6b5237';
  rr(ctx, cx - T * .26, base - T * .78, T * .52, T * .3, 2); ctx.fill();
  ctx.strokeStyle = '#c9a97a'; ctx.lineWidth = 1;
  ctx.strokeRect(cx - T * .24, base - T * .76, T * .48, T * .26);
}

function drawAltar(ctx, x, y, T, now, accent, active) {
  const cx = x + T * .5, base = y + T * .86;
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.beginPath(); ctx.ellipse(cx, base, T * .32, T * .08, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#5a564d';
  rr(ctx, cx - T * .26, base - T * .3, T * .52, T * .28, 2); ctx.fill();
  ctx.fillStyle = '#6d685e';
  rr(ctx, cx - T * .22, base - T * .55, T * .44, T * .26, 2); ctx.fill();
  ctx.fillStyle = '#43413a';
  rr(ctx, cx - T * .3, base - T * .05, T * .6, T * .08, 2); ctx.fill();
  if (active) {
    ctx.save();
    ctx.shadowColor = accent; ctx.shadowBlur = T * .4;
    ctx.fillStyle = withAlpha(accent, .9);
    const fy = base - T * .74 + Math.sin(now / 600) * T * .04;
    ctx.beginPath();
    ctx.moveTo(cx, fy - T * .16); ctx.lineTo(cx + T * .08, fy); ctx.lineTo(cx, fy + T * .16); ctx.lineTo(cx - T * .08, fy); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = withAlpha(accent, .4); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, base - T * .58, T * .28 + Math.sin(now / 700) * T * .02, 0, TAU); ctx.stroke();
  }
}

function drawStump(ctx, x, y, T) {
  const cx = x + T * .5, base = y + T * .82;
  ctx.fillStyle = '#4a3526';
  ctx.beginPath(); ctx.ellipse(cx, base - T * .14, T * .18, T * .16, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#3a2a1f';
  ctx.fillRect(cx - T * .16, base - T * .16, T * .32, T * .16);
  ctx.fillStyle = '#6b4e35';
  ctx.beginPath(); ctx.ellipse(cx, base - T * .26, T * .14, T * .05, 0, 0, TAU); ctx.fill();
}

function drawBones(ctx, x, y, T) {
  const cx = x + T * .5, base = y + T * .8;
  ctx.fillStyle = '#b7ad95';
  ctx.save(); ctx.translate(cx, base - T * .1); ctx.rotate(-.2);
  ctx.fillRect(-T * .16, -T * .02, T * .3, T * .035);
  ctx.beginPath(); ctx.arc(-T * .16, 0, T * .045, 0, TAU); ctx.arc(T * .15, 0, T * .045, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#c9c0a8';
  ctx.beginPath(); ctx.arc(cx + T * .12, base - T * .26, T * .07, 0, TAU); ctx.fill();
  ctx.fillStyle = '#2a221c';
  ctx.beginPath(); ctx.arc(cx + T * .1, base - T * .27, T * .015, 0, TAU); ctx.arc(cx + T * .15, base - T * .27, T * .015, 0, TAU); ctx.fill();
}

function drawTent(ctx, x, y, T, p) {
  const cx = x + T * .5, base = y + T * .92;
  ctx.fillStyle = 'rgba(0,0,0,.24)';
  ctx.beginPath(); ctx.ellipse(cx, base, T * .38, T * .08, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = shade(p.wall, -25);
  ctx.beginPath();
  ctx.moveTo(cx - T * .45, base); ctx.lineTo(cx, base - T * .78); ctx.lineTo(cx + T * .45, base);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = shade(p.roof, -10);
  ctx.beginPath();
  ctx.moveTo(cx - T * .45, base); ctx.lineTo(cx, base - T * .78); ctx.lineTo(cx + T * .05, base);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#1a1410';
  ctx.beginPath();
  ctx.moveTo(cx - T * .1, base); ctx.lineTo(cx, base - T * .3); ctx.lineTo(cx + T * .1, base);
  ctx.closePath(); ctx.fill();
}

function drawGrave(ctx, x, y, T) {
  const cx = x + T * .5, base = y + T * .86;
  ctx.fillStyle = 'rgba(0,0,0,.22)';
  ctx.beginPath(); ctx.ellipse(cx, base, T * .2, T * .05, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#5f5c53';
  ctx.beginPath();
  ctx.moveTo(cx - T * .18, base);
  ctx.lineTo(cx - T * .18, base - T * .4);
  ctx.quadraticCurveTo(cx, base - T * .58, cx + T * .18, base - T * .4);
  ctx.lineTo(cx + T * .18, base);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.1)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cx, base - T * .38); ctx.lineTo(cx, base - T * .18); ctx.moveTo(cx - T * .08, base - T * .28); ctx.lineTo(cx + T * .08, base - T * .28); ctx.stroke();
}

function drawLamp(ctx, x, y, T, now, p) {
  const cx = x + T * .5, base = y + T * .9;
  ctx.strokeStyle = '#3e332a'; ctx.lineWidth = Math.max(1, T * .035);
  ctx.beginPath(); ctx.moveTo(cx, base); ctx.lineTo(cx, base - T * .62); ctx.stroke();
  ctx.fillStyle = '#3e332a';
  ctx.fillRect(cx - T * .14, base - T * .64, T * .28, T * .05);
  const fy = base - T * .58;
  const g = ctx.createRadialGradient(cx, fy, 0, cx, fy, T * .42);
  g.addColorStop(0, 'rgba(255,200,120,.55)'); g.addColorStop(1, 'rgba(255,150,60,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, fy, T * .42, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ffd08a'; ctx.beginPath(); ctx.arc(cx, fy, T * .05 + Math.sin(now / 90) * 1, 0, TAU); ctx.fill();
  ctx.fillStyle = '#3e332a';
  ctx.beginPath(); ctx.arc(cx, fy, T * .12, 0, TAU); ctx.stroke();
}

function drawSparkle(ctx, x, y, T, now, item) {
  const cx = x + T * .5, cy = y + T * .55 + Math.sin(now / 500 + x) * T * .06;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, T * .34);
  g.addColorStop(0, 'rgba(240,230,150,.5)'); g.addColorStop(1, 'rgba(240,200,90,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, T * .34, 0, TAU); ctx.fill();
  ctx.fillStyle = '#f4e9b8';
  ctx.save(); ctx.translate(cx, cy);
  const s = T * .08;
  ctx.beginPath(); ctx.moveTo(0, -s * 1.7); ctx.lineTo(s * .5, -s * .4); ctx.lineTo(s * 1.7, 0); ctx.lineTo(s * .5, s * .4); ctx.lineTo(0, s * 1.7); ctx.lineTo(-s * .5, s * .4); ctx.lineTo(-s * 1.7, 0); ctx.lineTo(-s * .5, -s * .4); ctx.closePath(); ctx.fill();
  ctx.restore();
  if (item === 'moonpetal') {
    ctx.fillStyle = 'rgba(200,220,255,.8)';
    for (let i = 0; i < 4; i++) {
      const a = now / 900 + i * Math.PI / 2;
      ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * T * .1, cy + Math.sin(a) * T * .1, T * .05, T * .022, a, 0, TAU); ctx.fill();
    }
  }
}

function drawStatue(ctx, x, y, T, p, now) {
  const cx = x + T * .5, base = y + T * .9;
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  ctx.beginPath(); ctx.ellipse(cx, base, T * .34, T * .07, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#5c584e';
  rr(ctx, cx - T * .3, base - T * .22, T * .6, T * .2, 2); ctx.fill();
  ctx.fillStyle = '#6d685c';
  rr(ctx, cx - T * .24, base - T * .5, T * .48, T * .29, 2); ctx.fill();
  ctx.fillStyle = '#807a6c';
  ctx.beginPath();
  ctx.arc(cx, base - T * .66, T * .13, 0, TAU); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - T * .17, base - T * .52); ctx.lineTo(cx - T * .3, base - T * .36); ctx.lineTo(cx - T * .16, base - T * .38);
  ctx.lineTo(cx + T * .16, base - T * .38); ctx.lineTo(cx + T * .3, base - T * .36); ctx.lineTo(cx + T * .17, base - T * .52);
  ctx.closePath(); ctx.fill();
  // ember heart
  const pulse = .6 + .4 * Math.sin(now / 700);
  ctx.fillStyle = withAlpha(p.accent, .55 * pulse);
  ctx.beginPath(); ctx.arc(cx, base - T * .56, T * .04, 0, TAU); ctx.fill();
  ctx.strokeStyle = withAlpha(p.accent, .2 * pulse); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(cx, base - T * .56, T * .15, 0, TAU); ctx.stroke();
}

function drawTileObject(ctx, ch, x, y, T, p, now, tx, ty) {
  switch (ch) {
    case '#': drawTree(ctx, x, y, T, p); break;
    case 'T': drawTree(ctx, x, y, T, p, { big: true }); break;
    case '^': drawMountain(ctx, x, y, T, p, tx, ty); break;
    case 'r': drawRock(ctx, x, y, T, p, tx, ty); break;
    case 'R': drawRock(ctx, x, y, T, p, tx, ty); break;
    case 'H': case 'h': case 'D': drawHouseTile(ctx, ch, x, y, T, p, tx, ty); break;
    case 'W': drawHouseTile(ctx, 'H', x, y, T, p, tx, ty); ctx.fillStyle = 'rgba(10,8,8,.25)'; ctx.fillRect(x, y, T, T); break;
    case 'f': drawFence(ctx, x, y, T, p); break;
    case 'g': drawGrave(ctx, x, y, T); break;
    case 't': drawStump(ctx, x, y, T); break;
    case 'B': drawBones(ctx, x, y, T); break;
    case 'n': drawTent(ctx, x, y, T, p); break;
    case 'L': drawLamp(ctx, x, y, T, now, p); break;
    case 'A': drawStatue(ctx, x, y, T, p, now); break;
    case 'i': drawSign(ctx, x, y, T, p); break;
  }
}

// ── particles ─────────────────────────────────────────────────
function drawAmbient(ctx, W, H, zone, now, time, T) {
  const kind = zone.ambient;
  const count = kind === 'citadel' ? 26 : kind === 'mire' ? 30 : 30;
  const rng = (i) => hash(i * 13 + 7, i * 29 + 3);
  for (let i = 0; i < count; i++) {
    const speed = .008 + rng(i) * .016;
    const y = ((rng(i + 40) * H) + now * speed * (kind === 'forest' ? .3 : 1)) % H;
    let x = (rng(i + 90) * W + Math.sin(now / 2200 + i) * 24) % W;
    if (x < 0) x += W;
    const a = .25 + .55 * Math.abs(Math.sin(now / 900 + i * 1.7));
    if (kind === 'forest') {
      const firefly = i % 3 !== 0;
      if (firefly) {
        ctx.fillStyle = withAlpha('#c8e88a', a * .65);
        ctx.beginPath(); ctx.arc(x, y, 1.2 + rng(i) * 1.2, 0, TAU); ctx.fill();
      } else {
        ctx.fillStyle = withAlpha('#7a6b3a', a * .35);
        ctx.beginPath(); ctx.ellipse(x, y, 3, 1.4, now / 2000 + i, 0, TAU); ctx.fill();
      }
    } else if (kind === 'plains') {
      ctx.fillStyle = withAlpha('#e8d39a', a * .3);
      ctx.beginPath(); ctx.arc(x, y, 1 + rng(i), 0, TAU); ctx.fill();
    } else if (kind === 'mire') {
      ctx.fillStyle = withAlpha(i % 2 ? '#a8e6d0' : '#d8e8c0', a * .35);
      ctx.beginPath(); ctx.arc(x, y, 1 + rng(i) * 1.6, 0, TAU); ctx.fill();
    } else if (kind === 'peaks' || kind === 'village') {
      const size = 1 + rng(i) * 1.6;
      ctx.fillStyle = withAlpha(i % 3 ? '#f0a15a' : '#ffd29a', a * .7);
      ctx.beginPath(); ctx.arc(x, y, size, 0, TAU); ctx.fill();
      if (i % 7 === 0) {
        ctx.fillStyle = withAlpha('#ffd29a', a * .18);
        ctx.beginPath(); ctx.arc(x, y, size * 4, 0, TAU); ctx.fill();
      }
    } else {
      ctx.fillStyle = withAlpha('#b9a8d8', a * .3);
      ctx.beginPath(); ctx.arc(x, y, 1 + rng(i) * 1.4, 0, TAU); ctx.fill();
    }
  }
}

// ── lighting ──────────────────────────────────────────────────
let lightCanvas = null;
function getLightCanvas(W, H) {
  if (!lightCanvas) lightCanvas = document.createElement('canvas');
  if (lightCanvas.width !== W || lightCanvas.height !== H) { lightCanvas.width = W; lightCanvas.height = H; }
  return lightCanvas;
}

function drawTimeOverlay(ctx, W, H, now, zone, lights) {
  const cycle = state.time; // 0 midnight, .5 noon
  const brightness = .5 - .5 * Math.cos(cycle * TAU);
  let night = 1 - brightness;
  if (zone.ambient === 'citadel') night = Math.max(night, .55);
  if (zone.ambient === 'mire') night = Math.max(night, .3);
  // warm dusk
  if (brightness > .12 && brightness < .75) {
    const dusk = 1 - Math.abs(brightness - .35) / .4;
    if (dusk > 0) {
      ctx.fillStyle = withAlpha('#d2763a', Math.max(0, dusk) * .1);
      ctx.fillRect(0, 0, W, H);
    }
  }
  if (night > .04) {
    const lc = getLightCanvas(W, H);
    const lc2 = lc.getContext('2d');
    lc2.clearRect(0, 0, W, H);
    lc2.fillStyle = withAlpha('#050a18', Math.min(.72, night * .68));
    lc2.fillRect(0, 0, W, H);
    lc2.globalCompositeOperation = 'destination-out';
    for (const l of lights) {
      const r = l.r * (1 + Math.sin(now / 700 + l.x) * .03);
      const g = lc2.createRadialGradient(l.x, l.y, 0, l.x, l.y, r);
      g.addColorStop(0, `rgba(0,0,0,${l.strength || .95})`);
      g.addColorStop(.6, `rgba(0,0,0,${(l.strength || .95) * .35})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      lc2.fillStyle = g;
      lc2.beginPath(); lc2.arc(l.x, l.y, r, 0, TAU); lc2.fill();
    }
    lc2.globalCompositeOperation = 'source-over';
    ctx.drawImage(lc, 0, 0);
    // warm glow pass
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const l of lights) {
      if (!l.glow) continue;
      const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * .8);
      g.addColorStop(0, withAlpha(l.glow, .2 * night));
      g.addColorStop(1, withAlpha(l.glow, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(l.x, l.y, l.r * .8, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
}

// ── main world renderer ───────────────────────────────────────
export function renderWorld(ctx, W, H, view) {
  const { zone, tile: T, camx, camy, player, now } = view;
  const p = P[zone.ambient] || P.village;
  const map = zone.map;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#070a10';
  ctx.fillRect(0, 0, W, H);
  const x0 = Math.max(0, Math.floor(camx / T) - 1);
  const y0 = Math.max(0, Math.floor(camy / T) - 1);
  const x1 = Math.min(map.w - 1, Math.ceil((camx + W) / T) + 1);
  const y1 = Math.min(map.h - 1, Math.ceil((camy + H) / T) + 1);
  const sx = (tx) => tx * T - camx;
  const sy = (ty) => ty * T - camy;

  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const ch = map.g[ty][tx];
      drawGround(ctx, ch, sx(tx), sy(ty), T, p, now, tx, ty);
    }
  }
  // fog / haze bands
  if (zone.ambient === 'mire') {
    for (let i = 0; i < 4; i++) {
      const fy = H * (.2 + i * .2) + Math.sin(now / 5000 + i) * 20;
      const g = ctx.createLinearGradient(0, fy - 50, 0, fy + 50);
      g.addColorStop(0, 'rgba(170,210,200,0)');
      g.addColorStop(.5, 'rgba(170,210,200,.035)');
      g.addColorStop(1, 'rgba(170,210,200,0)');
      ctx.fillStyle = g; ctx.fillRect(0, fy - 50, W, 100);
    }
  }

  // collect drawables
  const drawables = [];
  const lights = [];
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const ch = map.g[ty][tx];
      if (BLOCKED_OBJECTS.has(ch)) {
        drawables.push({ y: (ty + 1) * T, draw: () => drawTileObject(ctx, ch, sx(tx), sy(ty), T, p, now, tx, ty) });
        if (ch === 'L') lights.push({ x: sx(tx) + T * .5, y: sy(ty) + T * .3, r: T * 2.1, glow: '#ffc27a' });
      }
    }
  }
  // zone interactables
  for (const c of view.chests || []) {
    const opened = state.openedChests.includes(c.id);
    if (c.x < x0 - 1 || c.x > x1 + 1 || c.y < y0 - 1 || c.y > y1 + 1) continue;
    drawables.push({ y: (c.y + 1) * T, draw: () => drawChest(ctx, sx(c.x), sy(c.y), T, opened) });
  }
  for (const c of view.crystals || []) {
    if (c.x < x0 - 1 || c.x > x1 + 1 || c.y < y0 - 1 || c.y > y1 + 1) continue;
    drawables.push({ y: (c.y + 1) * T, draw: () => drawCrystal(ctx, sx(c.x), sy(c.y), T, now) });
    lights.push({ x: sx(c.x) + T * .5, y: sy(c.y) + T * .5, r: T * 2.4, glow: '#7fe8d0', strength: 1 });
  }
  for (const b of view.braziers || []) {
    const lit = state.litBraziers.includes(b.id);
    if (b.x < x0 - 1 || b.x > x1 + 1 || b.y < y0 - 1 || b.y > y1 + 1) continue;
    drawables.push({ y: (b.y + 1) * T, draw: () => drawBrazier(ctx, sx(b.x), sy(b.y), T, lit, now) });
    if (lit) lights.push({ x: sx(b.x) + T * .5, y: sy(b.y) + T * .35, r: T * 2.3, glow: '#ffb066' });
  }
  for (const sp of view.sparkles || []) {
    if (state.takenSparkles.includes(sp.id)) continue;
    drawables.push({ y: (sp.y + 1) * T, draw: () => drawSparkle(ctx, sx(sp.x), sy(sp.y), T, now, sp.item) });
    lights.push({ x: sx(sp.x) + T * .5, y: sy(sp.y) + T * .5, r: T * .9, glow: '#e8e0a0', strength: .5 });
  }
  for (const s of view.signs || []) {
    drawables.push({ y: (s.y + 1) * T, draw: () => drawSign(ctx, sx(s.x), sy(s.y), T, p) });
  }
  for (const portal of zone.portals || []) {
    if (portal.x < x0 - 1 || portal.x > x1 + 1 || portal.y < y0 - 1 || portal.y > y1 + 1) continue;
    drawables.push({ y: (portal.y + 1) * T - T * .01, draw: () => drawPortal(ctx, sx(portal.x), sy(portal.y), T, now, p.accent) });
    lights.push({ x: sx(portal.x) + T * .5, y: sy(portal.y) + T * .4, r: T * 1.6, glow: p.accent, strength: .6 });
  }
  // altars
  for (const al of view.altars || []) {
    drawables.push({ y: (al.y + 1) * T, draw: () => drawAltar(ctx, sx(al.x), sy(al.y), T, now, p.accent, al.active !== false) });
    if (al.active !== false) lights.push({ x: sx(al.x) + T * .5, y: sy(al.y) + T * .6, r: T * 1.8, glow: p.accent, strength: .7 });
  }
  // npcs
  for (const npc of view.npcs || []) {
    if (npc.x < x0 - 1 || npc.x > x1 + 1 || npc.y < y0 - 1 || npc.y > y1 + 1) continue;
    const walk = npc.walking ? now / 140 : 0;
    drawables.push({
      y: (npc.y + 1) * T,
      draw: () => {
        if (npc.near) {
          ctx.strokeStyle = 'rgba(240,180,110,.5)'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.ellipse(sx(npc.x) + T * .5, sy(npc.y) + T * .88, T * .38, T * .13, 0, 0, TAU); ctx.stroke();
        }
        drawPerson(ctx, sx(npc.x) + T * .5, sy(npc.y) + T * .9, T, {
          palette: npc.palette || { skin: '#c9a07a', hair: '#2b2019', accent: npc.color, cloth: '#3a3a42' },
          accent: npc.color, role: npc.sprite, classId: npc.sprite === 'guard' ? 'vanguard' : npc.sprite === 'warden' ? 'warden' : npc.sprite === 'rogue' ? 'shadowblade' : npc.sprite === 'mage' ? 'emberweaver' : null,
          facing: npc.facing || 'down', time: now / 1000, seed: npc.x * 3 + npc.y, scale: npc.sprite === 'child' ? .78 : npc.sprite === 'witch' ? 1.05 : 1,
          sword: npc.sprite === 'hunter', weaponSide: npc.x % 2 ? 1 : -1,
        });
        if (npc.marker) {
          const my = sy(npc.y) - T * .38 + Math.sin(now / 400) * T * .05;
          ctx.save();
          ctx.font = `600 ${Math.round(T * .34)}px Georgia, serif`;
          ctx.textAlign = 'center';
          ctx.fillStyle = npc.marker === '!' ? '#ffd08a' : '#9fe0d2';
          ctx.shadowColor = '#000'; ctx.shadowBlur = 6;
          ctx.fillText(npc.marker, sx(npc.x) + T * .5, my);
          ctx.restore();
        }
      },
    });
  }
  // player
  const px = player.px * T + T * .5, py = player.py * T + T * .9;
  drawables.push({
    y: (player.py + 1) * T,
    draw: () => {
      const moving = player.moving;
      drawPerson(ctx, px, py, T, {
        classId: player.classId, palette: player.palette, facing: player.facing,
        time: now / 1000, walk: moving ? now / 170 : 0, scale: 1.02,
      });
      if (view.marker) {
        const mx = view.marker.x * T - camx + T * .5, my = view.marker.y * T - camy + T * .5;
        ctx.strokeStyle = 'rgba(240,190,120,.8)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(mx, my, T * .2 + Math.sin(now / 250) * 3, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(mx - T * .12, my); ctx.lineTo(mx + T * .12, my); ctx.moveTo(mx, my - T * .12); ctx.lineTo(mx, my + T * .12); ctx.stroke();
      }
    },
  });
  drawables.sort((a, b) => a.y - b.y);
  for (const d of drawables) d.draw();

  // player lantern light at night
  lights.push({ x: px - camx, y: py - T * .5 - camy, r: T * 3.1, glow: '#ffd29a', strength: .8 });
  for (const portal of zone.portals) {
    if (Math.abs(portal.x - player.x) < 6 && Math.abs(portal.y - player.y) < 5) {
      lights.push({ x: sx(portal.x) + T * .5, y: sy(portal.y) + T * .4, r: T * 2, glow: p.accent, strength: .5 });
    }
  }
  drawTimeOverlay(ctx, W, H, now, zone, lights);
  drawAmbient(ctx, W, H, zone, now, state.time, T);

  // vignette-ish edge
  const edge = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .34, W / 2, H / 2, Math.max(W, H) * .78);
  edge.addColorStop(0, 'rgba(0,0,0,0)');
  edge.addColorStop(1, 'rgba(2,4,8,.32)');
  ctx.fillStyle = edge; ctx.fillRect(0, 0, W, H);

  // near-interaction labels
  if (view.nearLabel) {
    const { x, y, text } = view.nearLabel;
    const lx = clamp(x - camx, 70, W - 70), ly = clamp(y - camy, 30, H - 60);
    ctx.save();
    ctx.font = '600 10px "Avenir Next", system-ui, sans-serif';
    ctx.textAlign = 'center';
    const tw = ctx.measureText(text.toUpperCase()).width + 22;
    ctx.fillStyle = 'rgba(8,11,17,.82)';
    rr(ctx, lx - tw / 2, ly - 30, tw, 21, 10); ctx.fill();
    ctx.strokeStyle = 'rgba(240,178,122,.25)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#f0d8b8';
    ctx.fillText(text.toUpperCase(), lx, ly - 16);
    ctx.restore();
  }
}

// ── minimap ───────────────────────────────────────────────────
export function drawMinimap(canvas, zone, player, npcs = []) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#070a10';
  ctx.fillRect(0, 0, w, h);
  const map = zone.map;
  const s = Math.min((w - 8) / map.w, (h - 8) / map.h);
  const ox = (w - map.w * s) / 2, oy = (h - map.h * s) / 2;
  const p = P[zone.ambient] || P.village;
  for (let y = 0; y < map.h; y++) {
    for (let x = 0; x < map.w; x++) {
      const ch = map.g[y][x];
      let col = p.grass;
      if (ch === '~' || ch === 'w') col = '#2d4d54';
      else if (ch === '=' || ch === '_') col = p.path;
      else if (ch === 'v') col = '#b8502a';
      else if (ch === '#' || ch === 'T') col = '#1b2d20';
      else if (ch === '^' || ch === 'r') col = '#3f3c38';
      else if (ch === 'H' || ch === 'h' || ch === 'W' || ch === 'D') col = '#5a4a3a';
      else if (ch === ',' ) col = '#3f5230';
      else if (ch === 'x') col = '#332d29';
      ctx.fillStyle = col;
      ctx.fillRect(ox + x * s, oy + y * s, s + .5, s + .5);
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
  // player dot
  ctx.fillStyle = '#ffd08a';
  ctx.beginPath(); ctx.arc(ox + player.x * s + s / 2, oy + player.y * s + s / 2, 2.6, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(255,208,138,.5)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(ox + player.x * s + s / 2, oy + player.y * s + s / 2, 5, 0, TAU); ctx.stroke();
  // frame
  ctx.strokeStyle = 'rgba(240,178,122,.2)'; ctx.lineWidth = 1; ctx.strokeRect(.5, .5, w - 1, h - 1);
}
