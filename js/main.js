// ── Emberwake boot & scene loop ────────────────────────────────
import {
  state, createHero, loadGameData, hasSave, saveMeta, saveGame, restoreParty, setDifficulty,
} from './state.js';
import { ZONES } from './data/zones.js';
import { audio } from './engine/audio.js';
import { renderTitle } from './engine/title-render.js';
import { renderBattle } from './engine/battle-render.js';
import {
  initWorld, enterZone, world, updateWorld, renderWorldScene, respawnPlayer, setPaused,
} from './world.js';
import { startBattle, battleState } from './battle.js';
import { initCreation, openCreation } from './engine/ui-create.js';
import { initMenu, openMenu, showHelp } from './engine/ui-menu.js';
import { initShop, openShop } from './engine/ui-shop.js';
import { buildEndingData } from './story.js';
import { hooks } from './hooks.js';
import {
  $, showScreen, hideHud, updateHud, fade, toast, escapeHtml, touchModeOn, formatTime,
} from './engine/ui-core.js';

const canvas = $('#game');
const ctx = canvas.getContext('2d');
let viewW = window.innerWidth;
let viewH = window.innerHeight;
let dpr = Math.min(2, window.devicePixelRatio || 1);
let mode = 'title'; // title | create | world | ending
let lastFrame = 0;
let booted = false;

// ── sizing ─────────────────────────────────────────────────────
function resize() {
  const w = Math.max(320, Math.round(window.innerWidth));
  const h = Math.max(320, Math.round(window.innerHeight));
  dpr = Math.min(2, window.devicePixelRatio || 1);
  viewW = w;
  viewH = h;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;
}

// ── scene loop ─────────────────────────────────────────────────
function frame(now) {
  const dt = Math.min(48, Math.max(0, now - (lastFrame || now)));
  lastFrame = now;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (mode === 'world') {
    if (battleState.active) {
      renderBattle(ctx, viewW, viewH, battleState, now);
    } else {
      updateWorld(dt, viewW, viewH);
      renderWorldScene(ctx, viewW, viewH, now);
    }
  } else {
    // Title backdrop remains behind creation and ending screens.
    renderTitle(ctx, viewW, viewH, now);
  }
  requestAnimationFrame(frame);
}

// ── title / menu wiring ────────────────────────────────────────
function updateContinueMeta() {
  const info = saveMeta();
  const btn = $('#btn-continue');
  const meta = $('#continue-meta');
  if (!info) {
    meta.textContent = 'No chronicle yet';
    btn.classList.add('dimmed');
    btn.disabled = true;
    return;
  }
  btn.disabled = false;
  btn.classList.remove('dimmed');
  const zone = ZONES[info.zone]?.name || 'Unknown road';
  const end = info.ending ? ' · Epilogue' : '';
  meta.textContent = `${info.name} · L${info.level}${end} · ${zone} · ${formatTime(info.playtime || 0)}`;
}

function currentSound() {
  return state.settings?.sound !== false;
}

function updateSoundButton() {
  const b = $('#btn-sound');
  if (b) b.textContent = currentSound() ? 'Sound · On' : 'Sound · Off';
}

function initTitle() {
  $('#btn-new').onclick = () => {
    audio.init();
    audio.sfx('confirm');
    // A brand-new first chronicle: clear continuation state.
    state.ngPlus = 0;
    state.legacy = false;
    state.legacyEnding = null;
    state.legacyName = null;
    state.legacyClass = null;
    state.ending = null;
    mode = 'create';
    hideHud(true);
    showScreen('screen-create');
    audio.setScene('title');
    openCreation();
  };

  $('#btn-continue').onclick = () => {
    audio.init();
    if (!hasSave()) { toast('No chronicle to continue.', '·'); audio.sfx('error'); return; }
    audio.sfx('confirm');
    continueGame();
  };

  $('#btn-help').onclick = () => { audio.init(); audio.sfx('page'); showHelp(); };

  $('#btn-sound').onclick = () => {
    audio.init();
    state.settings.sound = !currentSound();
    audio.setEnabled(state.settings.sound);
    audio.sfx('click');
    updateSoundButton();
    if (state.started) saveGame(true);
  };

  $('#btn-fullscreen').onclick = async () => {
    audio.init();
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.();
      else await document.exitFullscreen?.();
    } catch {
      toast('Fullscreen is unavailable in this browser.', '·');
    }
    setTimeout(resize, 120);
  };

  $('#btn-ngplus').onclick = () => {
    audio.sfx('confirm');
    // Carry the completed chronicle into a harder continuation.
    state.ngPlus = Math.max(1, (state.ngPlus || 0) + 1);
    state.legacy = true;
    state.legacyEnding = state.ending || state.flags?.ending || null;
    state.legacyName = state.heroName;
    state.legacyClass = state.heroClass;
    state.ending = null;
    state.act = 0;
    state.chapter = 'Prologue';
    mode = 'create';
    hideHud(true);
    showScreen('screen-create');
    audio.setScene('title');
    openCreation();
  };

  $('#btn-ending-menu').onclick = () => {
    audio.sfx('cancel');
    returnToTitle();
  };

  window.addEventListener('emberwake:menu', () => {
    if (mode !== 'world' || world.paused || battleState.active) return;
    openMenu('status');
  });
  document.addEventListener('fullscreenchange', () => setTimeout(resize, 120));
  window.addEventListener('orientationchange', () => setTimeout(resize, 240));
  window.addEventListener('resize', resize);
}

// ── game start ─────────────────────────────────────────────────
function beginWorld(zoneId, x, y) {
  if (!ZONES[zoneId]) zoneId = 'hearthfall';
  showScreen(null);
  hideHud(false);
  mode = 'world';
  world.paused = false;
  enterZone(zoneId, x, y);
  updateHud(ZONES[zoneId]);
  updateContinueMeta();
}

function continueGame() {
  if (!loadGameData()) {
    toast('The chronicle could not be opened.', '!');
    return;
  }
  audio.setEnabled(currentSound());
  updateSoundButton();
  if (state.ending) {
    state.act = 4;
    state.chapter = 'Epilogue';
    showEnding(buildEndingData(state.ending));
    return;
  }
  const z = ZONES[state.zone] ? state.zone : 'hearthfall';
  beginWorld(z, state.pos?.x, state.pos?.y);
}

function returnToTitle() {
  mode = 'title';
  world.paused = true;
  hideHud(true);
  for (const id of ['menu', 'shop', 'dialogue', 'cinematic', 'modal', 'battleUI']) {
    $('#' + id)?.classList.add('hidden');
  }
  showScreen('screen-title');
  audio.setScene('title');
  updateContinueMeta();
  updateSoundButton();
}

// ── endings ────────────────────────────────────────────────────
function showEnding(data) {
  if (!data) return;
  mode = 'ending';
  world.paused = true;
  hideHud(true);
  $('#ending-kicker').textContent = data.kicker || 'EPILOGUE';
  $('#ending-title').textContent = data.title || 'Dawnforge';
  $('#ending-body').innerHTML = data.body || '';
  $('#ending-choices').innerHTML = (data.choices || [])
    .map((c) => `<div><b>${escapeHtml(c.label)}</b><span>${escapeHtml(c.value)}</span></div>`)
    .join('');
  showScreen('screen-ending');
  audio.setScene('ending');
  updateContinueMeta();
  saveGame(true);
}

// ── hooks ──────────────────────────────────────────────────────
function wireHooks() {
  hooks.newGame = ({ name, classId, origin, palette, bonus }) => {
    createHero({ name, classId, origin, palette, extra: { bonus } });
    restoreParty(true);
    state.started = true;
    state.act = 0;
    state.chapter = 'Prologue';
    saveGame(true);
    beginWorld('hearthfall', 15, 14);
  };

  hooks.continueGame = continueGame;
  hooks.returnToTitle = returnToTitle;
  hooks.openMenu = (tab = 'status') => openMenu(tab);
  hooks.openWorldMap = () => openMenu('map');
  hooks.openShop = (id) => openShop(id);
  hooks.save = (auto = true) => saveGame(auto);
  hooks.setPaused = (v) => setPaused(v);
  hooks.setDifficulty = (d) => setDifficulty(d);

  hooks.startBattle = (opts) => startBattle(opts);
  hooks.respawn = () => {
    respawnPlayer();
    updateHud(world.zone);
    saveGame(true);
  };

  hooks.travel = async (zoneId, x, y, opts = {}) => {
    if (!ZONES[zoneId]) return;
    world.paused = true;
    audio.sfx('portal');
    await fade(true, 280);
    enterZone(zoneId, x, y);
    updateHud(world.zone);
    await fade(false, 380);
    world.paused = !!opts.keepPaused;
    saveGame(true);
  };

  hooks.endGame = (data) => showEnding(data);
}

// ── boot ───────────────────────────────────────────────────────
function boot() {
  if (booted) return;
  booted = true;
  resize();
  touchModeOn();
  initWorld();
  initCreation();
  initMenu();
  initShop();
  initTitle();
  wireHooks();
  updateContinueMeta();
  updateSoundButton();
  audio.setEnabled(currentSound());
  audio.setScene('title');

  // Audio contexts require a gesture. The first one also starts the title theme.
  const wake = () => {
    audio.init();
    audio.setEnabled(currentSound());
    if (mode === 'title' || mode === 'create') audio.setScene('title');
    document.removeEventListener('pointerdown', wake);
    document.removeEventListener('keydown', wake);
  };
  document.addEventListener('pointerdown', wake, { passive: true });
  document.addEventListener('keydown', wake);

  window.addEventListener('beforeunload', () => {
    if (state.started && !state.ending) saveGame(true);
  });

  requestAnimationFrame((now) => { lastFrame = now; frame(now); });
}

boot();
