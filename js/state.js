import { CLASSES, ORIGINS, COMPANIONS } from './data/classes.js';
import { SKILLS } from './data/classes.js';
import { ITEMS } from './data/items.js';

const SAVE_KEY = 'emberwake.chronicle.v1';
const AUTOSAVE_KEY = 'emberwake.autosave.v1';

export const state = {};

function baseState() {
  return {
    version: 1,
    started: false,
    act: 0,
    chapter: 'Prologue',
    heroName: 'Aren',
    heroClass: 'vanguard',
    heroOrigin: 'hearthbound',
    heroPalette: 0,
    level: 1,
    gold: 60,
    party: [],
    gearOwned: [],
    inventory: {},
    flags: {},
    quests: {
      locket: { status: 'inactive' },
      relief: { status: 'inactive' },
      braziers: { status: 'inactive' },
      bounty: { status: 'inactive', kills: 0 },
      moonpetal: { status: 'inactive' },
    },
    keys: 0,
    zone: 'hearthfall',
    pos: { x: 15, y: 14 },
    facing: 'down',
    openedChests: [],
    takenSparkles: [],
    litBraziers: [],
    crystals: [],
    visited: {},
    steps: 0,
    repelSteps: 0,
    time: 0,
    playtime: 0,
    settings: { sound: true, difficulty: 'balanced' },
    ngPlus: 0,
    legacy: false,
    legacyEnding: null,
    legacyName: null,
    legacyClass: null,
    ending: null,
    introDone: false,
  };
}

export function resetState(partial = {}) {
  Object.assign(state, baseState(), partial);
  state.party = [];
  state.flags = { ...(partial.flags || {}) };
  state.visited = { ...(partial.visited || {}) };
  return state;
}
resetState();

export const DIFFICULTY = {
  story: { name: 'Story', enemyHp: .82, enemyDmg: .72, xp: 1.15, desc: 'For the story. Enemies hit softly.' },
  balanced: { name: 'Balanced', enemyHp: 1, enemyDmg: 1, xp: 1, desc: 'A fair fight, if you use your skills.' },
  brutal: { name: 'Brutal', enemyHp: 1.18, enemyDmg: 1.28, xp: 1.2, desc: 'The ash does not forgive. Tactics required.' },
};

export function xpNeed(level) {
  return Math.round(36 + level * level * 17 + level * 20);
}

export function statBlock(member) {
  const cls = CLASSES[member.classId];
  const lv = Math.max(1, member.level);
  const g = cls.grow, b = cls.base;
  const s = {
    hp: b.hp + g.hp * (lv - 1),
    mp: b.mp + g.mp * (lv - 1),
    atk: b.atk + g.atk * (lv - 1),
    def: b.def + g.def * (lv - 1),
    mag: b.mag + g.mag * (lv - 1),
    res: b.res + g.res * (lv - 1),
    agi: b.agi + g.agi * (lv - 1),
    luck: b.luck + g.luck * (lv - 1),
  };
  const pct = { hp: 0, mp: 0 };
  const eleRes = { fire: 0, frost: 0, storm: 0, nature: 0, shadow: 0, earth: 0, water: 0, holy: 0 };
  const extras = { crit: 0, evade: 0, lifesteal: 0, counter: 0, mpRegen: 0, stormBoost: 0, reviveOnce: false };
  const tree = cls.tree;
  for (const node of tree) {
    if (!member.learned?.includes(node.id)) continue;
    const sk = SKILLS[node.id];
    if (!sk?.passive) continue;
    if (sk.mods) for (const [k, v] of Object.entries(sk.mods)) {
      if (k === 'hpPct') pct.hp += v;
      else if (k === 'mpPct') pct.mp += v;
      else if (k === 'crit') extras.crit += v;
      else if (k === 'evade') extras.evade += v;
      else if (k === 'fireRes') eleRes.fire += v;
      else if (k === 'lifesteal') extras.lifesteal += v;
      else if (s[k] !== undefined) s[k] += v;
    }
    if (sk.special === 'reviveOnce') extras.reviveOnce = true;
    if (sk.special === 'counter') extras.counter += .35;
    if (sk.special === 'counter25') extras.counter += .25;
    if (sk.special === 'lifesteal') extras.lifesteal += .18;
    if (sk.special === 'mpRegen') extras.mpRegen += 4;
    if (sk.special === 'mpRegen2') extras.mpRegen += 3;
    if (sk.special === 'stormBoost') extras.stormBoost += .2;
  }
  if (member.id === 'hero') {
    const o = ORIGINS[member.origin || state.heroOrigin];
    if (o?.bonuses) {
      for (const [k, v] of Object.entries(o.bonuses)) {
        if (k === 'hpPct') pct.hp += v;
        else if (s[k] !== undefined) s[k] += v;
      }
    }
  }
  if (member.bonus) for (const [k, v] of Object.entries(member.bonus)) { if (s[k] !== undefined) s[k] += v; }
  // equipment
  for (const slot of ['weapon', 'charm']) {
    const gid = member.gear?.[slot];
    const gi = gid && ITEMS[gid];
    if (gi?.stats) for (const [k, v] of Object.entries(gi.stats)) {
      if (k === 'hp' || k === 'mp') s[k] += v;
      else if (s[k] !== undefined) s[k] += v;
    }
  }
  s.hp = Math.round(s.hp * (1 + pct.hp));
  s.mp = Math.round(s.mp * (1 + pct.mp));
  for (const k of Object.keys(s)) s[k] = Math.round(s[k]);
  s.maxHp = s.hp;
  s.maxMp = s.mp;
  s.crit = .05 + s.luck * .004 + extras.crit;
  s.evade = Math.min(.35, s.agi * .002 + extras.evade);
  s.lifesteal = Math.min(.5, extras.lifesteal);
  s.counter = Math.min(.6, extras.counter);
  s.mpRegen = extras.mpRegen;
  s.stormBoost = extras.stormBoost;
  s.reviveOnce = extras.reviveOnce;
  s.eleRes = eleRes;
  return s;
}

export function makeMember({ id, name, classId, palette = 0, level = 1, origin = null, auto = false }) {
  const m = {
    id, name, classId, palette, level,
    xp: 0, sp: Math.max(0, level - 1 + (auto ? 0 : 1)),
    learned: [...CLASSES[classId].start],
    gear: { weapon: null, charm: null },
    origin: origin || null,
    joined: true,
  };
  if (id === 'hero') m.origin = origin || state.heroOrigin;
  const st = statBlock(m);
  m.hp = st.maxHp;
  m.mp = st.maxMp;
  m.sp = Math.max(1, level - 1 + 1);
  if (auto) {
    m.sp = Math.max(1, level - 1 + 1);
    autoLearn(m);
  }
  return m;
}

export function hero() { return state.party.find((m) => m.id === 'hero'); }
export function memberById(id) { return state.party.find((m) => m.id === id); }
export function fullStats(m) { return statBlock(m); }

export function syncVitals(m, oldStats = null) {
  const st = statBlock(m);
  if (oldStats) {
    const dHp = st.maxHp - oldStats.maxHp;
    const dMp = st.maxMp - oldStats.maxMp;
    m.hp = Math.max(1, Math.min(st.maxHp, m.hp + Math.max(0, dHp)));
    m.mp = Math.max(0, Math.min(st.maxMp, m.mp + Math.max(0, dMp)));
  } else {
    m.hp = Math.min(m.hp ?? st.maxHp, st.maxHp);
    m.mp = Math.min(m.mp ?? st.maxMp, st.maxMp);
  }
  if (m.hp <= 0) m.hp = 0;
  return st;
}

export function restoreParty(full = true) {
  for (const m of state.party) {
    const st = statBlock(m);
    if (full) { m.hp = st.maxHp; m.mp = st.maxMp; }
    else { m.hp = Math.min(st.maxHp, m.hp + Math.round(st.maxHp * .5)); m.mp = Math.min(st.maxMp, m.mp + Math.round(st.maxMp * .5)); }
  }
}

export function addXp(m, amount) {
  const levels = [];
  m.xp += amount;
  while (m.xp >= xpNeed(m.level)) {
    m.xp -= xpNeed(m.level);
    m.level++;
    m.sp += 1;
    if (m.level % 5 === 0) m.sp += 1;
    levels.push(m.level);
    const st = statBlock(m);
    m.hp = st.maxHp;
    m.mp = st.maxMp;
    if (m.id !== 'hero') autoLearn(m);
  }
  return levels;
}

export function learnNode(member, nodeId) {
  const cls = CLASSES[member.classId];
  const node = cls.tree.find((n) => n.id === nodeId);
  if (!node || member.learned.includes(nodeId) || member.sp < node.sp) return false;
  const reqs = node.req || [];
  if (!reqs.every((r) => member.learned.includes(r))) return false;
  member.sp -= node.sp;
  member.learned.push(nodeId);
  syncVitals(member);
  return true;
}

export function availableNodes(member) {
  const cls = CLASSES[member.classId];
  return cls.tree.filter((n) => !member.learned.includes(n.id) && (n.req || []).every((r) => member.learned.includes(r)));
}

export function autoLearn(member) {
  let guard = 0;
  while (member.sp > 0 && guard++ < 30) {
    const avail = availableNodes(member)
      .filter((n) => n.sp <= member.sp)
      .sort((a, b) => a.sp - b.sp || a.tier - b.tier || a.col - b.col);
    if (!avail.length) break;
    learnNode(member, avail[0].id);
  }
}

export function companionLevel() {
  const h = hero();
  return Math.max(1, h ? h.level : 1);
}

export function joinCompanion(id) {
  if (state.party.some((m) => m.id === id)) return false;
  const c = COMPANIONS[id];
  if (!c) return false;
  if (state.party.length >= 4) return false;
  const member = makeMember({
    id, name: c.name, classId: c.classId, palette: c.palette,
    level: companionLevel(), auto: true,
  });
  member.title = c.title;
  member.bio = c.bio;
  const st = statBlock(member);
  member.hp = st.maxHp; member.mp = st.maxMp;
  state.party.push(member);
  return true;
}

// ── inventory ──────────────────────────────────────────────────
export function countItem(id) { return state.inventory[id] || 0; }
export function addItem(id, n = 1) {
  if (!ITEMS[id]) return;
  if (ITEMS[id].type === 'gear') {
    for (let i = 0; i < n; i++) state.gearOwned.push(id);
    return;
  }
  state.inventory[id] = (state.inventory[id] || 0) + n;
}
export function removeItem(id, n = 1) {
  if (!state.inventory[id]) return false;
  state.inventory[id] -= n;
  if (state.inventory[id] <= 0) delete state.inventory[id];
  return true;
}
export function addGold(n) { state.gold = Math.max(0, state.gold + n); }

export function addGear(id) {
  if (!ITEMS[id]) return;
  state.gearOwned.push(id);
}

export function equipGear(member, itemId) {
  const item = ITEMS[itemId];
  if (!item || item.type !== 'gear') return false;
  const idx = state.gearOwned.indexOf(itemId);
  if (idx === -1) return false;
  // free it from anyone else who has it equipped
  for (const m of state.party) {
    if (m.gear[item.slot] === itemId) { m.gear[item.slot] = null; }
  }
  state.gearOwned.splice(idx, 1);
  const prev = member.gear[item.slot];
  if (prev) state.gearOwned.push(prev);
  member.gear[item.slot] = itemId;
  const st = statBlock(member);
  member.hp = Math.min(member.hp, st.maxHp);
  member.mp = Math.min(member.mp, st.maxMp);
  return true;
}

export function unequip(member, slot) {
  const gid = member.gear[slot];
  if (!gid) return false;
  state.gearOwned.push(gid);
  member.gear[slot] = null;
  const st = statBlock(member);
  member.hp = Math.min(member.hp, st.maxHp);
  member.mp = Math.min(member.mp, st.maxMp);
  return true;
}

export function countKeys() {
  let k = 0;
  for (const id of ['emberkey_thorn', 'emberkey_tide', 'emberkey_cinder']) if (countItem(id) > 0) k++;
  state.keys = k;
  return k;
}

export function setFlag(k, v = true) { state.flags[k] = v; }
export function flag(k) { return state.flags[k]; }

// ── quests ─────────────────────────────────────────────────────
export function startQuest(id) {
  const q = state.quests[id];
  if (q && q.status === 'inactive') q.status = 'active';
}
export function completeQuest(id) {
  const q = state.quests[id];
  if (q) q.status = 'done';
}
export function isQuest(id, status) { return state.quests[id]?.status === status; }

// ── persistence ────────────────────────────────────────────────
export function serialize() {
  const copy = JSON.parse(JSON.stringify(state));
  copy.playtime = Math.round(state.playtime);
  return copy;
}

export function saveGame(auto = false) {
  try {
    const data = JSON.stringify(serialize());
    localStorage.setItem(auto ? AUTOSAVE_KEY : SAVE_KEY, data);
    if (auto) localStorage.setItem(SAVE_KEY, data);
    return true;
  } catch (e) { console.warn('Save failed', e); return false; }
}

export function hasSave() {
  try { return !!(localStorage.getItem(SAVE_KEY) || localStorage.getItem(AUTOSAVE_KEY)); } catch { return false; }
}
export function saveMeta() {
  try {
    const raw = localStorage.getItem(SAVE_KEY) || localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    return { name: d.heroName, level: d.level, zone: d.zone, act: d.act, playtime: d.playtime || 0, ending: d.ending };
  } catch { return null; }
}
export function loadGameData() {
  try {
    const raw = localStorage.getItem(SAVE_KEY) || localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    if (!d || !Array.isArray(d.party) || !d.party.length) return false;
    resetState(d);
    for (const m of state.party) {
      if (!m.learned) m.learned = [...CLASSES[m.classId].start];
      if (!m.gear) m.gear = { weapon: null, charm: null };
    }
    state.keys = countKeys();
    return true;
  } catch (e) { console.warn('Load failed', e); return false; }
}

export function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem(AUTOSAVE_KEY); } catch {}
}

export function createHero({ name, classId, origin, palette, extra = {} }) {
  const prevNg = state.ngPlus || 0;
  const prevLegacy = !!state.legacy;
  const prevLegacyEnding = state.legacyEnding || null;
  const prevLegacyName = state.legacyName || null;
  const prevLegacyClass = state.legacyClass || null;
  const startLevel = 1 + prevNg * 2;
  resetState({
    started: true,
    heroName: name.trim() || 'Aren',
    heroClass: classId,
    heroOrigin: origin,
    heroPalette: palette,
    level: startLevel,
    gold: 60 + prevNg * 80,
    flags: {},
    quests: {
      locket: { status: 'inactive' }, relief: { status: 'inactive' },
      braziers: { status: 'inactive' }, bounty: { status: 'inactive', kills: 0 },
      moonpetal: { status: 'inactive' },
    },
    visited: { hearthfall: true },
    ngPlus: prevNg,
    legacy: prevLegacy,
    legacyEnding: prevLegacyEnding,
    legacyName: prevLegacyName,
    legacyClass: prevLegacyClass,
    settings: { ...(state.settings || {}) },
  });
  const h = makeMember({ id: 'hero', name: state.heroName, classId, palette, level: startLevel, origin });
  h.origin = origin;
  if (extra.bonus) h.bonus = { ...extra.bonus };
  addItem('wornBlade');
  h.gear.weapon = 'wornBlade';
  const st = statBlock(h);
  h.hp = st.maxHp; h.mp = st.maxMp;
  state.party.push(h);
  // origin items
  const o = ORIGINS[origin];
  if (o?.items) for (const [id, n] of Object.entries(o.items)) addItem(id, n);
  addItem('tonic', 3);
  if (state.legacy) addGear('heirloom');
  Object.assign(state, extra);
  h.sp = h.level + (h.level > 1 ? 1 : 0);
  h.learned = [...CLASSES[classId].start];
  if (prevNg > 0) autoLearn(h);
  syncVitals(h);
  restoreParty(true);
  return h;
}

export function mainObjective() {
  if (state.ending) return 'The chronicle is complete.';
  if (!state.flags.prologueDone) return 'Speak with Elder Maro at the Hearthfall festival.';
  if (state.act >= 3) return 'The Hollow Citadel awaits. End the Ashen Crown.';
  if (state.keys < 3) {
    const parts = [];
    if (!state.flags.keyThorn) parts.push('the Emberkey of Thorn (Greenwood)');
    if (!state.flags.keyTide) parts.push('the Emberkey of Tide (Ashen Mire)');
    if (!state.flags.keyCinder) parts.push('the Emberkey of Cinder (Cinder Peaks)');
    return 'Recover ' + parts.join(', ') + '.';
  }
  return 'Return to Hearthfall, then ascend to the Hollow Citadel.';
}

// Convenience for the story layer
export function recruitOrQueue(id) {
  return joinCompanion(id);
}

export function setDifficulty(d) {
  if (DIFFICULTY[d]) state.settings.difficulty = d;
}

export const SAVE_SLOTS = { SAVE_KEY, AUTOSAVE_KEY };
