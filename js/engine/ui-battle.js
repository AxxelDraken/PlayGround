// ── Battle DOM interface ──────────────────────────────────────
import { state } from '../state.js';
import { SKILLS, STATUSES } from '../data/classes.js';
import { ITEMS } from '../data/items.js';
import { audio } from './audio.js';
import { drawFace, drawEnemyFace } from './art.js';
import { $, el, escapeHtml, toast } from './ui-core.js';

let B = null;
let pendingResolve = null;
let resultResolve = null;
let ticker = null;
let mode = 'idle';
let lastLogLen = -1;
let lastLogSig = '';
let partySig = '';

function dpr() { return Math.min(2, window.devicePixelRatio || 1); }
function unitOf(uid) {
  if (!B) return null;
  return B.allies.find((u) => u.uid === uid) || B.enemies.find((u) => u.uid === uid) || null;
}
function alive(list) { return (list || []).filter((u) => !u.dead); }

function faceCanvas(unit, size) {
  const d = dpr();
  const c = document.createElement('canvas');
  c.className = 'pc-face';
  c.width = size * d;
  c.height = size * d;
  c.style.width = size + 'px';
  c.style.height = size + 'px';
  c.style.borderRadius = unit.side === 'enemy' ? '50%' : '';
  if (unit.side === 'ally') drawFace(c, unit.member, d);
  else drawEnemyFace(c, unit.def, { dpr: d });
  return c;
}

export function showBattleUI(bs) {
  B = bs;
  mode = 'idle';
  pendingResolve = null;
  resultResolve = null;
  lastLogLen = -1;
  lastLogSig = '';
  partySig = '';
  $('#battleUI').classList.remove('hidden');
  $('#bt-result').classList.add('hidden');
  $('#bt-target').classList.add('hidden');
  $('#bt-actions').innerHTML = '';
  buildPartyCards();
  syncBattleUI();
  clearInterval(ticker);
  ticker = setInterval(() => { if (B?.active) syncBattleUI(); }, 240);
}

export function hideBattleUI() {
  clearInterval(ticker);
  ticker = null;
  $('#battleUI').classList.add('hidden');
  $('#bt-result').classList.add('hidden');
  $('#bt-target').classList.add('hidden');
  $('#bt-actions').innerHTML = '';
  B = null;
  pendingResolve = null;
  resultResolve = null;
}

export function requestPlayerAction(unit) {
  mode = 'main';
  $('#bt-target').classList.add('hidden');
  renderMainActions(unit);
  return new Promise((resolve) => { pendingResolve = resolve; });
}

function finishAction(action) {
  if (!pendingResolve) return;
  const resolve = pendingResolve;
  pendingResolve = null;
  mode = 'idle';
  $('#bt-actions').innerHTML = '';
  $('#bt-target').classList.add('hidden');
  if (B) B.targetUid = action?.targetUid || null;
  resolve(action);
}

function cancelAction() {
  const unit = B?.activeUid ? unitOf(B.activeUid) : null;
  if (!unit) return;
  mode = 'main';
  $('#bt-target').classList.add('hidden');
  if (B) B.targetUid = null;
  renderMainActions(unit);
}

function actionButton(icon, label, sub, cls, onClick, disabled = false) {
  const b = el('button', 'bt-action ' + (cls || ''));
  b.innerHTML = `<b><span>${icon}</span>${escapeHtml(label)}</b><small>${escapeHtml(sub)}</small>`;
  b.disabled = !!disabled;
  b.onclick = () => { if (!disabled) { audio.sfx('click'); onClick(); } };
  return b;
}

function renderMainActions(unit) {
  const box = $('#bt-actions');
  box.innerHTML = '';
  box.appendChild(actionButton('⚔', 'Attack', 'Strike one foe', 'attack', () => {
    pickTarget(unit, { type: 'attack' }, alive(B.enemies), 'Choose a foe');
  }));
  box.appendChild(actionButton('✦', 'Skills', 'Spend aether', '', () => renderSkillList(unit)));
  box.appendChild(actionButton('❖', 'Satchel', 'Use an item', '', () => renderItemList(unit)));
  box.appendChild(actionButton('⛨', 'Guard', 'Halve incoming damage', 'guard', () => finishAction({ type: 'guard' })));
  box.appendChild(actionButton('☾', 'Flee', B?.canFlee ? 'Escape the fight' : 'No escape', 'flee',
    () => finishAction({ type: 'flee' }), !B?.canFlee));
}

function renderSkillList(unit) {
  mode = 'skills';
  const box = $('#bt-actions');
  box.innerHTML = '';
  const learned = (unit.member?.learned || []).filter((id) => SKILLS[id] && !SKILLS[id].passive);
  for (const id of learned) {
    const sk = SKILLS[id];
    const cost = sk.mp || 0;
    const can = unit.mp >= cost;
    const b = el('button', 'bt-action' + (can ? '' : ' cancel'));
    b.disabled = !can;
    b.innerHTML = `<b><span>${sk.icon || '✦'}</span>${escapeHtml(sk.name)}<span class="ba-cost">${cost} MP</span></b><small>${escapeHtml(targetLabel(sk.target))}</small>`;
    b.onclick = () => {
      if (unit.mp < cost) { toast('Not enough MP.', '◈'); audio.sfx('error'); return; }
      audio.sfx('click');
      chooseSkillTarget(unit, id, sk);
    };
    box.appendChild(b);
  }
  if (!learned.length) {
    const empty = el('div', 'menu-empty', 'No active skills learned yet.');
    empty.style.gridColumn = '1 / -1';
    box.appendChild(empty);
  }
  box.appendChild(actionButton('‹', 'Back', 'Return to actions', 'cancel', cancelAction));
}

function chooseSkillTarget(unit, id, sk) {
  const base = { type: 'skill', skillId: id };
  if (sk.target === 'enemy') return pickTarget(unit, base, alive(B.enemies), 'Choose a foe');
  if (sk.target === 'ally') return pickTarget(unit, base, alive(B.allies), 'Choose an ally');
  if (sk.target === 'deadAlly') {
    const dead = B.allies.filter((u) => u.dead);
    if (!dead.length) { toast('No fallen ally to call back.', '☤'); audio.sfx('error'); return; }
    return pickTarget(unit, base, dead, 'Choose a fallen ally');
  }
  finishAction(base);
}

function renderItemList(unit) {
  mode = 'items';
  const box = $('#bt-actions');
  box.innerHTML = '';
  const entries = Object.entries(state.inventory).filter(([id, n]) => n > 0 && ITEMS[id]?.type === 'consumable');
  for (const [id, n] of entries) {
    const item = ITEMS[id];
    const b = el('button', 'bt-action');
    b.innerHTML = `<b><span>${item.icon || '❖'}</span>${escapeHtml(item.name)}<span class="ba-cost">×${n}</span></b><small>${escapeHtml(item.desc || '')}</small>`;
    b.onclick = () => {
      audio.sfx('click');
      if (item.target === 'ally') return pickTarget(unit, { type: 'item', itemId: id }, alive(B.allies), 'Use on an ally');
      if (item.target === 'deadAlly') {
        const dead = B.allies.filter((u) => u.dead);
        if (!dead.length) { toast('No fallen ally.', '☤'); audio.sfx('error'); return; }
        return pickTarget(unit, { type: 'item', itemId: id }, dead, 'Use on a fallen ally');
      }
      finishAction({ type: 'item', itemId: id });
    };
    box.appendChild(b);
  }
  if (!entries.length) {
    const empty = el('div', 'menu-empty', 'Your satchel is empty.');
    empty.style.gridColumn = '1 / -1';
    box.appendChild(empty);
  }
  box.appendChild(actionButton('‹', 'Back', 'Return to actions', 'cancel', cancelAction));
}

function targetLabel(target) {
  return ({
    enemy: 'One enemy', allEnemies: 'All enemies', ally: 'One ally', allAllies: 'All allies',
    self: 'Self', deadAlly: 'Fallen ally',
  })[target] || 'Target';
}

function pickTarget(unit, base, candidates, title) {
  if (!candidates.length) { toast('No valid target.', '·'); audio.sfx('error'); return; }
  mode = 'target';
  if (B) B.targetUid = candidates[0].uid;
  const box = $('#bt-target');
  box.innerHTML = '';
  const head = el('div', 'bt-target-title', escapeHtml(title));
  box.appendChild(head);
  for (const t of candidates) {
    const b = el('button', 'target-btn');
    b.appendChild(faceCanvas(t, 32));
    const mid = el('div', 'tb-mid');
    const weak = t.def?.weak || [];
    mid.innerHTML = `<div class="tb-name">${escapeHtml(t.name)} <span style="color:var(--ink-faint);font-size:9px">Lv ${t.level}</span></div>
      <div class="tb-hp"><i style="width:${t.side === 'enemy' ? t.hp / t.maxHp * 100 : (t.hp / t.maxHp * 100)}%"></i></div>
      ${t.side === 'enemy' && weak.length ? `<div class="tb-weak">Weak: ${weak.join(' · ')}</div>` : ''}`;
    b.appendChild(mid);
    b.onmouseenter = () => { if (B) B.targetUid = t.uid; };
    b.onclick = () => {
      audio.sfx('confirm');
      if (B) B.targetUid = t.uid;
      finishAction({ ...base, targetUid: t.uid });
    };
    box.appendChild(b);
  }
  const cancel = el('button', 'target-btn', '<span class="tb-mid" style="color:var(--ink-faint)">Cancel · go back</span>');
  cancel.onclick = () => { audio.sfx('cancel'); cancelAction(); };
  box.appendChild(cancel);
  box.classList.remove('hidden');
}

// ── drawing state ─────────────────────────────────────────────
function buildPartyCards() {
  if (!B) return;
  partySig = B.allies.map((u) => u.uid + ':' + u.level).join('|');
  const wrap = $('#bt-party');
  wrap.innerHTML = '';
  for (const u of B.allies) {
    const card = el('div', 'bt-card');
    card.dataset.uid = u.uid;
    card.appendChild(faceCanvas(u, 34));
    const mid = el('div', 'bc-mid');
    mid.innerHTML = `<div class="bc-top"><span class="bc-name">${escapeHtml(u.name)}</span><span class="bc-lv">L${u.level}</span><span class="bc-status"></span></div>
      <div class="bc-bars"><div class="bc-bar hp"><i></i></div><div class="bc-bar mp"><i></i></div></div>
      <div class="bc-num"></div>`;
    card.appendChild(mid);
    wrap.appendChild(card);
  }
  updatePartyCards();
}

function updatePartyCards() {
  if (!B) return;
  for (const card of document.querySelectorAll('#bt-party .bt-card')) {
    const u = unitOf(card.dataset.uid);
    if (!u) continue;
    card.classList.toggle('dead', u.dead);
    card.classList.toggle('active', B.activeUid === u.uid && !u.dead);
    const hp = card.querySelector('.bc-bar.hp i');
    const mp = card.querySelector('.bc-bar.mp i');
    if (hp) hp.style.width = Math.max(0, Math.min(100, u.hp / u.maxHp * 100)) + '%';
    if (mp) mp.style.width = Math.max(0, Math.min(100, u.mp / u.maxMp * 100)) + '%';
    const st = card.querySelector('.bc-status');
    if (st) st.textContent = u.statuses.map((s) => s.icon).join(' ') || '';
    const num = card.querySelector('.bc-num');
    if (num) num.textContent = `${Math.max(0, Math.round(u.hp))}/${u.maxHp} · ${Math.round(u.mp)} MP`;
  }
}

function renderTurnOrder() {
  const wrap = $('#turn-order');
  if (!B) return;
  const units = B.order.map(unitOf).filter(Boolean);
  const sig = units.map((u) => u.uid + (u.dead ? 'x' : '') ).join(',') + '#' + B.turnIndex;
  if (wrap.dataset.sig === sig) return;
  wrap.dataset.sig = sig;
  wrap.innerHTML = '';
  units.forEach((u, i) => {
    const chip = el('div', 'to-chip' + (u.side === 'enemy' ? ' enemy' : '') + (B.activeUid === u.uid ? ' active' : '') + (u.dead ? ' done' : ''));
    chip.appendChild(faceCanvas(u, 20));
    const name = el('span', 'to-name', escapeHtml(u.name.split(' ')[0]));
    chip.appendChild(name);
    wrap.appendChild(chip);
  });
}

function renderLog() {
  if (!B) return;
  const lines = B.log.slice(-6);
  const sig = B.log.length + ':' + (lines[lines.length - 1]?.text || '');
  if (sig === lastLogSig) return;
  lastLogSig = sig;
  const box = $('#bt-log');
  box.innerHTML = '';
  for (const line of lines) {
    const d = el('div', 'log-line ' + (line.tone || ''));
    d.innerHTML = line.text;
    box.appendChild(d);
  }
}

export function syncBattleUI() {
  if (!B) return;
  renderTurnOrder();
  updatePartyCards();
  renderLog();
  $('#bt-round').textContent = 'ROUND ' + (B.round || 1);
}

export function showBattleResult(result, bs = B) {
  B = bs || B;
  mode = 'result';
  $('#bt-actions').innerHTML = '';
  $('#bt-target').classList.add('hidden');
  const wrap = $('#bt-result');
  const card = el('div', 'bt-result-card');
  let title = 'VICTORY';
  let sub = 'THE ASH SETTLES';
  let body = '';
  if (result.defeat) {
    title = 'FALLEN';
    sub = 'THE FLAME REMEMBERS';
    body = `<div class="res-row"><span>Gold scattered</span><b>−${result.goldLost || 0} g</b></div>
      <div class="res-row"><span>Fallen</span><b>${escapeHtml((result.fallen || []).join(', ') || 'You')}</b></div>
      <p style="margin-top:10px">The crystal's warmth pulls you back. You wake at the last place the ember answered.</p>`;
    audio.sfx('defeat');
  } else if (result.fled) {
    title = 'ESCAPED';
    sub = 'LIVE TO FIGHT AGAIN';
    body = `<p>You slip away into the dark, breathing hard. The fight is not over — only postponed.</p>`;
  } else {
    body = `<div class="res-row"><span>Experience</span><b>+${result.xp || 0} XP</b></div>
      <div class="res-row"><span>Gold</span><b>+${result.gold || 0} g</b></div>
      <div class="res-row"><span>Spoils</span><b>${escapeHtml((result.drops || []).join(' · ') || 'None')}</b></div>`;
    if (result.levels?.length) {
      body += `<div class="res-level">${result.levels.map((l) => `${escapeHtml(l.name)} reached level ${l.level}`).join('<br>')}</div>`;
    }
    audio.sfx('victory');
  }
  card.innerHTML = `<h2>${title}</h2><div class="res-sub">${sub}</div><div class="bt-result-body">${body}</div>`;
  const btn = el('button', 'btn primary', result.defeat ? 'Rise Again' : result.fled ? 'Slip Away' : 'Continue');
  btn.onclick = () => {
    audio.sfx('confirm');
    wrap.classList.add('hidden');
    wrap.innerHTML = '';
    if (resultResolve) { const r = resultResolve; resultResolve = null; r(true); }
  };
  card.appendChild(btn);
  wrap.innerHTML = '';
  wrap.appendChild(card);
  wrap.classList.remove('hidden');
  return new Promise((resolve) => { resultResolve = resolve; });
}
