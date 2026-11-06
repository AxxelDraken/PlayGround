import { state, statBlock, restoreParty, addItem, addGold, addGear, syncVitals, saveGame, countKeys, hero, completeQuest, startQuest, addXp } from './state.js';
import { ZONES } from './data/zones.js';
import { ITEMS } from './data/items.js';
import { PALETTES } from './data/classes.js';
import { PAL, CHAR_PALS } from './engine/pixel.js';
import { shade } from './engine/art.js';
import { audio } from './engine/audio.js';
import { renderWorld, drawMinimap } from './engine/world-render.js';
import {
  say, choice, toast, fade, banner, updateHud, showInteract, renderPartyHud,
  setMinimap, closeDialogue, modal, ui, $, $$, escapeHtml, cinematic, shakeScreen,
} from './engine/ui-core.js';
import { runStory, STORIES } from './story.js';
import { startBattle, battleState } from './battle.js';

const BLOCKED = new Set(['#', 'T', '^', '~', 'r', 'R', 'f', 'g', 'H', 'h', 'D', 'W', 'L', 'A', 'i', 't', 'n', 'B', 'C', 'o', 'S', 'e']);
const ENCOUNTER_TILES = new Set([',', 'x', 'w']);
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

export const world = {
  zone: null,
  npcs: [],
  player: { x: 15, y: 14, px: 15, py: 14, facing: 'down', moving: false, progress: 0, from: null, to: null, path: [], pending: null },
  camx: 0,
  camy: 0,
  paused: true,
  keys: {},
  joy: { active: false, x: 0, y: 0 },
  tapMarker: null,
  stepsSinceEnc: 0,
  near: null,
  lastPrompt: null,
  timeAcc: 0,
  hudAcc: 0,
  miniAcc: 0,
  wanderAcc: 0,
  wantInteract: null,
  initialized: false,
};

export function initWorld() {
  if (world.initialized) return;
  world.initialized = true;
  setupInput();
  setupJoystick();
}

function setupInput() {
  const canvas = $('#game');
  canvas.addEventListener('pointerdown', (e) => {
    if (world.paused || ui.dialogueOpen || battleState.active || !$('#menu').classList.contains('hidden')) return;
    const rect = canvas.getBoundingClientRect();
    onTap(e.clientX - rect.left, e.clientY - rect.top);
  });
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (ui.dialogueOpen || ui.cinematicOpen) return;
    if (battleState.active) return;
    const k = e.key.toLowerCase();
    if (['arrowup', 'w'].includes(k)) { world.keys.up = true; e.preventDefault(); }
    else if (['arrowdown', 's'].includes(k)) { world.keys.down = true; e.preventDefault(); }
    else if (['arrowleft', 'a'].includes(k)) { world.keys.left = true; e.preventDefault(); }
    else if (['arrowright', 'd'].includes(k)) { world.keys.right = true; e.preventDefault(); }
    else if (k === 'e' || k === 'enter') { e.preventDefault(); interact(); }
    else if (k === 'escape' || k === 'm') {
      e.preventDefault();
      if ($('#menu').classList.contains('hidden') && !world.paused) window.dispatchEvent(new CustomEvent('emberwake:menu'));
    }
  });
  document.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if (['arrowup', 'w'].includes(k)) world.keys.up = false;
    if (['arrowdown', 's'].includes(k)) world.keys.down = false;
    if (['arrowleft', 'a'].includes(k)) world.keys.left = false;
    if (['arrowright', 'd'].includes(k)) world.keys.right = false;
  });
  window.addEventListener('blur', () => { world.keys = {}; });
  $('#btn-action').addEventListener('click', () => {
    if (ui.dialogueOpen) { import('./engine/ui-core.js').then((m) => m.advanceDialogue()); return; }
    if (world.paused) return;
    interact();
  });
  $('#btn-menu').addEventListener('click', () => {
    if (world.paused || ui.dialogueOpen || battleState.active) return;
    window.dispatchEvent(new CustomEvent('emberwake:menu'));
  });
  $('#btn-bag').addEventListener('click', () => {
    if (world.paused || ui.dialogueOpen || battleState.active) return;
    window.dispatchEvent(new CustomEvent('emberwake:menu'));
  });
}

function setupJoystick() {
  const joy = $('#joystick');
  const knob = $('#joy-knob');
  let id = null;
  const radius = 42;
  const start = (e) => {
    if (world.paused || ui.dialogueOpen || battleState.active) return;
    id = e.pointerId;
    joy.setPointerCapture?.(id);
    move(e);
    e.preventDefault();
  };
  const move = (e) => {
    if (id !== e.pointerId) return;
    const r = joy.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy);
    if (d > radius) { dx = dx / d * radius; dy = dy / d * radius; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    world.joy.x = dx / radius;
    world.joy.y = dy / radius;
    if (d > 10) { world.player.path = []; world.player.pending = null; }
    e.preventDefault();
  };
  const end = (e) => {
    if (e.pointerId !== id) return;
    id = null;
    knob.style.transform = '';
    world.joy = { active: false, x: 0, y: 0 };
  };
  joy.addEventListener('pointerdown', start);
  joy.addEventListener('pointermove', move);
  window.addEventListener('pointerup', end);
  window.addEventListener('pointercancel', end);
}

// ── zone entry ────────────────────────────────────────────────
export function enterZone(id, x = null, y = null, opts = {}) {
  const zone = ZONES[id];
  if (!zone) return;
  state.zone = id;
  world.zone = zone;
  if (x != null) state.pos.x = x;
  if (y != null) state.pos.y = y;
  // ensure walkable spawn
  if (!isWalkable(state.pos.x, state.pos.y, true)) {
    const s = zone.spawn;
    state.pos.x = s.x; state.pos.y = s.y;
  }
  world.player.x = state.pos.x; world.player.y = state.pos.y;
  world.player.px = state.pos.x; world.player.py = state.pos.y;
  world.player.path = [];
  world.player.moving = false;
  world.player.from = null; world.player.to = null;
  world.stepsSinceEnc = 5;
  state.visited[id] = true;
  state.time = state.time || .72;
  refreshWorld();
  snapCamera();
  updateHud(zone);
  banner(zone.name, zone.sub);
  setMinimap(zone, world.npcs);
  audio.setScene(zone.ambient === 'forest' ? 'forest' : zone.ambient === 'mire' ? 'mire' : zone.ambient === 'peaks' ? 'peaks' : zone.ambient === 'citadel' ? 'citadel' : 'explore');
  if (!state.flags['intro_' + id] && zone.intro && STORIES[zone.intro]) {
    state.flags['intro_' + id] = true;
    setTimeout(() => runDialogue(zone.intro), 500);
  }
}

export function refreshWorld() {
  const zone = world.zone;
  if (!zone) return;
  world.npcs = zone.npcs.filter((n) => !n.cond || n.cond(state)).map((n) => {
    let marker = null;
    if (n.id === 'maro' && !state.flags.prologueDone) marker = '!';
    if (n.id === 'seris' || n.id === 'lyra') marker = '!';
    if (n.id === 'wren' && state.quests.locket.status === 'active') marker = '?';
    if (n.id === 'wren' && state.quests.relief.status === 'active') marker = '?';
    if (n.id === 'dax' && state.quests.bounty.status === 'active') marker = '?';
    if (n.id === 'witchnpc' && state.quests.moonpetal.status === 'active') marker = '?';
    if (n.id === 'sable') marker = '?';
    if (n.id === 'malrec' && !state.flags.peaksChoice) marker = '!';
    return { ...n, marker };
  });
  world.near = null;
  world.lastPrompt = null;
  if (zone.map) setMinimap(zone, world.npcs);
}

function snapCamera() {
  const W = 320, H = 180;
  const map = world.zone.map;
  world.camx = clampCam(world.player.px * TILE + TILE / 2 - W / 2, map.w * TILE, W);
  world.camy = clampCam(world.player.py * TILE + TILE / 2 - H / 2, map.h * TILE, H);
}

const TILE = 16;
function clampCam(v, mapPx, viewPx) {
  if (mapPx <= viewPx) return (mapPx - viewPx) / 2;
  return Math.max(0, Math.min(mapPx - viewPx, v));
}

// ── walkability ───────────────────────────────────────────────
export function isWalkable(x, y, ignorePlayer = false) {
  const zone = world.zone;
  if (!zone) return false;
  const map = zone.map;
  if (x < 0 || y < 0 || x >= map.w || y >= map.h) return false;
  const ch = map.g[y][x];
  if (BLOCKED.has(ch)) return false;
  if (world.npcs.some((n) => n.x === x && n.y === y)) return false;
  if (zone.chests?.some((c) => c.x === x && c.y === y)) return false;
  if (zone.crystals?.some((c) => c.x === x && c.y === y)) return false;
  if (zone.braziers?.some((c) => c.x === x && c.y === y)) return false;
  if (zone.signs?.some((c) => c.x === x && c.y === y)) return false;
  const alt = altarAt(x, y);
  if (alt) return false;
  return true;
}

function altarAt(x, y) {
  const zone = world.zone;
  if (!zone?.boss?.altar) return null;
  const a = zone.boss.altar;
  if (a.x === x && a.y === y) return { ...a, story: zone.boss.trigger };
  return null;
}

// ── pathfinding ───────────────────────────────────────────────
function findPath(start, goal, maxNodes = 900) {
  if (start.x === goal.x && start.y === goal.y) return [];
  const key = (x, y) => x + ',' + y;
  const q = [{ x: start.x, y: start.y, p: null }];
  const seen = new Set([key(start.x, start.y)]);
  let head = 0;
  let found = null;
  while (head < q.length && q.length < maxNodes) {
    const cur = q[head++];
    if (cur.x === goal.x && cur.y === goal.y) { found = cur; break; }
    for (const [dx, dy] of Object.values(DIRS)) {
      const nx = cur.x + dx, ny = cur.y + dy;
      const k = key(nx, ny);
      if (seen.has(k) || !isWalkable(nx, ny)) continue;
      seen.add(k);
      q.push({ x: nx, y: ny, p: cur });
    }
  }
  if (!found) return null;
  const path = [];
  let n = found;
  while (n && n.p) { path.unshift({ x: n.x, y: n.y }); n = n.p; }
  return path;
}

function onTap(cx, cy) {
  const T = 16;
  const s = $('#game').clientWidth / 320 || 1;
  const wx = (cx / s + world.camx) / T;
  const wy = (cy / s + world.camy) / T;
  const tx = Math.floor(wx), ty = Math.floor(wy);
  let target = { x: tx, y: ty };
  const obj = interactables().find((o) => o.x === tx && o.y === ty);
  if (obj) {
    const adj = adjacentWalkable(tx, ty);
    if (!adj) { audio.sfx('error'); return; }
    target = adj;
    world.player.pending = obj;
  } else {
    world.player.pending = null;
  }
  if (!isWalkable(target.x, target.y)) {
    // find nearest walkable around tap within 1
    let best = null;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (isWalkable(tx + dx, ty + dy)) { best = { x: tx + dx, y: ty + dy }; break; }
    }
    if (!best) return;
    target = best;
  }
  if (obj) {
    const d = Math.abs(obj.x - world.player.x) + Math.abs(obj.y - world.player.y);
    if (d <= 1) { interactWith(obj); return; }
  }
  const path = findPath({ x: world.player.x, y: world.player.y }, target);
  if (path) {
    world.player.path = path;
    world.tapMarker = { x: target.x, y: target.y, at: performance.now() };
    audio.sfx('click');
  }
}

function adjacentWalkable(x, y) {
  const opts = [
    { x, y: y + 1 }, { x: x - 1, y }, { x: x + 1, y }, { x, y: y - 1 },
    { x: x - 1, y: y + 1 }, { x: x + 1, y: y + 1 }, { x: x - 1, y: y - 1 }, { x: x + 1, y: y - 1 },
  ];
  const p = world.player;
  return opts.filter((o) => isWalkable(o.x, o.y)).sort((a, b) => (Math.abs(a.x - p.x) + Math.abs(a.y - p.y)) - (Math.abs(b.x - p.x) + Math.abs(b.y - p.y)))[0] || null;
}

// ── update ────────────────────────────────────────────────────
export function updateWorld(dt, W, H) {
  if (!world.zone) return;
  if (battleState.active) return;
  const p = world.player;
  if (!world.paused) {
    state.time = (state.time + dt / 240) % 1;
    state.playtime += dt;
    // movement
    if (p.moving) {
      p.progress += dt / 155;
      if (p.progress >= 1) {
        p.progress = 0;
        p.px = p.to.x; p.py = p.to.y;
        p.x = p.to.x; p.y = p.to.y;
        state.pos.x = p.x; state.pos.y = p.y;
        p.moving = false;
        p.from = null; p.to = null;
        onArrive();
      } else {
        p.px = p.from.x + (p.to.x - p.from.x) * p.progress;
        p.py = p.from.y + (p.to.y - p.from.y) * p.progress;
      }
    } else {
      const dir = inputDirection();
      if (dir) {
        if (p.path.length) p.path = [];
        if (p.pending) p.pending = null;
        tryMove(dir);
      } else if (p.path.length) {
        const next = p.path[0];
        const [dx, dy] = [next.x - p.x, next.y - p.y];
        const dirName = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up';
        if (tryMove(dirName)) p.path.shift();
        else p.path = [];
      }
    }
    // camera
    const targetX = p.px * TILE + TILE / 2 - 160;
    const targetY = p.py * TILE + TILE / 2 - 90 + 6;
    world.camx += (clampCam(targetX, world.zone.map.w * TILE, 320) - world.camx) * Math.min(1, dt / 90);
    world.camy += (clampCam(targetY, world.zone.map.h * TILE, 180) - world.camy) * Math.min(1, dt / 90);

    // gentle NPC wander for festival life
    world.wanderAcc += dt;
    if (world.wanderAcc > 1200) {
      world.wanderAcc = 0;
      const dirs = Object.values(DIRS);
      for (const n of world.npcs) {
        if (!n.wander) continue;
        if (Math.random() < .6) { n.facing = ['up','down','left','right'][Math.floor(Math.random() * 4)]; continue; }
        const [dx, dy] = dirs[Math.floor(Math.random() * dirs.length)];
        const nx = n.x + dx, ny = n.y + dy;
        const occupied = world.npcs.some((o) => o.x === nx && o.y === ny);
        if (isWalkable(nx, ny) && !occupied && !(nx === p.x && ny === p.y)) {
          n.facing = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up';
          n.px = n.x = nx; n.py = n.y = ny;
        }
      }
    }
  }
  // timers
  world.hudAcc += dt;
  if (world.hudAcc > 400) {
    world.hudAcc = 0;
    updateHud(world.zone);
    setMinimap(world.zone, world.npcs);
    if (state.playtime > 0 && Math.floor(state.playtime) % 60 === 0 && !world.paused) saveGame(true);
  }
  // prompt
  if (!world.paused) updatePrompt();
}

function inputDirection() {
  const k = world.keys;
  let dx = 0, dy = 0;
  if (k.left) dx -= 1;
  if (k.right) dx += 1;
  if (k.up) dy -= 1;
  if (k.down) dy += 1;
  if (Math.hypot(world.joy.x, world.joy.y) > .38) { dx = world.joy.x; dy = world.joy.y; }
  if (!dx && !dy) return null;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

function tryMove(dir) {
  const p = world.player;
  const [dx, dy] = DIRS[dir];
  p.facing = dir;
  const nx = p.x + dx, ny = p.y + dy;
  if (!isWalkable(nx, ny)) {
    // little bump
    p.px = p.x + dx * .06; p.py = p.y + dy * .06;
    setTimeout(() => { if (!p.moving) { p.px = p.x; p.py = p.y; } }, 60);
    return false;
  }
  p.from = { x: p.x, y: p.y };
  p.to = { x: nx, y: ny };
  p.progress = 0;
  p.moving = true;
  if (Math.random() < .25) audio.sfx('step');
  return true;
}

function onArrive() {
  const p = world.player;
  state.steps++;
  if (state.repelSteps > 0) state.repelSteps--;
  world.stepsSinceEnc++;
  // auto pickup sparkles
  const sp = (world.zone.sparkles || []).find((s) => s.x === p.x && s.y === p.y && !state.takenSparkles.includes(s.id));
  if (sp) {
    state.takenSparkles.push(sp.id);
    if (ITEMS[sp.item] && ITEMS[sp.item].type === 'gear') addGear(sp.item);
    else addItem(sp.item);
    audio.sfx('chest');
    toast(`${ITEMS[sp.item]?.name || sp.item} found`, '✧');
  }
  // portal
  const portal = (world.zone.portals || []).find((pt) => pt.x === p.x && pt.y === p.y);
  if (portal) {
    if (portal.locked?.(state)) {
      audio.sfx('error');
      toast('The way is sealed. Three Emberkeys are needed.', '✦');
      return;
    }
    travel(portal.to, portal.toX, portal.toY);
    return;
  }
  // story triggers
  for (const tr of world.zone.triggers || []) {
    if (state.flags['trigger_' + tr.once]) continue;
    if (tr.cond && !tr.cond(state)) continue;
    if (Math.abs(tr.x - p.x) <= (tr.r || 1) && Math.abs(tr.y - p.y) <= (tr.r || 1)) {
      state.flags['trigger_' + tr.once] = true;
      runDialogue(tr.story);
      return;
    }
  }
  // battle pickup / quest tracking
  const ch = world.zone.map.g[p.y][p.x];
  if (world.zone.encRate > 0 && world.stepsSinceEnc > 3 && state.repelSteps <= 0 && ENCOUNTER_TILES.has(ch) && Math.random() < world.zone.encRate) {
    world.stepsSinceEnc = 0;
    randomEncounter();
    return;
  }
  // pending interaction after walking
  if (p.pending) {
    const t = p.pending;
    if (Math.abs(t.x - p.x) + Math.abs(t.y - p.y) <= 1) {
      p.pending = null;
      interactWith(t);
    } else {
      p.pending = null;
    }
  }
}

async function travel(zoneId, x, y) {
  if (world.paused) return;
  world.paused = true;
  audio.sfx('portal');
  await fade(true, 340);
  closeDialogue();
  enterZone(zoneId, x, y);
  await fade(false, 460);
  world.paused = false;
  saveGame(true);
}

function updatePrompt() {
  const near = nearestInteractable();
  world.near = near;
  if (!near) {
    if (world.lastPrompt !== null) { showInteract(null); world.lastPrompt = null; }
    return;
  }
  if (world.lastPrompt !== near.label + near.x + near.y) {
    world.lastPrompt = near.label + near.x + near.y;
    showInteract(near.label);
    for (const n of world.npcs) n.near = near.kind === 'npc' && near.id === n.id;
  }
}

function nearestInteractable() {
  if (!world.zone) return null;
  const p = world.player;
  const [dx, dy] = DIRS[p.facing] || [0, 1];
  const list = interactables();
  const front = list.find((o) => o.x === p.x + dx && o.y === p.y + dy);
  if (front) return front;
  let best = null, bd = 1.6;
  for (const o of list) {
    const d = Math.hypot(o.x - p.x, o.y - p.y);
    if (d <= bd) { bd = d; best = o; }
  }
  return best;
}

function interactables() {
  const zone = world.zone;
  if (!zone) return [];
  const list = [];
  for (const n of world.npcs) list.push({ kind: 'npc', id: n.id, x: n.x, y: n.y, label: 'Talk', npc: n });
  for (const c of zone.chests || []) list.push({ kind: 'chest', id: c.id, x: c.x, y: c.y, label: state.openedChests.includes(c.id) ? 'Inspect' : 'Open chest', data: c });
  for (const c of zone.crystals || []) list.push({ kind: 'crystal', id: c.id, x: c.x, y: c.y, label: 'Rest · Save', data: c });
  for (const b of zone.braziers || []) list.push({ kind: 'brazier', id: b.id, x: b.x, y: b.y, label: state.litBraziers.includes(b.id) ? 'Brazier' : 'Light brazier', data: b });
  for (const s of zone.signs || []) list.push({ kind: 'sign', id: 'sign' + s.x + s.y, x: s.x, y: s.y, label: 'Read', data: s });
  for (const s of zone.sparkles || []) if (!state.takenSparkles.includes(s.id)) list.push({ kind: 'sparkle', id: s.id, x: s.x, y: s.y, label: 'Take', data: s });
  const alt = zone.boss?.altar;
  if (alt) list.push({ kind: 'altar', id: 'altar_' + zone.id, x: alt.x, y: alt.y, label: altarLabel(zone), data: alt });
  return list;
}

function altarLabel(zone) {
  if (zone.id === 'citadel') return 'Ashen Throne';
  if (state.flags[zone.id + 'BossDefeated']) return 'Altar';
  return 'Touch altar';
}

export function interact() {
  if (world.paused || battleState.active) return;
  const near = nearestInteractable();
  if (!near) { audio.sfx('error'); return; }
  interactWith(near);
}

function interactWith(o) {
  if (world.paused) return;
  if (o.kind === 'npc') {
    canonicalSparkle(0, 0, 0);
    runDialogue(o.npc.dialog, o.npc);
  } else if (o.kind === 'chest') {
    openChest(o.data);
  } else if (o.kind === 'crystal') {
    restAtCrystal(o.data);
  } else if (o.kind === 'brazier') {
    lightBrazier(o.data);
  } else if (o.kind === 'sign') {
    audio.sfx('page');
    modal({ kicker: 'A WRITTEN MEMORY', title: 'Notice', body: `<p style="white-space:pre-wrap">${escapeHtml(o.data.text)}</p>`, actions: [{ label: 'Close', value: true, class: 'primary' }] });
  } else if (o.kind === 'sparkle') {
    collectSparkle(o.data);
  } else if (o.kind === 'altar') {
    if (world.zone.boss?.trigger) runDialogue(world.zone.boss.trigger);
  }
}

function canonicalSparkle() {}

function openChest(c) {
  if (state.openedChests.includes(c.id)) {
    audio.sfx('page');
    toast('The chest is empty. Only dust remembers.', '·');
    return;
  }
  state.openedChests.push(c.id);
  audio.sfx('chest');
  const parts = [];
  if (c.loot.gold) { addGold(c.loot.gold); parts.push(`${c.loot.gold} gold`); }
  if (c.loot.item) { addItem(c.loot.item, c.loot.n || 1); parts.push(`${ITEMS[c.loot.item]?.name || c.loot.item}${c.loot.n > 1 ? ' ×' + c.loot.n : ''}`); }
  if (c.loot.gear) { addGear(c.loot.gear); parts.push(ITEMS[c.loot.gear]?.name || c.loot.gear); }
  toast(parts.join(' · ') || 'Empty', '❖');
  updateHud(world.zone);
  saveGame(true);
}

function restAtCrystal(c) {
  if (!state.crystals.includes(world.zone.id)) state.crystals.push(world.zone.id);
  state.flags.lastCrystal = { zone: world.zone.id, x: c.x, y: c.y };
  restoreParty(true);
  audio.sfx('crystal');
  updateHud(world.zone);
  saveGame();
  modal({
    kicker: 'THE EMBER ANSWERS', title: 'Respite',
    body: `<p>The crystal drinks the dusk and gives it back as warmth. Your wounds close. Your companions breathe easier.</p><p style="color:var(--teal)">Party fully restored · Chronicle saved<br>You will return here if you fall.</p>`,
    actions: [{ label: 'Rise', value: true, class: 'primary' }],
  });
  world.paused = true;
  setTimeout(() => { world.paused = false; }, 100);
}

function collectSparkle(s) {
  if (state.takenSparkles.includes(s.id)) return;
  state.takenSparkles.push(s.id);
  addItem(s.item);
  audio.sfx('chest');
  toast(`${ITEMS[s.item]?.name || s.item} found`, '✧');
  if (s.item === 'moonpetal' && state.quests.moonpetal.status === 'active') {
    const n = state.inventory.moonpetal || 0;
    if (n >= 3) toast('Three moonpetals. The Witch will want to see these.', '❀');
  }
  updateHud(world.zone);
  saveGame(true);
}

function lightBrazier(b) {
  if (state.litBraziers.includes(b.id)) {
    audio.sfx('page');
    return;
  }
  state.litBraziers.push(b.id);
  audio.sfx('fire');
  if (world.zone.braziers.every((x) => state.litBraziers.includes(x.id))) {
    toast('All braziers burn. Something answers.', '✹');
    if (world.zone.id === 'emberfield' && !state.flags.braziersReward) {
      state.flags.braziersReward = true;
      if (state.quests.braziers.status === 'inactive') startQuest('braziers');
      completeQuest('braziers');
      const h = hero();
      if (h) { h.sp += 2; toast('The ruins grant 2 skill points.', '✧'); }
      addGold(160);
      addGear('crownFragment');
    }
  } else {
    toast('The brazier catches. Its light pushes at the dark.', '✹');
  }
  updateHud(world.zone);
  saveGame(true);
}

async function randomEncounter() {
  const zone = world.zone;
  world.paused = true;
  audio.sfx('magic');
  const pool = zone.encounters || [];
  if (!pool.length) { world.paused = false; return; }
  const lvlBase = zone.level;
  const group = [];
  const n = 1 + (Math.random() < .45 ? 1 : 0) + (Math.random() < .18 ? 1 : 0);
  const used = {};
  for (let i = 0; i < n; i++) {
    let id = pool[Math.floor(Math.random() * pool.length)];
    let guard = 0;
    while (used[id] >= 2 && guard++ < 8) id = pool[Math.floor(Math.random() * pool.length)];
    used[id] = (used[id] || 0) + 1;
    const lvl = lvlBase[0] + Math.floor(Math.random() * (lvlBase[1] - lvlBase[0] + 1));
    group.push({ id, level: lvl });
  }
  const result = await startBattle({ zone, enemies: group, canFlee: true });
  if (result?.respawn) {
    const lc = state.flags.lastCrystal;
    if (lc) enterZone(lc.zone, lc.x, lc.y + 1);
    else enterZone('hearthfall');
  } else if (result?.victory) {
    if (state.quests.bounty.status === 'active') {
      updateHud(world.zone);
    }
  }
  world.paused = false;
  world.stepsSinceEnc = 0;
  saveGame(true);
}

// ── story execution ───────────────────────────────────────────
export async function runDialogue(id, npc = null) {
  if (!id) return;
  const gen = STORIES[id];
  if (!gen) {
    toast('They have nothing to say just now.', '·');
    return;
  }
  world.paused = true;
  try {
    await runStory(gen, { npc, world });
  } catch (err) {
    console.error('Story error', id, err);
    toast('The thread of fate tangles...', '!');
  } finally {
    closeDialogue();
    world.paused = false;
    refreshWorld();
    updateHud(world.zone);
    saveGame(true);
  }
}

// ── render ────────────────────────────────────────────────────
export function renderWorldScene(ctx, W, H, now) {
  const zone = world.zone;
  if (!zone) return;
  const T = TILE;
  const p = world.player;
  const hero = state.party.find((m) => m.id === 'hero');
  const pal = PALETTES[hero?.palette ?? 0] || PALETTES[0];
  const near = nearestInteractable();
  const litTiles = new Set((state.litBraziers || []).map((b) => `${b.x},${b.y}`));
  const lights = [];
  for (const b of zone.braziers || []) {
    if (state.litBraziers.includes(b.id)) lights.push({ x: b.x * TILE + TILE / 2, y: b.y * TILE + TILE * 0.3, r: TILE * 2.2, glow: '#ffb066', strength: 1 });
  }
  for (const c of zone.crystals || []) lights.push({ x: c.x * TILE + TILE / 2, y: c.y * TILE + TILE / 2, r: TILE * 2.4, glow: '#7fe8d0', strength: 1 });
  for (const portal of zone.portals || []) lights.push({ x: portal.x * TILE + TILE / 2, y: portal.y * TILE + TILE * 0.4, r: TILE * 1.6, glow: PAL?.amber ?? '#f0c27a', strength: 0.5 });
  const playerLanternX = p.px * TILE + TILE / 2, playerLanternY = p.py * TILE + TILE * 0.4;
  lights.push({ x: playerLanternX, y: playerLanternY, r: TILE * 2.6, glow: '#ffd29a', strength: 0.5 });

  const npcsWithPal = world.npcs.map((n) => {
    const base = CHAR_PALS[n.sprite] || CHAR_PALS.villager;
    return { ...n, pal: { ...base, accent: n.color || base.accent } };
  });

  const view = {
    zone, camx: world.camx, camy: world.camy, now,
    timeCycle: state.time,
    litTiles,
    lights,
    player: {
      x: p.x, y: p.y, px: p.px, py: p.py, facing: p.facing, moving: p.moving,
      classId: hero?.classId, palette: pal, pants: shade(pal.cloth, -20), boots: '#282228',
    },
    npcs: npcsWithPal,
    chests: zone.chests || [],
    crystals: zone.crystals || [],
    braziers: zone.braziers || [],
    sparkles: zone.sparkles || [],
    signs: zone.signs || [],
    altars: zone.boss?.altar ? [{ ...zone.boss.altar, active: !state.flags[zone.id + 'BossDefeated'] }] : [],
    marker: world.tapMarker && now - world.tapMarker.at < 900 ? world.tapMarker : null,
    nearLabel: null,
  };
  if (near) {
    const isNpc = near.kind === 'npc';
    view.nearLabel = isNpc
      ? { x: near.x * T + T / 2, y: near.y * T, text: near.npc.name }
      : { x: near.x * T + T / 2, y: near.y * T, text: near.label };
  }
  renderWorld(ctx, W, H, view);
}

export function setPaused(v) { world.paused = v; }

export function campfireRest() {
  restoreParty(true);
  updateHud(world.zone);
  saveGame();
}

// re-export for battle defeat handling
export function respawnPlayer() {
  const lc = state.flags.lastCrystal;
  if (lc) enterZone(lc.zone, lc.x, lc.y + 1);
  else enterZone('hearthfall');
}

export { renderWorld, startBattle, drawMinimap };
