import { CLASSES, ORIGINS, PALETTES } from '../data/classes.js';
import { audio } from './audio.js';
import { $, el, showScreen, escapeHtml } from './ui-core.js';
import { drawClassArt } from './art.js';
import { hooks } from '../hooks.js';
import { state } from '../state.js';

const NAMES = ['Aren', 'Mira', 'Cael', 'Sena', 'Rook', 'Ilya', 'Dain', 'Vesper', 'Tovin', 'Neri', 'Ash', 'Wren', 'Sol', 'Maeve', 'Kiran', 'Ysolde'];
const BONUS_DEFS = [
  { id: 'hp', label: 'Vitality', add: 8, desc: '+8 Max HP' },
  { id: 'atk', label: 'Strength', add: 1, desc: '+1 Attack' },
  { id: 'mag', label: 'Spirit', add: 1, desc: '+1 Magic' },
  { id: 'def', label: 'Guard', add: 1, desc: '+1 Defence' },
  { id: 'agi', label: 'Swiftness', add: 1, desc: '+1 Agility' },
  { id: 'luck', label: 'Fate', add: 1, desc: '+1 Luck' },
];

function newDraft() {
  return {
    step: 0,
    name: NAMES[Math.floor(Math.random() * NAMES.length)],
    origin: 'hearthbound',
    classId: 'vanguard',
    palette: 0,
    bonus: { hp: 0, atk: 0, mag: 0, def: 0, agi: 0, luck: 0 },
  };
}
let C = newDraft();

export function openCreation() {
  C = newDraft();
  showScreen('screen-create');
  renderCreation();
}

function pointsLeft() {
  return 3 - Object.values(C.bonus).reduce((a, b) => a + b, 0);
}

function bonusStats() {
  const out = {};
  for (const d of BONUS_DEFS) {
    const n = C.bonus[d.id] || 0;
    if (n) out[d.id] = n * d.add;
  }
  return out;
}

export function renderCreation() {
  const body = $('#create-body');
  $('#create-step-label').textContent = `${C.step + 1} / 3`;
  const dots = $('#create-dots');
  dots.innerHTML = [0, 1, 2].map((i) => `<i class="${i === C.step ? 'on' : ''}"></i>`).join('');
  $('#btn-create-prev').textContent = C.step === 0 ? 'Title' : 'Back';
  $('#btn-create-next').textContent = C.step === 2 ? 'Begin the Emberwake' : 'Continue';
  $('#btn-create-next').classList.toggle('primary', C.step === 2);

  if (C.step === 0) {
    body.innerHTML = `
      <div class="cr-section">
        <div class="cr-label"><h3>Who are you?</h3><span>name & origin</span></div>
        <div class="name-row">
          <div class="field">
            <label>True name</label>
            <input id="cr-name" maxlength="18" value="${escapeHtml(C.name)}" autocomplete="off" spellcheck="false" />
          </div>
          <button class="btn" id="cr-random" style="align-self:flex-end">Roll name</button>
        </div>
      </div>
      <div class="cr-section">
        <div class="cr-label"><h3>Where did the flame find you?</h3><span>origin</span></div>
        <div class="origin-grid">
          ${Object.values(ORIGINS).map((o) => `
            <button class="origin-card ${C.origin === o.id ? 'on' : ''}" data-origin="${o.id}">
              <b><i>${o.glyph}</i>${o.name}</b>
              <span>${o.blurb}</span>
              <em>${o.perk}</em>
            </button>`).join('')}
        </div>
      </div>
      <div class="cr-section">
        <div class="cr-label"><h3>What do you carry?</h3><span>your beginning</span></div>
        <div class="create-summary">
          <canvas class="cs-portrait" id="cr-portrait" width="120" height="120"></canvas>
          <div>
            <div class="cs-name">${escapeHtml(C.name || 'The Unnamed')}</div>
            <div class="cs-meta">${ORIGINS[C.origin].name} · ${CLASSES[C.classId].name}</div>
            <div class="cs-meta" style="color:var(--ink-faint);margin-top:4px">${ORIGINS[C.origin].perk}</div>
          </div>
          <div class="cs-sp">Every choice<br>will be remembered</div>
        </div>
      </div>`;
    const input = $('#cr-name');
    input.oninput = () => {
      C.name = input.value;
      const n = $('.cs-name');
      if (n) n.textContent = C.name || 'The Unnamed';
    };
    input.onkeydown = (e) => { if (e.key === 'Enter') next(); };
    $('#cr-random').onclick = () => {
      let n = C.name;
      while (n === C.name) n = NAMES[Math.floor(Math.random() * NAMES.length)];
      C.name = n;
      input.value = n;
      $('.cs-name').textContent = n;
      audio.sfx('click');
    };
    document.querySelectorAll('[data-origin]').forEach((b) => {
      b.onclick = () => {
        C.origin = b.dataset.origin;
        audio.sfx('click');
        renderCreation();
      };
    });
    setTimeout(() => drawPreview($('#cr-portrait')), 0);
  } else if (C.step === 1) {
    body.innerHTML = `
      <div class="cr-section">
        <div class="cr-label"><h3>Choose your calling</h3><span>job class · skill tree</span></div>
        <div class="cr-grid">
          ${Object.values(CLASSES).map((c) => `
            <button class="class-card ${C.classId === c.id ? 'on' : ''}" data-class="${c.id}" style="--cc:${c.color}">
              <div class="sigil">${c.sigil}</div>
              <div>
                <div class="cc-name">${c.name}</div>
                <div class="cc-role">${c.role} · ${c.weapon}</div>
                <div class="cc-desc">${c.desc}</div>
              </div>
            </button>`).join('')}
        </div>
      </div>
      <div class="cr-section">
        <div class="cr-label"><h3>The shape of your flame</h3><span>starting attributes</span></div>
        <div class="create-summary">
          <canvas class="cs-portrait" id="cr-portrait" width="120" height="120"></canvas>
          <div style="flex:1">
            <div class="cs-name">${CLASSES[C.classId].name} <span style="font-family:var(--sans);font-size:9px;letter-spacing:.15em;color:${CLASSES[C.classId].color}">${CLASSES[C.classId].role.toUpperCase()}</span></div>
            <div class="cs-meta">${CLASSES[C.classId].desc}</div>
            <div style="display:flex;gap:12px;margin-top:8px;font-size:10px;color:var(--ink-dim);flex-wrap:wrap">
              <span>HP <b style="color:var(--green)">${CLASSES[C.classId].base.hp}</b></span>
              <span>MP <b style="color:var(--blue)">${CLASSES[C.classId].base.mp}</b></span>
              <span>ATK <b>${CLASSES[C.classId].base.atk}</b></span>
              <span>MAG <b>${CLASSES[C.classId].base.mag}</b></span>
              <span>DEF <b>${CLASSES[C.classId].base.def}</b></span>
              <span>AGI <b>${CLASSES[C.classId].base.agi}</b></span>
            </div>
          </div>
          <div class="cs-sp" style="color:var(--ink-faint)">1 skill point<br>to spend</div>
        </div>
      </div>`;
    document.querySelectorAll('[data-class]').forEach((b) => {
      b.onclick = () => {
        C.classId = b.dataset.class;
        audio.sfx('confirm');
        renderCreation();
      };
    });
    setTimeout(() => drawPreview($('#cr-portrait')), 0);
  } else {
    const left = pointsLeft();
    const cls = CLASSES[C.classId];
    body.innerHTML = `
      <div class="cr-section">
        <div class="cr-label"><h3>Your face in the firelight</h3><span>appearance</span></div>
        <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
          <div class="char-portrait" style="width:104px;height:104px"><canvas id="cr-portrait" width="208" height="208" style="width:100%;height:100%"></canvas></div>
          <div>
            <div class="swatches">
              ${PALETTES.map((p, i) => `<button class="swatch ${C.palette === i ? 'on' : ''}" data-pal="${i}" style="background:linear-gradient(135deg, ${p.skin} 0 45%, ${p.hair} 45% 70%, ${p.cloth} 70%)" aria-label="Appearance ${i + 1}"></button>`).join('')}
            </div>
            <div style="font-size:10px;color:var(--ink-faint);margin-top:9px;letter-spacing:.06em">The flame remembers the face it chose.</div>
          </div>
        </div>
      </div>
      <div class="cr-section">
        <div class="cr-label"><h3>Three sparks of fate</h3><span>${left} point${left === 1 ? '' : 's'} remaining</span></div>
        <div class="stat-alloc">
          ${BONUS_DEFS.map((d) => {
            const n = C.bonus[d.id] || 0;
            return `<div class="alloc-row">
              <label>${d.label}</label>
              <button class="alloc-btn" data-minus="${d.id}" ${n <= 0 ? 'disabled' : ''}>−</button>
              <div class="bar"><i style="width:${Math.min(100, n / 3 * 100)}%"></i></div>
              <div class="val">+${n * d.add}</div>
              <button class="alloc-btn" data-plus="${d.id}" ${left <= 0 ? 'disabled' : ''}>+</button>
            </div>`;
          }).join('')}
        </div>
        <div style="font-size:10px;color:var(--ink-faint);margin-top:8px">Spend your three sparks now. They cannot be reclaimed later.</div>
      </div>
      <div class="cr-section">
        <div class="cr-label"><h3>The chronicle begins</h3><span>summary</span></div>
        <div class="create-summary">
          <canvas class="cs-portrait" id="cr-summary-portrait" width="120" height="120"></canvas>
          <div style="flex:1;min-width:0">
            <div class="cs-name">${escapeHtml(C.name || 'The Unnamed')}</div>
            <div class="cs-meta">${cls.name} · ${ORIGINS[C.origin].name}</div>
            <div class="cs-meta" style="margin-top:4px;color:var(--ink-dim)">${ORIGINS[C.origin].perk}</div>
          </div>
          <div class="cs-sp">${left > 0 ? `<span style="color:var(--gold)">${left} unspent spark${left === 1 ? '' : 's'}</span><br>` : ''}Emberwake awaits</div>
        </div>
      </div>`;
    document.querySelectorAll('[data-pal]').forEach((b) => {
      b.onclick = () => { C.palette = Number(b.dataset.pal); audio.sfx('click'); renderCreation(); };
    });
    document.querySelectorAll('[data-plus]').forEach((b) => {
      b.onclick = () => { if (pointsLeft() > 0) { C.bonus[b.dataset.plus]++; audio.sfx('click'); renderCreation(); } };
    });
    document.querySelectorAll('[data-minus]').forEach((b) => {
      b.onclick = () => { if (C.bonus[b.dataset.minus] > 0) { C.bonus[b.dataset.minus]--; audio.sfx('click'); renderCreation(); } };
    });
    setTimeout(() => {
      drawPreview($('#cr-portrait'));
      drawPreview($('#cr-summary-portrait'));
    }, 0);
  }
}

function drawPreview(canvas) {
  if (!canvas) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = canvas.clientWidth * dpr || 120 * dpr;
  canvas.height = canvas.clientHeight * dpr || 120 * dpr;
  drawClassArt(canvas, C.classId, C.palette, { dpr, time: performance.now() / 1000 });
}

function next() {
  if (C.step < 2) {
    C.step++;
    audio.sfx('page');
    renderCreation();
  } else {
    if (!C.name.trim()) { C.name = 'Aren'; }
    startGame();
  }
}

function prev() {
  if (C.step > 0) {
    C.step--;
    audio.sfx('cancel');
    renderCreation();
  } else {
    audio.sfx('cancel');
    showScreen('screen-title');
    hooks.returnToTitle?.(false);
  }
}

function startGame() {
  audio.sfx('confirm');
  hooks.newGame?.({
    name: C.name.trim().slice(0, 18) || 'Aren',
    classId: C.classId,
    origin: C.origin,
    palette: C.palette,
    bonus: bonusStats(),
  });
}

export function initCreation() {
  $('#btn-create-back').onclick = prev;
  $('#btn-create-prev').onclick = prev;
  $('#btn-create-next').onclick = next;
  document.addEventListener('keydown', (e) => {
    if ($('#screen-create').classList.contains('hidden')) return;
    if (e.key === 'Enter' && !e.target.closest('input')) next();
    if (e.key === 'Escape') prev();
  });
}
