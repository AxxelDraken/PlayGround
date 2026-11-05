// ── Shop interface ─────────────────────────────────────────────
import { state, addGold, addItem, addGear } from '../state.js';
import { ITEMS, SHOP_STOCK, SELL_RATE } from '../data/items.js';
import { audio } from './audio.js';
import { $, el, escapeHtml, toast } from './ui-core.js';

const SHOPS = {
  hearthfall: {
    kicker: 'HEARTHFALL', name: 'The Ember Forge', keeper: 'Barda',
    talk: () => [
      `Barda wipes soot from her brow. <b>“Steel is honest. It only fails when the hand does.”</b>`,
      `“Take the embersteel if you can carry it. And bring back your blades unbroken — I hate wasted metal.”`,
      state.flags.prologueDone
        ? `“The whole village saw the flame answer you. Don't let it go to your head. Or do. Just come back.”`
        : `“The festival has everyone skittish. Even the coals are whispering.”`,
    ],
  },
  mosswood: {
    kicker: 'MOSSWOOD', name: "Trader Quill's Cart", keeper: 'Quill',
    talk: () => [
      `Quill counts coins with one hand and sorts roots with the other. <b>“Roads are bad. Prices are worse. That's how you know I'm honest.”</b>`,
      `“Moonpetals? I buy them when I can. The Witch of Mire pays better, if you've the stomach for the marsh.”`,
      state.flags.groveChoice === 'freewood'
        ? `“The Freewood is singing again. They say the grove chose a side. I say groves don't choose — people do.”`
        : state.flags.groveChoice === 'warden'
          ? `“The Wardens hold the grove. Order, they call it. I call it a very old fence.”`
          : `“The Grove is that way. Whatever you hear, don't answer the trees.”`,
    ],
  },
  mire: {
    kicker: 'THE DROWNED SHRINE', name: "The Witch's Hollow", keeper: 'The Witch of Mire',
    talk: () => [
      `The Witch arranges bottles that should not exist. <b>“Mireglass is cheaper than a funeral. Consider the economics.”</b>`,
      state.quests?.moonpetal?.status === 'active'
        ? `“Three silver flowers. You have ${Math.min(3, state.inventory.moonpetal || 0)}. The marsh is patient. I am not.”`
        : `“Bring me moonpetals when the mood takes you. I pay in things the road cannot sell.”`,
      `“The drowned ones are not ghosts. They are promises nobody kept. Be careful which promises you make here.”`,
    ],
  },
  peaks: {
    kicker: 'CINDER PEAKS', name: 'Ashen Order Forge', keeper: 'Forge-Mother Hessa',
    talk: () => [
      `Hessa works the bellows without looking up. <b>“The Order forges chains. Sometimes swords. You're buying the swords.”</b>`,
      `“Dawnblade? Aye. The first light, trapped in steel. It costs more than most villages earn in a year.”`,
      state.flags.peaksChoice === 'order'
        ? `“Malrec says you're with us. Then stand straight. The mountain can smell doubt.”`
        : `“You refused Malrec. Good. He's not wrong, exactly. That's what makes him dangerous.”`,
    ],
  },
};

let current = null;
let currentShopId = null;
let tab = 'buy';
let resolveClose = null;
let initialized = false;

const shopDef = (id) => SHOPS[id] || SHOPS.hearthfall;

export function initShop() {
  if (initialized) return;
  initialized = true;
  $('#btn-shop-close').onclick = () => { audio.sfx('cancel'); closeShop(); };
  $('#shop').addEventListener('click', (e) => { if (e.target.id === 'shop') closeShop(); });
  document.querySelectorAll('#shop .shop-tabs [data-shoppane]').forEach((b) => {
    b.onclick = () => {
      tab = b.dataset.shoppane;
      audio.sfx('click');
      paint();
    };
  });
  document.addEventListener('keydown', (e) => {
    if ($('#shop').classList.contains('hidden')) return;
    if (e.key === 'Escape') { e.preventDefault(); closeShop(); }
  });
}

export function openShop(shopId) {
  initShop();
  if (resolveClose) { const r = resolveClose; resolveClose = null; r(); }
  currentShopId = SHOP_STOCK[shopId] ? shopId : 'hearthfall';
  current = shopDef(currentShopId);
  tab = 'buy';
  $('#shop').classList.remove('hidden');
  audio.sfx('page');
  paint();
  return new Promise((resolve) => { resolveClose = resolve; });
}

function closeShop() {
  $('#shop').classList.add('hidden');
  current = null;
  currentShopId = null;
  const r = resolveClose;
  resolveClose = null;
  if (r) r();
}

function paint() {
  if (!current) return;
  const def = current;
  $('#shop-kicker').textContent = def.kicker;
  $('#shop-title').textContent = def.name;
  $('#shop-gold').textContent = `${state.gold} g`;
  document.querySelectorAll('#shop .shop-tabs [data-shoppane]').forEach((b) => b.classList.toggle('on', b.dataset.shoppane === tab));
  const hint = $('#shop-hint');
  const content = $('#shop-content');
  content.innerHTML = '';
  if (tab === 'buy') {
    hint.textContent = 'Tap Buy to purchase. Gear is shared by the whole party and can be equipped from the Satchel.';
    renderBuy(content);
  } else if (tab === 'sell') {
    hint.textContent = `Sell for half value. Quest items, Emberkeys, and equipped gear cannot be sold here.`;
    renderSell(content);
  } else {
    hint.textContent = `${def.keeper} has more to say, if you have the time.`;
    renderTalk(content, def);
  }
  $('#shop-gold').textContent = `${state.gold} g`;
}

function itemStats(it) {
  if (!it?.stats) return it?.desc || '';
  const bonus = Object.entries(it.stats).map(([k, v]) => `${k.toUpperCase()} +${v}`).join(' · ');
  return `${bonus}${it.desc ? ' — ' + it.desc : ''}`;
}

function renderBuy(box) {
  const stock = SHOP_STOCK[currentShopId] || [];
  if (!stock.length) {
    box.appendChild(el('div', 'menu-empty', 'The shelves are bare.'));
    return;
  }
  for (const id of stock) {
    const it = ITEMS[id];
    if (!it) continue;
    const owned = it.type === 'gear' ? state.gearOwned.filter((g) => g === id).length : (state.inventory[id] || 0);
    const row = el('div', 'shop-row' + (owned > 0 && it.type === 'gear' ? ' owned' : ''));
    row.innerHTML = `<span class="sr-ic">${it.icon || '❖'}</span>
      <span class="sr-main">
        <span class="sr-name">${escapeHtml(it.name)} ${owned ? `<span style="color:var(--ink-faint);font-size:9px">owned ${owned}</span>` : ''}</span>
        <span class="sr-desc">${escapeHtml(it.desc || '')}</span>
        ${it.stats ? `<span class="sr-bonus">${Object.entries(it.stats).map(([k, v]) => `${k.toUpperCase()} +${v}`).join(' · ')}</span>` : ''}
      </span>
      <span class="sr-price">${it.price} g</span>`;
    const buy = el('button', 'btn primary', 'Buy');
    buy.disabled = state.gold < it.price;
    buy.onclick = () => {
      if (state.gold < it.price) { audio.sfx('error'); toast('Not enough gold.', '◈'); return; }
      addGold(-it.price);
      if (it.type === 'gear') addGear(id); else addItem(id, 1);
      audio.sfx('chest');
      toast(`Bought ${it.name}.`, '❖');
      paint();
    };
    row.appendChild(buy);
    box.appendChild(row);
  }
}

function sellableEntries() {
  const entries = [];
  for (const [id, n] of Object.entries(state.inventory)) {
    const it = ITEMS[id];
    if (!it || n <= 0) continue;
    if (it.type === 'quest' || it.type === 'key') continue;
    entries.push({ id, n, gear: false });
  }
  const gearCount = {};
  for (const id of state.gearOwned) gearCount[id] = (gearCount[id] || 0) + 1;
  for (const [id, n] of Object.entries(gearCount)) {
    const it = ITEMS[id];
    if (!it || it.type !== 'gear') continue;
    entries.push({ id, n, gear: true });
  }
  return entries;
}

function renderSell(box) {
  const entries = sellableEntries();
  if (!entries.length) {
    box.appendChild(el('div', 'menu-empty', 'Nothing to sell. The road keeps what it takes.'));
    return;
  }
  for (const { id, n, gear } of entries) {
    const it = ITEMS[id];
    const price = Math.max(1, Math.floor((it.price || 0) * SELL_RATE));
    const row = el('div', 'shop-row');
    row.innerHTML = `<span class="sr-ic">${it.icon || '❖'}</span>
      <span class="sr-main">
        <span class="sr-name">${escapeHtml(it.name)} ${n > 1 ? `<span style="color:var(--ink-faint);font-size:9px">×${n}</span>` : ''}</span>
        <span class="sr-desc">${escapeHtml(gear ? itemStats(it) : (it.desc || ''))}</span>
      </span>
      <span class="sr-price">${price} g</span>`;
    const sell = el('button', 'btn ghost', 'Sell');
    sell.onclick = () => {
      if (gear) {
        const idx = state.gearOwned.indexOf(id);
        if (idx === -1) { audio.sfx('error'); toast('That gear is equipped.', '!'); return; }
        state.gearOwned.splice(idx, 1);
      } else {
        if (!state.inventory[id]) return;
        state.inventory[id]--;
        if (state.inventory[id] <= 0) delete state.inventory[id];
      }
      addGold(price);
      audio.sfx('chest');
      toast(`Sold ${it.name} for ${price} g.`, '❖');
      paint();
    };
    row.appendChild(sell);
    box.appendChild(row);
  }
}

function renderTalk(box, def) {
  const wrap = el('div', 'shop-talk');
  const lines = def.talk();
  wrap.innerHTML = `<p style="margin:0 0 12px;color:var(--ink-faint);font-size:9px;letter-spacing:.18em;text-transform:uppercase">${escapeHtml(def.keeper)}</p>` +
    lines.map((l) => `<p style="margin:0 0 13px">${l}</p>`).join('');
  const leave = el('button', 'btn primary', 'Leave the counter');
  leave.onclick = () => { audio.sfx('cancel'); closeShop(); };
  wrap.appendChild(leave);
  box.appendChild(wrap);
}
