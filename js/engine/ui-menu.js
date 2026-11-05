// ── Chronicle menu: status, skills, satchel, party, quests, map, system ──
import {
  state, statBlock, mainObjective, learnNode, availableNodes, equipGear, unequip,
  addGold, removeItem, saveGame, restoreParty, DIFFICULTY, setDifficulty, xpNeed,
} from '../state.js';
import { CLASSES, SKILLS, ORIGINS } from '../data/classes.js';
import { ITEMS, SELL_RATE } from '../data/items.js';
import { ZONES } from '../data/zones.js';
import { audio } from './audio.js';
import { drawFace, drawClassArt } from './art.js';
import { drawWorldMap } from './title-render.js';
import { $, el, escapeHtml, toast, modal, confirm, formatTime } from './ui-core.js';
import { hooks } from '../hooks.js';

let activeTab = 'status';
let selectedId = 'hero';
let gearPick = null;
let selectedNode = null;
let selectedItem = null;
let equipPickFor = null;
let cursor = 0;

const memberOf = (id = selectedId) => state.party.find((m) => m.id === id) || state.party[0];
const TAB_HEADINGS = {
  status: 'Journal', skills: 'Skill Trees', items: 'Satchel', party: 'The Party',
  quests: 'Quests', map: 'World', system: 'System',
};

function paintFaces(root) {
  const d = Math.min(2, window.devicePixelRatio || 1);
  root.querySelectorAll('canvas[data-face]').forEach((c) => {
    const m = state.party.find((x) => x.id === c.dataset.face);
    if (!m) return;
    c.width = 30 * d; c.height = 30 * d;
    drawFace(c, m, d);
  });
}

function charTabs() {
  return `<div class="char-select">${state.party.map((m) => {
    const st = statBlock(m);
    return `<button class="char-tab ${m.id === selectedId ? 'on' : ''}" data-char="${m.id}">
      <canvas class="ct-face" data-face="${m.id}" width="22" height="22"></canvas>
      <span>${escapeHtml(m.name)}</span><small style="color:var(--ink-faint)">L${m.level}${m.hp < st.maxHp * .3 ? ' · hurt' : ''}</small>
    </button>`;
  }).join('')}</div>`;
}

function bindCharTabs(root) {
  root.querySelectorAll('[data-char]').forEach((b) => {
    b.onclick = () => {
      selectedId = b.dataset.char;
      selectedNode = null;
      gearPick = null;
      equipPickFor = null;
      audio.sfx('click');
      renderTab(activeTab);
    };
  });
  paintFaces(root);
}

export function initMenu() {
  $('#btn-menu-close').onclick = () => { audio.sfx('cancel'); closeMenu(); };
  $('#menu-tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (!b) return;
    audio.sfx('click');
    activeTab = b.dataset.tab;
    gearPick = null;
    selectedNode = null;
    equipPickFor = null;
    renderTab(activeTab);
  });
  $('#menu').addEventListener('click', (e) => {
    if (e.target.id === 'menu') closeMenu();
  });
  document.addEventListener('keydown', (e) => {
    if ($('#menu').classList.contains('hidden')) return;
    if (e.key === 'Escape') { e.preventDefault(); closeMenu(); }
  });
}

export function openMenu(tab = 'status') {
  if (tab) activeTab = tab;
  selectedId = state.party.some((m) => m.id === selectedId) ? selectedId : (state.party[0]?.id || 'hero');
  gearPick = null;
  selectedNode = null;
  equipPickFor = null;
  $('#menu').classList.remove('hidden');
  hooks.setPaused?.(true);
  renderTab(activeTab);
  audio.sfx('page');
}

export function closeMenu() {
  $('#menu').classList.add('hidden');
  hooks.setPaused?.(false);
  saveGame(true);
}

function renderTab(tab) {
  activeTab = tab;
  $('#menu-heading').textContent = TAB_HEADINGS[tab] || 'Journal';
  $('#menu-gold').innerHTML = `${state.gold} <i>g</i>`;
  $('#menu-sp').textContent = `Act ${state.act || 1} · ${state.chapter || 'Prologue'}`;
  document.querySelectorAll('#menu-tabs [data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
  const box = $('#menu-content');
  box.scrollTop = 0;
  if (tab === 'status') renderStatus(box);
  else if (tab === 'skills') renderSkills(box);
  else if (tab === 'items') renderItems(box);
  else if (tab === 'party') renderParty(box);
  else if (tab === 'quests') renderQuests(box);
  else if (tab === 'map') renderMap(box);
  else renderSystem(box);
}

// ── status ────────────────────────────────────────────────────
function renderStatus(box) {
  const m = memberOf();
  if (!m) { box.innerHTML = '<div class="menu-empty">No chronicle open.</div>'; return; }
  const st = statBlock(m);
  const cls = CLASSES[m.classId];
  const origin = ORIGINS[m.origin || state.heroOrigin];
  const xp = m.id === 'hero' ? m.xp : m.xp;
  const need = xpNeed(m.level);
  box.innerHTML = `
    ${charTabs()}
    <div class="status-top">
      <div class="char-hero">
        <div class="char-portrait"><canvas id="menu-portrait" width="264" height="264" style="width:100%;height:100%"></canvas></div>
        <div class="ch-name">${escapeHtml(m.name)}</div>
        <div class="ch-meta">${cls.name} · ${cls.role}</div>
        <div class="ch-origin">${origin?.name || 'Unknown origin'}${m.id === 'hero' ? ' · ' + state.heroName : ''}</div>
        <span class="origin-badge">LEVEL ${m.level}</span>
        <div class="gear-slots">
          <button class="gear-slot" data-gear="weapon">
            <span class="gs-k">Weapon</span>
            <span class="gs-v">${ITEMS[m.gear?.weapon]?.name || '— empty —'}</span>
          </button>
          <button class="gear-slot" data-gear="charm">
            <span class="gs-k">Charm</span>
            <span class="gs-v">${ITEMS[m.gear?.charm]?.name || '— empty —'}</span>
          </button>
        </div>
        ${gearPick ? renderGearPick(m, gearPick) : ''}
      </div>
      <div class="status-right">
        <div class="vitals">
          <div class="vital hp"><div class="v-k">Health</div><div class="v-v">${Math.max(0, Math.round(m.hp))} <small>/ ${st.maxHp}</small></div><div class="v-bar"><i style="width:${Math.max(0, m.hp / st.maxHp * 100)}%"></i></div></div>
          <div class="vital mp"><div class="v-k">Aether</div><div class="v-v">${Math.round(m.mp)} <small>/ ${st.maxMp}</small></div><div class="v-bar"><i style="width:${Math.max(0, m.mp / st.maxMp * 100)}%"></i></div></div>
          <div class="vital xp"><div class="v-k">Experience</div><div class="v-v">${xp} <small>/ ${need}</small></div><div class="v-bar"><i style="width:${Math.min(100, xp / need * 100)}%"></i></div></div>
        </div>
        <div>
          <div class="menu-section-title">Attributes</div>
          <div class="stat-grid">
            ${statLine('Attack', st.atk, 60)}
            ${statLine('Defence', st.def, 60)}
            ${statLine('Magic', st.mag, 60)}
            ${statLine('Resistance', st.res, 60)}
            ${statLine('Agility', st.agi, 45)}
            ${statLine('Luck', st.luck, 35)}
          </div>
        </div>
        <div>
          <div class="menu-section-title">Derived</div>
          <div class="stat-grid">
            <div class="stat-line"><span class="sl-k">Critical</span><span class="sl-v">${Math.round(st.crit * 100)}%</span></div>
            <div class="stat-line"><span class="sl-k">Evade</span><span class="sl-v">${Math.round(st.evade * 100)}%</span></div>
            <div class="stat-line"><span class="sl-k">Skill points</span><span class="sl-v" style="color:var(--ember)">${m.sp}</span></div>
            <div class="stat-line"><span class="sl-k">Origin</span><span class="sl-v" style="width:auto;font-size:10px;color:var(--teal)">${origin?.glyph || '✦'}</span></div>
          </div>
        </div>
        ${m.bonus ? `<div class="bonus-line">Three sparks: ${Object.entries(m.bonus).filter(([, v]) => v).map(([k, v]) => `+${v} ${k.toUpperCase()}`).join(' · ')}</div>` : ''}
        ${m.title ? `<div class="bonus-line" style="color:var(--ink-faint)">${escapeHtml(m.title)} — ${escapeHtml(m.bio || '')}</div>` : ''}
      </div>
    </div>`;
  const canvas = $('#menu-portrait');
  if (canvas) {
    const d = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = 132 * d; canvas.height = 132 * d;
    drawClassArt(canvas, m.classId, m.palette, { dpr: d, time: performance.now() / 1000 });
  }
  bindCharTabs(box);
  box.querySelectorAll('[data-gear]').forEach((b) => {
    b.onclick = () => { gearPick = gearPick === b.dataset.gear ? null : b.dataset.gear; audio.sfx('click'); renderStatus(box); };
  });
  bindGearPick(box, m);
}

function statLine(label, value, max) {
  return `<div class="stat-line"><span class="sl-k">${label}</span><span class="sl-bar"><i style="width:${Math.min(100, value / max * 100)}%"></i></span><span class="sl-v">${value}</span></div>`;
}

function renderGearPick(m, slot) {
  const owned = state.gearOwned.filter((id) => ITEMS[id]?.slot === slot);
  const equipped = m.gear?.[slot];
  return `<div class="equip-select" style="width:100%">
    <div style="font-size:8px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-faint)">${slot} · choose</div>
    ${equipped ? `<button class="equip-opt" data-unequip="${slot}">Unequip ${escapeHtml(ITEMS[equipped]?.name || '')}</button>` : ''}
    ${owned.length ? owned.map((id) => {
      const it = ITEMS[id];
      return `<button class="equip-opt" data-equip="${id}"><b>${escapeHtml(it.name)}</b> · <span style="color:var(--teal)">${statsText(it.stats)}</span></button>`;
    }).join('') : '<div style="font-size:10px;color:var(--ink-faint);padding:5px">Nothing else owned.</div>'}
    <button class="equip-opt" data-gear-close>Close</button>
  </div>`;
}

function statsText(stats = {}) {
  return Object.entries(stats).map(([k, v]) => `${k.toUpperCase()} +${v}`).join(', ');
}

function bindGearPick(box, m) {
  box.querySelectorAll('[data-equip]').forEach((b) => {
    b.onclick = () => {
      if (equipGear(m, b.dataset.equip)) { audio.sfx('equip'); toast('Equipped ' + ITEMS[b.dataset.equip].name, '⚔'); renderStatus(box); }
      else { audio.sfx('error'); toast('Cannot equip that.', '!'); }
    };
  });
  box.querySelectorAll('[data-unequip]').forEach((b) => {
    b.onclick = () => { if (unequip(m, b.dataset.unequip)) { audio.sfx('equip'); renderStatus(box); } };
  });
  box.querySelectorAll('[data-gear-close]').forEach((b) => {
    b.onclick = () => { gearPick = null; audio.sfx('cancel'); renderStatus(box); };
  });
}

// ── skills ────────────────────────────────────────────────────
function renderSkills(box) {
  const m = memberOf();
  if (!m) return;
  const cls = CLASSES[m.classId];
  const avail = availableNodes(m).map((n) => n.id);
  const tiers = 5;
  const cells = [];
  for (let tier = 0; tier < tiers; tier++) {
    for (let col = 0; col < 3; col++) {
      const node = cls.tree.find((n) => n.tier === tier && n.col === col);
      cells.push(node ? node : null);
    }
  }
  box.innerHTML = `
    ${charTabs()}
    <div class="skill-top">
      <div class="menu-section-title" style="margin:0">${cls.name} <small>${cls.role} · ${cls.weapon}</small></div>
      <div class="skill-pool">Skill points <b>${m.sp}</b></div>
    </div>
    <div class="tree-wrap">
      <div class="tree-grid" id="tree-grid">
        ${cells.map((node) => {
          if (!node) return '<div style="min-height:1px"></div>';
          const learned = m.learned.includes(node.id);
          const can = !learned && avail.includes(node.id) && m.sp >= node.sp;
          const clsName = learned ? 'learned' : can ? 'available' : 'locked';
          const kind = node.kind === 'passive' ? 'Passive' : 'Active';
          return `<button class="tree-node ${clsName} ${selectedNode === node.id ? 'just' : ''}" data-node="${node.id}">
            <span class="tn-icon">${node.icon}</span>
            <span class="tn-name">${escapeHtml(node.name)}</span>
            <span class="tn-kind">${kind} · tier ${node.tier + 1}</span>
            <span class="tn-cost">${learned ? 'Learned' : node.sp + ' SP'}</span>
            <span class="tn-desc">${escapeHtml(node.desc)}</span>
          </button>`;
        }).join('')}
      </div>
    </div>
    <div class="tree-legend">
      <span><i class="dot" style="background:#78d5c0"></i><b>Learned</b></span>
      <span><i class="dot" style="background:#f0a15a"></i><b>Available</b></span>
      <span><i class="dot" style="background:#3d4452"></i><b>Locked</b></span>
      <span>Tap a node to inspect. Learning is permanent.</span>
    </div>
    <div id="skill-detail" class="skill-detail ${selectedNode ? 'show' : ''}"></div>`;
  bindCharTabs(box);
  drawTreeLines();
  const detail = $('#skill-detail');
  if (selectedNode) {
    const node = cls.tree.find((n) => n.id === selectedNode);
    if (node) {
      const learned = m.learned.includes(node.id);
      const can = !learned && avail.includes(node.id) && m.sp >= node.sp;
      detail.innerHTML = `<h4>${node.icon} ${escapeHtml(node.name)} <span class="sd-cost">${learned ? 'LEARNED' : node.sp + ' SKILL POINT' + (node.sp > 1 ? 'S' : '')}</span></h4>
        <p>${escapeHtml(node.desc)}</p>
        <div class="sd-actions">
          ${learned ? '<span style="font-size:10px;color:var(--teal);align-self:center">This path is already yours.</span>' : can ? `<button class="btn primary" id="btn-learn">Learn</button>` : `<span style="font-size:10px;color:var(--ink-faint);align-self:center">${avail.includes(node.id) ? 'Not enough skill points.' : 'Requires ' + (node.req || []).map((r) => SKILLS[r]?.name || r).join(', ')}</span>`}
          <button class="btn ghost" id="btn-node-close">Close</button>
        </div>`;
      const learn = $('#btn-learn');
      if (learn) learn.onclick = () => {
        if (learnNode(m, node.id)) {
          audio.sfx('levelup');
          toast(`Learned ${node.name}`, '✦');
          renderSkills(box);
        } else { audio.sfx('error'); toast('Cannot learn that yet.', '!'); }
      };
      $('#btn-node-close').onclick = () => { selectedNode = null; detail.classList.remove('show'); };
    }
  }
  box.querySelectorAll('[data-node]').forEach((b) => {
    b.onclick = () => { selectedNode = selectedNode === b.dataset.node ? null : b.dataset.node; audio.sfx('click'); renderSkills(box); };
  });
}

function drawTreeLines() {
  requestAnimationFrame(() => {
    const grid = $('#tree-grid');
    if (!grid) return;
    const nodes = [...grid.querySelectorAll('[data-node]')];
    if (!nodes.length) return;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'tree-lines');
    svg.setAttribute('width', grid.scrollWidth);
    svg.setAttribute('height', grid.scrollHeight);
    svg.setAttribute('viewBox', `0 0 ${grid.scrollWidth} ${grid.scrollHeight}`);
    const center = (node) => ({
      x: node.offsetLeft + node.offsetWidth / 2,
      y: node.offsetTop + node.offsetHeight / 2,
    });
    for (const nodeEl of nodes) {
      const node = memberOf()?.classId ? CLASSES[memberOf().classId].tree.find((n) => n.id === nodeEl.dataset.node) : null;
      if (!node) continue;
      const to = center(nodeEl);
      for (const reqId of node.req || []) {
        const reqEl = grid.querySelector(`[data-node="${reqId}"]`);
        if (!reqEl) continue;
        const from = center(reqEl);
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', `M ${from.x} ${from.y} C ${from.x} ${(from.y + to.y) / 2}, ${to.x} ${(from.y + to.y) / 2}, ${to.x} ${to.y}`);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', 'rgba(240,178,122,.22)');
        path.setAttribute('stroke-width', '1.4');
        svg.appendChild(path);
      }
    }
    grid.insertBefore(svg, grid.firstChild);
  });
}

// ── items ─────────────────────────────────────────────────────
function itemRow(id, count, extra = '') {
  const it = ITEMS[id];
  return `<button class="item-row" data-item="${id}">
    <span class="ir-icon">${it.icon || '❖'}</span>
    <span><span class="ir-name">${escapeHtml(it.name)}</span><span class="ir-sub">${escapeHtml(it.type === 'gear' ? ((it.slot || '') + ' · ' + statsText(it.stats)) : (it.desc || ''))}</span></span>
    <span class="ir-count">${extra || (count > 1 ? '×' + count : '')}</span>
  </button>`;
}

function renderItems(box) {
  const inventory = Object.entries(state.inventory).filter(([, n]) => n > 0);
  const gear = state.gearOwned.slice();
  const first = selectedItem || inventory[0]?.[0] || gear[0] || null;
  selectedItem = first;
  box.innerHTML = `
    <div class="item-cols">
      <div>
        <div class="menu-section-title">Satchel <small>${inventory.length + gear.length} entries</small></div>
        <div class="item-list">
          ${inventory.map(([id, n]) => itemRow(id, n)).join('')}
          ${gear.length ? `<div style="font-size:8px;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-faint);margin:10px 0 3px">Un equipped gear</div>` : ''}
          ${gear.map((id) => itemRow(id, 1, '<span class="ir-eq">gear</span>')).join('')}
          ${!inventory.length && !gear.length ? '<div class="menu-empty">Nothing but lint and resolve.</div>' : ''}
        </div>
      </div>
      <div class="item-detail" id="item-detail"></div>
    </div>`;
  const detail = $('#item-detail');
  const paintDetail = () => {
    if (!selectedItem || !ITEMS[selectedItem]) { detail.innerHTML = '<div class="menu-empty">Select an item.</div>'; return; }
    const it = ITEMS[selectedItem];
    const isGear = it.type === 'gear';
    const equippedBy = isGear ? state.party.find((m) => m.gear?.weapon === selectedItem || m.gear?.charm === selectedItem) : null;
    detail.innerHTML = `<h4>${it.icon || '❖'} ${escapeHtml(it.name)}</h4>
      <div class="id-sub">${it.type}${isGear ? ' · ' + it.slot : ''}${it.price ? ' · ' + it.price + ' g' : ''}</div>
      <p>${escapeHtml(it.desc || '')}</p>
      ${isGear ? `<div class="id-bonus">${statsText(it.stats)}</div>` : ''}
      <div class="id-actions" id="item-actions"></div>`;
    const actions = $('#item-actions');
    if (it.type === 'consumable') {
      const use = el('button', 'btn primary', 'Use');
      use.onclick = () => useOutOfBattle(selectedItem);
      actions.appendChild(use);
    }
    if (isGear && !equippedBy) {
      const eq = el('button', 'btn primary', 'Equip');
      eq.onclick = () => { equipPickFor = selectedItem; paintDetail(); };
      actions.appendChild(eq);
    }
    if (it.type !== 'quest' && it.type !== 'key' && it.price > 0) {
      const sell = el('button', 'btn ghost', `Sell · ${Math.max(1, Math.floor(it.price * SELL_RATE))} g`);
      sell.onclick = () => sellItem(selectedItem);
      actions.appendChild(sell);
    }
    if (equipPickFor === selectedItem && isGear) {
      const sel = el('div', 'equip-select');
      sel.style.width = '100%';
      for (const m of state.party) {
        const b = el('button', 'equip-opt', `<b>${escapeHtml(m.name)}</b> · L${m.level} · ${CLASSES[m.classId].name}`);
        b.onclick = () => {
          if (equipGear(m, selectedItem)) { audio.sfx('equip'); toast(`${m.name} equips ${it.name}`, '⚔'); equipPickFor = null; renderItems(box); }
        };
        sel.appendChild(b);
      }
      actions.appendChild(sel);
    }
  };
  paintDetail();
  box.querySelectorAll('[data-item]').forEach((b) => {
    b.onclick = () => { selectedItem = b.dataset.item; audio.sfx('click'); renderItems(box); };
  });
}

function useOutOfBattle(id) {
  const it = ITEMS[id];
  const m = memberOf();
  if (!it || !m) return;
  if (it.target === 'deadAlly') {
    const dead = state.party.find((x) => x.hp <= 0);
    if (!dead) { toast('No one has fallen.', '☤'); audio.sfx('error'); return; }
    dead.hp = Math.max(1, Math.round(statBlock(dead).maxHp * (it.revive || .45)));
  } else if (it.heal || it.mp || it.cleanse) {
    const st = statBlock(m);
    if (it.heal) m.hp = Math.min(st.maxHp, m.hp + it.heal);
    if (it.mp) m.mp = Math.min(st.maxMp, m.mp + it.mp);
    if (it.cleanse) { /* no persistent statuses outside battle */ }
  } else if (it.flee) {
    state.repelSteps = 120;
    toast('The smoke will keep weak foes away for 120 steps.', '☾');
  } else if (it.bomb) {
    toast('Save the fire flask for a fight.', '✹'); audio.sfx('error'); return;
  } else {
    audio.sfx('error'); return;
  }
  removeItem(id, 1);
  audio.sfx('heal');
  toast(`${it.name} used.`, it.icon || '❖');
  renderItems($('#menu-content'));
}

function sellItem(id) {
  const it = ITEMS[id];
  if (!it) return;
  const price = Math.max(1, Math.floor((it.price || 0) * SELL_RATE));
  if (it.type === 'gear') {
    const idx = state.gearOwned.indexOf(id);
    if (idx === -1) { toast('That gear is equipped.', '!'); audio.sfx('error'); return; }
    state.gearOwned.splice(idx, 1);
  } else {
    if (!removeItem(id, 1)) return;
  }
  addGold(price);
  audio.sfx('chest');
  toast(`Sold ${it.name} for ${price} g.`, '❖');
  selectedItem = null;
  renderItems($('#menu-content'));
}

// ── party ─────────────────────────────────────────────────────
function renderParty(box) {
  box.innerHTML = `
    <div class="menu-section-title">The Party <small>${state.party.length} / 4</small></div>
    <div class="party-list">
      ${state.party.map((m) => {
        const st = statBlock(m);
        const cls = CLASSES[m.classId];
        return `<div class="party-row">
          <canvas class="pr-face" data-face="${m.id}" width="46" height="46"></canvas>
          <div style="flex:1;min-width:0">
            <div class="pr-name">${escapeHtml(m.name)} ${m.id === 'hero' ? '<span class="pr-tag">LEAD</span>' : ''}</div>
            <div class="pr-meta"><span class="pr-class">${cls.name}</span> · L${m.level} · ${m.title ? escapeHtml(m.title) : cls.role}</div>
            <div class="pr-bars">
              <div class="pc-bar hp" style="height:4px"><i style="width:${Math.max(0, m.hp / st.maxHp * 100)}%"></i></div>
              <div class="pc-bar mp" style="height:4px;margin-top:3px"><i style="width:${Math.max(0, m.mp / st.maxMp * 100)}%"></i></div>
              <div class="pr-meta" style="margin-top:3px">${Math.round(m.hp)} / ${st.maxHp} HP · ${Math.round(m.mp)} / ${st.maxMp} MP</div>
            </div>
          </div>
          <div class="pr-stats">
            <span>ATK <b>${st.atk}</b></span><span>DEF <b>${st.def}</b></span><span>MAG <b>${st.mag}</b></span><span>AGI <b>${st.agi}</b></span>
          </div>
        </div>`;
      }).join('')}
    </div>
    <div class="formation-note">Your party holds four. Companions grow with you and learn their own paths. Choices decide who walks beside you.</div>`;
  paintFaces(box);
}

// ── quests ────────────────────────────────────────────────────
const QUEST_META = {
  locket: {
    name: 'The Tarnished Locket', giver: 'Wren, Emberfield',
    desc: 'A refugee lost a keepsake in the old ruins. Find it, and bring it home.',
    objective: () => state.inventory.locket ? 'Return the locket to Wren in Emberfield.' : 'Search the ruins of Emberfield for the locket.',
    reward: '120 gold · Wren\'s gratitude',
  },
  relief: {
    name: 'Bread for the Road', giver: 'Wren, Emberfield',
    desc: 'The refugee camp needs medicine before the next ashfall.',
    objective: () => `Gather 2 Ember Tonics for Wren. (${Math.min(2, state.inventory.tonic || 0)} / 2)`,
    reward: '160 gold · 1 skill point',
  },
  braziers: {
    name: 'The Four Embers', giver: 'Emberfield ruins',
    desc: 'Four ancient braziers ring the ruined shrine. Light them all.',
    objective: () => `Light the braziers (${state.litBraziers.filter((id) => id.startsWith('ef_')).length} / 4).`,
    reward: '160 gold · Crown Fragment · 2 SP',
  },
  bounty: {
    name: 'Teeth of the Field', giver: 'Hunter Dax, Emberfield',
    desc: 'The tall grass has grown too many teeth. Thin the packs.',
    objective: () => `Defeat beasts in Emberfield (${Math.min(6, state.quests.bounty.kills || 0)} / 6).`,
    reward: '240 gold · Emberheart',
  },
  moonpetal: {
    name: 'Three Silver Flowers', giver: 'The Witch of Mire',
    desc: 'The Witch needs three moonpetals from deep Greenwood shade.',
    objective: () => `Gather moonpetals (${Math.min(3, state.inventory.moonpetal || 0)} / 3).`,
    reward: 'Mireglass Rod · 2 SP',
  },
};

function renderQuests(box) {
  const main = `<div class="quest-card main">
    <div class="qc-k">Main Chronicle · Act ${state.act || 1}</div>
    <div class="qc-title">${state.keys >= 3 ? 'The Ashen Crown' : 'Gather the Emberkeys'}</div>
    <div class="qc-desc">${escapeHtml(state.flags.prologueDone ? 'The flame has chosen you. Three keys seal the Hollow Citadel; the Crown waits beyond.' : 'The Emberwake Eve has come. Speak with Elder Maro in Hearthfall.')}</div>
    <div class="qc-obj"><i>◆</i><span>${escapeHtml(mainObjective())}</span></div>
    <div class="qc-reward">Emberkeys found: ${state.keys} / 3</div>
  </div>`;
  const side = Object.entries(state.quests).map(([id, q]) => {
    const meta = QUEST_META[id];
    if (!meta || q.status === 'inactive') return '';
    return `<div class="quest-card ${q.status === 'done' ? 'done' : ''}">
      <div class="qc-k">${q.status === 'done' ? 'Complete' : 'Side Quest'} · ${escapeHtml(meta.giver)}</div>
      <div class="qc-title">${meta.name}</div>
      <div class="qc-desc">${meta.desc}</div>
      <div class="qc-obj"><i>${q.status === 'done' ? '✓' : '◇'}</i><span>${q.status === 'done' ? 'The thread is tied.' : meta.objective()}</span></div>
      <div class="qc-reward">${meta.reward}</div>
    </div>`;
  }).join('');
  box.innerHTML = main + (side ? `<div class="menu-section-title" style="margin-top:16px">Side Threads</div>${side}` : '<div class="menu-empty" style="margin-top:14px">No side threads yet. The world is full of small griefs.</div>');
}

// ── world map ─────────────────────────────────────────────────
function renderMap(box) {
  box.innerHTML = `
    <div class="menu-section-title">The Shattered Reach <small>fast travel</small></div>
    <div class="world-map-wrap"><canvas id="menu-worldmap" width="800" height="500"></canvas></div>
    <div class="map-legend">
      <span><b>✦</b> You are here</span><span><b>◌</b> Discovered</span><span><b>✧</b> Sealed by the Crown</span>
    </div>
    <div class="menu-section-title" style="margin-top:16px">Waypoints</div>
    <div class="waypoint-list">
      ${Object.values(ZONES).map((z) => {
        const visited = !!state.visited[z.id];
        const current = state.zone === z.id;
        const locked = z.id === 'citadel' && state.keys < 3;
        return `<button class="waypoint-btn ${current ? 'on' : ''}" data-way="${z.id}" ${(!visited || locked) ? 'disabled style="opacity:.4"' : ''}>
          ${visited ? '◌' : '·'} ${z.name} ${current ? '<small>HERE</small>' : locked ? '<small>SEALED</small>' : visited ? '<small>TRAVEL</small>' : '<small>UNKNOWN</small>'}
        </button>`;
      }).join('')}
    </div>
    <div class="formation-note">Fast travel returns you to a zone's threshold. The Hollow Citadel opens only when three Emberkeys answer.</div>`;
  setTimeout(() => {
    const c = $('#menu-worldmap');
    if (c) drawWorldMap(c, performance.now());
  }, 30);
  box.querySelectorAll('[data-way]').forEach((b) => {
    b.onclick = async () => {
      const id = b.dataset.way;
      if (id === state.zone) { closeMenu(); return; }
      if (!state.visited[id]) return;
      if (id === 'citadel' && state.keys < 3) { toast('The way is sealed. Three Emberkeys are needed.', '✦'); audio.sfx('error'); return; }
      const z = ZONES[id];
      const yes = await confirm('Fast travel', `<p>Travel to <b>${escapeHtml(z.name)}</b>?</p><p style="color:var(--ink-faint)">You will arrive at the zone threshold. The road is not without risk.</p>`, 'Travel', 'Stay');
      if (!yes) return;
      audio.sfx('portal');
      closeMenu();
      hooks.travel?.(id, z.spawn.x, z.spawn.y);
    };
  });
}

// ── system ────────────────────────────────────────────────────
function renderSystem(box) {
  const diff = state.settings?.difficulty || 'balanced';
  const sound = state.settings?.sound !== false;
  box.innerHTML = `
    <div class="menu-section-title">Chronicle</div>
    <div class="sys-grid">
      <div class="sys-row"><div class="sr-k"><b>${escapeHtml(state.heroName)}</b><small>Level ${state.party[0]?.level || 1} · ${state.party[0] ? CLASSES[state.party[0].classId].name : 'Wanderer'} · Act ${state.act || 1}</small></div><span class="origin-badge">${state.keys} / 3 KEYS</span></div>
      <div class="sys-row"><div class="sr-k"><b>Playtime</b><small>${formatTime(state.playtime || 0)} · ${state.steps || 0} steps · ${state.ngPlus ? 'Continuation ' + state.ngPlus : 'First chronicle'}</small></div><button class="btn" id="sys-save">Save now</button></div>
      <div class="sys-row"><div class="sr-k"><b>Difficulty</b><small>${DIFFICULTY[diff].desc}</small></div>
        <div class="seg" id="sys-diff">${Object.entries(DIFFICULTY).map(([k, d]) => `<button data-diff="${k}" class="${k === diff ? 'on' : ''}">${d.name}</button>`).join('')}</div>
      </div>
      <div class="sys-row"><div class="sr-k"><b>Sound</b><small>Procedural music & effects</small></div>
        <div class="seg" id="sys-sound"><button data-sound="on" class="${sound ? 'on' : ''}">On</button><button data-sound="off" class="${!sound ? 'on' : ''}">Off</button></div>
      </div>
      <div class="sys-row"><div class="sr-k"><b>How to play</b><small>Controls, combat, and the shape of the chronicle</small></div><button class="btn" id="sys-help">Read</button></div>
      <div class="sys-row"><div class="sr-k"><b>Return to title</b><small>Your chronicle is autosaved at every step</small></div><button class="btn danger" id="sys-title">Title</button></div>
    </div>
    <div class="credits" style="margin-top:16px">
      <b>EMBERWAKE — The Ashen Crown</b><br>
      A complete hand-built chronicle: procedural art, procedural music, no external assets.<br>
      Every choice is stored. The flame remembers.
    </div>`;
  $('#sys-save').onclick = () => { if (saveGame(false)) { audio.sfx('confirm'); toast('Chronicle saved.', '❖'); } else toast('Could not save.', '!'); };
  box.querySelectorAll('[data-diff]').forEach((b) => {
    b.onclick = () => {
      setDifficulty(b.dataset.diff);
      state.settings.difficulty = b.dataset.diff;
      audio.sfx('confirm'); saveGame(true); renderSystem(box);
    };
  });
  box.querySelectorAll('[data-sound]').forEach((b) => {
    b.onclick = () => {
      const on = b.dataset.sound === 'on';
      state.settings.sound = on;
      audio.setEnabled(on);
      audio.sfx('click'); saveGame(true); renderSystem(box);
    };
  });
  $('#sys-help').onclick = () => showHelp();
  $('#sys-title').onclick = async () => {
    const yes = await confirm('Return to title?', '<p>Your chronicle is autosaved. You can continue from the title screen.</p>', 'Return', 'Stay');
    if (!yes) return;
    closeMenu();
    hooks.returnToTitle?.();
  };
}

export function showHelp() {
  return modal({
    kicker: 'A GUIDE FOR THE ASH-BOUND', title: 'How to Play',
    body: `<h4>Exploring</h4>
      <ul><li>Walk with <span class="key">WASD</span> / arrow keys, the on-screen stick, or tap the ground to pathfind.</li>
      <li>Stand near a person, chest, crystal, brazier, sign, or altar and press <span class="key">E</span> / <span class="key">Enter</span> or the <b>✦ TALK</b> button.</li>
      <li>Save crystals restore the whole party and set your return point when you fall.</li>
      <li>The <b>☰ MENU</b> button opens your chronicle: status, skill trees, satchel, party, quests, map, and system.</li></ul>
      <h4>Combat</h4>
      <ul><li>Combat is turn-based. Speed (Agility) decides turn order; the strip at the top shows the round.</li>
      <li><b>Attack</b> one foe, spend MP on <b>Skills</b>, use the <b>Satchel</b>, <b>Guard</b> to halve damage, or try to <b>Flee</b>.</li>
      <li>Elements matter: fire melts plants and frost, storm cracks stone. Weaknesses deal +35%; resistances cut damage.</li>
      <li>Bosses grow furious below half health. Keep a healer or a stock of Ember Tonics.</li></ul>
      <h4>The Chronicle</h4>
      <ul><li>Choices are permanent. Who you trust in Greenwood, what you do in the Mire, and what you claim in the Peaks shape the ending.</li>
      <li>Three Emberkeys — Thorn, Tide, and Cinder — can be gathered in any order. The Citadel opens when all three answer.</li>
      <li>After an ending, begin the Continuation to carry a legacy into a harder new chronicle.</li></ul>`,
    actions: [{ label: 'Understood', value: true, class: 'primary' }],
  });
}
