import { CLASSES, PALETTES } from '../data/classes.js';
import { ITEMS } from '../data/items.js';

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
  ctx.arcTo(x, y, x + w, y, r);
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

// ── humanoid sprite ───────────────────────────────────────────
// x,y = feet centre, s = tile size. Draws a small, readable JRPG figure.
export function drawPerson(ctx, x, y, s, opt = {}) {
  const pal = opt.palette || PALETTES[opt.paletteIndex || 0] || PALETTES[0];
  const cls = CLASSES[opt.classId];
  const accent = opt.accent || cls?.color || pal.accent;
  const role = opt.role || '';
  const facing = opt.facing || 'down';
  const walk = opt.walk || 0;
  const t = opt.time || 0;
  const bob = Math.sin(t * 3 + (opt.seed || 0)) * s * .012;
  const scale = opt.scale || 1;
  const h = s * 1.42 * scale;
  const w = s * .62 * scale;
  const cx = x, foot = y + bob;
  ctx.save();
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,.32)';
  ctx.beginPath(); ctx.ellipse(cx, foot, w * .48, s * .12, 0, 0, TAU); ctx.fill();
  // legs
  const step = Math.sin(walk * TAU) * s * .05 * scale;
  const legH = h * .3;
  ctx.fillStyle = shade(pal.cloth, -22);
  rr(ctx, cx - w * .25 + step * .4, foot - legH, w * .2, legH, 2); ctx.fill();
  rr(ctx, cx + w * .06 - step * .4, foot - legH, w * .2, legH, 2); ctx.fill();
  ctx.fillStyle = '#241b16';
  rr(ctx, cx - w * .28 + step * .4, foot - s * .06, w * .26, s * .06, 2); ctx.fill();
  rr(ctx, cx + w * .04 - step * .4, foot - s * .06, w * .26, s * .06, 2); ctx.fill();
  // cloak / robe
  const bodyTop = foot - h * .78;
  const grad = ctx.createLinearGradient(cx, bodyTop, cx, foot - legH + s * .05);
  grad.addColorStop(0, pal.cloth);
  grad.addColorStop(1, shade(pal.cloth, -30));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(cx - w * .42, bodyTop + h * .07);
  ctx.quadraticCurveTo(cx - w * .55, foot - legH - s * .02, cx - w * .5, foot - legH + s * .05);
  ctx.lineTo(cx + w * .5, foot - legH + s * .05);
  ctx.quadraticCurveTo(cx + w * .55, foot - legH - s * .02, cx + w * .42, bodyTop + h * .07);
  ctx.closePath(); ctx.fill();
  // trim
  ctx.strokeStyle = withAlpha(accent, .75);
  ctx.lineWidth = Math.max(1, s * .022);
  ctx.beginPath(); ctx.moveTo(cx, bodyTop + h * .1); ctx.lineTo(cx, foot - legH + s * .03); ctx.stroke();
  // belt
  ctx.fillStyle = shade(pal.cloth, -45);
  rr(ctx, cx - w * .4, foot - h * .35, w * .8, s * .055, 1.5); ctx.fill();
  // arms
  ctx.strokeStyle = pal.cloth; ctx.lineWidth = s * .1 * scale; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx - w * .36, bodyTop + h * .16); ctx.lineTo(cx - w * .5, foot - h * .38); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + w * .36, bodyTop + h * .16); ctx.lineTo(cx + w * .5, foot - h * .38); ctx.stroke();
  // head
  const headR = s * .205 * scale;
  const headY = bodyTop - headR * .45;
  if (facing !== 'up') {
    ctx.fillStyle = pal.skin;
    ctx.beginPath(); ctx.ellipse(cx, headY, headR * .86, headR, 0, 0, TAU); ctx.fill();
    // hair
    ctx.fillStyle = pal.hair;
    ctx.beginPath(); ctx.arc(cx, headY - headR * .22, headR * .94, Math.PI * 1.03, Math.PI * 1.97); ctx.fill();
    if (role === 'elder' || role === 'seer') {
      ctx.fillStyle = '#d8d2c4';
      ctx.beginPath(); ctx.moveTo(cx - headR * .5, headY + headR * .4); ctx.quadraticCurveTo(cx, headY + headR * 1.7, cx + headR * .5, headY + headR * .4); ctx.fill();
    }
    if (role === 'witch') {
      ctx.fillStyle = accent;
      ctx.beginPath(); ctx.moveTo(cx - headR * 1.5, headY - headR * .35); ctx.lineTo(cx, headY - headR * 2.9); ctx.lineTo(cx + headR * 1.5, headY - headR * .35); ctx.closePath(); ctx.fill();
      ctx.fillStyle = shade(accent, -40);
      ctx.beginPath(); ctx.ellipse(cx, headY - headR * .3, headR * 1.8, headR * .32, 0, 0, TAU); ctx.fill();
    } else if (role === 'guard' || role === 'envoy' || role === 'knight') {
      ctx.fillStyle = shade(accent, 15);
      ctx.beginPath(); ctx.arc(cx, headY - headR * .1, headR * 1.02, Math.PI, TAU); ctx.fill();
      ctx.fillStyle = shade(accent, -60);
      ctx.fillRect(cx - headR, headY - headR * .3, headR * 2, headR * .22);
    }
    // eyes
    if (facing === 'down') {
      ctx.fillStyle = '#241a18';
      ctx.beginPath(); ctx.arc(cx - headR * .32, headY + headR * .05, Math.max(.7, s * .016), 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + headR * .32, headY + headR * .05, Math.max(.7, s * .016), 0, TAU); ctx.fill();
    } else if (facing === 'left' || facing === 'right') {
      const d = facing === 'left' ? -1 : 1;
      ctx.fillStyle = '#241a18';
      ctx.beginPath(); ctx.arc(cx + d * headR * .34, headY + headR * .05, Math.max(.7, s * .017), 0, TAU); ctx.fill();
    }
    // hood for mage/rogue/warden
    if (['mage', 'rogue', 'warden'].includes(role)) {
      ctx.strokeStyle = withAlpha(accent, .6); ctx.lineWidth = Math.max(1, s * .022);
      ctx.beginPath(); ctx.arc(cx, headY - headR * .05, headR * 1.16, Math.PI * 1.06, Math.PI * 1.94); ctx.stroke();
    }
  } else {
    ctx.fillStyle = pal.hair;
    ctx.beginPath(); ctx.arc(cx, headY, headR * .9, 0, TAU); ctx.fill();
  }
  // weapon
  const wdir = opt.weaponSide ?? 1;
  const wx = cx + w * .56 * wdir;
  if (cls?.id === 'vanguard' || opt.role === 'guard' || opt.role === 'envoy') {
    ctx.strokeStyle = '#b9c2c9'; ctx.lineWidth = s * .045;
    ctx.beginPath(); ctx.moveTo(wx, foot - h * .12); ctx.lineTo(wx + wdir * s * .06, bodyTop - h * .2); ctx.stroke();
    ctx.strokeStyle = accent; ctx.lineWidth = s * .06;
    ctx.beginPath(); ctx.moveTo(wx - s * .09, foot - h * .34); ctx.lineTo(wx + s * .09, foot - h * .34); ctx.stroke();
  } else if (['emberweaver', 'warden', 'stormcaller'].includes(cls?.id) || role === 'witch' || role === 'seer') {
    ctx.strokeStyle = '#6b5238'; ctx.lineWidth = s * .05;
    ctx.beginPath(); ctx.moveTo(wx, foot - s * .02); ctx.lineTo(wx + wdir * s * .03, bodyTop - h * .23); ctx.stroke();
    ctx.fillStyle = accent; ctx.shadowColor = accent; ctx.shadowBlur = s * .22;
    ctx.beginPath(); ctx.arc(wx + wdir * s * .03, bodyTop - h * .25, s * .075, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
  } else if (cls?.id === 'shadowblade' || role === 'rogue') {
    ctx.strokeStyle = '#c9c2d6'; ctx.lineWidth = s * .035;
    ctx.beginPath(); ctx.moveTo(cx - w * .5, foot - h * .32); ctx.lineTo(cx - w * .62, foot - h * .18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + w * .5, foot - h * .32); ctx.lineTo(cx + w * .62, foot - h * .18); ctx.stroke();
  } else if (cls?.id === 'ronin' || role === 'smith' || opt.sword) {
    ctx.strokeStyle = '#d7d0c2'; ctx.lineWidth = s * .04;
    ctx.beginPath(); ctx.moveTo(wx, foot - h * .1); ctx.lineTo(wx + wdir * s * .13, bodyTop - h * .32); ctx.stroke();
    ctx.strokeStyle = accent; ctx.lineWidth = s * .05;
    ctx.beginPath(); ctx.moveTo(wx - s * .06, foot - h * .28); ctx.lineTo(wx + s * .06, foot - h * .28); ctx.stroke();
  }
  // role extras
  if (role === 'inn') {
    ctx.fillStyle = withAlpha(accent, .9);
    ctx.beginPath(); ctx.arc(cx + w * .26, bodyTop + h * .12, s * .03, 0, TAU); ctx.fill();
  }
  if (role === 'merchant') {
    ctx.fillStyle = '#6b5238';
    rr(ctx, cx - w * .62, bodyTop + h * .16, w * .28, h * .36, 3); ctx.fill();
  }
  if (role === 'child') {
    // handled by scale
  }
  ctx.restore();
}

// ── enemy sprites ─────────────────────────────────────────────
// Drawn facing left. x,y = feet centre, s = height scale.
export function drawEnemy(ctx, def, x, y, s, t = 0, fx = {}) {
  const type = def.shape || 'human';
  const col = def.color || '#8a6a4a';
  const acc = def.accent || '#f0a15a';
  const bob = Math.sin(t * 2.1 + (def.seed || 0)) * s * .018 + (fx.bob || 0);
  const scale = def.size || 1;
  const H = s * 1.5 * scale;
  const foot = y + bob;
  const shake = fx.shake || 0;
  const alpha = fx.alpha ?? 1;
  const flash = fx.flash || 0;
  ctx.save();
  ctx.translate(x + shake, 0);
  ctx.globalAlpha = alpha;
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,.36)';
  ctx.beginPath(); ctx.ellipse(0, foot, H * .34, H * .075, 0, 0, TAU); ctx.fill();

  const body = (c = col) => {
    if (flash > 0) return '#fff4e8';
    return c;
  };
  ctx.shadowColor = withAlpha(acc, .35);
  ctx.shadowBlur = s * .12;

  if (type === 'wisp') {
    const fy = foot - H * .55;
    ctx.shadowBlur = s * .3;
    const g = ctx.createRadialGradient(0, fy, 0, 0, fy, H * .34);
    g.addColorStop(0, '#fff1cf'); g.addColorStop(.35, acc); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, fy, H * .32, 0, TAU); ctx.fill();
    ctx.fillStyle = body(col);
    ctx.beginPath(); ctx.arc(0, fy, H * .15, 0, TAU); ctx.fill();
    // trailing wisps
    ctx.strokeStyle = withAlpha(acc, .55); ctx.lineWidth = s * .035;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo((i - 1) * s * .12, fy + H * .1);
      ctx.quadraticCurveTo((i - 1) * s * .22, fy + H * .26, (i - 1) * s * .12 + Math.sin(t + i) * s * .06, fy + H * .38);
      ctx.stroke();
    }
    ctx.fillStyle = '#2b1810';
    ctx.beginPath(); ctx.arc(-H * .05, fy - H * .02, s * .022, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(H * .06, fy - H * .02, s * .022, 0, TAU); ctx.fill();
  } else if (type === 'wolf') {
    const bodyY = foot - H * .34;
    ctx.fillStyle = body(col);
    ctx.beginPath(); ctx.ellipse(0, bodyY, H * .34, H * .18, -.1, 0, TAU); ctx.fill();
    // legs
    ctx.strokeStyle = shade(col, -30); ctx.lineWidth = s * .075; ctx.lineCap = 'round';
    for (const [ox, oy] of [[-.17, .14], [.16, .13], [-.06, .18], [.26, .18]]) {
      ctx.beginPath(); ctx.moveTo(ox * H, bodyY + H * .1); ctx.lineTo(ox * H + oy * H * .8, foot); ctx.stroke();
    }
    // head
    ctx.fillStyle = body(shade(col, 12));
    ctx.beginPath(); ctx.ellipse(-H * .3, bodyY - H * .12, H * .17, H * .14, -.3, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-H * .44, bodyY - H * .17); ctx.lineTo(-H * .56, bodyY - H * .2); ctx.lineTo(-H * .45, bodyY - H * .05); ctx.fill();
    // ears
    ctx.fillStyle = shade(col, -20);
    ctx.beginPath(); ctx.moveTo(-H * .3, bodyY - H * .24); ctx.lineTo(-H * .26, bodyY - H * .38); ctx.lineTo(-H * .19, bodyY - H * .25); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-H * .4, bodyY - H * .22); ctx.lineTo(-H * .4, bodyY - H * .36); ctx.lineTo(-H * .32, bodyY - H * .24); ctx.fill();
    // tail
    ctx.strokeStyle = shade(col, -15); ctx.lineWidth = s * .06;
    ctx.beginPath(); ctx.moveTo(H * .3, bodyY - H * .08); ctx.quadraticCurveTo(H * .48, bodyY - H * .2, H * .42, bodyY - H * .34); ctx.stroke();
    // eyes
    ctx.fillStyle = acc; ctx.shadowColor = acc; ctx.shadowBlur = s * .1;
    ctx.beginPath(); ctx.arc(-H * .4, bodyY - H * .13, s * .022, 0, TAU); ctx.fill();
    // ember embers
    if (acc) {
      ctx.globalAlpha = alpha * .7;
      for (let i = 0; i < 3; i++) {
        const p = (t * .5 + i * .33) % 1;
        ctx.fillStyle = withAlpha(acc, 1 - p);
        ctx.beginPath(); ctx.arc(.15 * H + Math.sin(t + i) * 8, bodyY - H * .15 - p * H * .4, s * .014, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = alpha;
    }
  } else if (type === 'husk' || type === 'human') {
    const h = H * .78;
    const wide = type === 'husk' ? .4 : .34;
    // body
    ctx.fillStyle = body(col);
    rr(ctx, -H * wide * .6, foot - h, H * wide * 1.2, h * .72, s * .06); ctx.fill();
    // legs
    ctx.fillStyle = shade(col, -35);
    rr(ctx, -H * .16, foot - h * .35, H * .13, h * .35, 2); ctx.fill();
    rr(ctx, H * .03, foot - h * .35, H * .13, h * .35, 2); ctx.fill();
    // arms
    ctx.strokeStyle = shade(col, 8); ctx.lineWidth = s * .085; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-H * wide * .55, foot - h * .85); ctx.lineTo(-H * wide * .8, foot - h * .45); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(H * wide * .55, foot - h * .85); ctx.lineTo(H * wide * .75, foot - h * .5); ctx.stroke();
    // head
    ctx.fillStyle = type === 'husk' ? '#c6b89c' : PALETTES[(def.seed || 0) % 6].skin;
    ctx.beginPath(); ctx.arc(0, foot - h - s * .04, H * .115, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2b211c';
    if (type === 'husk') {
      ctx.beginPath(); ctx.arc(-H * .04, foot - h - s * .04, s * .025, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(H * .04, foot - h - s * .04, s * .025, 0, TAU); ctx.fill();
      ctx.fillStyle = withAlpha(acc, .8);
      rr(ctx, -H * .1, foot - h * .72, H * .2, s * .03, 2); ctx.fill();
    } else {
      // hood
      ctx.fillStyle = shade(col, -35);
      ctx.beginPath(); ctx.arc(0, foot - h - s * .03, H * .14, Math.PI * 1.02, Math.PI * 1.98); ctx.fill();
      ctx.fillStyle = acc;
      ctx.beginPath(); ctx.arc(-H * .04, foot - h, s * .018, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(H * .04, foot - h, s * .018, 0, TAU); ctx.fill();
      // weapon
      ctx.strokeStyle = '#cfc6b2'; ctx.lineWidth = s * .04;
      ctx.beginPath(); ctx.moveTo(-H * .3, foot - h * .7); ctx.lineTo(-H * .52, foot - h * .15); ctx.stroke();
    }
    // belt / accent
    ctx.fillStyle = withAlpha(acc, .8);
    rr(ctx, -H * wide * .55, foot - h * .42, H * wide * 1.1, s * .035, 2); ctx.fill();
  } else if (type === 'plant') {
    const baseY = foot;
    ctx.fillStyle = body(shade(col, -18));
    ctx.beginPath(); ctx.moveTo(-H * .25, baseY); ctx.quadraticCurveTo(-H * .36, baseY - H * .7, 0, baseY - H * .85); ctx.quadraticCurveTo(H * .36, baseY - H * .7, H * .25, baseY); ctx.closePath(); ctx.fill();
    // petals / maw
    ctx.fillStyle = body(col);
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI + i * Math.PI / 6;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * H * .17, baseY - H * .78 + Math.sin(a) * H * .08, H * .12, H * .055, a, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#1d2a18';
    ctx.beginPath(); ctx.arc(0, baseY - H * .78, H * .11, 0, TAU); ctx.fill();
    ctx.fillStyle = acc;
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * TAU + t * .2;
      ctx.beginPath(); ctx.arc(Math.cos(a) * H * .07, baseY - H * .78 + Math.sin(a) * H * .05, s * .016, 0, TAU); ctx.fill();
    }
    // vines
    ctx.strokeStyle = withAlpha(shade(col, 20), .8); ctx.lineWidth = s * .045;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-H * .2 + i * H * .2, baseY - H * .1);
      ctx.quadraticCurveTo(-H * .4 + i * H * .34, baseY - H * .25, -H * .44 + i * H * .3, baseY - H * .45);
      ctx.stroke();
    }
  } else if (type === 'toad') {
    const h = H * .5;
    ctx.fillStyle = body(col);
    ctx.beginPath(); ctx.ellipse(0, foot - h * .42, H * .38, h * .7, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-H * .2, foot - h * .7, H * .16, h * .34, -.2, 0, TAU); ctx.fill();
    ctx.fillStyle = shade(col, 25);
    ctx.beginPath(); ctx.arc(-H * .27, foot - h * .95, H * .09, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(-H * .07, foot - h * .95, H * .09, 0, TAU); ctx.fill();
    ctx.fillStyle = '#10170f';
    ctx.beginPath(); ctx.arc(-H * .29, foot - h * .95, s * .04, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(-H * .05, foot - h * .95, s * .04, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#1d2a18'; ctx.lineWidth = s * .03;
    ctx.beginPath(); ctx.arc(-H * .17, foot - h * .78, H * .16, .2, Math.PI - .2); ctx.stroke();
    // spots
    ctx.fillStyle = withAlpha(acc, .5);
    for (let i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.arc(-H * .1 + i * H * .09, foot - h * .45 + (i % 2) * H * .1, s * .035, 0, TAU); ctx.fill();
    }
  } else if (type === 'wraith' || type === 'witch') {
    const h = H * .8;
    const float = Math.sin(t * 1.4) * s * .04;
    ctx.fillStyle = body(col);
    ctx.globalAlpha = alpha * .9;
    ctx.beginPath();
    ctx.moveTo(-H * .32, foot - h * .15 + float);
    ctx.quadraticCurveTo(-H * .42, foot - h * .75 + float, 0, foot - h + float);
    ctx.quadraticCurveTo(H * .42, foot - h * .75 + float, H * .32, foot - h * .15 + float);
    ctx.lineTo(H * .24, foot - h * .02 + float);
    ctx.lineTo(H * .12, foot - h * .14 + float);
    ctx.lineTo(0, foot + float);
    ctx.lineTo(-H * .16, foot - h * .14 + float);
    ctx.lineTo(-H * .26, foot - h * .02 + float);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = alpha;
    // hood / face void
    ctx.fillStyle = '#171420';
    ctx.beginPath(); ctx.ellipse(-H * .02, foot - h * .78 + float, H * .14, H * .16, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = acc; ctx.shadowColor = acc; ctx.shadowBlur = s * .16;
    if (type === 'witch') {
      ctx.beginPath(); ctx.ellipse(-H * .07, foot - h * .77 + float, s * .028, s * .018, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(H * .05, foot - h * .77 + float, s * .028, s * .018, 0, 0, TAU); ctx.fill();
      // hat
      ctx.fillStyle = body(shade(col, -18));
      ctx.beginPath(); ctx.moveTo(-H * .24, foot - h * .85 + float); ctx.lineTo(-H * .02, foot - h * 1.22 + float); ctx.lineTo(H * .18, foot - h * .85 + float); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-H * .03, foot - h * .86 + float, H * .28, H * .04, 0, 0, TAU); ctx.fill();
      // staff
      ctx.strokeStyle = '#6b5238'; ctx.lineWidth = s * .035;
      ctx.beginPath(); ctx.moveTo(-H * .42, foot + float); ctx.lineTo(-H * .48, foot - h + float); ctx.stroke();
      ctx.fillStyle = acc; ctx.shadowBlur = s * .2;
      ctx.beginPath(); ctx.arc(-H * .48, foot - h + float, s * .05, 0, TAU); ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(-H * .05, foot - h * .79 + float, s * .022, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(H * .03, foot - h * .79 + float, s * .022, 0, TAU); ctx.fill();
    }
    // wisps
    ctx.globalAlpha = alpha * .5;
    ctx.fillStyle = acc;
    for (let i = 0; i < 4; i++) {
      const a = t * .8 + i * 1.6;
      ctx.beginPath(); ctx.arc(Math.cos(a) * H * .28, foot - h * .5 + Math.sin(a * 1.3) * H * .2, s * .012, 0, TAU); ctx.fill();
    }
  } else if (type === 'golem') {
    const h = H * .8;
    ctx.fillStyle = body(col);
    rr(ctx, -H * .3, foot - h, H * .6, h, s * .06); ctx.fill();
    ctx.fillStyle = shade(col, -18);
    rr(ctx, -H * .42, foot - h * .92, H * .18, h * .5, s * .04); ctx.fill();
    rr(ctx, H * .24, foot - h * .92, H * .18, h * .5, s * .04); ctx.fill();
    rr(ctx, -H * .2, foot - h * .36, H * .16, h * .36, 2); ctx.fill();
    rr(ctx, H * .05, foot - h * .36, H * .16, h * .36, 2); ctx.fill();
    // head
    ctx.fillStyle = shade(col, 10);
    rr(ctx, -H * .16, foot - h - H * .1, H * .32, H * .16, s * .03); ctx.fill();
    // glowing cracks
    ctx.strokeStyle = acc; ctx.lineWidth = s * .03; ctx.shadowColor = acc; ctx.shadowBlur = s * .15;
    ctx.beginPath();
    ctx.moveTo(-H * .2, foot - h * .9); ctx.lineTo(-H * .06, foot - h * .7); ctx.lineTo(-H * .14, foot - h * .5); ctx.lineTo(H * .04, foot - h * .28);
    ctx.stroke();
    ctx.beginPath(); ctx.moveTo(H * .16, foot - h * .82); ctx.lineTo(H * .08, foot - h * .62); ctx.stroke();
    ctx.fillStyle = acc;
    ctx.beginPath(); ctx.arc(-H * .07, foot - h - H * .02, s * .022, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(H * .07, foot - h - H * .02, s * .022, 0, TAU); ctx.fill();
  } else if (type === 'knight' || type === 'king') {
    const h = H * .82 * (type === 'king' ? 1.12 : 1);
    const wide = type === 'king' ? .42 : .36;
    // cape
    ctx.fillStyle = withAlpha(shade(col, -35), .9);
    ctx.beginPath();
    ctx.moveTo(-H * wide * .55, foot - h * .9);
    ctx.lineTo(-H * wide * 1.05, foot - h * .02);
    ctx.lineTo(H * wide * .2, foot - h * .06);
    ctx.closePath(); ctx.fill();
    // body armour
    ctx.fillStyle = body(col);
    rr(ctx, -H * wide * .62, foot - h, H * wide * 1.24, h * .7, s * .05); ctx.fill();
    ctx.fillStyle = shade(col, 18);
    ctx.beginPath(); ctx.moveTo(-H * wide * .62, foot - h + s * .02); ctx.lineTo(0, foot - h * .78); ctx.lineTo(H * wide * .62, foot - h + s * .02); ctx.fill();
    // legs
    ctx.fillStyle = shade(col, -25);
    rr(ctx, -H * .17, foot - h * .34, H * .14, h * .34, 2); ctx.fill();
    rr(ctx, H * .03, foot - h * .34, H * .14, h * .34, 2); ctx.fill();
    // arms
    ctx.fillStyle = shade(col, 6);
    rr(ctx, -H * wide * .8, foot - h * .8, H * .16, h * .38, s * .03); ctx.fill();
    // helm
    ctx.fillStyle = shade(col, 25);
    ctx.beginPath(); ctx.arc(0, foot - h - s * .03, H * .13, Math.PI, TAU); ctx.fill();
    rr(ctx, -H * .13, foot - h - s * .04, H * .26, H * .13, s * .02); ctx.fill();
    ctx.fillStyle = '#1a120e';
    rr(ctx, -H * .09, foot - h + H * .02, H * .18, s * .022, 1); ctx.fill();
    ctx.fillStyle = acc; ctx.shadowColor = acc; ctx.shadowBlur = s * .14;
    ctx.beginPath(); ctx.arc(-H * .05, foot - h + H * .035, s * .015, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(H * .05, foot - h + H * .035, s * .015, 0, TAU); ctx.fill();
    // weapon
    ctx.strokeStyle = '#cfd6da'; ctx.lineWidth = s * .055;
    ctx.beginPath(); ctx.moveTo(-H * wide * .8, foot - h * .38); ctx.lineTo(-H * wide * .8 - H * .18, foot + s * .06); ctx.stroke();
    ctx.fillStyle = withAlpha(acc, .85);
    ctx.beginPath(); ctx.arc(-H * wide * .8, foot - h * .84, s * .03, 0, TAU); ctx.fill();
    if (type === 'king') {
      // crown
      ctx.fillStyle = acc; ctx.shadowColor = acc; ctx.shadowBlur = s * .2;
      const cy = foot - h - H * .16;
      ctx.beginPath();
      ctx.moveTo(-H * .14, cy); ctx.lineTo(-H * .12, cy - H * .08); ctx.lineTo(-H * .06, cy - H * .03);
      ctx.lineTo(0, cy - H * .11); ctx.lineTo(H * .06, cy - H * .03); ctx.lineTo(H * .12, cy - H * .08); ctx.lineTo(H * .14, cy);
      ctx.closePath(); ctx.fill();
      // flame aura
      ctx.globalAlpha = alpha * .35;
      for (let i = 0; i < 6; i++) {
        const a = t * 1.2 + i;
        ctx.fillStyle = withAlpha(acc, .5 + .3 * Math.sin(a));
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * H * .36, foot - h * .55 + Math.sin(a * 1.7) * H * .26, s * .05, s * .11, Math.sin(a), 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = alpha;
    }
  } else {
    ctx.fillStyle = body(col);
    ctx.beginPath(); ctx.arc(0, foot - H * .4, H * .28, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

// ── portraits ─────────────────────────────────────────────────
export function drawPortrait(canvas, member, opts = {}) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const dpr = opts.dpr || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const W = w / dpr, H = h / dpr;
  const pal = paletteFor(member);
  const cls = CLASSES[member.classId];
  const accent = cls?.color || pal.accent;
  ctx.clearRect(0, 0, W, H);
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, shade(pal.cloth, 22));
  bg.addColorStop(.55, '#151b26');
  bg.addColorStop(1, '#0a0e15');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  // halo
  const halo = ctx.createRadialGradient(W * .5, H * .38, 0, W * .5, H * .38, W * .55);
  halo.addColorStop(0, withAlpha(accent, .24));
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo; ctx.fillRect(0, 0, W, H);
  // sigil watermark
  ctx.save();
  ctx.translate(W * .5, H * .48); ctx.rotate(-.12);
  ctx.font = `${W * .85}px Georgia, serif`;
  ctx.fillStyle = withAlpha(accent, .07);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(cls?.sigil || '✦', 0, W * .05);
  ctx.restore();
  // bust
  const cx = W * .5, shoulder = H * .95;
  ctx.fillStyle = shade(pal.cloth, -20);
  ctx.beginPath();
  ctx.moveTo(cx - W * .4, shoulder);
  ctx.quadraticCurveTo(cx - W * .3, H * .62, cx - W * .14, H * .58);
  ctx.lineTo(cx + W * .14, H * .58);
  ctx.quadraticCurveTo(cx + W * .3, H * .62, cx + W * .4, shoulder);
  ctx.closePath(); ctx.fill();
  // collar
  ctx.strokeStyle = withAlpha(accent, .7); ctx.lineWidth = W * .012;
  ctx.beginPath(); ctx.moveTo(cx - W * .13, H * .6); ctx.lineTo(cx, H * .72); ctx.lineTo(cx + W * .13, H * .6); ctx.stroke();
  // neck
  ctx.fillStyle = shade(pal.skin, -18);
  ctx.fillRect(cx - W * .07, H * .48, W * .14, H * .15);
  // head
  const headR = W * .19;
  const hy = H * .37;
  ctx.fillStyle = pal.skin;
  ctx.beginPath(); ctx.ellipse(cx, hy, headR * .84, headR, 0, 0, TAU); ctx.fill();
  // hair
  ctx.fillStyle = pal.hair;
  ctx.beginPath(); ctx.arc(cx, hy - headR * .18, headR * .92, Math.PI * 1.02, Math.PI * 1.98); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx - headR * .82, hy - headR * .05, headR * .24, headR * .58, .12, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + headR * .82, hy - headR * .05, headR * .24, headR * .58, -.12, 0, TAU); ctx.fill();
  // eyes
  ctx.fillStyle = '#221716';
  ctx.beginPath(); ctx.arc(cx - headR * .32, hy + headR * .06, headR * .055, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + headR * .32, hy + headR * .06, headR * .055, 0, TAU); ctx.fill();
  ctx.fillStyle = withAlpha(accent, .9);
  ctx.beginPath(); ctx.arc(cx - headR * .29, hy + headR * .05, headR * .018, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + headR * .35, hy + headR * .05, headR * .018, 0, TAU); ctx.fill();
  // mouth
  ctx.strokeStyle = 'rgba(60,30,25,.5)'; ctx.lineWidth = W * .008;
  ctx.beginPath(); ctx.arc(cx, hy + headR * .38, headR * .18, .25, Math.PI - .25); ctx.stroke();
  // class hood/mark
  if (['emberweaver', 'shadowblade', 'warden', 'stormcaller'].includes(member.classId)) {
    ctx.strokeStyle = withAlpha(accent, .75); ctx.lineWidth = W * .016;
    ctx.beginPath(); ctx.arc(cx, hy - headR * .04, headR * 1.18, Math.PI * 1.04, Math.PI * 1.96); ctx.stroke();
    if (member.classId === 'shadowblade') {
      ctx.fillStyle = withAlpha(accent, .28);
      ctx.beginPath(); ctx.moveTo(cx - headR * 1.2, hy - headR * .45); ctx.lineTo(cx + headR * 1.3, hy - headR * .7); ctx.lineTo(cx + headR * .7, hy - headR * .15); ctx.closePath(); ctx.fill();
    }
  }
  // glow sigil at bottom
  ctx.font = `${W * .11}px Georgia, serif`;
  ctx.fillStyle = withAlpha(accent, .5);
  ctx.textAlign = 'center';
  ctx.fillText(cls?.sigil || '✦', cx, H * .96);
  // frame gradient
  const edge = ctx.createLinearGradient(0, H * .6, 0, H);
  edge.addColorStop(0, 'rgba(0,0,0,0)'); edge.addColorStop(1, 'rgba(0,0,0,.55)');
  ctx.fillStyle = edge; ctx.fillRect(0, 0, W, H);
}

export function drawEnemyFace(canvas, def, opts = {}) {
  const ctx = canvas.getContext('2d');
  const dpr = opts.dpr || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const W = canvas.width / dpr, H = canvas.height / dpr;
  ctx.clearRect(0, 0, W, H);
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, shade(def.color || '#5a4a3a', -10));
  g.addColorStop(1, '#0a0d14');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.beginPath(); ctx.arc(W / 2, H / 2, W / 2, 0, TAU); ctx.clip();
  const halo = ctx.createRadialGradient(W / 2, H * .55, 0, W / 2, H * .55, W * .5);
  halo.addColorStop(0, withAlpha(def.accent || '#f0a15a', .22));
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo; ctx.fillRect(0, 0, W, H);
  drawEnemy(ctx, def, W / 2, H * .94, H * .52, 0, {});
  ctx.restore();
}

// draw a hero bust icon for cards (small)
export function drawFace(canvas, member, dpr = 1) {
  drawPortrait(canvas, member, { dpr });
}

// full character card art for creation
export function drawClassArt(canvas, classId, paletteIdx, opts = {}) {
  const ctx = canvas.getContext('2d');
  const dpr = opts.dpr || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const W = canvas.width / dpr, H = canvas.height / dpr;
  const cls = CLASSES[classId];
  const pal = PALETTES[paletteIdx] || PALETTES[0];
  ctx.clearRect(0, 0, W, H);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, withAlpha(cls.color, .16));
  g.addColorStop(1, 'rgba(8,11,17,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // aura rings
  ctx.strokeStyle = withAlpha(cls.color, .18); ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath(); ctx.arc(W / 2, H * .55, H * (.2 + i * .11), 0, TAU); ctx.stroke();
  }
  drawPerson(ctx, W / 2, H * .93, H * .75, {
    classId, palette: pal, role: '', facing: 'down', time: opts.time || 0, scale: 1,
  });
}
