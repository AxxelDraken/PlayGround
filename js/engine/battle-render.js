import { state } from '../state.js';
import { TAU, hash, clamp, rr, shade, withAlpha, drawPerson, drawEnemy, paletteFor } from './art.js';

const SKY = {
  village: ['#1b2334', '#4b3a33', '#a2603c', '#241a1a'],
  plains: ['#202940', '#544739', '#b57c44', '#2b2118'],
  forest: ['#0c1718', '#1a2f28', '#3c5e44', '#0d1412'],
  mire: ['#0c161a', '#1c3038', '#3e5f60', '#0b1114'],
  peaks: ['#1a1014', '#3e1d1c', '#8a3d26', '#170c0c'],
  citadel: ['#0c0b14', '#211b2e', '#4a3b5e', '#0a0810'],
};

export function unitPos(unit, index, count, side, W, H, s) {
  const boss = unit.def?.boss;
  if (side === 'enemy') {
    if (count === 1) return { x: W * (boss ? .31 : .27), y: H * (boss ? .7 : .64), s: s * (boss ? 1.9 : 1.1) };
    const cols = count > 2 ? 2 : count;
    const col = index % 2;
    const row = Math.floor(index / 2);
    return {
      x: W * (.16 + col * (boss ? .2 : .18)) + (count === 2 ? W * .03 : 0),
      y: H * (.55 + row * .155),
      s: s * (boss ? 1.7 : 1.0),
    };
  }
  const col = count > 2 ? index % 2 : index;
  const row = count > 2 ? Math.floor(index / 2) : 0;
  const baseX = count === 1 ? .72 : count === 2 ? .64 : .6;
  return {
    x: W * (baseX + col * (count > 2 ? .16 : .12)),
    y: H * (.58 + row * .15),
    s: s * .92,
  };
}

function drawBattleBg(ctx, W, H, zone, now, boss) {
  const cols = SKY[zone.ambient] || SKY.plains;
  const t = now / 1000;
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, cols[0]);
  sky.addColorStop(.34, cols[1]);
  sky.addColorStop(.58, cols[2]);
  sky.addColorStop(.72, cols[3]);
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  const horizon = H * .53;
  // glow orb
  const gx = W * .72, gy = H * .28;
  const halo = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.min(W, H) * .42);
  halo.addColorStop(0, withAlpha(zone.ambient === 'forest' ? '#a8d0a0' : '#ffbf7a', .18));
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo; ctx.fillRect(0, 0, W, H);

  // distant silhouettes
  ctx.save();
  if (zone.ambient === 'forest' || zone.ambient === 'mire') {
    for (let i = 0; i < 16; i++) {
      const x = (i / 16) * W + hash(i, 4) * W * .05;
      const h = H * (.16 + hash(i, 8) * .22);
      ctx.fillStyle = zone.ambient === 'mire' ? 'rgba(12,22,24,.75)' : 'rgba(10,20,14,.8)';
      ctx.fillRect(x, horizon - h * .4, Math.max(3, W * .012), h);
      ctx.beginPath();
      ctx.arc(x + W * .006, horizon - h * .4, Math.min(W, H) * .05, 0, TAU);
      ctx.fill();
    }
  } else if (zone.ambient === 'peaks') {
    for (let i = 0; i < 5; i++) {
      const x = (i / 4) * W;
      ctx.fillStyle = 'rgba(20,10,12,.75)';
      ctx.beginPath();
      ctx.moveTo(x - W * .2, horizon + 10);
      ctx.lineTo(x + W * (hash(i, 2) * .12), horizon - H * (.18 + hash(i, 6) * .18));
      ctx.lineTo(x + W * .22, horizon + 10);
      ctx.closePath(); ctx.fill();
    }
    // volcano glow
    const vg = ctx.createLinearGradient(0, horizon - 10, 0, horizon + 60);
    vg.addColorStop(0, 'rgba(240,90,40,.28)');
    vg.addColorStop(1, 'rgba(240,90,40,0)');
    ctx.fillStyle = vg; ctx.fillRect(W * .5, horizon - 10, W * .5, 90);
  } else if (zone.ambient === 'citadel') {
    for (let i = 0; i < 6; i++) {
      const x = W * (.08 + i * .17);
      ctx.fillStyle = 'rgba(10,8,16,.8)';
      ctx.fillRect(x, horizon - H * .3, W * .05, H * .32);
      ctx.fillStyle = 'rgba(120,90,150,.12)';
      ctx.fillRect(x + W * .012, horizon - H * .28, W * .006, H * .2);
    }
  } else {
    // distant town / ruins
    for (let i = 0; i < 9; i++) {
      const x = W * (.05 + i * .11);
      const h = H * (.03 + hash(i, 5) * .07);
      ctx.fillStyle = 'rgba(14,15,20,.65)';
      ctx.fillRect(x, horizon - h, W * .06, h);
      if (i % 3 === 0) {
        ctx.beginPath();
        ctx.moveTo(x - W * .01, horizon - h);
        ctx.lineTo(x + W * .03, horizon - h - H * .035);
        ctx.lineTo(x + W * .07, horizon - h);
        ctx.closePath(); ctx.fill();
      }
    }
  }
  ctx.restore();

  // ground plane
  const ground = ctx.createLinearGradient(0, horizon, 0, H);
  ground.addColorStop(0, cols[3]);
  ground.addColorStop(.3, shade(cols[3], 6));
  ground.addColorStop(1, '#07090d');
  ctx.fillStyle = ground;
  ctx.fillRect(0, horizon, W, H - horizon);
  // horizon glow
  const hg = ctx.createLinearGradient(0, horizon - 8, 0, horizon + 34);
  hg.addColorStop(0, withAlpha(cols[2], .18));
  hg.addColorStop(1, withAlpha(cols[2], 0));
  ctx.fillStyle = hg; ctx.fillRect(0, horizon - 8, W, 42);
  // perspective lines
  ctx.strokeStyle = 'rgba(255,220,180,.05)'; ctx.lineWidth = 1;
  for (let i = -4; i <= 4; i++) {
    ctx.beginPath();
    ctx.moveTo(W / 2 + i * W * .03, horizon);
    ctx.lineTo(W / 2 + i * W * .22, H);
    ctx.stroke();
  }
  for (let i = 0; i < 5; i++) {
    const y = horizon + Math.pow(i / 5, 1.7) * (H - horizon);
    ctx.globalAlpha = .5;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  // arena ring
  ctx.strokeStyle = withAlpha(cols[2], .12); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(W * .5, H * .77, W * .38, H * .16, 0, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(W * .5, H * .77, W * .3, H * .12, 0, 0, TAU); ctx.stroke();

  // embers
  for (let i = 0; i < 26; i++) {
    const p = (t * (.03 + hash(i, 7) * .06) + hash(i, 11)) % 1;
    const x = (hash(i, 19) * W + Math.sin(t + i) * 18) % W;
    const y = H * .9 - p * H * .8;
    const a = Math.sin(p * Math.PI) * .5;
    ctx.fillStyle = withAlpha(zone.ambient === 'forest' ? '#c8e88a' : zone.ambient === 'citadel' ? '#b79bea' : '#ffb066', a);
    ctx.beginPath(); ctx.arc(x, y, .8 + hash(i, 3) * 1.6, 0, TAU); ctx.fill();
  }
  if (boss) {
    ctx.fillStyle = 'rgba(240,90,50,.05)';
    ctx.fillRect(0, 0, W, H);
  }
}

function statusIcons(ctx, unit, x, y, s) {
  const list = (unit.statuses || []).slice(0, 5);
  if (!list.length) return;
  const size = Math.max(8, s * .14);
  ctx.font = `${size}px Georgia, serif`;
  ctx.textAlign = 'center';
  list.forEach((st, i) => {
    ctx.fillStyle = st.tone === 'good' ? 'rgba(120,213,192,.9)' : 'rgba(222,106,92,.9)';
    ctx.fillText(st.icon, x - (list.length - 1) * size * .55 + i * size * 1.1, y);
  });
}

function drawHpBar(ctx, x, y, w, hp, maxHp, color = '#de6a5c') {
  ctx.fillStyle = 'rgba(4,6,10,.7)';
  rr(ctx, x - w / 2, y, w, 4, 2); ctx.fill();
  ctx.fillStyle = color;
  rr(ctx, x - w / 2, y, Math.max(0, w * (hp / maxHp)), 4, 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.1)'; ctx.lineWidth = 1;
  rr(ctx, x - w / 2, y, w, 4, 2); ctx.stroke();
}

function drawCombatant(ctx, battle, unit, W, H, s, now) {
  const pos = unitPos(unit, unit._slot, unit._count, unit.side, W, H, s);
  const age = now - (unit.fx?.lungeAt || 0);
  let ox = 0;
  if (age < 260) {
    const k = Math.sin(age / 260 * Math.PI) * (unit.fx.lungeDir || -1) * s * .55;
    ox += k;
  }
  const hitAge = now - (unit.fx?.hitAt || -9999);
  let shake = 0;
  if (hitAge < 320) shake = Math.sin(hitAge * .09) * (1 - hitAge / 320) * s * .12;
  const castAge = now - (unit.fx?.castAt || -9999);
  const bob = Math.sin(now / 640 + (unit.seed || 0)) * s * .012;
  const flash = hitAge < 160;
  const alpha = unit.dead ? clamp(1 - (now - unit.deadAt) / 900, 0, 1) * .35 + .1 : 1;
  const scale = unit.dead ? .94 : 1;

  if (unit.side === 'enemy') {
    const def = unit.def;
    drawEnemy(ctx, def, pos.x + ox + shake, pos.y + bob, pos.s, now / 1000, { flash: flash ? 1 : 0, alpha });
    // name + hp
    const labelY = pos.y - (pos.s * 1.5 * (def.size || 1)) - (def.boss ? 20 : 8);
    ctx.save();
    ctx.font = `600 ${Math.max(9, Math.min(13, W * .015))}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = unit.dead ? 'rgba(170,160,150,.4)' : 'rgba(238,226,208,.92)';
    ctx.shadowColor = '#000'; ctx.shadowBlur = 6;
    ctx.fillText(def.name, pos.x, labelY);
    ctx.shadowBlur = 0;
    if (!unit.dead) {
      const bw = def.boss ? Math.min(W * .32, 190) : Math.min(W * .16, 84);
      drawHpBar(ctx, pos.x, labelY + 5, bw, unit.hp, unit.maxHp, def.boss ? '#d9564f' : '#c4674f');
      if (def.boss) {
        ctx.font = '8px "Avenir Next", system-ui, sans-serif';
        ctx.fillStyle = 'rgba(220,200,170,.65)';
        ctx.fillText('LV ' + unit.level, pos.x, labelY + 18);
      }
      statusIcons(ctx, unit, pos.x, labelY - 12, pos.s);
    }
    ctx.restore();
  } else {
    const pal = paletteFor(unit.member);
    drawPerson(ctx, pos.x + ox + shake, pos.y + bob, pos.s, {
      classId: unit.member.classId,
      palette: pal,
      facing: 'left',
      time: now / 1000,
      scale: scale,
      seed: unit.seed,
      walk: 0,
    });
    const labelY = pos.y - pos.s * 1.65;
    ctx.save();
    ctx.font = `600 ${Math.max(8, Math.min(12, W * .014))}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(238,226,208,.88)';
    ctx.shadowColor = '#000'; ctx.shadowBlur = 5;
    ctx.fillText(unit.name, pos.x, labelY);
    ctx.shadowBlur = 0;
    statusIcons(ctx, unit, pos.x, labelY - 11, pos.s);
    ctx.restore();
  }

  // active marker
  if (battle.activeUid === unit.uid && !unit.dead) {
    const pulse = .5 + .5 * Math.sin(now / 200);
    ctx.strokeStyle = `rgba(255,208,138,${.55 + pulse * .35})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(pos.x, pos.y + 3, pos.s * .45, pos.s * .13, 0, 0, TAU); ctx.stroke();
    ctx.fillStyle = `rgba(255,208,138,${.6 + pulse * .3})`;
    ctx.beginPath();
    const ay = pos.y - pos.s * (unit.side === 'enemy' ? 2.2 : 1.9) - 4;
    ctx.moveTo(pos.x, ay); ctx.lineTo(pos.x - 6, ay - 9); ctx.lineTo(pos.x + 6, ay - 9); ctx.closePath(); ctx.fill();
  }
  // target marker
  if (battle.targetUid === unit.uid) {
    const pulse = .5 + .5 * Math.sin(now / 180);
    ctx.strokeStyle = `rgba(255,120,90,${.7 + pulse * .3})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(pos.x, pos.y - pos.s * .7, pos.s * .55 + pulse * 3, 0, TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(255,160,100,.9)';
    ctx.font = '11px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('▼', pos.x, pos.y - pos.s * 1.4);
  }
  return pos;
}

function drawEffect(ctx, eff, W, H, now, pos) {
  const age = now - eff.born;
  if (age < 0 || age > eff.dur) return;
  const k = age / eff.dur;
  const x = pos?.x ?? eff.x ?? W * .4;
  const y = pos?.y ?? eff.y ?? H * .6;
  const rare = 0;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  if (eff.kind === 'fire') {
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU + age * .003;
      const d = Math.sin(k * Math.PI) * 52 + (i % 3) * 10;
      const px = x + Math.cos(a) * d;
      const py = y - 20 + Math.sin(a) * d * .6 - k * 34;
      ctx.fillStyle = `rgba(255,${120 + (i * 23 % 90)},50,${(1 - k) * .75})`;
      ctx.beginPath(); ctx.arc(px, py, (1 - k) * 7 + 1.5, 0, TAU); ctx.fill();
    }
    ctx.strokeStyle = `rgba(255,160,80,${(1 - k) * .8})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x, y - 14, 18 + k * 60, 10 + k * 30, 0, 0, TAU); ctx.stroke();
  } else if (eff.kind === 'frost') {
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * TAU;
      const d = 20 + k * 70;
      ctx.fillStyle = `rgba(160,230,255,${(1 - k) * .8})`;
      ctx.save(); ctx.translate(x + Math.cos(a) * d, y - 24 + Math.sin(a) * d * .5); ctx.rotate(a);
      ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(2.5, 0); ctx.lineTo(0, 7); ctx.lineTo(-2.5, 0); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  } else if (eff.kind === 'storm') {
    ctx.strokeStyle = `rgba(170,220,255,${(1 - k) * .95})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    let lx = x + (pos ? 0 : 0), ly = 0;
    ctx.moveTo(lx + (pos ? 0 : 0), 0);
    for (let i = 1; i <= 7; i++) {
      const yy = y * (i / 7) - 20;
      lx = x + (hash(i, Math.floor(eff.born / 100)) - .5) * 60;
      ctx.lineTo(lx, yy);
    }
    ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,255,${(1 - k) * .5})`; ctx.lineWidth = 1; ctx.stroke();
  } else if (eff.kind === 'nature') {
    for (let i = 0; i < 18; i++) {
      const a = i / 18 * TAU;
      const d = k * 58;
      ctx.fillStyle = `rgba(150,220,120,${(1 - k) * .7})`;
      ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y - 25 + Math.sin(a) * d * .6, 2.5, 0, TAU); ctx.fill();
    }
  } else if (eff.kind === 'shadow') {
    const g = ctx.createRadialGradient(x, y - 25, 0, x, y - 25, 30 + k * 50);
    g.addColorStop(0, `rgba(150,110,200,${(1 - k) * .5})`);
    g.addColorStop(1, 'rgba(30,10,50,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y - 25, 30 + k * 50, 0, TAU); ctx.fill();
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU + k;
      ctx.strokeStyle = `rgba(120,80,160,${(1 - k) * .6})`;
      ctx.beginPath(); ctx.moveTo(x, y - 25); ctx.lineTo(x + Math.cos(a) * k * 70, y - 25 + Math.sin(a) * k * 50); ctx.stroke();
    }
  } else if (eff.kind === 'heal') {
    for (let i = 0; i < 14; i++) {
      const px = x + (hash(i, 7) - .5) * 50;
      const py = y - 10 - ((k + hash(i, 3)) % 1) * 70;
      ctx.fillStyle = `rgba(170,240,180,${(1 - k) * .8})`;
      ctx.beginPath(); ctx.arc(px, py, 2, 0, TAU); ctx.fill();
    }
    ctx.strokeStyle = `rgba(170,240,180,${(1 - k) * .4})`;
    ctx.beginPath(); ctx.ellipse(x, y, 26, 8, 0, 0, TAU); ctx.stroke();
  } else if (eff.kind === 'buff') {
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * TAU + age * .002;
      ctx.fillStyle = `rgba(255,210,130,${(1 - k) * .7})`;
      ctx.beginPath(); ctx.arc(x + Math.cos(a) * 30, y - 30 - k * 40 + Math.sin(a) * 22, 1.6, 0, TAU); ctx.fill();
    }
  } else {
    // slash / physical
    ctx.strokeStyle = `rgba(255,245,225,${(1 - k) * .9})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x - 38, y - 50); ctx.quadraticCurveTo(x, y - 20, x + 38, y - 55);
    ctx.stroke();
    ctx.strokeStyle = `rgba(255,170,90,${(1 - k) * .6})`; ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * TAU;
      ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 8, y - 30 + Math.sin(a) * 8); ctx.lineTo(x + Math.cos(a) * 38, y - 30 + Math.sin(a) * 38); ctx.stroke();
    }
  }
  ctx.restore();
}

export function renderBattle(ctx, W, H, battle, now) {
  ctx.clearRect(0, 0, W, H);
  drawBattleBg(ctx, W, H, battle.zone, now, battle.boss);
  const s = clamp(Math.min(W / 7.8, H / 8.4), 38, 96);
  // assign slots
  const enemyCount = battle.enemies.length;
  battle.enemies.forEach((u, i) => { u._slot = i; u._count = enemyCount; u._seed = i * 7; });
  const allyCount = battle.allies.length;
  battle.allies.forEach((u, i) => { u._slot = i; u._count = allyCount; u._seed = i * 3; });

  const shake = battle.shakeUntil > now ? (battle.shakePower || 0) * (battle.shakeUntil - now) / 260 : 0;
  ctx.save();
  if (shake > 0) ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake);

  // enemies then allies (so allies in front)
  const positions = new Map();
  for (const u of battle.enemies) {
    const p = drawCombatant(ctx, battle, u, W, H, s, now);
    positions.set(u.uid, p);
  }
  for (const u of battle.allies) {
    const p = drawCombatant(ctx, battle, u, W, H, s, now);
    positions.set(u.uid, p);
  }

  // effects
  for (const eff of battle.effects) {
    const p = eff.uid ? positions.get(eff.uid) : null;
    drawEffect(ctx, eff, W, H, now, p);
  }

  // target line / cursor ring for target round handled by DOM list too

  // floaters
  for (const f of battle.floaters) {
    const age = now - f.born;
    if (age < 0 || age > f.dur) continue;
    const p = positions.get(f.uid);
    if (!p) continue;
    const k = age / f.dur;
    const x = p.x + (f.dx || 0) + (f.vx || 0) * k;
    const y = p.y - p.s * .9 - k * 46 + (f.dy || 0);
    ctx.save();
    ctx.font = `700 ${f.big ? Math.max(16, s * .34) : Math.max(11, s * .22)}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000'; ctx.shadowBlur = 7;
    ctx.globalAlpha = clamp(1.4 - k * 1.4, 0, 1);
    ctx.fillStyle = f.color || '#f0e3cf';
    ctx.fillText(f.text, x, y);
    ctx.restore();
  }
  ctx.restore();

  // screen flash
  if (battle.flashUntil > now) {
    const k = (battle.flashUntil - now) / 240;
    ctx.fillStyle = withAlpha(battle.flashColor || '#ffd9a8', clamp(k, 0, .65));
    ctx.fillRect(0, 0, W, H);
  }
  // dark vignette top/bottom
  const vg = ctx.createLinearGradient(0, 0, 0, H);
  vg.addColorStop(0, 'rgba(4,6,10,.32)');
  vg.addColorStop(.22, 'rgba(4,6,10,0)');
  vg.addColorStop(.72, 'rgba(4,6,10,0)');
  vg.addColorStop(1, 'rgba(4,6,10,.5)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

  if (battle.boss) {
    ctx.save();
    ctx.font = `600 ${Math.max(9, W * .012)}px "Avenir Next", system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(255,180,120,.45)';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '4px';
    ctx.fillText(battle.bossName || 'CALAMITY', W / 2, H * .08);
    ctx.restore();
  }
}

// player + party canvas portraits helper for battle cards
export function drawBattleFace(canvas, unit) {
  import('./art.js').then(({ drawPortrait }) => {
    // drawPortrait expects member-shaped object
    drawPortrait(canvas, unit.member, { dpr: window.devicePixelRatio || 1 });
  });
}
