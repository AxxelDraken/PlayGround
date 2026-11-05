// ── Turn-based battle engine ───────────────────────────────────
import { state, statBlock, restoreParty, addXp, addItem, addGear, addGold, saveGame, DIFFICULTY } from './state.js';
import { SKILLS, STATUSES } from './data/classes.js';
import { ENEMIES, ENEMY_MOVES } from './data/enemies.js';
import { ITEMS } from './data/items.js';
import { audio } from './engine/audio.js';
import * as uiBattle from './engine/ui-battle.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const battleState = {
  active: false,
  zone: null,
  allies: [],
  enemies: [],
  order: [],
  round: 1,
  turnIndex: 0,
  boss: false,
  bossName: '',
  canFlee: true,
  log: [],
  effects: [],
  floaters: [],
  shakeUntil: 0,
  shakePower: 0,
  flashUntil: 0,
  flashColor: '#ffd9a8',
  activeUid: null,
  targetUid: null,
  phase: 'idle',
  result: null,
};

// ── unit helpers ───────────────────────────────────────────────
function makeAlly(member, index) {
  const st = statBlock(member);
  return {
    uid: 'a_' + member.id,
    side: 'ally',
    member,
    name: member.name,
    level: member.level,
    hp: Math.max(0, member.hp ?? st.maxHp),
    maxHp: st.maxHp,
    mp: member.mp ?? st.maxMp,
    maxMp: st.maxMp,
    stats: st,
    statuses: [],
    dead: (member.hp ?? st.maxHp) <= 0,
    guard: false,
    fx: {},
    seed: index * 3,
    usedRevive: false,
  };
}

function makeEnemy(entry, index) {
  const def = ENEMIES[entry.id];
  if (!def) return null;
  const lv = Math.max(1, entry.level || 1);
  const diff = DIFFICULTY[state.settings?.difficulty] || DIFFICULTY.balanced;
  const st = {};
  for (const k of ['hp', 'atk', 'def', 'mag', 'res', 'agi', 'luck']) {
    st[k] = (def.base[k] || 0) + (def.grow[k] || 0) * (lv - 1);
  }
  st.maxHp = Math.round(st.hp * diff.enemyHp);
  st.maxMp = 999;
  st.crit = .04 + (st.luck || 0) * .004;
  st.evade = Math.min(.2, (st.agi || 0) * .0015);
  st.eleRes = {};
  st.lifesteal = 0;
  st.counter = 0;
  st.mpRegen = 0;
  return {
    uid: 'e_' + index,
    side: 'enemy',
    def,
    enemyId: entry.id,
    name: def.name,
    level: lv,
    hp: st.maxHp,
    maxHp: st.maxHp,
    mp: 999,
    maxMp: 999,
    stats: st,
    statuses: [],
    dead: false,
    guard: false,
    fx: {},
    seed: index * 7 + 2,
    enraged: false,
  };
}

export function unitByUid(uid) {
  return battleState.allies.find((u) => u.uid === uid) || battleState.enemies.find((u) => u.uid === uid) || null;
}
const living = (arr) => arr.filter((u) => !u.dead);
const opponents = (unit) => (unit.side === 'ally' ? battleState.enemies : battleState.allies);
const friends = (unit) => (unit.side === 'ally' ? battleState.allies : battleState.enemies);

function hasStatus(unit, id) {
  return unit.statuses.some((s) => s.id === id);
}
function statusValue(unit, id) {
  return unit.statuses.filter((s) => s.id === id).reduce((a, s) => a + (s.value || 0), 0);
}
function addStatus(unit, id, turns = 3, extra = {}) {
  if (!unit || unit.dead || !STATUSES[id]) return;
  const meta = STATUSES[id];
  const existing = unit.statuses.find((s) => s.id === id);
  if (existing) {
    existing.turns = Math.max(existing.turns, turns);
    if (extra.value != null) existing.value = Math.max(existing.value || 0, extra.value);
    return;
  }
  unit.statuses.push({ id, name: meta.name, icon: meta.icon, tone: meta.tone, turns, ...extra });
}
function removeStatus(unit, id) {
  unit.statuses = unit.statuses.filter((s) => s.id !== id);
}
function cleanseNegative(unit) {
  unit.statuses = unit.statuses.filter((s) => s.tone !== 'bad');
}

// effective stats after buffs / debuffs
function liveStat(unit, key) {
  let v = unit.stats[key] || 0;
  if (key === 'atk') {
    if (hasStatus(unit, 'atkUp')) v *= 1.3;
    if (hasStatus(unit, 'weaken')) v *= .75;
  } else if (key === 'mag') {
    if (hasStatus(unit, 'magUp')) v *= 1.3;
  } else if (key === 'def') {
    if (hasStatus(unit, 'defUp')) v *= 1.3;
    if (hasStatus(unit, 'defDown')) v *= .7;
  } else if (key === 'res') {
    if (hasStatus(unit, 'resUp')) v *= 1.3;
    if (hasStatus(unit, 'resDown')) v *= .7;
  } else if (key === 'agi') {
    if (hasStatus(unit, 'agiUp')) v *= 1.35;
    if (hasStatus(unit, 'chill')) v *= .75;
  }
  return v;
}

// ── visual feedback ────────────────────────────────────────────
function pushLog(text, tone = '') {
  battleState.log.push({ text, tone, at: now() });
  if (battleState.log.length > 40) battleState.log.shift();
}
function floater(unit, text, color = '#f0e3cf', big = false) {
  if (!unit) return;
  battleState.floaters.push({
    uid: unit.uid, text, color, big, born: now(), dur: 1150,
    dx: rnd(-8, 8), vx: rnd(-10, 10),
  });
}
function effect(unit, kind, dur = 620) {
  battleState.effects.push({ uid: unit?.uid, kind, born: now(), dur });
}
function shake(power = 7) {
  battleState.shakePower = power;
  battleState.shakeUntil = now() + 260;
}
function flash(color = '#ffd9a8') {
  battleState.flashColor = color;
  battleState.flashUntil = now() + 180;
}
function fxFor(element, kind) {
  if (kind === 'heal') return 'heal';
  if (kind === 'buff') return 'buff';
  if (kind === 'revive') return 'heal';
  if (element === 'fire') return 'fire';
  if (element === 'frost') return 'frost';
  if (element === 'storm') return 'storm';
  if (element === 'nature' || element === 'earth') return 'nature';
  if (element === 'shadow') return 'shadow';
  return 'slash';
}
function sfxFor(element, kind) {
  if (kind === 'heal' || kind === 'revive') return 'heal';
  if (kind === 'buff') return 'guard';
  if (element === 'fire') return 'fire';
  if (element === 'frost') return 'ice';
  if (element === 'storm') return 'thunder';
  if (element === 'shadow') return 'magic';
  return 'hit';
}
function prune() {
  const t = now();
  battleState.effects = battleState.effects.filter((e) => t - e.born < e.dur + 200);
  battleState.floaters = battleState.floaters.filter((f) => t - f.born < f.dur + 200);
}
function syncMembers() {
  for (const u of battleState.allies) {
    u.member.hp = Math.max(0, Math.round(u.hp));
    u.member.mp = Math.max(0, Math.round(u.mp));
  }
}

// ── damage ─────────────────────────────────────────────────────
function elementMod(attacker, target, element) {
  let mod = 1;
  if (!element || element === 'phys') return mod;
  if (target.def?.weak?.includes(element)) mod *= 1.35;
  if (target.def?.resist?.includes(element)) mod *= .7;
  const res = target.stats?.eleRes?.[element] || 0;
  mod *= (1 - res);
  if (attacker.stats?.stormBoost && element === 'storm') mod *= (1 + attacker.stats.stormBoost);
  return mod;
}

function calcDamage(attacker, target, opts) {
  const kind = opts.kind === 'mag' ? 'mag' : 'phys';
  const power = opts.power ?? 1;
  const pierce = opts.pierce || 0;
  let base = (kind === 'mag' ? liveStat(attacker, 'mag') : liveStat(attacker, 'atk')) * power;
  const defense = kind === 'mag' ? liveStat(target, 'res') : liveStat(target, 'def');
  base -= defense * (kind === 'mag' ? .35 : .42) * (1 - pierce);
  base *= rnd(.9, 1.1);
  base *= elementMod(attacker, target, opts.element);
  if (hasStatus(target, 'mark')) base *= 1.25;
  if (target.guard) base *= .55;
  if (opts.execute && target.hp / target.maxHp < .35) base *= 2;
  const critChance = Math.min(.75, (attacker.stats?.crit || 0) + (opts.critBonus || 0));
  const crit = Math.random() < critChance;
  if (crit) base *= 1.7;
  return { dmg: Math.max(1, Math.round(base)), crit };
}

function applyDamage(source, target, amount, opts = {}) {
  if (!target || target.dead) return 0;
  let dmg = Math.max(0, Math.round(amount));
  // Aegis shields absorb first
  const shield = target.statuses.find((s) => s.id === 'shield' && (s.value || 0) > 0);
  if (shield) {
    const absorbed = Math.min(shield.value, dmg);
    shield.value -= absorbed;
    dmg -= absorbed;
    if (absorbed > 0) floater(target, `⛨ ${absorbed}`, '#8fd8c8');
    if (shield.value <= 0) removeStatus(target, 'shield');
  }
  target.fx.hitAt = now();
  if (dmg <= 0) return 0;
  target.hp = Math.max(0, target.hp - dmg);
  floater(target, `-${dmg}`, opts.crit ? '#ffd27a' : '#ff8f78', opts.crit);
  if (opts.crit) {
    audio.sfx('crit');
    shake(9);
    flash('#ffd9a8');
  } else {
    audio.sfx('hit');
  }
  // lifesteal
  const steal = source?.stats?.lifesteal || 0;
  if (steal > 0 && source && !source.dead) {
    const heal = Math.max(1, Math.round(dmg * steal));
    source.hp = Math.min(source.maxHp, source.hp + heal);
    floater(source, `+${heal}`, '#9fe0a8');
  }
  if (target.hp <= 0) killUnit(target);
  return dmg;
}

function killUnit(unit) {
  if (unit.dead) return;
  unit.dead = true;
  unit.deadAt = now();
  unit.statuses = [];
  unit.guard = false;
  pushLog(`<b>${unit.name}</b> falls.`, 'dmg');
  audio.sfx('defeat');
}

// ── battle setup ───────────────────────────────────────────────
export async function startBattle({ zone, enemies = [], boss = false, bossName = null, canFlee = true } = {}) {
  if (battleState.active) return { victory: false, busy: true };
  battleState.active = true;
  battleState.zone = zone || { id: 'emberfield', name: 'Emberfield', ambient: 'plains' };
  battleState.boss = !!boss;
  battleState.bossName = bossName || (boss ? 'CALAMITY' : '');
  battleState.canFlee = canFlee && !boss;
  battleState.log = [];
  battleState.effects = [];
  battleState.floaters = [];
  battleState.round = 1;
  battleState.turnIndex = 0;
  battleState.activeUid = null;
  battleState.targetUid = null;
  battleState.result = null;
  battleState.phase = 'start';
  battleState.shakeUntil = 0;
  battleState.flashUntil = 0;
  battleState.allies = state.party.map((m, i) => makeAlly(m, i));
  battleState.enemies = enemies.map((e, i) => makeEnemy(e, i)).filter(Boolean);
  battleState.order = [];
  syncMembers();
  uiBattle.showBattleUI(battleState);
  audio.setScene(boss ? 'boss' : 'battle');
  if (boss) audio.sfx('magic');
  if (boss && battleState.bossName) pushLog(`<b>${battleState.bossName}</b> bars the way.`, 'dmg');
  uiBattle.syncBattleUI();
  await sleep(boss ? 650 : 420);
  const result = await runBattleLoop();
  return result;
}

async function runBattleLoop() {
  while (battleState.active) {
    buildOrder();
    battleState.round = battleState.round || 1;
    uiBattle.syncBattleUI();
    for (let qi = 0; qi < battleState.order.length; qi++) {
      if (battleState.result) break;
      const unit = unitByUid(battleState.order[qi]);
      if (!unit || unit.dead) continue;
      battleState.turnIndex = qi;
      battleState.activeUid = unit.uid;
      battleState.targetUid = null;
      battleState.phase = 'turn';
      uiBattle.syncBattleUI();
      const canAct = await beginTurn(unit);
      if (battleState.result) break;
      if (canAct && !unit.dead) {
        if (unit.side === 'ally') {
          battleState.phase = 'select';
          uiBattle.syncBattleUI();
          const action = await uiBattle.requestPlayerAction(unit);
          await executeAction(unit, action);
        } else {
          battleState.phase = 'enemy';
          uiBattle.syncBattleUI();
          await sleep(420);
          const action = chooseEnemyAction(unit);
          await executeAction(unit, action);
        }
      }
      if (battleState.result) break;
      await endOfTurn(unit);
      prune();
      syncMembers();
      checkEnd();
      uiBattle.syncBattleUI();
      await sleep(240);
      if (battleState.result) break;
    }
    if (battleState.result) break;
    battleState.round++;
    if (battleState.round > 99) {
      battleState.result = { defeat: true, respawn: true };
      break;
    }
  }
  return finishBattle(battleState.result);
}

function buildOrder() {
  const alive = [...battleState.allies, ...battleState.enemies].filter((u) => !u.dead);
  for (const u of alive) u.initiative = liveStat(u, 'agi') * rnd(.88, 1.14);
  alive.sort((a, b) => b.initiative - a.initiative);
  battleState.order = alive.map((u) => u.uid);
  battleState.turnIndex = -1;
}

async function beginTurn(unit) {
  unit.guard = false;
  if (hasStatus(unit, 'stun')) {
    removeStatus(unit, 'stun');
    pushLog(`<b>${unit.name}</b> is stunned and loses the turn.`);
    floater(unit, 'STUNNED', '#b79bea');
    await sleep(420);
    return false;
  }
  if (unit.stats?.mpRegen > 0 && !unit.dead) {
    const before = unit.mp;
    unit.mp = Math.min(unit.maxMp, unit.mp + unit.stats.mpRegen);
    if (unit.mp > before) floater(unit, `+${unit.mp - before} MP`, '#8fc4ee');
  }
  return true;
}

async function endOfTurn(unit) {
  if (!unit || unit.dead) return;
  const maxHp = unit.maxHp;
  if (hasStatus(unit, 'burn')) {
    const dmg = Math.max(2, Math.round(maxHp * .06));
    applyDamage(null, unit, dmg, { noCounter: true });
    pushLog(`<b>${unit.name}</b> burns for ${dmg}.`, 'dmg');
    effect(unit, 'fire', 460);
  }
  if (unit.dead) return;
  if (hasStatus(unit, 'poison')) {
    const dmg = Math.max(2, Math.round(maxHp * .05));
    applyDamage(null, unit, dmg, { noCounter: true });
    pushLog(`<b>${unit.name}</b> suffers poison for ${dmg}.`, 'dmg');
    effect(unit, 'nature', 460);
  }
  if (unit.dead) return;
  if (hasStatus(unit, 'regen')) {
    const heal = Math.max(4, Math.round(unit.stats.mag * .75 + 8));
    unit.hp = Math.min(maxHp, unit.hp + heal);
    floater(unit, `+${heal}`, '#9fe0a8');
    effect(unit, 'heal', 420);
  }
  for (const st of unit.statuses) st.turns--;
  const expired = unit.statuses.filter((s) => s.turns <= 0);
  unit.statuses = unit.statuses.filter((s) => s.turns > 0);
  if (expired.length) {
    const names = expired.map((s) => s.name).join(', ');
    pushLog(`<b>${unit.name}</b>: ${names} fades.`, 'good');
  }
  // boss phase
  if (unit.def?.boss && !unit.enraged && unit.hp / unit.maxHp < .55) {
    unit.enraged = true;
    unit.stats.atk *= 1.16;
    unit.stats.mag *= 1.16;
    pushLog(`<b>${unit.name}</b> is undone by fury. Its power rises!`, 'dmg');
    floater(unit, 'ENRAGED', '#ff9a6a', true);
    effect(unit, 'shadow', 800);
    shake(10);
  }
}

// ── enemy AI ───────────────────────────────────────────────────
function chooseEnemyAction(unit) {
  const moves = (unit.def.moves || []).map((id) => {
    const sk = SKILLS[id] || ENEMY_MOVES[id];
    return sk ? { id, ...sk } : null;
  }).filter(Boolean);
  const foes = living(opponents(unit));
  const hurt = unit.hp / unit.maxHp;
  const heals = moves.filter((m) => m.kind === 'heal' && (m.target === 'self' || m.target === 'ally' || m.target === 'allAllies'));
  if (hurt < .38 && heals.length && Math.random() < .7) {
    return { type: 'skill', skillId: heals[0].id, targetUid: unit.uid };
  }
  const buffs = moves.filter((m) => m.kind === 'buff' && m.target !== 'enemy');
  if (buffs.length && Math.random() < .18) {
    return { type: 'skill', skillId: pick(buffs).id, targetUid: unit.uid };
  }
  const attacks = moves.filter((m) => m.kind === 'phys' || m.kind === 'mag' || m.kind === 'buff');
  let target = pick(foes);
  const taunters = foes.filter((f) => hasStatus(f, 'taunt'));
  if (taunters.length && Math.random() < .72) target = pick(taunters);
  if (!target) return { type: 'attack', targetUid: null };
  if (attacks.length && Math.random() < .68) {
    const move = pick(attacks);
    return { type: 'skill', skillId: move.id, targetUid: target.uid };
  }
  return { type: 'attack', targetUid: target.uid };
}

// ── action execution ───────────────────────────────────────────
async function executeAction(unit, action) {
  if (!action || unit.dead || battleState.result) return;
  battleState.targetUid = action.targetUid || null;
  uiBattle.syncBattleUI();
  if (action.type === 'guard') {
    unit.guard = true;
    addStatus(unit, 'defUp', 2);
    pushLog(`<b>${unit.name}</b> raises a guard.`, 'good');
    floater(unit, 'GUARD', '#78d5c0');
    effect(unit, 'buff', 440);
    audio.sfx('guard');
    await sleep(360);
    return;
  }
  if (action.type === 'flee') {
    await attemptFlee(unit);
    return;
  }
  if (action.type === 'item') {
    await useItem(unit, action);
    await sleep(280);
    return;
  }
  if (action.type === 'skill') {
    const sk = SKILLS[action.skillId] || ENEMY_MOVES[action.skillId];
    if (!sk || sk.passive) { await basicAttack(unit, action.targetUid); return; }
    const cost = sk.mp || 0;
    if (unit.side === 'ally' && unit.mp < cost) {
      pushLog(`<b>${unit.name}</b> lacks the aether for ${sk.name}.`, 'dmg');
      audio.sfx('error');
      await sleep(320);
      return;
    }
    if (cost) unit.mp = Math.max(0, unit.mp - cost);
    await useSkill(unit, { ...sk, id: action.skillId }, action.targetUid);
    await sleep(320);
    return;
  }
  await basicAttack(unit, action.targetUid);
  await sleep(240);
}

async function basicAttack(unit, targetUid) {
  let target = targetUid ? unitByUid(targetUid) : null;
  if (!target || target.dead) target = pick(living(opponents(unit)));
  if (!target) return;
  unit.fx.lungeAt = now();
  unit.fx.lungeDir = unit.side === 'ally' ? 1 : -1;
  pushLog(`<b>${unit.name}</b> strikes <b>${target.name}</b>.`);
  audio.sfx('hit');
  // evade
  const evade = Math.min(.4, (target.stats?.evade || 0) + (hasStatus(target, 'evade') ? .45 : 0));
  if (Math.random() < evade) {
    floater(target, 'MISS', '#b8b0a0');
    pushLog(`<b>${target.name}</b> slips aside.`, 'good');
    audio.sfx('miss');
    unit.fx.lungeAt = 0;
    return;
  }
  const { dmg, crit } = calcDamage(unit, target, { kind: 'phys', power: 1 });
  const dealt = applyDamage(unit, target, dmg, { crit });
  if (dealt > 0 && target.side === 'ally' && !target.dead && Math.random() < (target.stats.counter || 0)) {
    pushLog(`<b>${target.name}</b> answers the blow.`, 'good');
    floater(target, 'COUNTER', '#78d5c0');
    const c = calcDamage(target, unit, { kind: 'phys', power: .7 });
    await sleep(140);
    applyDamage(target, unit, c.dmg, { crit: c.crit });
  }
}

async function useSkill(unit, sk, targetUid) {
  const kind = sk.kind || 'phys';
  const element = sk.element || 'phys';
  const good = kind === 'heal' || kind === 'revive' || kind === 'buff' || kind === 'cleanse';
  pushLog(`<b>${unit.name}</b> uses <b>${sk.name}</b>.`, good ? 'good' : '');
  const fx = fxFor(element, kind);
  audio.sfx(sfxFor(element, kind));
  if (!good) flash(element === 'fire' ? '#ffb066' : element === 'storm' ? '#bfe0ff' : element === 'frost' ? '#d6f2ff' : '#ffe0bc');
  const friendsList = living(friends(unit));
  const foeList = living(opponents(unit));
  const enemiesOfUnit = opponents(unit);

  let targets = [];
  const explicit = targetUid ? unitByUid(targetUid) : null;
  switch (sk.target) {
    case 'self': targets = [unit]; break;
    case 'allAllies': targets = friendsList; break;
    case 'allEnemies': targets = foeList; break;
    case 'deadAlly': {
      const dead = friends(unit).filter((u) => u.dead);
      targets = explicit && explicit.dead ? [explicit] : (dead[0] ? [dead[0]] : []);
      break;
    }
    case 'ally': {
      const pool = kind === 'heal' ? friendsList : friendsList;
      targets = explicit && !explicit.dead && explicit.side === unit.side ? [explicit] : [pool[0] || unit];
      break;
    }
    case 'enemy':
    default: {
      let t = explicit && !explicit.dead && explicit.side !== unit.side ? explicit : null;
      if (!t) t = pick(foeList);
      targets = t ? [t] : [];
      break;
    }
  }
  if (sk.target === 'deadAlly' && !targets.length) {
    pushLog('No fallen ally answers the call.', 'dmg');
    return;
  }

  if (kind === 'heal') {
    const amount = Math.round(liveStat(unit, 'mag') * (sk.power || 1) * 1.65 + 10);
    for (const t of targets) {
      if (!t || t.dead) continue;
      const before = t.hp;
      t.hp = Math.min(t.maxHp, t.hp + amount);
      effect(t, 'heal', 620);
      floater(t, `+${t.hp - before}`, '#9fe0a8');
      pushLog(`<b>${t.name}</b> recovers ${t.hp - before} HP.`, 'heal');
    }
    return;
  }
  if (kind === 'revive') {
    for (const t of targets) {
      if (!t || !t.dead) continue;
      t.dead = false;
      t.deadAt = 0;
      t.hp = Math.max(1, Math.round(t.maxHp * (sk.power || .5)));
      t.statuses = [];
      effect(t, 'heal', 900);
      floater(t, 'REVIVED', '#8fe0c0', true);
      pushLog(`<b>${t.name}</b> returns to the fight.`, 'heal');
      audio.sfx('levelup');
    }
    return;
  }
  if (kind === 'cleanse') {
    for (const t of targets) {
      if (!t) continue;
      cleanseNegative(t);
      effect(t, 'heal', 500);
      floater(t, 'CLEANSED', '#8fd8c8');
      pushLog(`<b>${t.name}</b> is cleansed.`, 'good');
    }
    return;
  }
  if (kind === 'buff') {
    const statuses = sk.statuses || [];
    if (sk.target === 'enemy' || sk.target === 'allEnemies') {
      const list = sk.target === 'allEnemies' ? foeList : (targets.length ? targets : [pick(foeList)]).filter(Boolean);
      for (const t of list) {
        if (!t || t.dead) continue;
        for (const st of statuses) addStatus(t, st.id, st.turns, { value: st.value });
        effect(t, 'shadow', 520);
        floater(t, statuses.map((s) => STATUSES[s.id]?.icon || '✦').join(' '), '#b79bea');
        pushLog(`<b>${t.name}</b> is marked.`, 'good');
      }
      return;
    }
    for (const t of targets) {
      if (!t || t.dead) continue;
      for (const st of statuses) addStatus(t, st.id, st.turns, { value: st.value });
      effect(t, 'buff', 620);
      floater(t, statuses.map((s) => STATUSES[s.id]?.icon || '✦').join(' '), '#78d5c0');
      pushLog(`<b>${t.name}</b> is empowered.`, 'good');
    }
    return;
  }

  // physical / magical damage
  const hits = sk.hits || 1;
  const strike = async (target) => {
    if (!target || target.dead) return;
    const evade = Math.min(.38, (target.stats?.evade || 0));
    if (Math.random() < evade) {
      floater(target, 'MISS', '#b8b0a0');
      audio.sfx('miss');
      return;
    }
    const { dmg, crit } = calcDamage(unit, target, {
      kind, power: sk.power || 1, element, pierce: sk.pierce || 0,
      critBonus: sk.critBonus || 0, execute: sk.execute,
    });
    effect(target, fx, 620);
    const dealt = applyDamage(unit, target, dmg, { crit });
    if (sk.drain && dealt > 0) {
      const heal = Math.round(dealt * sk.drain);
      unit.hp = Math.min(unit.maxHp, unit.hp + heal);
      floater(unit, `+${heal}`, '#9fe0a8');
    }
    if (sk.status && !target.dead && Math.random() < (sk.status.chance || .3)) {
      addStatus(target, sk.status.id, sk.status.turns || 3);
      pushLog(`<b>${target.name}</b> is ${STATUSES[sk.status.id]?.name || 'afflicted'}.`, 'good');
    }
  };
  if (sk.randomHits) {
    for (let h = 0; h < hits; h++) {
      const pool = living(enemiesOfUnit);
      if (!pool.length) break;
      await strike(pick(pool));
      await sleep(100);
    }
  } else {
    for (const t of targets) {
      for (let h = 0; h < hits; h++) {
        if (!t || t.dead) break;
        await strike(t);
        await sleep(hits > 1 ? 110 : 60);
      }
    }
  }
  if (targets.some((t) => t?.def?.boss)) shake(8);
}

async function useItem(unit, action) {
  const item = ITEMS[action.itemId];
  if (!item || (state.inventory[action.itemId] || 0) <= 0) {
    pushLog('The satchel is empty.', 'dmg');
    return;
  }
  state.inventory[action.itemId]--;
  if (state.inventory[action.itemId] <= 0) delete state.inventory[action.itemId];
  pushLog(`<b>${unit.name}</b> uses <b>${item.name}</b>.`, 'good');
  if (item.flee) {
    await attemptFlee(unit, .9);
    if (!battleState.result) pushLog('The smoke thins. There is no way out.', 'dmg');
    return;
  }
  if (item.bomb) {
    for (const t of living(battleState.enemies)) {
      effect(t, 'fire', 700);
      const dmg = Math.round((item.power || 70) * elementMod(unit, t, item.element));
      applyDamage(unit, t, dmg, {});
      await sleep(90);
    }
    flash('#ffb066');
    return;
  }
  const targetUid = action.targetUid;
  let target = targetUid ? unitByUid(targetUid) : null;
  if (item.target === 'deadAlly') {
    const dead = battleState.allies.filter((u) => u.dead);
    target = target && target.dead ? target : dead[0];
    if (target) {
      target.dead = false;
      target.hp = Math.max(1, Math.round(target.maxHp * (item.revive || .45)));
      target.statuses = [];
      effect(target, 'heal', 800);
      floater(target, 'REVIVED', '#8fe0c0', true);
      pushLog(`<b>${target.name}</b> returns to the fight.`, 'heal');
    }
    return;
  }
  if (!target || target.dead) target = item.target === 'self' ? unit : battleState.allies.filter((u) => !u.dead)[0];
  if (!target) return;
  if (item.cleanse) {
    cleanseNegative(target);
    effect(target, 'heal', 460);
    floater(target, 'CLEANSED', '#8fd8c8');
  }
  if (item.heal) {
    const before = target.hp;
    target.hp = Math.min(target.maxHp, target.hp + item.heal);
    effect(target, 'heal', 620);
    floater(target, `+${target.hp - before}`, '#9fe0a8');
  }
  if (item.mp) {
    const before = target.mp;
    target.mp = Math.min(target.maxMp, target.mp + item.mp);
    floater(target, `+${target.mp - before} MP`, '#8fc4ee');
  }
  audio.sfx('heal');
}

async function attemptFlee(unit, bonus = 0) {
  if (!battleState.canFlee) {
    pushLog('There is no escape from this fight.', 'dmg');
    audio.sfx('error');
    return;
  }
  const avgAgi = battleState.enemies.reduce((a, e) => a + liveStat(e, 'agi'), 0) / Math.max(1, battleState.enemies.length);
  const chance = Math.max(.28, Math.min(.92, .46 + bonus + (liveStat(unit, 'agi') - avgAgi) * .008));
  if (Math.random() < chance) {
    pushLog('You break away into the dark.', 'good');
    battleState.result = { fled: true };
  } else {
    pushLog('The way is blocked. You must fight.', 'dmg');
    audio.sfx('error');
  }
}

// ── ending & rewards ──────────────────────────────────────────
function checkEnd() {
  if (battleState.result) return;
  if (battleState.enemies.every((e) => e.dead)) battleState.result = { victory: true };
  else if (battleState.allies.every((a) => a.dead)) battleState.result = { defeat: true, respawn: true };
}

async function finishBattle(raw) {
  battleState.phase = 'end';
  const diff = DIFFICULTY[state.settings?.difficulty] || DIFFICULTY.balanced;
  let result = raw || { victory: false };
  if (result.victory) {
    let xp = 0, gold = 0;
    const drops = [];
    for (const e of battleState.enemies) {
      const def = e.def;
      xp += Math.round((def.xp || 10) * (1 + (e.level - 1) * .17) * diff.xp);
      gold += Math.round((def.gold || 5) * (1 + (e.level - 1) * .12));
      if (def.drop && !def.noDrop) {
        const chance = def.boss ? 1 : (def.drop.chance || .1);
        if (Math.random() < chance) {
          const item = ITEMS[def.drop.item];
          if (item?.type === 'gear') addGear(def.drop.item);
          else addItem(def.drop.item, 1);
          drops.push(item?.name || def.drop.item);
        }
      }
    }
    addGold(gold);
    const levels = [];
    for (const m of state.party) {
      const gained = addXp(m, xp);
      if (gained.length) levels.push({ name: m.name, level: m.level });
    }
    if (state.quests?.bounty?.status === 'active' && battleState.zone?.id === 'emberfield') {
      state.quests.bounty.kills += battleState.enemies.length;
      pushLog(`Bounty tally: ${state.quests.bounty.kills} / 6.`, 'good');
    }
    syncMembers();
    result = { ...result, xp, gold, drops, levels };
    pushLog('Victory. The ash settles.', 'good');
    battleState.result = result;
    audio.sfx('victory');
    if (levels.length) setTimeout(() => audio.sfx('levelup'), 380);
    saveGame(true);
  } else if (result.defeat) {
    audio.sfx('defeat');
    const lost = Math.floor((state.gold || 0) * .1);
    state.gold = Math.max(0, (state.gold || 0) - lost);
    const fallen = battleState.allies.filter((a) => a.dead).map((a) => a.name);
    restoreParty(true);
    syncMembers();
    result = { ...result, goldLost: lost, fallen };
    battleState.result = result;
    saveGame(true);
  } else if (result.fled) {
    result = { ...result, victory: false, fled: true };
    battleState.result = result;
    syncMembers();
  }
  uiBattle.syncBattleUI();
  await uiBattle.showBattleResult(result, battleState);
  battleState.active = false;
  battleState.phase = 'idle';
  battleState.activeUid = null;
  battleState.targetUid = null;
  uiBattle.hideBattleUI();
  audio.setScene(sceneForZone(battleState.zone));
  saveGame(true);
  return result;
}

export function sceneForZone(zone) {
  const a = zone?.ambient;
  if (a === 'forest') return 'forest';
  if (a === 'mire') return 'mire';
  if (a === 'peaks') return 'peaks';
  if (a === 'citadel') return 'citadel';
  return 'explore';
}
