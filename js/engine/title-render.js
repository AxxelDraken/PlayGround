import { state } from '../state.js';
import { ZONES } from '../data/zones.js';
import { TAU, hash, clamp, rr, withAlpha } from './art.js';

// ── Title scene ────────────────────────────────────────────────
export function renderTitle(ctx, W, H, now) {
  const t = now / 1000;
  ctx.clearRect(0, 0, W, H);
  // sky
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#05070d');
  sky.addColorStop(.42, '#101726');
  sky.addColorStop(.68, '#3b2620');
  sky.addColorStop(.78, '#7a3f26');
  sky.addColorStop(.9, '#160f10');
  sky.addColorStop(1, '#07090e');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

  // stars
  for (let i = 0; i < 90; i++) {
    const x = hash(i, 11) * W;
    const y = hash(i, 23) * H * .55;
    const a = .25 + .55 * Math.abs(Math.sin(t * .7 + i * 1.3));
    ctx.fillStyle = `rgba(230,220,200,${a * .55})`;
    ctx.fillRect(x, y, 1.1, 1.1);
  }

  // broken eclipse
  const mx = W * .7, my = H * .3, mr = Math.min(W, H) * .16;
  const halo = ctx.createRadialGradient(mx, my, mr * .7, mx, my, mr * 3);
  halo.addColorStop(0, 'rgba(240,140,60,.18)');
  halo.addColorStop(.5, 'rgba(180,80,45,.06)');
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#e8c7a0';
  ctx.beginPath(); ctx.arc(mx, my, mr, 0, TAU); ctx.fill();
  ctx.fillStyle = '#0a0d15';
  ctx.beginPath(); ctx.arc(mx - mr * .2, my + mr * .08, mr * .97, 0, TAU); ctx.fill();
  // crack of fire across the eclipse
  ctx.strokeStyle = 'rgba(255,170,90,.7)'; ctx.lineWidth = Math.max(1.5, mr * .025);
  ctx.beginPath();
  ctx.moveTo(mx - mr * 1.05, my - mr * .2);
  ctx.quadraticCurveTo(mx - mr * .4, my - mr * .06, mx - mr * .1, my - mr * .3);
  ctx.quadraticCurveTo(mx + mr * .1, my - mr * .45, mx + mr * .55, my - mr * .2);
  ctx.stroke();
  // ember ring
  ctx.strokeStyle = 'rgba(240,170,100,.22)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(mx, my, mr * 1.5, 0, TAU); ctx.stroke();

  // mountains layers
  const layer = (baseY, amp, color, seed) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-10, H);
    ctx.lineTo(-10, baseY);
    for (let x = -10; x <= W + 10; x += 24) {
      const y = baseY - (hash(Math.floor(x / 24), seed) * amp) - Math.sin(x * .01 + seed) * amp * .2;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W + 10, H);
    ctx.closePath(); ctx.fill();
  };
  layer(H * .74, H * .17, '#141822', 3);
  layer(H * .79, H * .13, '#0f121a', 7);
  layer(H * .85, H * .09, '#090c12', 13);

  // citadel silhouette right
  const cx = W * .82, cy = H * .78;
  ctx.fillStyle = '#080b11';
  ctx.beginPath();
  ctx.moveTo(cx - W * .1, H);
  ctx.lineTo(cx - W * .07, cy - H * .12);
  ctx.lineTo(cx - W * .04, cy - H * .1);
  ctx.lineTo(cx - W * .035, cy - H * .22);
  ctx.lineTo(cx - W * .015, cy - H * .19);
  ctx.lineTo(cx - W * .005, cy - H * .3);
  ctx.lineTo(cx + W * .012, cy - H * .19);
  ctx.lineTo(cx + W * .03, cy - H * .23);
  ctx.lineTo(cx + W * .038, cy - H * .1);
  ctx.lineTo(cx + W * .08, cy - H * .08);
  ctx.lineTo(cx + W * .11, H);
  ctx.closePath(); ctx.fill();
  // citadel windows
  for (let i = 0; i < 7; i++) {
    const wx = cx - W * .04 + (i % 3) * W * .02;
    const wy = cy - H * .16 + Math.floor(i / 3) * H * .04;
    const a = .25 + .3 * Math.abs(Math.sin(t * .9 + i));
    ctx.fillStyle = `rgba(255,150,70,${a})`;
    ctx.fillRect(wx, wy, Math.max(1.5, W * .0025), Math.max(2, H * .006));
  }

  // ruined horizon line + forest left
  ctx.fillStyle = '#070a0f';
  ctx.beginPath();
  ctx.moveTo(0, H * .85);
  ctx.quadraticCurveTo(W * .24, H * .8, W * .5, H * .87);
  ctx.quadraticCurveTo(W * .7, H * .92, W, H * .84);
  ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
  for (let i = 0; i < 26; i++) {
    const x = i / 26 * W;
    const base = H * .86 + Math.sin(i * 1.7) * H * .015;
    const h = (14 + hash(i, 4) * 46) * (H / 820);
    ctx.fillStyle = i % 3 === 0 ? '#0d1620' : '#0a1119';
    ctx.beginPath();
    ctx.moveTo(x - h * .25, base);
    ctx.lineTo(x, base - h);
    ctx.lineTo(x + h * .25, base);
    ctx.closePath(); ctx.fill();
  }

  // foreground cliff
  ctx.fillStyle = '#06080d';
  ctx.beginPath();
  ctx.moveTo(0, H * .95);
  ctx.lineTo(W * .1, H * .92);
  ctx.lineTo(W * .22, H * .96);
  ctx.lineTo(W * .34, H * .91);
  ctx.lineTo(W * .46, H * .97);
  ctx.lineTo(W * .58, H * 1);
  ctx.lineTo(0, H);
  ctx.closePath(); ctx.fill();

  // lone figure
  const fx = W * .24, fy = H * .915;
  const fs = Math.max(18, Math.min(W, H) * .045);
  ctx.fillStyle = '#05070b';
  ctx.beginPath(); ctx.ellipse(fx, fy, fs * .22, fs * .05, 0, 0, TAU); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(fx - fs * .16, fy);
  ctx.lineTo(fx - fs * .14, fy - fs * .9);
  ctx.quadraticCurveTo(fx, fy - fs * 1.15, fx + fs * .12, fy - fs * .9);
  ctx.lineTo(fx + fs * .2, fy);
  ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.arc(fx, fy - fs * 1.08, fs * .15, 0, TAU); ctx.fill();
  // cloak flutter
  ctx.beginPath();
  ctx.moveTo(fx + fs * .05, fy - fs * .85);
  ctx.quadraticCurveTo(fx + fs * .5, fy - fs * .6 + Math.sin(t * 2) * fs * .08, fx + fs * .35, fy - fs * .1);
  ctx.lineTo(fx + fs * .1, fy - fs * .3);
  ctx.closePath(); ctx.fill();
  // tiny lantern
  ctx.fillStyle = 'rgba(255,180,100,.8)';
  ctx.beginPath(); ctx.arc(fx + fs * .2, fy - fs * .5, fs * .045, 0, TAU); ctx.fill();
  const lg = ctx.createRadialGradient(fx + fs * .2, fy - fs * .5, 0, fx + fs * .2, fy - fs * .5, fs * .8);
  lg.addColorStop(0, 'rgba(255,160,80,.25)'); lg.addColorStop(1, 'rgba(255,160,80,0)');
  ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(fx + fs * .2, fy - fs * .5, fs * .8, 0, TAU); ctx.fill();

  // rising embers
  for (let i = 0; i < 55; i++) {
    const speed = .008 + hash(i, 5) * .02;
    const prog = (t * speed + hash(i, 9)) % 1;
    const x = (hash(i, 17) * W + Math.sin(t * .5 + i) * W * .01) % W;
    const y = H * .9 - prog * H * .8;
    const a = Math.sin(prog * Math.PI) * .85;
    const size = .8 + hash(i, 31) * (W < 600 ? 1.4 : 2.2);
    ctx.fillStyle = `rgba(255,${150 + Math.floor(hash(i, 43) * 60)},${80 + Math.floor(hash(i, 47) * 50)},${a})`;
    ctx.beginPath(); ctx.arc(x, y, size, 0, TAU); ctx.fill();
    if (i % 9 === 0) {
      ctx.fillStyle = `rgba(255,170,90,${a * .12})`;
      ctx.beginPath(); ctx.arc(x, y, size * 5, 0, TAU); ctx.fill();
    }
  }

  // low haze
  const haze = ctx.createLinearGradient(0, H * .55, 0, H);
  haze.addColorStop(0, 'rgba(120,60,30,0)');
  haze.addColorStop(.55, 'rgba(120,60,30,.09)');
  haze.addColorStop(1, 'rgba(10,8,10,.5)');
  ctx.fillStyle = haze; ctx.fillRect(0, 0, W, H);
}

// ── World map ──────────────────────────────────────────────────
const REGION_POS = {
  hearthfall: { x: .32, y: .58, r: .075, label: 'Hearthfall', sub: 'village', color: '#697a4f' },
  emberfield: { x: .48, y: .66, r: .13, label: 'Emberfield', sub: 'plains', color: '#7d7a4a' },
  greenwood: { x: .63, y: .51, r: .125, label: 'Greenwood', sub: 'forest', color: '#4e6d4a' },
  mire: { x: .37, y: .82, r: .1, label: 'Ashen Mire', sub: 'marsh', color: '#4e6e68' },
  peaks: { x: .77, y: .28, r: .1, label: 'Cinder Peaks', sub: 'volcano', color: '#7a4a3a' },
  citadel: { x: .87, y: .12, r: .065, label: 'Hollow Citadel', sub: 'throne', color: '#5e5568' },
};
const LINKS = [
  ['hearthfall', 'emberfield'], ['emberfield', 'greenwood'],
  ['emberfield', 'mire'], ['greenwood', 'peaks'], ['peaks', 'citadel'],
];

export function drawWorldMap(canvas, now = 0) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.clientWidth, H = canvas.clientHeight || W * .625;
  if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  // sea / parchment
  const bg = ctx.createRadialGradient(W * .5, H * .45, 0, W * .5, H * .45, W * .7);
  bg.addColorStop(0, '#151b22');
  bg.addColorStop(1, '#080b11');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  // latitude grid
  ctx.strokeStyle = 'rgba(200,190,160,.055)'; ctx.lineWidth = 1;
  for (let i = 1; i < 8; i++) {
    ctx.beginPath(); ctx.moveTo(i / 8 * W, 0); ctx.lineTo(i / 8 * W, H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i / 8 * H); ctx.lineTo(W, i / 8 * H); ctx.stroke();
  }
  // sea texture
  for (let i = 0; i < 60; i++) {
    const x = hash(i, 71) * W, y = hash(i, 79) * H;
    ctx.fillStyle = 'rgba(120,160,160,.06)';
    ctx.beginPath(); ctx.ellipse(x, y, 6 + hash(i, 3) * 16, 1, 0, 0, TAU); ctx.fill();
  }
  const pos = (id) => ({ x: REGION_POS[id].x * W, y: REGION_POS[id].y * H }
  );
  // land blobs
  for (const [id, r] of Object.entries(REGION_POS)) {
    const p = pos(id);
    const rad = r.r * Math.min(W, H);
    const visited = state.visited[id];
    const locked = id === 'citadel' && state.keys < 3;
    ctx.save();
    ctx.globalAlpha = visited ? 1 : .55;
    const g = ctx.createRadialGradient(p.x, p.y, rad * .1, p.x, p.y, rad);
    g.addColorStop(0, withAlpha(r.color, .85));
    g.addColorStop(.7, withAlpha(r.color, .55));
    g.addColorStop(1, withAlpha(r.color, .05));
    ctx.fillStyle = g;
    ctx.beginPath();
    for (let i = 0; i <= 28; i++) {
      const a = i / 28 * TAU;
      const wob = 1 + (hash(i + id.length * 9, id.length) - .5) * .38;
      const x = p.x + Math.cos(a) * rad * wob;
      const y = p.y + Math.sin(a) * rad * wob * .8;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.fill();
    // coastline
    ctx.strokeStyle = withAlpha(r.color, .55); ctx.lineWidth = 1.2; ctx.stroke();
    // terrain marks
    ctx.clip();
    for (let i = 0; i < 13; i++) {
      const a = hash(i + id.length, 13) * TAU;
      const d = hash(i, 17 + id.length) * rad * .72;
      const x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d * .8;
      ctx.strokeStyle = withAlpha(r.color, .6);
      if (id === 'greenwood') {
        ctx.beginPath(); ctx.moveTo(x, y + 4); ctx.lineTo(x, y - 5); ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y - 5, 3, 0, TAU); ctx.fillStyle = withAlpha(r.color, .5); ctx.fill();
      } else if (id === 'peaks' || id === 'citadel') {
        ctx.beginPath(); ctx.moveTo(x - 5, y + 2); ctx.lineTo(x, y - 6); ctx.lineTo(x + 5, y + 2); ctx.stroke();
      } else if (id === 'mire') {
        ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.quadraticCurveTo(x, y - 3, x + 5, y); ctx.stroke();
      } else {
        ctx.fillStyle = withAlpha(r.color, .3);
        ctx.fillRect(x - 1, y - 1, 2, 2);
      }
    }
    ctx.restore();
    if (locked) {
      ctx.save();
      ctx.strokeStyle = 'rgba(180,120,220,.5)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(p.x, p.y, rad * .35, 0, TAU); ctx.stroke();
      ctx.fillStyle = 'rgba(180,140,220,.8)';
      ctx.font = `600 ${Math.max(9, rad * .22)}px Georgia, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('✦', p.x, p.y - 1);
      ctx.restore();
    }
    // labels
    ctx.font = `600 ${Math.max(9, Math.min(13, W * .013))}px Georgia, serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = visited ? 'rgba(238,228,206,.92)' : 'rgba(180,175,160,.55)';
    ctx.shadowColor = '#000'; ctx.shadowBlur = 5;
    ctx.fillText(r.label.toUpperCase(), p.x, p.y + rad * .82 + 10);
    ctx.font = '8px "Avenir Next", system-ui, sans-serif';
    ctx.fillStyle = visited ? withAlpha(r.color, .9) : 'rgba(120,120,110,.5)';
    ctx.fillText(visited ? 'DISCOVERED' : 'UNEXPLORED', p.x, p.y + rad * .82 + 22);
    ctx.shadowBlur = 0;
  }
  // connections
  for (const [a, b] of LINKS) {
    const pa = pos(a), pb = pos(b);
    const visited = state.visited[a] || state.visited[b];
    ctx.strokeStyle = visited ? 'rgba(220,190,140,.28)' : 'rgba(120,120,110,.12)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    const mx = (pa.x + pb.x) / 2 + (pa.y - pb.y) * .08;
    const my = (pa.y + pb.y) / 2 + (pb.x - pa.x) * .08;
    ctx.moveTo(pa.x, pa.y); ctx.quadraticCurveTo(mx, my, pb.x, pb.y); ctx.stroke();
    ctx.setLineDash([]);
  }
  // current marker
  const cur = pos(state.zone);
  const pulse = .5 + .5 * Math.sin(now / 500);
  ctx.strokeStyle = `rgba(255,208,138,${.4 + pulse * .5})`; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cur.x, cur.y, 7 + pulse * 5, 0, TAU); ctx.stroke();
  ctx.fillStyle = '#ffd08a';
  ctx.beginPath(); ctx.arc(cur.x, cur.y, 3.4, 0, TAU); ctx.fill();
  ctx.font = '8px "Avenir Next", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,208,138,.9)'; ctx.textAlign = 'center';
  ctx.fillText('YOU ARE HERE', cur.x, cur.y - 15);
  // compass
  const ccx = W - 34, ccy = 34;
  ctx.strokeStyle = 'rgba(220,190,140,.35)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(ccx, ccy, 14, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(ccx, ccy - 20); ctx.lineTo(ccx + 4, ccy + 2); ctx.lineTo(ccx, ccy - 2); ctx.lineTo(ccx - 4, ccy + 2); ctx.closePath();
  ctx.fillStyle = 'rgba(220,190,140,.5)'; ctx.fill();
  ctx.font = '7px system-ui, sans-serif'; ctx.fillStyle = 'rgba(220,190,140,.6)'; ctx.textAlign = 'center';
  ctx.fillText('N', ccx, ccy - 23);
  // border
  ctx.strokeStyle = 'rgba(220,190,140,.18)'; ctx.lineWidth = 1;
  rr(ctx, 5, 5, W - 10, H - 10, 5); ctx.stroke();
  // fog edges
  const fog = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .3, W / 2, H / 2, Math.max(W, H) * .75);
  fog.addColorStop(0, 'rgba(0,0,0,0)'); fog.addColorStop(1, 'rgba(4,6,10,.55)');
  ctx.fillStyle = fog; ctx.fillRect(0, 0, W, H);
}
