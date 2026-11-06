import { state, mainObjective, statBlock } from '../state.js';
import { ZONES } from '../data/zones.js';
import { CLASSES, PALETTES } from '../data/classes.js';
import { audio } from './audio.js';
import { drawPortrait, drawFace, TAU, drawPerson, paletteFor, clamp } from './art.js';
import { mode } from '../main.js';
import {
  PAL, TILE, drawWindow, drawText, drawChoice, drawArrow, pr, measureText,
} from './pixel.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
export const el = (tag, cls = '', html = '') => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
};

export const ui = {
  dialogueQueue: [],
  typing: null,
  dialogueOpen: false,
  cinematicOpen: false,
  hudSig: '',
  lastPortrait: null,
  resolveSay: null,
  resolveChoice: null,
  skipType: false,
};

export const SPEAKERS = {
  'Elder Maro': { role: 'elder', palette: 1, color: '#d9b67a' },
  'Kael': { classId: 'ronin', palette: 1 },
  'Lyra': { classId: 'emberweaver', palette: 3 },
  'Seris': { classId: 'warden', palette: 4 },
  'Sable': { classId: 'shadowblade', palette: 2 },
  'Barda': { role: 'smith', palette: 1, color: '#c98a55' },
  'Nessa': { role: 'inn', palette: 5, color: '#c78a8a' },
  'Yara': { role: 'herbalist', palette: 4, color: '#8fbf7a' },
  'Pip': { role: 'child', palette: 0, color: '#e0c07a' },
  'Seer Oma': { role: 'seer', palette: 3, color: '#b79bea' },
  'Guard Rhen': { role: 'guard', palette: 1, color: '#9b8a6a' },
  'Wren': { role: 'villager', palette: 0, color: '#b98a7a' },
  'Hunter Dax': { role: 'hunter', palette: 4, color: '#8a9b6a' },
  'Pilgrim': { role: 'pilgrim', palette: 1, color: '#c9bda6' },
  'Wandering Merchant': { role: 'merchant', palette: 1, color: '#c0a060' },
  'Innkeeper Fen': { role: 'inn', palette: 5, color: '#c78a8a' },
  'Trader Quill': { role: 'merchant', palette: 0, color: '#c0a060' },
  'Captain Thea': { role: 'guard', palette: 1, color: '#9b8a6a' },
  'Elder Bramble': { role: 'elder', palette: 4, color: '#8fbf7a' },
  'Fenn': { role: 'child', palette: 4, color: '#d8c07a' },
  'Hermit Goll': { role: 'pilgrim', palette: 2, color: '#7f9b8a' },
  'The Witch of Mire': { role: 'witch', palette: 2, color: '#8fd0a8' },
  'Mudlark': { role: 'child', palette: 4, color: '#9bbf77' },
  'Envoy Malrec': { role: 'envoy', palette: 1, color: '#d9a05a' },
  'Forge-Mother Hessa': { role: 'smith', palette: 1, color: '#c98a55' },
  'Order Sentinel': { role: 'guard', palette: 0, color: '#b08060' },
  'Scout Vela': { role: 'hunter', palette: 4, color: '#8a9b6a' },
  'Caged Warden': { role: 'warden', palette: 4, color: '#79c98b' },
  'The Thornwarden': { role: 'plant', palette: 4, color: '#e7b75c' },
  'Thornwarden': { role: 'plant', palette: 4, color: '#e7b75c' },
  'Vaelor': { role: 'king', palette: 0, color: '#ffb066' },
  'The Ashen King': { role: 'king', palette: 0, color: '#ffb066' },
  'The Crown': { role: 'seer', palette: 3, color: '#b79bea' },
  'Narrator': { role: 'seer', palette: 3, color: '#a9a293' },
};

export function portraitDef(speaker, custom) {
  if (custom) return custom;
  const hero = state.party?.find((m) => m.name === speaker);
  if (hero) return hero;
  return SPEAKERS[speaker] || { role: 'pilgrim', palette: 0, color: '#c9bda6' };
}

function makePortraitNode(speaker, custom, size = 112) {
  const wrap = el('div', 'dlg-portrait-art');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const canvas = document.createElement('canvas');
  canvas.width = size * dpr; canvas.height = (size * 1.24) * dpr;
  canvas.style.width = '100%'; canvas.style.height = '100%';
  const def = portraitDef(speaker, custom);
  if (def.classId) {
    drawPortrait(canvas, def, { dpr });
  } else {
    // build a synthetic member for the classless NPC
    const fake = { classId: def.classId || 'vanguard', palette: def.palette ?? 0, name: speaker };
    drawPortrait(canvas, fake, { dpr });
    // role tint unobtrusive: overlay role glyph
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = .25;
    ctx.fillStyle = def.color || '#f0a15a';
    ctx.font = `${size * .16}px Georgia, serif`;
    ctx.textAlign = 'right';
    ctx.fillText(def.role ? def.role[0].toUpperCase() : '✦', size * .9, size * 1.1);
  }
  wrap.appendChild(canvas);
  return wrap;
}

export function setPortrait(speaker, custom) {
  const holder = $('#dlg-portrait');
  holder.innerHTML = '';
  holder.appendChild(makePortraitNode(speaker, custom));
  ui.lastPortrait = { speaker, custom };
}

// ── effects ────────────────────────────────────────────────────
export function toast(text, icon = '✦', ms = 2600) {
  const stack = $('#toast-stack');
  if (!stack) return;
  const t = el('div', 'toast', `<i>${icon}</i><span>${text}</span>`);
  stack.appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 450); }, ms);
}

export function fade(on, ms = 420) {
  const f = $('#fade');
  f.style.transition = `opacity ${ms}ms ease`;
  f.classList.toggle('on', on);
  return new Promise((res) => setTimeout(res, on ? ms : 60));
}

export function flash(color = '#ffd9a8') {
  const f = $('#flash');
  f.style.background = color;
  f.classList.add('on');
  setTimeout(() => f.classList.remove('on'), 80);
}

export function banner(name, sub) {
  const b = $('#zone-banner');
  $('#zb-name').textContent = name;
  $('#zb-sub').textContent = sub;
  b.classList.remove('hidden');
  b.style.animation = 'none';
  void b.offsetWidth;
  b.style.animation = '';
  clearTimeout(banner._t);
  banner._t = setTimeout(() => b.classList.add('hidden'), 3200);
}

export function showScreen(id) {
  for (const s of $$('.screen')) s.classList.add('hidden');
  if (id) $('#' + id).classList.remove('hidden');
}

export function shakeScreen(power = 8) {
  const app = $('#app');
  app.animate(
    [{ transform: 'translate(0,0)' }, { transform: `translate(${power}px,${power * .4}px)` },
     { transform: `translate(${-power}px,${-power * .3}px)` }, { transform: 'translate(0,0)' }],
    { duration: 240, easing: 'ease-out' }
  );
}

// ── modal ──────────────────────────────────────────────────────
export function modal({ kicker = 'EMBERWAKE', title = '', body = '', actions = [{ label: 'Close', value: true }], closable = true }) {
  const m = $('#modal');
  $('#modal-kicker').textContent = kicker;
  $('#modal-title').textContent = title;
  $('#modal-body').innerHTML = body;
  const act = $('#modal-actions');
  act.innerHTML = '';
  return new Promise((resolve) => {
    const close = (v) => {
      m.classList.add('hidden');
      m.onclick = null;
      document.removeEventListener('keydown', onKey);
      resolve(v);
    };
    const onKey = (e) => {
      if (e.key === 'Escape' && closable) close(null);
      if (e.key === 'Enter' && actions.length === 1) close(actions[0].value);
    };
    for (const a of actions) {
      const b = el('button', `btn ${a.class || ''}`, a.label);
      b.onclick = () => { audio.sfx('click'); close(a.value); };
      act.appendChild(b);
    }
    if (closable) m.onclick = (e) => { if (e.target === m) close(null); };
    document.addEventListener('keydown', onKey);
    m.classList.remove('hidden');
    audio.sfx('page');
  });
}

export function confirm(title, body, yes = 'Confirm', no = 'Cancel') {
  return modal({
    title, body,
    actions: [{ label: no, value: false, class: 'ghost' }, { label: yes, value: true, class: 'primary' }],
  });
}

// ── cinematic ─────────────────────────────────────────────────
export function cinematic(lines, opts = {}) {
  return new Promise((resolve) => {
    const box = $('#cinematic');
    const txt = $('#cine-text');
    box.classList.remove('hidden');
    ui.cinematicOpen = true;
    let i = 0;
    let resolveLine = null;
    let typingTimer = null;
    let titleCard = !!opts.title;
    let titleTimer = null;
    let full = '';
    const render = (line) => {
      full = line;
      txt.textContent = '';
      let pos = 0;
      clearInterval(typingTimer);
      txt.innerHTML = '';
      typingTimer = setInterval(() => {
        pos += 2;
        if (pos >= line.length) {
          clearInterval(typingTimer);
          typingTimer = null;
          txt.innerHTML = formatCine(line);
          if (ui.cinematicSkip) { ui.cinematicSkip = false; advance(); }
        } else {
          txt.textContent = line.slice(0, pos);
        }
      }, 15);
    };
    const advance = () => {
      if (titleCard) {
        titleCard = false;
        clearTimeout(titleTimer);
        titleTimer = null;
        render(lines[0]);
        return;
      }
      if (typingTimer) {
        clearInterval(typingTimer);
        typingTimer = null;
        txt.innerHTML = formatCine(full);
        return;
      }
      i++;
      if (i >= lines.length) {
        cleanup();
        return;
      }
      render(lines[i]);
    };
    const cleanup = () => {
      box.classList.add('hidden');
      ui.cinematicOpen = false;
      box.onclick = null;
      clearTimeout(titleTimer);
      document.removeEventListener('keydown', onKey);
      resolve();
    };
    const onKey = (e) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); advance(); }
    };
    box.onclick = advance;
    document.addEventListener('keydown', onKey);
    if (opts.title) {
      txt.innerHTML = '';
      // title card
      const t = el('div', 'cine-titlecard', `<span class="eyebrow">${opts.kicker || 'EMBERWAKE'}</span><h2>${opts.title}</h2>`);
      box.querySelector('.cine-text').appendChild(t);
      titleTimer = setTimeout(() => { if (ui.cinematicOpen && titleCard) advance(); }, 2400);
      i = -1;
      full = '';
      ui.cinematicSkip = true;
    } else {
      render(lines[0]);
    }
    audio.sfx('page');
  });
}

function formatCine(s) {
  return s.replace(/\n/g, '<br>').replace(/\*([^*]+)\*/g, '<em>$1</em>').replace(/_([^_]+)_/g, '<span class="dim">$1</span>');
}

// ── dialogue ──────────────────────────────────────────────────
// ── canvas dialogue state (world mode, pixel JRPG window) ────────────────
export const dialogue = {
  open: false,
  speaker: '',
  text: '',
  full: '',
  choices: [],
  idx: 0,
  typing: true,
  pos: 0,
  last: 0,
  hitBoxes: [],
  resolveSay: null,
  resolveChoice: null,
};

function sayCanvas(speaker, text, opts = {}) {
  return new Promise((resolve) => {
    const d = dialogue;
    d.open = true; ui.dialogueOpen = true;
    d.speaker = speaker || 'Narrator';
    d.full = text;
    d.choices = [];
    d.idx = 0;
    d.typing = true;
    d.pos = 0;
    d.last = performance.now();
    d.hitBoxes = [];
    d.resolveSay = resolve;
    d.resolveChoice = null;
    audio.sfx('page');
  });
}

export function say(speaker, text, opts = {}) {
  if (mode === 'world') return sayCanvas(speaker, text, opts);
  return new Promise((resolve) => {
    const dlg = $('#dialogue');
    dlg.classList.remove('hidden');
    ui.dialogueOpen = true;
    $('#dlg-choices').classList.add('hidden');
    $('#dlg-choices').innerHTML = '';
    $('#dlg-next').style.visibility = 'visible';
    $('#dlg-name').textContent = speaker || 'Narrator';
    setPortrait(speaker || 'Narrator', opts.portrait);
    const txt = $('#dlg-text');
    txt.innerHTML = '';
    let pos = 0;
    ui.skipType = false;
    clearInterval(ui.typing);
    const full = text;
    ui.typing = setInterval(() => {
      pos += 2;
      if (pos >= full.length) {
        clearInterval(ui.typing); ui.typing = null;
        txt.innerHTML = formatDlg(full);
      } else {
        txt.textContent = full.slice(0, pos);
      }
    }, 14);
    ui.resolveSay = () => {
      if (ui.typing) {
        clearInterval(ui.typing); ui.typing = null;
        txt.innerHTML = formatDlg(full);
        return;
      }
      ui.resolveSay = null;
      audio.sfx('click');
      resolve();
    };
    audio.sfx('page');
  });
}

export function choice(options) {
  if (mode === 'world') {
    return new Promise((resolve) => {
      const d = dialogue;
      d.open = true; ui.dialogueOpen = true;
      d.choices = options.filter((o) => !o.hide);
      d.idx = 0;
      d.typing = false;
      d.pos = 0;
      d.hitBoxes = [];
      d.resolveChoice = resolve;
      d._choiceResolve = resolve;
      d.resolveSay = null;
      audio.sfx('page');
    });
  }
  return new Promise((resolve) => {
    const box = $('#dlg-choices');
    box.innerHTML = '';
    box.classList.remove('hidden');
    $('#dlg-next').style.visibility = 'hidden';
    const opts = options.filter((o) => !o.hide);
    opts.forEach((o, i) => {
      const b = el('button', 'dlg-choice');
      b.innerHTML = `<b>${i + 1}</b><span>${o.text}</span>${o.note ? `<span class="dc-note">${o.note}</span>` : ''}`;
      if (o.req === false) { b.disabled = true; b.style.opacity = '.4'; }
      b.onclick = () => {
        if (o.req === false) return;
        audio.sfx('confirm');
        box.classList.add('hidden');
        ui.resolveChoice = null;
        resolve(o.value);
      };
      box.appendChild(b);
    });
    ui.resolveChoice = (idx) => {
      const o = opts[idx];
      if (!o || o.req === false) return;
      audio.sfx('confirm');
      box.classList.add('hidden');
      ui.resolveChoice = null;
      resolve(o.value);
    };
  });
}

export function closeDialogue() {
  $('#dialogue').classList.add('hidden');
  const d = dialogue;
  d.open = false;
  ui.dialogueOpen = false;
  d.resolveSay = null;
  d.resolveChoice = null;
  d.hitBoxes = [];
  clearInterval(ui.typing); ui.typing = null;
}

export function advanceDialogue() {
  const d = dialogue;
  if (mode === 'world') {
    if (d.resolveChoice) return;
    if (d.typing) { d.pos = d.full.length; return; }
    if (d.resolveSay) { audio.sfx('click'); d.resolveSay(); }
    return;
  }
  if (ui.resolveChoice) return;
  if (ui.resolveSay) ui.resolveSay();
}

export function finishTyping() {
  const d = dialogue;
  if (d.typing) d.pos = d.full.length;
}



export function renderPortraitSprite(ctx, speaker, x, y, w, h) {
  const cvs = document.createElement('canvas');
  cvs.width = w; cvs.height = h;
  const def = portraitDef(speaker);
  drawPortrait(cvs, def, { dpr: 1 });
  ctx.drawImage(cvs, x, y, w, h);
}

// ── canvas HUD ───────────────────────────────────────────────────────────
export function renderHud(ctx, now) {
  if (!state.party || !state.party.length) return;
  const dpr = 1;
  const chipW = 94, chipH = 24, gap = 5;
  let x = 8;
  for (const m of state.party) {
    const st = statBlock(m);
    const low = m.hp < st.maxHp * 0.3;
    drawWindow(ctx, x, 5, chipW, chipH, {
      fill: '#241e2a',
      accent: low ? '#d9564f' : (m.mp < st.maxMp * 0.3 ? '#83b6e8' : '#f0c27a'),
    });
    // mini face (12×18)
    const fc = document.createElement('canvas');
    fc.width = 12; fc.height = 18;
    const fctx = fc.getContext('2d');
    fctx.imageSmoothingEnabled = false;
    drawPerson(fctx, 6, 16, 12, {
      classId: m.classId, palette: paletteFor(m), facing: 'down', walk: 0,
      time: now / 1000, role: '', scale: 0.75,
    });
    ctx.drawImage(fc, x + 5, 4, 12, 18);
    ctx.fillStyle = '#e8ddc8';
    drawText(ctx, m.name, x + 19, 8, { color: '#e8ddc8' });
    drawText(ctx, `L${m.level}`, x + chipW - 24, 8, { color: '#a69c86', align: 'right' });
    const barY = 16;
    drawText(ctx, 'HP', x + 19, barY, { color: '#8a9c8c' });
    drawBar(ctx, x + 34, barY, chipW - 44, m.hp / st.maxHp, low ? '#d9564f' : '#7fc272');
    drawText(ctx, 'MP', x + 19, barY + 7, { color: '#8a8cb2' });
    drawBar(ctx, x + 34, barY + 7, chipW - 44, m.mp / st.maxMp, '#5c8fd6');
    x += chipW + gap;
  }
  // zone + clock
  const zone = state.zone && ZONES?.[state.zone];
  // zone name banner
  if (zone) {
    const zw = 132, zh = 26;
    const zx = 160 - zw / 2;
    drawWindow(ctx, zx, 5, zw, zh, { fill: '#241e2a', accent: '#f0c27a' });
    drawText(ctx, zone.name.toUpperCase(), zx + 8, 10, { color: '#f0d8b8' });
    drawText(ctx, (mainObjective && mainObjective() || ''), zx + 8, 18, { color: '#a69c86' });
  }
  const clockW = 54, clockH = 16;
  drawWindow(ctx, 320 - clockW - 8, 5, clockW, clockH, { fill: '#241e2a', accent: '#f0c27a' });
  drawText(ctx, clockLabel ? clockLabel() : 'DUSK', 320 - clockW - 8 + 7, 10, { color: '#d8c8b0' });
}

function drawBar(ctx, x, y, w, ratio, color) {
  pr(ctx, x, y, w, 3, '#1a141a');
  const fill = Math.max(0, Math.min(w, Math.round(w * ratio)));
  if (fill) pr(ctx, x, y, fill, 3, color);
  ctx.strokeStyle = 'rgba(255,255,255,.1)'; ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, 3);
}

// ── interact prompt ──────────────────────────────────────────────────────
export function showInteract(label) {
  const p = $('#interact-prompt');
  if (p) p.classList.add('hidden');
  if (!label) { ui.nearLabel = null; return; }
  const near = dialogue && dialogue.near;
  ui.nearLabel = { x: near ? near.x : 0, y: near ? near.y : 0, text: label };
}

export function renderInteract(ctx, camx, camy, now) {
  const nl = ui.nearLabel;
  if (!nl) return;
  const sx = Math.round(nl.x * TILE - camx);
  const sy = Math.round(nl.y * TILE - camy) - 10;
  const w = measureText(nl.text, 1).width + 14;
  const x = clamp(sx - w / 2 + 8, 6, 320 - w - 6);
  drawWindow(ctx, x, sy, w, 12, { fill: '#262230', accent: '#f0c27a' });
  drawText(ctx, nl.text.toUpperCase(), x + 7, sy + 2, { color: '#e8ddc8' });
}

// ── canvas dialogue render ───────────────────────────────────────────────
export function renderDialogue(ctx, now) {
  const d = dialogue;
  if (!d.open) return;
  const W = 320, H = 180;
  const bw = 284;
  const choiceH = d.choices.length ? d.choices.length * 10 + 6 : 0;
  const bh = 46 + choiceH;
  const bx = 18, by = H - bh - 8;
  drawWindow(ctx, bx, by, bw, bh, { fill: '#241e2a', accent: '#f0c27a' });

  // portrait
  renderPortraitSprite(ctx, d.speaker, bx + 7, by + 7, 30, 36);

  // name
  drawText(ctx, d.speaker.toUpperCase(), bx + 42, by + 6, { color: '#f0c27a' });

  // typing
  if (d.typing) {
    const elapsed = now - d.last;
    d.pos += (elapsed / 14) * 2;
    d.last = now;
    if (d.pos >= d.full.length) { d.pos = d.full.length; d.typing = false; }
  }
  const textColor = '#e8ddc8';
  drawText(ctx, d.full.slice(0, Math.floor(d.pos)), bx + 42, by + 17, {
    color: textColor, wrap: true, maxWidth: bw - 60,
  });

  // choices
  if (d.choices.length) {
    d.hitBoxes = [];
    let cy = by + bh - d.choices.length * 10 - 6;
    d.choices.forEach((o, i) => {
      const sel = i === d.idx;
      const label = (i + 1) + '. ' + o.text + (o.note ? `  <${o.note}>` : '');
      drawChoice(ctx, bx + 10, cy, bw - 20, 9, label, sel, { accent: '#f0c27a' });
      d.hitBoxes.push({ y: cy, h: 9, value: o.value, req: o.req });
      cy += 10;
    });
  } else if (!d.typing) {
    drawArrow(ctx, bx + bw - 14, by + bh - 9, 'down', '#f0c27a');
  }
}

export function canvasDialoguePointer(x, y) {
  const d = dialogue;
  if (!d.open) return false;
  if (d.resolveChoice) {
    for (const hb of d.hitBoxes) {
      if (y >= hb.y && y <= hb.y + hb.h && x >= 28 && x <= 302) {
        if (hb.req === false) return true;
        resolveChoiceIdxLocal(hb.value);
        return true;
      }
    }
    return true;
  }
  if (d.typing) { d.pos = d.full.length; return true; }
  if (d.resolveSay) { audio.sfx('click'); d.resolveSay(); }
  return true;
}

function resolveChoiceIdxLocal(value) {
  const d = dialogue;
  const o = d.choices.find((c) => c.value === value);
  if (!o || o.req === false) return;
  audio.sfx('confirm');
  d.open = false; ui.dialogueOpen = false;
  d.resolveChoice = null;
  d.hitBoxes = [];
  d.resolveSay = null;
  // resolve the choice promise: stored at creation
  if (d._choiceResolve) { const r = d._choiceResolve; d._choiceResolve = null; r(o.value); }
}

function formatDlg(s) {
  return s.replace(/\n/g, '<br>').replace(/\*([^*]+)\*/g, '<em>$1</em>').replace(/"([^"]+)"/g, '<span class="quote">“$1”</span>');
}

// keyboard/tap handling for dialogue
document.addEventListener('click', (e) => {
  if (!ui.dialogueOpen) return;
  const dlg = $('#dialogue');
  if (!dlg.contains(e.target)) return;
  if (e.target.closest('.dlg-choice') || e.target.closest('button')) return;
  advanceDialogue();
});
document.addEventListener('keydown', (e) => {
  if (ui.cinematicOpen) return;
  const d = dialogue;
  if (ui.dialogueOpen && d.open) {
    if (d.resolveChoice && /^[1-9]$/.test(e.key)) {
      e.preventDefault();
      const idx = Number(e.key) - 1;
      if (d.choices[idx] && d.choices[idx].req !== false) {
        audio.sfx('confirm');
        d.idx = idx;
      }
    } else if (d.resolveChoice && (e.key === 'ArrowDown' || e.key === 'ArrowRight')) {
      e.preventDefault();
      d.idx = (d.idx + 1) % d.choices.length;
    } else if (d.resolveChoice && (e.key === 'ArrowUp' || e.key === 'ArrowLeft')) {
      e.preventDefault();
      d.idx = (d.idx - 1 + d.choices.length) % d.choices.length;
    } else if (d.resolveChoice && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      const o = d.choices[d.idx];
      if (o && o.req !== false) resolveChoiceIdxLocal(o.value);
    } else if (!d.resolveChoice && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      advanceDialogue();
    }
    return;
  }
  if (ui.dialogueOpen && ui.resolveChoice && /^[1-9]$/.test(e.key)) {
    e.preventDefault();
    ui.resolveChoice(Number(e.key) - 1);
  }
});

// ── HUD ────────────────────────────────────────────────────────
export function hudSig() {
  return state.party.map((m) => `${m.id}:${m.level}:${m.hp}:${m.mp}`).join('|') + '|' + state.gold;
}

export function renderPartyHud(force = false) {
  const sig = state.party.map((m) => `${m.id}:${m.level}`).join('|');
  if (!force && ui.hudSig === sig) return;
  ui.hudSig = sig;
  const wrap = $('#hud-party');
  wrap.innerHTML = '';
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  for (const m of state.party) {
    const st = statBlock(m);
    const chip = el('div', 'party-chip' + (m.hp < st.maxHp * .3 ? ' low' : ''));
    const face = document.createElement('canvas');
    face.className = 'pc-face';
    face.width = 30 * dpr; face.height = 30 * dpr;
    drawFace(face, m, dpr);
    chip.appendChild(face);
    const mid = el('div', 'pc-mid');
    const top = el('div', 'pc-top');
    top.innerHTML = `<span class="pc-name">${escapeHtml(m.name)}</span><span class="pc-lv">L${m.level}</span>`;
    const bars = el('div', 'pc-bars');
    bars.innerHTML = `<div class="pc-bar hp"><i style="width:${Math.max(0, m.hp / st.maxHp * 100)}%"></i></div><div class="pc-bar mp"><i style="width:${Math.max(0, m.mp / st.maxMp * 100)}%"></i></div>`;
    mid.appendChild(top); mid.appendChild(bars);
    chip.appendChild(mid);
    wrap.appendChild(chip);
  }
}

export function updateHudBars() {
  const chips = $$('#hud-party .party-chip');
  state.party.forEach((m, i) => {
    const chip = chips[i];
    if (!chip) return;
    const st = statBlock(m);
    const hp = chip.querySelector('.hp i'), mp = chip.querySelector('.mp i');
    if (hp) hp.style.width = Math.max(0, m.hp / st.maxHp * 100) + '%';
    if (mp) mp.style.width = Math.max(0, m.mp / st.maxMp * 100) + '%';
    chip.classList.toggle('low', m.hp < st.maxHp * .3);
  });
}

const CLOCK_LABELS = [
  [.18, 'NIGHT'], [.28, 'DAWN'], [.4, 'MORNING'], [.58, 'MIDDAY'], [.7, 'AFTERNOON'], [.8, 'DUSK'], [1.01, 'NIGHT'],
];
export function clockLabel() {
  const t = state.time % 1;
  for (const [end, label] of CLOCK_LABELS) if (t < end) return label;
  return 'NIGHT';
}

export function updateHud(zone) {
  if (!zone) return;
  $('#zone-name').textContent = zone.name;
  $('#quest-hint').textContent = mainObjective();
  $('#hud-clock').textContent = clockLabel();
  renderPartyHud();
  updateHudBars();
}

export function setMinimap(zone, npcs) {
  const c = $('#minimap');
  if (!c) return;
  import('./world-render.js').then(({ drawMinimap }) => drawMinimap(c, zone, state.pos, npcs || []));
}

export function hideHud(hide) {
  $('#hud').classList.toggle('hidden', !!hide);
}

export function touchModeOn() {
  const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0 || matchMedia('(pointer: coarse)').matches;
  document.body.classList.toggle('touch', isTouch);
  if (isTouch || window.innerWidth < 900) document.body.classList.add('show-touch');
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function formatTime(sec) {
  const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export { drawFace, drawPortrait };
