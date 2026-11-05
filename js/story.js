// ── Story threads, choices, quests, bosses, and endings ────────
import {
  state, addItem, removeItem, addGold, addGear, joinCompanion, restoreParty,
  startQuest, completeQuest, addXp, countKeys, saveGame, hero,
} from './state.js';
import { ZONES } from './data/zones.js';
import { ITEMS } from './data/items.js';
import { audio } from './engine/audio.js';
import { startBattle } from './battle.js';
import { openShop } from './engine/ui-shop.js';
import { hooks } from './hooks.js';
import {
  say, choice, modal, cinematic, toast, fade, updateHud, escapeHtml, $,
} from './engine/ui-core.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── command shorthands ─────────────────────────────────────────
const SAY = (who, text, opts = {}) => ({ t: 'say', who, text, ...opts });
const NARRATE = (text) => SAY('Narrator', text);
const CHOICE = (options) => ({ t: 'choice', options });
const FLAG = (key, value = true) => ({ t: 'flag', key, value });
const GIVE = (item, n = 1) => ({ t: 'give', item, n });
const TAKE = (item, n = 1) => ({ t: 'take', item, n });
const GEAR = (item) => ({ t: 'gear', item });
const GOLD = (n) => ({ t: 'gold', n });
const JOIN = (id) => ({ t: 'join', id });
const BATTLE = (enemies, opts = {}) => ({ t: 'battle', enemies, ...opts });
const SHOP = (id) => ({ t: 'shop', id });
const HEAL = () => ({ t: 'heal' });
const REST = (checkpoint = null) => ({ t: 'rest', checkpoint });
const TOAST = (text, icon = '✦', ms = 3000) => ({ t: 'toast', text, icon, ms });
const CINEMA = (lines, opts = {}) => ({ t: 'cinematic', lines, opts });
const MODAL = (opts) => ({ t: 'modal', ...opts });
const WAIT = (ms) => ({ t: 'wait', ms });
const MUSIC = (name) => ({ t: 'music', name });
const SFX = (name) => ({ t: 'sfx', name });
const XP = (n) => ({ t: 'xp', n });
const SP = (n) => ({ t: 'sp', n });
const QUEST = (id, status) => ({ t: 'quest', id, status });
const KEY = (item, flag) => ({ t: 'key', item, flag });
const ACT = () => ({ t: 'act' });
const END = (id) => ({ t: 'ending', id });
const SAVE = () => ({ t: 'save' });
const HUD = () => ({ t: 'hud' });

const heroMember = () => state.party.find((m) => m.id === 'hero') || state.party[0];
const hasMember = (id) => state.party.some((m) => m.id === id);
const nm = (id) => state.party.find((m) => m.id === id)?.name || id;

function currentZone() { return ZONES[state.zone] || ZONES.hearthfall; }

function refreshAct() {
  countKeys();
  if (state.ending) { state.act = 4; state.chapter = 'Epilogue'; return; }
  if (state.zone === 'citadel' && state.keys >= 3) {
    state.act = 3;
    state.chapter = 'Act III · The Ashen Crown';
    return;
  }
  if (state.keys >= 3) {
    state.act = Math.max(2, state.act || 0);
    state.chapter = 'Act II · The Hollow Citadel';
    return;
  }
  if (state.flags.prologueDone) {
    state.act = Math.max(1, state.act || 0);
    state.chapter = 'Act I · The Three Emberkeys';
  }
}

function syncHud() {
  refreshAct();
  updateHud(currentZone());
}

// ── story runner ───────────────────────────────────────────────
export async function runStory(story, ctx = {}) {
  if (!story) return { done: true };
  let gen;
  try {
    gen = typeof story === 'function' ? story(ctx) : story;
  } catch (err) {
    console.error('Story begin error', err);
    throw err;
  }
  if (!gen || typeof gen.next !== 'function') return { done: true };
  let step = gen.next();
  while (!step.done) {
    const result = await exec(step.value, ctx);
    if (result && result.__abort) return { aborted: true, result };
    step = gen.next(result);
  }
  return { done: true, value: step.value };
}

async function exec(cmd, ctx) {
  if (!cmd || typeof cmd !== 'object') return undefined;
  switch (cmd.t) {
    case 'say':
      if (cmd.who && cmd.text) await say(cmd.who, cmd.text, { portrait: cmd.portrait });
      return undefined;
    case 'choice':
      return await choice(cmd.options || []);
    case 'flag':
      state.flags[cmd.key] = cmd.value;
      return cmd.value;
    case 'give': {
      const it = ITEMS[cmd.item];
      if (!it) return false;
      if (it.type === 'gear') addGear(cmd.item); else addItem(cmd.item, cmd.n || 1);
      toast(`${it.name}${cmd.n > 1 ? ' ×' + cmd.n : ''} obtained.`, it.icon || '❖');
      return true;
    }
    case 'take':
      removeItem(cmd.item, cmd.n || 1);
      return true;
    case 'gear':
      addGear(cmd.item);
      toast(`${ITEMS[cmd.item]?.name || cmd.item} obtained.`, ITEMS[cmd.item]?.icon || '⚔');
      return true;
    case 'gold':
      if (cmd.n >= 0) { addGold(cmd.n); toast(`+${cmd.n} gold`, '◈'); }
      else addGold(cmd.n);
      syncHud();
      return true;
    case 'join': {
      if (hasMember(cmd.id)) return { already: true };
      const ok = joinCompanion(cmd.id);
      if (ok) {
        const m = state.party[state.party.length - 1];
        toast(`${m.name} joins the party.`, '✦', 3600);
        audio.sfx('levelup');
        syncHud();
      } else {
        toast('Your party is full.', '·');
      }
      return { ok };
    }
    case 'battle': {
      const res = await startBattle({
        zone: currentZone(),
        enemies: cmd.enemies || [],
        boss: !!cmd.boss,
        bossName: cmd.bossName || null,
        canFlee: cmd.canFlee !== false,
      });
      if (res?.defeat) {
        await fade(true, 320);
        toast('The crystal pulls you back from the dark.', '✦', 3200);
        restoreParty(true);
        hooks.respawn?.();
        await fade(false, 440);
        return { __abort: true, defeat: true };
      }
      syncHud();
      saveGame(true);
      return res || {};
    }
    case 'shop':
      await (hooks.openShop ? hooks.openShop(cmd.id) : openShop(cmd.id));
      return true;
    case 'heal':
      restoreParty(true);
      syncHud();
      toast('The party is fully restored.', '❖');
      return true;
    case 'rest': {
      restoreParty(true);
      state.time = .24;
      if (cmd.checkpoint) state.flags.lastCrystal = { ...cmd.checkpoint };
      syncHud();
      saveGame(true);
      toast('You rest. Wounds close; the road waits.', '☾');
      return true;
    }
    case 'toast':
      toast(cmd.text, cmd.icon || '✦', cmd.ms || 3000);
      return true;
    case 'cinematic':
      await cinematic(cmd.lines || [], cmd.opts || {});
      return true;
    case 'modal':
      return await modal(cmd);
    case 'wait':
      await sleep(cmd.ms || 300);
      return true;
    case 'music':
      audio.setScene(cmd.name || 'explore');
      return true;
    case 'sfx':
      audio.sfx(cmd.name || 'click');
      return true;
    case 'xp': {
      const levels = [];
      for (const m of state.party) {
        const gained = addXp(m, cmd.n || 0);
        if (gained.length) levels.push(`${m.name} reached level ${m.level}`);
      }
      for (const l of levels) toast(l, '✧', 3600);
      syncHud();
      return true;
    }
    case 'sp': {
      const h = heroMember();
      if (h) h.sp += cmd.n || 1;
      toast(`+${cmd.n || 1} skill point${(cmd.n || 1) === 1 ? '' : 's'}.`, '✦');
      syncHud();
      return true;
    }
    case 'quest':
      if (cmd.status === 'active') startQuest(cmd.id);
      else if (cmd.status === 'done') completeQuest(cmd.id);
      return true;
    case 'key':
      if (!state.inventory[cmd.item]) {
        addItem(cmd.item, 1);
        toast(`${ITEMS[cmd.item]?.name || 'Key'} claimed.`, '✧', 3800);
        audio.sfx('levelup');
      }
      state.flags[cmd.flag] = true;
      countKeys();
      syncHud();
      saveGame(true);
      return true;
    case 'act':
      syncHud();
      return true;
    case 'hud':
      updateHud(currentZone());
      return true;
    case 'save':
      saveGame(true);
      return true;
    case 'ending':
      return await finishEnding(cmd.id, ctx);
    default:
      console.warn('Unknown story command', cmd);
      return undefined;
  }
}

async function finishEnding(id, ctx) {
  const data = buildEndingData(id, ctx);
  state.ending = id;
  state.act = 4;
  state.chapter = 'Epilogue';
  state.flags.ending = id;
  saveGame(true);
  if (hooks.endGame) hooks.endGame(data);
  else {
    audio.setScene('ending');
    $('#screen-ending')?.classList.remove('hidden');
  }
  return { ending: id };
}

// ═══════════════════════════════════════════════════════════════
// HEARTHFALL
// ═══════════════════════════════════════════════════════════════
export function* hearthfall_intro() {
  audio.setScene('explore');
  if (state.ngPlus > 0) {
    yield CINEMA([
      'The flame remembers another ending. It remembers *you*.',
      'Hearthfall is smaller than you left it. The same smoke, the same bells, the same fear behind the shutters.',
      'On the eve of Emberwake, the village waits for a hero it does not yet know.',
    ], { title: 'THE CONTINUATION', kicker: `CHRONICLE ${state.ngPlus + 1}` });
  } else {
    yield CINEMA([
      'Every year, on the eve of Emberwake, the people of Hearthfall carry a coal from their hearth to the square.',
      'They feed it to the old flame and ask the dark to stay outside the walls one more winter.',
      'This year, the dark has learned to knock.',
    ], { title: 'HEARTHFALL', kicker: 'PROLOGUE · THE EMBERWAKE EVE' });
  }
  yield NARRATE('The festival lanterns are lit, but no one is laughing. Elder Maro stands by the central fire, watching the tree line.');
  yield TOAST('Find Elder Maro by the festival fire in the square.', '✦', 4600);
}

export function* elder() {
  const h = heroMember();
  if (!state.flags.prologueDone) {
    yield SAY('Elder Maro', `So the flame chose you after all, ${h?.name || 'child'}. I had hoped it would choose someone older. Someone with less to lose.`);
    yield SAY('Elder Maro', 'The Emberwake is failing. Three Emberkeys seal the Hollow Citadel, and the thing that wears the Ashen Crown has begun to pull at them.');
    const ask = yield CHOICE([
      { text: 'What is the Ashen Crown?', value: 'crown' },
      { text: 'Tell me what must be done.', value: 'ready' },
      { text: 'Why me?', value: 'why' },
    ]);
    if (ask === 'crown') {
      yield SAY('Elder Maro', 'A crown of fire and iron, forged when the first age burned. It was meant to hold a dying world together. Instead it taught its wearer to rule the ashes.');
      yield SAY('Elder Maro', 'Vaelor was a hero once. Now he sits in the Hollow Citadel and calls the end of the world a kindness.');
    } else if (ask === 'why') {
      yield SAY('Elder Maro', 'Because you were standing closest to the fire when it answered. Because the flame does not ask permission.');
      yield SAY('Elder Maro', 'And because I am too old to carry a sword, and too proud to watch someone else do it badly.');
    } else {
      yield SAY('Elder Maro', 'Three keys. Thorn, Tide, and Cinder. Find them, and the Citadel will open. Or the Crown will come out, and there will be no village left to defend.');
    }
    yield SAY('Elder Maro', 'You will not go alone. Kael owes this village a debt. He will walk the road with you.');
    yield JOIN('kael');
    yield SAY('Kael', 'I remember the debt. Do not make me regret remembering it.');
    yield NARRATE('A shriek tears through the festival music. Embers rise from the central fire — and take shape.');
    yield SFX('magic');
    const won = yield BATTLE([
      { id: 'ashling', level: 1 }, { id: 'ashling', level: 1 },
    ], { canFlee: true });
    if (!won?.victory) return;
    yield NARRATE('The last spark bursts against the stones. The square is quiet again, except for the crackle of coals.');
    yield SAY('Elder Maro', 'They came for the flame. It knows you now. It will not stop.');
    yield SAY('Elder Maro', 'Take this. The Hearthsigil. It was my mother\'s, and hers before. It will mark you as a friend of every hearth that still burns.');
    yield GIVE('hearthsigil', 1);
    yield GIVE('tonic', 3);
    yield GOLD(80);
    yield SAY('Kael', 'The Emberkeys are in Greenwood, the Ashen Mire, and the Cinder Peaks. Any order. None of the roads are kind.');
    yield SAY('Elder Maro', 'Rest at the crystal when you can. It remembers the last place you stood. And child — come back.');
    yield FLAG('prologueDone', true);
    yield FLAG('emberwakeStarted', true);
    yield QUEST('braziers', 'active');
    yield ACT();
    yield SAVE();
    yield TOAST('The road opens. Three Emberkeys wait in Greenwood, the Mire, and the Peaks.', '✦', 5200);
    return;
  }

  // post-prologue
  if (state.keys >= 3) {
    yield SAY('Elder Maro', 'Three keys. I can feel them from here, humming like a struck bell.');
    yield SAY('Elder Maro', 'The Hollow Citadel stands at the top of the Cinder Peaks. The Order has kept the way open. Do not mistake that for friendship.');
    yield SAY('Kael', 'Vaelor will know we are coming.');
    yield SAY('Elder Maro', 'Let him. A man who has waited three hundred years should be ready for guests.');
  } else if (state.keys === 2) {
    yield SAY('Elder Maro', 'Two keys. The third will be watching for you. They always are, at the end.');
    yield SAY('Elder Maro', 'Greenwood, the Mire, the Peaks. One road remains. Walk it with your eyes open.');
  } else if (state.keys === 1) {
    yield SAY('Elder Maro', 'One key. The flame in the square burned blue all night. That is either hope or warning.');
    yield SAY('Elder Maro', 'Follow the road. The other two keys will not come to you.');
  } else {
    yield SAY('Elder Maro', 'The Emberwake has chosen you. The keys are out there, and the Crown is pulling at the seams of the world.');
    yield SAY('Elder Maro', 'Begin with Greenwood, the Mire, or the Peaks. There is no wrong order. Only wrong choices.');
  }
  if (state.flags.groveChoice === 'warden') yield SAY('Elder Maro', 'They say the Wardens hold the Greenwood now. Order is a kind of fire too. It warms, and it burns.');
  if (state.flags.groveChoice === 'freewood') yield SAY('Elder Maro', 'The Freewood sings again. I have not heard that song since I was a boy. Try not to let it go quiet.');
  if (state.flags.sparedWitch) yield SAY('Elder Maro', 'The Witch of Mire still sends medicine upriver. I do not ask what she wants in return.');
}

export function* smith() {
  yield SAY('Barda', 'Steel or stories? I have more of the first. The second I trade for coin.');
  const pick = yield CHOICE([
    { text: 'Show me your wares.', value: 'shop' },
    { text: 'Tell me about the Emberwake.', value: 'lore' },
  ]);
  if (pick === 'lore') {
    yield SAY('Barda', 'My grandmother forged the last Hearthsigil. She said the Crown was not evil. It was hungry. There is a difference, and it matters.');
    yield SAY('Barda', 'If you find a blade with a name, bring it to me. Names are heavier than they look.');
  }
  yield SAY('Barda', 'Mind the edge. It is older than you.');
  yield SHOP('hearthfall');
}

export function* innkeeper() {
  yield SAY('Nessa', 'You look like the road chewed you up and spat you back out. Sit. The stew is mostly turnip, but the fire is honest.');
  if (state.gold >= 12) {
    const yes = yield CHOICE([
      { text: 'Rest for 12 gold.', value: 'rest' },
      { text: 'Just talk for now.', value: 'talk' },
    ]);
    if (yes === 'rest') {
      yield GOLD(-12);
      yield REST({ zone: 'hearthfall', x: 14, y: 13 });
      yield SAY('Nessa', 'There. Whatever is chasing you can wait until morning. It usually does.');
      return;
    }
  } else {
    yield SAY('Nessa', 'You are short on coin. Sleep by the hearth. I will not have it said that Hearthfall turned a hero out into the ash.');
    yield REST({ zone: 'hearthfall', x: 14, y: 13 });
    return;
  }
  yield SAY('Nessa', 'The inn was full of pilgrims last week. Now it is full of people who used to live in Mosswood. The roots started screaming, they said.');
  yield SAY('Nessa', 'If you see my sister in Greenwood, tell her the kettle is still on.');
}

export function* herbalist() {
  yield SAY('Yara', 'Moonpetals, emberleaf, and a little grief. That is most of my trade.');
  if (!state.flags.herbGift) {
    yield SAY('Yara', 'Here. A tonic for the road. Do not drink it all at once unless something is trying to eat you.');
    yield GIVE('tonic', 2);
    yield FLAG('herbGift', true);
  }
  const pick = yield CHOICE([
    { text: 'Ask about moonpetals.', value: 'moon' },
    { text: 'Ask about the ashfall.', value: 'ash' },
  ]);
  if (pick === 'moon') {
    yield SAY('Yara', 'They bloom in deep Greenwood shade. The Witch of Mire pays well for them. She also pays in ways that are difficult to spend.');
    if (state.quests.moonpetal.status === 'active') yield SAY('Yara', `You have ${Math.min(3, state.inventory.moonpetal || 0)}. Bring her three and she may stop sending frogs to my door.`);
  } else {
    yield SAY('Yara', 'It falls slower than it should. Like the sky is deciding where to put it. I do not like a sky that hesitates.');
  }
}

export function* child() {
  yield SAY('Pip', 'You are the one the fire talked to! Everyone is pretending not to look at you, but they are looking.');
  if (!state.flags.pipGift) {
    const play = yield CHOICE([
      { text: 'Play hide-and-seek.', value: 'play' },
      { text: 'Ask what the grown-ups are afraid of.', value: 'ask' },
    ]);
    if (play === 'play') {
      yield NARRATE('Pip vanishes behind a rain barrel and reappears three heartbeats later, breathless and delighted.');
      yield SAY('Pip', 'You are bad at hiding. That is good. Monsters are bad at it too. Here — I found this by the pond.');
      yield GIVE('ether', 1);
      yield FLAG('pipGift', true);
    } else {
      yield SAY('Pip', 'The dark. But not the normal dark. The dark with a crown.');
      yield SAY('Pip', 'My mum says if I am scared I should think of the fire. I have been thinking about it a lot. It is getting tired.');
      yield FLAG('pipGift', true);
    }
  } else {
    yield SAY('Pip', 'Are you going to the forest? Bring me back a feather. A big one. Not from a chicken.');
  }
}

export function* seer() {
  const cls = state.heroClass;
  const origin = state.heroOrigin;
  yield SAY('Seer Oma', 'Sit where the smoke can see you. It is impolite to make a prophecy guess.');
  if (origin === 'scholar') yield SAY('Seer Oma', 'You read the old runes and thought they were dead. They were only waiting for someone with enough patience to be dangerous.');
  else if (origin === 'outcast') yield SAY('Seer Oma', 'The road raised you. It taught you to leave before the door closes. One day you will have to stay.');
  else yield SAY('Seer Oma', 'The hearth raised you. That is why the flame knows your name. It is also why it will ask you to burn for it.');
  if (cls === 'vanguard') yield SAY('Seer Oma', 'You will stand where others fall. Make sure there is someone left standing behind you.');
  else if (cls === 'emberweaver') yield SAY('Seer Oma', 'Fire is a poor master and a worse friend. You will learn the difference before the end.');
  else if (cls === 'shadowblade') yield SAY('Seer Oma', 'The quiet path finds the Crown first. It will also find the parts of you you left behind.');
  else if (cls === 'warden') yield SAY('Seer Oma', 'The old roots are listening. They have been waiting a long time for a gardener with a sword.');
  else if (cls === 'stormcaller') yield SAY('Seer Oma', 'The sky is full of old anger. You will have to decide which bolts to throw, and which to let fall.');
  else if (cls === 'ronin') yield SAY('Seer Oma', 'A blade without a lord cuts its own path. Be careful not to cut the people walking beside you.');
  yield SAY('Seer Oma', 'Three keys, three choices, one crown. The flame remembers every one. Especially the ones you think no one saw.');
  if (state.ngPlus > 0) yield SAY('Seer Oma', 'You have done this before. I can see the ash of another ending on your sleeves. It did not make you lighter.');
  if (!state.flags.seerGift) {
    yield GIVE('ether', 2);
    yield FLAG('seerGift', true);
    yield SAY('Seer Oma', 'Take these. Prophecy is thirsty work.');
  }
}

export function* guard() {
  yield SAY('Guard Rhen', 'The south gate leads to the Emberfield. East road goes to Greenwood, if the forest lets you through. South of the field, the Mire.');
  if (!state.flags.prologueDone) {
    yield SAY('Guard Rhen', 'Stay close to the fire tonight. Something is moving beyond the tree line. We have doubled the watch and it has not helped.');
  } else if (state.flags.prologueDone && state.keys < 3) {
    yield SAY('Guard Rhen', 'The gate is open. The Elder says the flame chose you. I hope the flame knows what it is doing.');
  } else if (state.keys >= 3) {
    yield SAY('Guard Rhen', 'So it is true. Three keys. I have been a guard for twenty years and never thought I would see the Citadel open.');
    yield SAY('Guard Rhen', 'When you come back — and you will come back — I will stand you a drink.');
  } else {
    yield SAY('Guard Rhen', 'Keep your blade loose and your friends close. The roads are no place for pride.');
  }
}

// ═══════════════════════════════════════════════════════════════
// EMBERFIELD
// ═══════════════════════════════════════════════════════════════
export function* emberfield_intro() {
  audio.setScene('explore');
  yield NARRATE('The Emberfield is gold and grey at once: tall grass combed by the wind, black furrows where the old fires passed.');
  yield NARRATE('To the north, Hearthfall smokes. To the east, Greenwood darkens. South, the Ashen Mire breathes through drowned reeds.');
  yield NARRATE('Refugees have pitched tents among the ruins. Somewhere in the grass, something with too many teeth is learning your scent.');
  yield TOAST('Wren waits at the refugee camp. Hunter Dax watches the tall grass.', '✦', 4600);
}

export function* emberfield_crossroads() {
  yield NARRATE('At the crossroads, an overturned cart blocks the road. A pilgrim presses himself against the wheel while two road bandits pull at his pack.');
  yield SAY('Pilgrim', 'Please — the locket is all I have left of my daughter. Take the coin, take the mule, just not the locket.');
  yield SAY('Road Bandit', 'The locket is worth more than the mule, old man. Everything is worth more than the mule.');
  const pick = yield CHOICE([
    { text: 'Draw your blade and intervene.', value: 'help' },
    { text: 'Stay low and pass by.', value: 'leave' },
  ]);
  if (pick === 'leave') {
    yield NARRATE('You keep to the tall grass. The pilgrim\'s voice follows you for a while, then does not.');
    yield FLAG('crossroadsAvoided', true);
    yield TOAST('Some roads are remembered by the people you leave on them.', '·', 3800);
    return;
  }
  yield SAY('Kael', 'Two of them. One of us takes the one on the left. Try to keep up.');
  const won = yield BATTLE([
    { id: 'bandit', level: 2 }, { id: 'bandit', level: 2 },
  ], { canFlee: true });
  if (!won?.victory) return;
  yield FLAG('crossroadsHelped', true);
  yield NARRATE('The bandits scatter into the grass. The pilgrim clutches his pack and bows so low his forehead touches the mud.');
  yield SAY('Pilgrim', 'I have nothing to give. Only this — a charm my wife made. It kept me alive this far. Perhaps it will keep you.');
  yield GEAR('travelerCharm');
  yield GOLD(60);
  yield GIVE('greaterTonic', 1);
  yield XP(22);
}

export function* wren() {
  const inv = state.inventory;
  yield SAY('Wren', 'You are not from the camp. Good. Everyone from the camp has already told me there is no hope.');
  // locket
  if (inv.locket) {
    yield SAY('Wren', 'Wait. That locket. Where did you find it?');
    yield NARRATE('She turns it over in her hands. The engraved name catches the light.');
    yield SAY('Wren', 'It was my daughter\'s. She went into the ruins when the ash came down. I told her not to. I told her.');
    yield TAKE('locket', 1);
    yield GOLD(120);
    yield GIVE('greaterTonic', 1);
    yield QUEST('locket', 'done');
    yield SAY('Wren', 'Keep the coin. I cannot eat it, and I cannot spend what it would buy me. Just — thank you.');
    yield XP(30);
  } else if (state.quests.locket.status === 'inactive') {
    yield SAY('Wren', 'My daughter\'s locket is somewhere in the old ruins east of here. She went looking for her father. The ruins are full of things that went looking for something too.');
    yield QUEST('locket', 'active');
    yield SAY('Wren', 'If you find it, bring it back. I will pay what I can.');
  } else if (state.quests.locket.status === 'active') {
    yield SAY('Wren', 'The ruins are east, past the tall grass. Look for the broken wall with the four braziers. And do not touch anything that looks back.');
  }
  // relief
  if (state.quests.relief.status === 'inactive') {
    const help = yield CHOICE([
      { text: 'Is there anything else the camp needs?', value: 'yes' },
      { text: 'I should keep moving.', value: 'no' },
    ]);
    if (help === 'yes') {
      yield SAY('Wren', 'Medicine. Two Ember Tonics would keep the fever down until the next caravan. I have coin, but no one will sell to a refugee.');
      yield QUEST('relief', 'active');
    }
  } else if (state.quests.relief.status === 'active') {
    if ((state.inventory.tonic || 0) >= 2) {
      yield SAY('Wren', 'You brought them. Both. I did not think — here. Take this. It is all the camp could spare.');
      yield TAKE('tonic', 2);
      yield GOLD(160);
      yield SP(1);
      yield QUEST('relief', 'done');
      yield SAY('Wren', 'The children will sleep tonight. That is worth more than the coin.');
      yield XP(24);
    } else {
      yield SAY('Wren', `Two Ember Tonics. You have ${state.inventory.tonic || 0}. The fever does not care about the road.`);
    }
  } else {
    yield SAY('Wren', 'The camp is quieter now. Not happy. Quiet. I will take it.');
  }
}

export function* dax() {
  const kills = state.quests.bounty.kills || 0;
  if (state.quests.bounty.status === 'done') {
    yield SAY('Hunter Dax', 'The grass is quieter. Not empty — never empty — but quieter. You did good work.');
    yield SAY('Hunter Dax', 'If you go to the Mire, watch the water. The toads there are older than the roads and twice as patient.');
    return;
  }
  if (state.quests.bounty.status === 'active') {
    if (kills >= 6) {
      yield SAY('Hunter Dax', 'Six. That is a pack thinned enough to breathe. Here — the Emberheart. It belonged to a hunter who stopped breathing.');
      yield GOLD(240);
      yield GEAR('emberheart');
      yield SP(1);
      yield QUEST('bounty', 'done');
      yield SAY('Hunter Dax', 'Do not thank me. Just do not come back with more teeth than you left with.');
      yield XP(40);
    } else {
      yield SAY('Hunter Dax', `Six beasts in the Emberfield. You have ${Math.min(6, kills)}. The tall grass is east and south. They come to the sound of walking.`);
    }
    return;
  }
  yield SAY('Hunter Dax', 'You walk like someone who has not been hunted. That will change.');
  const yes = yield CHOICE([
    { text: 'What needs killing?', value: 'yes' },
    { text: 'I have enough trouble.', value: 'no' },
  ]);
  if (yes === 'yes') {
    yield SAY('Hunter Dax', 'The tall grass has grown too many teeth. Ashwolves, bandits, husks. Thin six and I will pay you what the camp cannot.');
    yield QUEST('bounty', 'active');
  } else {
    yield SAY('Hunter Dax', 'Then walk soft. The grass does not care whether you are ready.');
  }
}

export function* pilgrim() {
  yield SAY('Pilgrim', 'The Order says the Crown is a burden. The Freewood says it is a wound. The villagers say it is a curse. All three are right, which is why no one agrees.');
  if (!state.flags.pilgrimGift && state.gold >= 25) {
    const yes = yield CHOICE([
      { text: 'Give him 25 gold for a blessing.', value: 'give' },
      { text: 'Keep your coin.', value: 'no' },
    ]);
    if (yes === 'give') {
      yield GOLD(-25);
      yield SAY('Pilgrim', 'You are kinder than the road. The old blessing is not much — a full belly, a steady hand, a little fire in the blood.');
      yield HEAL();
      yield GIVE('greaterTonic', 1);
      yield FLAG('pilgrimGift', true);
      return;
    }
  }
  yield SAY('Pilgrim', 'If you find the keys, do not hold them all at once. They argue.');
}

export function* merchant() {
  yield SAY('Wandering Merchant', 'Ah, a customer with a sword and the look of someone who has recently been rained on by something worse than rain.');
  yield SAY('Wandering Merchant', 'I carry only the essentials: tonics, charms, and a small number of very good lies.');
  yield SHOP('mosswood');
}

// ═══════════════════════════════════════════════════════════════
// GREENWOOD
// ═══════════════════════════════════════════════════════════════
export function* greenwood_intro() {
  audio.setScene('forest');
  yield NARRATE('Greenwood closes over the road like a hand. The air tastes of rain, sap, and something older than either.');
  yield NARRATE('Mosswood\'s lanterns glimmer west. East, the Wardens\' camp flies a green banner. Deeper in, the Freewood sings — or argues.');
  yield NARRATE('At the center of the old ring, the trees have begun to lean toward a single point, as if listening.');
  yield TOAST('The Grove lies east of the crossroads. The Wardens and the Freewood both claim it.', '✦', 4800);
}

export function* seris() {
  if (state.flags.groveChoice) {
    yield SAY('Seris', 'The choice is made. Do not ask me to unmake it.');
    return;
  }
  yield SAY('Seris', 'You are the one from Hearthfall. The grove has been bleeding since the ash came. The Wardens hold the ring, but the thing inside is not ours to command.');
  yield SAY('Seris', 'Lyra wants to tear the old seals open and let the forest decide. I have seen what the forest decides when it is frightened.');
  const pick = yield CHOICE([
    { text: 'What do the Wardens want?', value: 'order' },
    { text: 'What does Lyra want?', value: 'free' },
  ]);
  if (pick === 'order') {
    yield SAY('Seris', 'We want the flame guarded. Not owned. Not worshipped. Contained, until the world is strong enough to hold it without burning.');
    yield SAY('Seris', 'My order has made terrible choices. But we made them so no one else had to.');
  } else {
    yield SAY('Seris', 'She wants the old powers returned to the wild. It is a beautiful idea. Beautiful ideas have a body count.');
  }
  yield SAY('Seris', 'Speak to her if you must. Then choose. The grove will not wait much longer.');
}

export function* lyra() {
  if (state.flags.groveChoice) {
    yield SAY('Lyra', 'You chose a side. Now we live with it. Or we burn with it. I am still deciding which.');
    return;
  }
  yield SAY('Lyra', 'You can feel it, can you not? The grove is holding its breath. The Wardens have been holding it for it for three hundred years.');
  yield SAY('Lyra', 'The seals are not protecting the forest. They are protecting the Crown from the forest. There is a difference, and the difference is everything.');
  const pick = yield CHOICE([
    { text: 'What would the Freewood do?', value: 'free' },
    { text: 'Is the Crown truly alive?', value: 'crown' },
  ]);
  if (pick === 'free') {
    yield SAY('Lyra', 'We would let the old roots decide. No crown, no order, no chosen one. Just the green, and whatever it chooses to grow around.');
    yield SAY('Lyra', 'It is terrifying. It is also the first honest thing anyone has offered this forest in centuries.');
  } else {
    yield SAY('Lyra', 'It is alive enough to want. That is all anything needs to become a tyrant.');
  }
  yield SAY('Lyra', 'Seris believes in walls. I believe walls are what the dark climbs over. Choose carefully.');
}

export function* fen() {
  yield SAY('Innkeeper Fen', 'Mosswood has beds, if you do not mind the moss. The roots have been growing through the floorboards again.');
  if (state.gold >= 14) {
    const yes = yield CHOICE([
      { text: 'Rest for 14 gold.', value: 'rest' },
      { text: 'Only passing through.', value: 'no' },
    ]);
    if (yes === 'rest') {
      yield GOLD(-14);
      yield REST({ zone: 'greenwood', x: 8, y: 21 });
      yield SAY('Innkeeper Fen', 'The forest is quieter at night. Not safe. Quiet. There is a difference.');
      return;
    }
  } else {
    yield SAY('Innkeeper Fen', 'No coin? Sleep in the common room. Just do not wake the cat. It is older than the inn.');
    yield REST({ zone: 'greenwood', x: 8, y: 21 });
    return;
  }
  yield SAY('Innkeeper Fen', 'My sister Nessa runs the inn in Hearthfall. Tell her the moss is winning.');
}

export function* quill() {
  yield SAY('Trader Quill', 'Greenwood goods. Roots, charms, and a sword that may or may not be listening. All prices are final, except when they are not.');
  yield SHOP('mosswood');
}

export function* thea() {
  yield SAY('Captain Thea', 'The Warden camp is not a market. State your business or move along.');
  if (state.flags.groveChoice === 'warden') {
    yield SAY('Captain Thea', 'Seris speaks for you. That is enough. The camp is open — rest, resupply, and do not touch the sealed relics.');
    return;
  }
  if (state.flags.groveChoice === 'freewood') {
    yield SAY('Captain Thea', 'You chose the Freewood. I will not pretend to like it. But the grove is still standing, and that is more than I expected.');
    return;
  }
  yield SAY('Captain Thea', 'The grove is east. Something has taken root in the old altar. We have lost four Wardens trying to reach it.');
  yield SAY('Captain Thea', 'If you go in, go in with a decision already made. The grove can smell hesitation.');
}

export function* bramble() {
  yield SAY('Elder Bramble', 'The Freewood remembers what the Wardens would rather forget: the Crown was not found. It was grown.');
  if (state.flags.groveChoice === 'freewood') {
    yield SAY('Elder Bramble', 'Lyra chose to stand with you. The green remembers. When the time comes, the forest will answer.');
    return;
  }
  if (state.flags.groveChoice === 'warden') {
    yield SAY('Elder Bramble', 'You gave the grove to the Wardens. I hope they are gentler than their history. I hope a great many things.');
    return;
  }
  yield SAY('Elder Bramble', 'The old altar is east of here. The Thornwarden guards it. It was gentle once. Now it is only old, and afraid, and very large.');
  yield SAY('Elder Bramble', 'Fire is the cleanest answer. It is also the answer that leaves nothing to grow back.');
}

export function* woodchild() {
  yield SAY('Fenn', 'I am not lost. I am exploring. There is a difference, and my mother says it is a very expensive one.');
  if (!state.flags.fennGift) {
    yield SAY('Fenn', 'Do you want a flower? It is silver and it only opens when the moon is looking. I have three. Well. I had three.');
    yield GIVE('moonpetal', 1);
    yield FLAG('fennGift', true);
    yield SAY('Fenn', 'Do not tell my mother. She says the flowers are not ours. But they are not hers either, are they?');
  } else {
    yield SAY('Fenn', 'The trees are arguing again. I can hear them at night. They sound like my parents, but slower.');
  }
}

export function* grove_confrontation() {
  yield MUSIC('forest');
  yield NARRATE('The trees open into a ring of pale stones. Seris stands on one side with her Wardens; Lyra on the other with a dozen Freewood folk holding lanterns like small, stubborn suns.');
  yield SAY('Seris', 'The grove is waking, and it is not waking gently. We seal the altar, or we lose Greenwood.');
  yield SAY('Lyra', 'You seal it and the Crown drinks the forest dry. Let the roots answer it. Let the green choose.');
  yield SAY('Seris', 'And if the green chooses us as kindling?');
  yield SAY('Lyra', 'Then at least it will have chosen.');
  yield NARRATE('Both of them turn to you. The grove goes very quiet.');
  const pick = yield CHOICE([
    { text: 'Stand with Seris. The flame must be guarded.', value: 'warden', note: 'Seris joins you' },
    { text: 'Stand with Lyra. The flame belongs to no crown.', value: 'freewood', note: 'Lyra joins you' },
  ]);
  if (pick === 'warden') {
    yield FLAG('groveChoice', 'warden');
    yield FLAG('groveScene', true);
    yield SAY('Seris', 'Then the Wardens stand with you. Lyra — go home. The grove is not yours to spend.');
    yield SAY('Lyra', 'It was never yours to keep. But I will not fight you in front of the stones. Not today.');
    yield NARRATE('Lyra turns and walks into the green. The Freewood folk follow, their lanterns one by one swallowed by shadow.');
    yield JOIN('seris');
    yield SAY('Seris', 'The Thornwarden is old and sick with the Crown\'s influence. Fire will hurt it. So will steel. So will time, if we are patient, and we are not.');
    yield GIVE('greaterTonic', 2);
    yield SAY('Kael', 'A choice made. Now we live with the shape of it.');
  } else {
    yield FLAG('groveChoice', 'freewood');
    yield FLAG('groveScene', true);
    yield SAY('Lyra', 'Then the Freewood stands with you. Seris — the old seals are done. Let the roots decide.');
    yield SAY('Seris', 'You are making a child\'s choice with a kingdom\'s consequences. But I will not spill blood on the altar. Not before the thing inside has its say.');
    yield NARRATE('Seris signals her Wardens back. They withdraw in silence, disciplined even in defeat.');
    yield JOIN('lyra');
    yield SAY('Lyra', 'The Thornwarden is suffering. The Crown planted a black seed in it. We can burn the seed out — or burn the whole grove. Try the first.');
    yield GIVE('greaterTonic', 2);
    yield SAY('Kael', 'A choice made. Now we live with the shape of it.');
  }
  yield ACT();
  yield SAVE();
  yield TOAST('The grove has chosen. The altar waits at the heart of the ring.', '✦', 4400);
}

export function* grove_heart_hint() {
  yield NARRATE('The path bends toward a ring of pale stones. The air is thick with sap and something sweetly rotten.');
  yield SAY('Kael', 'That is not wind. That is breathing.');
  yield TOAST('Touch the altar at the heart of the grove when you are ready.', '✦', 4000);
}

export function* grove_heart() {
  if (state.flags.greenwoodBossDefeated) {
    yield NARRATE('The grove is quiet. New shoots push through the black soil where the Thornwarden fell.');
    if (state.flags.groveChoice === 'warden') yield SAY('Seris', 'The seal holds. For now. The Wardens will keep watch.');
    else yield SAY('Lyra', 'Listen. The roots are singing again. Off-key, but singing.');
    return;
  }
  yield NARRATE('The altar is a knot of roots around a black seed. It pulses once, and the whole grove leans toward you.');
  yield SAY('The Thornwarden', 'You carry the flame. It carries you. Which of you is the rider?');
  if (state.flags.groveChoice === 'warden') yield SAY('Seris', 'It is still in there. Somewhere. Do not let it suffer longer than it must.');
  else yield SAY('Lyra', 'The seed is in its heart. Cut it out, burn it out — just do not let it spread.');
  const won = yield BATTLE([
    { id: 'thornwarden', level: 5 },
  ], { boss: true, bossName: 'THE THORNWARDEN', canFlee: false });
  if (!won?.victory) return;
  yield NARRATE('The Thornwarden folds inward, roots curling around the black seed. The grove exhales.');
  yield FLAG('greenwoodBossDefeated', true);
  yield KEY('emberkey_thorn', 'keyThorn');
  yield SAY('Kael', 'One key. The forest gave it up.');
  if (state.flags.groveChoice === 'warden') {
    yield SAY('Seris', 'The Wardens will tend the grove. The key is yours by right of blood and blade. Do not make me regret handing it over.');
  } else {
    yield SAY('Lyra', 'The green chose you. Not the Crown. Not the Wardens. Remember that when the Citadel starts whispering.');
  }
  yield SAY('Elder Bramble', 'The roots are already growing over the scar. Greenwood remembers how to heal. It may even remember how to forgive.');
  yield NARRATE('A path of pale flowers opens through the trees, pointing north toward the Cinder Peaks.');
  yield ACT();
  yield SAVE();
  yield TOAST('Emberkey of Thorn claimed. The Cinder Peaks lie north.', '✧', 4800);
}

// ═══════════════════════════════════════════════════════════════
// ASHEN MIRE
// ═══════════════════════════════════════════════════════════════
export function* mire_intro() {
  audio.setScene('mire');
  yield NARRATE('The Ashen Mire swallows sound. Boardwalks creak over black water; drowned trees hold up a sky the colour of old iron.');
  yield NARRATE('Somewhere to the west, a shrine rises from the bog. Somewhere east, a witch\'s chimney smokes without a fire.');
  yield NARRATE('The water is full of faces that are almost yours.');
  yield TOAST('The drowned shrine lies west. The Witch\'s hut smokes to the east.', '✦', 4600);
}

export function* mire_altar_hint() {
  yield NARRATE('The shrine island rises from the water: a ring of white stone, a black altar, and a door that is not a door.');
  yield NARRATE('Every step closer makes the water go still. Something beneath the boards is listening.');
  yield TOAST('The Witch of Mire has not left the shrine unguarded. Find her first.', '✦', 4200);
}

export function* mire_sable_meet() {
  yield NARRATE('A shape detaches from the reeds. A young woman in a patched cloak, one hand resting on a knife that has seen better decades.');
  yield SAY('Sable', 'You are walking toward the drowned shrine. Either you are lost, or you are exactly the kind of fool the Mire has been waiting for.');
  const pick = yield CHOICE([
    { text: 'We are here for the Emberkey.', value: 'truth' },
    { text: 'Who are you?', value: 'who' },
  ]);
  if (pick === 'who') {
    yield SAY('Sable', 'Sable. I was raised by the Witch of Mire. She taught me which mushrooms kill and which only make you wish they had.');
  }
  yield SAY('Sable', 'The Witch guards the key. She has guarded it for three hundred years. She is not going to hand it to a stranger with a nice sword.');
  yield SAY('Sable', 'I can get you to the altar. After that, you decide what kind of person you are. I have been trying to decide that about myself for years.');
  yield FLAG('sableMet', true);
  yield TOAST('Sable will meet you at the drowned shrine. The altar waits west.', '✦', 4400);
}

export function* sable() {
  yield SAY('Sable', 'The Witch is not evil. She is tired. There is a difference, and it is the only reason I am still alive.');
  yield SAY('Sable', 'If you hurt her, the Mire will remember. If you spare her — well. The Mire remembers that too.');
}

export function* hermit() {
  yield SAY('Hermit Goll', 'The water talks. Mostly it says "turn back." Very repetitive, water.');
  if (!state.flags.hermitGift) {
    yield SAY('Hermit Goll', 'Here. Antidote. The toads spit something that makes your bones feel like wet rope. You will know it when it happens.');
    yield GIVE('antidote', 2);
    yield FLAG('hermitGift', true);
  }
  const pick = yield CHOICE([
    { text: 'Ask about the Witch.', value: 'witch' },
    { text: 'Ask about the drowned shrine.', value: 'shrine' },
  ]);
  if (pick === 'witch') {
    yield SAY('Hermit Goll', 'She keeps the shrine because no one else would. The Order tried. The Freewood tried. The Mire ate them both.');
    yield SAY('Hermit Goll', 'She had a daughter once. Or a student. Same thing, out here. The girl left. The Witch stayed.');
  } else {
    yield SAY('Hermit Goll', 'The shrine was built to hold the Tide key. The key is not the door. The key is the lock. Or the door is the lock. I forget.');
    yield SAY('Hermit Goll', 'Bring fire. The drowned things hate fire. Also bring dry socks. They hate dry socks less, but it is good to have goals.');
  }
}

export function* mudlark() {
  yield SAY('Mudlark', 'You are standing on a frog. Or a frog is standing on you. It is hard to tell with frogs.');
  if (!state.flags.mudlarkGift) {
    yield SAY('Mudlark', 'The Witch is not a monster. My mum says monsters do not mend broken arms for free.');
    yield GIVE('greaterTonic', 1);
    yield FLAG('mudlarkGift', true);
    yield SAY('Mudlark', 'Take this. I found it in a drowned man\'s pocket. He did not need it anymore, and he was very rude about it.');
  } else {
    yield SAY('Mudlark', 'The water went quiet after you went west. That is either good or very bad. I am betting on bad.');
  }
}

export function* witch() {
  if (!state.flags.sparedWitch) return;
  yield SAY('The Witch of Mire', 'You came back. People usually do not. Either they drown or they become sensible.');
  if (state.quests.moonpetal.status === 'inactive') {
    yield SAY('The Witch of Mire', 'I have a use for moonpetals. Three, from deep Greenwood shade. Bring them and I will pay you in glass and favours.');
    yield QUEST('moonpetal', 'active');
  } else if (state.quests.moonpetal.status === 'active') {
    const petals = state.inventory.moonpetal || 0;
    if (petals >= 3) {
      yield SAY('The Witch of Mire', 'Three. You actually brought three. I had begun to think the forest was hoarding them out of spite.');
      yield TAKE('moonpetal', 3);
      yield GOLD(150);
      yield GEAR('mireglass');
      yield SP(2);
      yield QUEST('moonpetal', 'done');
      yield SAY('The Witch of Mire', 'Mireglass is not a weapon. It is a promise that the marsh will remember you kindly. Try not to make it a lie.');
      yield XP(40);
    } else {
      yield SAY('The Witch of Mire', `You have ${Math.min(3, petals)}. The moonpetals grow in Greenwood\'s deep shade. Look for the silver sparkle. Try not to be eaten.`);
    }
  } else {
    yield SAY('The Witch of Mire', 'The moonpetals are still blooming in my garden. I did not expect them to. Good things are usually the first to go.');
  }
  const pick = yield CHOICE([
    { text: 'Browse the Witch\'s wares.', value: 'shop' },
    { text: 'Ask about Sable.', value: 'sable' },
  ]);
  if (pick === 'sable') {
    yield SAY('The Witch of Mire', 'She chose to follow you. That is not nothing. The Mire does not let go of its children easily.');
  }
  yield SHOP('mire');
}

export function* mire_boss() {
  if (state.flags.mireBoss) {
    if (state.flags.sparedWitch) {
      yield NARRATE('The drowned shrine is calm. The Witch works at a table of bottles while Sable watches the water.');
      yield SAY('The Witch of Mire', 'The key is gone from the altar. The shrine feels lighter. I feel lighter. Do not tell anyone.');
    } else {
      yield NARRATE('The shrine is empty. The Witch\'s body is gone; only a dark stain on the altar remains, and the water refuses to wash it away.');
      yield SAY('Kael', 'It is done. Whatever she was, she is not that anymore.');
    }
    return;
  }
  yield NARRATE('The Witch of Mire stands before the black altar, sleeves rolled to the elbow, hands bright with swamp-light.');
  yield SAY('The Witch of Mire', 'Three hundred years I have kept this shrine. Three hundred years of drowned pilgrims, hungry toads, and kings who send boys with swords.');
  yield SAY('Sable', 'Mistress — please. They are not the Order. They came to end the Crown.');
  yield SAY('The Witch of Mire', 'Everyone comes to end the Crown. The Crown is very good at surviving endings.');
  const pick = yield CHOICE([
    { text: 'We need the Emberkey. Stand aside.', value: 'demand' },
    { text: 'We do not want to fight you.', value: 'peace' },
    { text: 'If you will not move, we will make you.', value: 'threat' },
  ]);
  if (pick === 'peace') {
    yield SAY('The Witch of Mire', 'Wanting and doing are different rivers. The key will not leave while I live. I have tried.');
    yield SAY('Sable', 'She cannot let it go. The shrine is tied to her. If the key leaves, the Mire takes her.');
  } else if (pick === 'demand') {
    yield SAY('The Witch of Mire', 'Then you are like all the others. At least be efficient about it.');
  } else {
    yield SAY('The Witch of Mire', 'There it is. The honest face under the hero face. Come, then.');
  }
  const won = yield BATTLE([
    { id: 'mireWitch', level: 7 },
  ], { boss: true, bossName: 'THE WITCH OF MIRE', canFlee: false });
  if (!won?.victory) return;
  yield NARRATE('The Witch falls to one knee. The swamp-light gutters out of her hands. Sable is already moving, knife forgotten, kneeling in the black water.');
  yield SAY('Sable', 'She is dying. The shrine is eating her. Please — there has to be another way.');
  const mercy = yield CHOICE([
    { text: 'Spare her. Take the key and go.', value: 'spare', note: 'Sable may join you' },
    { text: 'End it. The key is all that matters.', value: 'kill' },
  ]);
  yield FLAG('mireBoss', true);
  yield KEY('emberkey_tide', 'keyTide');
  if (mercy === 'spare') {
    yield FLAG('sparedWitch', true);
    yield SAY('The Witch of Mire', 'You are either very kind or very foolish. The Mire will decide which.');
    yield SAY('Sable', 'The shrine needs a keeper. I will stay. No — I will follow you first. The Mire can wait. It is good at that.');
    yield JOIN('sable');
    yield SAY('Sable', 'I owe you a life. Do not make me regret paying it back.');
    yield GIVE('greaterEther', 2);
    yield GOLD(200);
    yield SAY('The Witch of Mire', 'Take the key. And take care of her. If she comes back drowned, I will find you.');
    yield NARRATE('The Witch presses a hand to the altar. The black stone opens like a flower, and the Emberkey of Tide rises from the water.');
  } else {
    yield FLAG('sparedWitch', false);
    yield FLAG('sableHate', true);
    yield NARRATE('You take the key. Sable does not look at you. She kneels beside the Witch until the water closes over them both.');
    yield SAY('Kael', 'We should go. Before we become part of the story the Mire tells about itself.');
    yield GOLD(350);
    yield GIVE('greaterEther', 2);
  }
  yield SAY('Kael', 'Two keys. The mountain is next.');
  yield ACT();
  yield SAVE();
  yield TOAST('Emberkey of Tide claimed. The Cinder Peaks wait beyond Greenwood.', '✧', 5000);
}

// ═══════════════════════════════════════════════════════════════
// CINDER PEAKS
// ═══════════════════════════════════════════════════════════════
export function* peaks_intro() {
  audio.setScene('peaks');
  yield NARRATE('The Cinder Peaks are a wound in the world. Ash falls like grey snow; the lava river breathes orange through the cracks.');
  yield NARRATE('The Ashen Order has built a camp on the western slope. Their banners are clean, their armour is immaculate, and their eyes are very tired.');
  yield NARRATE('Above, the caldera glows. Somewhere inside it, the last Emberkey is waiting.');
  yield TOAST('The Ashen Order camp lies west. The caldera rises to the east.', '✦', 4600);
}

export function* peaks_camp_arrival() {
  yield NARRATE('A sentinel steps into the road, shield raised. Behind him, ragged tents and a forge that never cools.');
  yield SAY('Order Sentinel', 'Halt. The Cinder Peaks belong to the Ashen Order. State your name and your purpose, or turn back down the mountain.');
  yield SAY('Envoy Malrec', 'Let them through, Sentinel. I know that sigil. The flame has chosen another hero — and not a moment too soon.');
  yield SAY('Envoy Malrec', 'I am Malrec, envoy of the Ashen Order. We have held the Cinder Key for generations. We no longer have it. Knight-Commander Vurn took it into the caldera three days ago.');
  yield SAY('Envoy Malrec', 'He believes the Crown can be wielded. We believe it should be guarded. Speak with me. Then go and do what heroes do.');
  yield FLAG('metMalrec', true);
  yield TOAST('Envoy Malrec waits by the forge. Scout Vela stands near the southern bridge.', '✦', 4400);
}

export function* peaks_caldera_hint() {
  yield NARRATE('The caldera is close. Heat rolls off the stone in visible waves; the air tastes of iron and old smoke.');
  yield NARRATE('At the center, a ring of broken pillars surrounds an altar. A figure in blackened armour stands before it, sword planted in the ash.');
  yield SAY('Kael', 'That is Vurn. I have heard the Order speak of him. They lower their voices.');
  yield TOAST('Knight-Commander Vurn waits at the altar in the caldera.', '✦', 4400);
}

export function* malrec() {
  if (!state.flags.peaksChoice) {
    yield SAY('Envoy Malrec', 'The Order has one purpose: no one should wear the Crown. Not a king, not a hero, not us. We guard it because we are afraid of it. That is the only honest qualification.');
    const pick = yield CHOICE([
      { text: 'Accept the Order\'s alliance.', value: 'order', note: 'The Order will aid you' },
      { text: 'Refuse. You will not owe the Order anything.', value: 'refuse', note: 'You walk alone' },
      { text: 'Tell him the Crown should be yours.', value: 'claim', note: 'A dangerous ambition' },
    ]);
    yield FLAG('peaksChoice', pick || 'refuse');
    if (pick === 'order') {
      yield SAY('Envoy Malrec', 'Then the Order stands with you. Not for you — with you. There is a difference, and it will matter before the end.');
      yield GOLD(180);
      yield GIVE('greaterTonic', 2);
    } else if (pick === 'claim') {
      yield SAY('Envoy Malrec', 'Every person who has ever said that has become a worse version of Vaelor. I will not stop you. I will simply remember that I warned you.');
      yield SAY('Envoy Malrec', 'Take the road to the caldera. Vurn will not care whose side you claim. He only cares who is holding the key.');
    } else {
      yield SAY('Envoy Malrec', 'Pride is a fine thing to die on. The Order will not bar your way. We will also not bleed for you.');
      yield SAY('Envoy Malrec', 'Vurn is in the caldera. He has the key. He has lost whatever sense he had left. Go carefully.');
    }
  } else if (state.flags.peaksChoice === 'order') {
    yield SAY('Envoy Malrec', 'The Order is with you. Vurn has disgraced us. Bring the key back, and we will see the Crown sealed together.');
  } else if (state.flags.peaksChoice === 'claim') {
    yield SAY('Envoy Malrec', 'You still mean to take it. I can see it in the way you stand. The Crown likes that. That is how it gets in.');
  } else {
    yield SAY('Envoy Malrec', 'You refused us. The offer stands, but I will not repeat it. The caldera is east. Do not expect a warm welcome.');
  }
  if (state.flags.peaksBossDefeated) {
    yield SAY('Envoy Malrec', 'Vurn is dead. The key is yours. The Order will not fight you for it. We made that choice when we let you pass.');
  }
}

export function* hessa() {
  yield SAY('Forge-Mother Hessa', 'Another hero. The mountain has been spitting them out for weeks. You are the first one with all your fingers.');
  if (!state.flags.hessaGift) {
    yield SAY('Hessa', 'Take this. A whetstone and a word of advice: the Crown is not a sword. You cannot beat it by being sharper.');
    yield GIVE('greaterTonic', 1);
    yield FLAG('hessaGift', true);
  }
  yield SAY('Hessa', 'The forge is hot enough to mend almost anything. Almost.');
  yield SHOP('peaks');
}

export function* sentinel() {
  if (state.flags.peaksChoice === 'order') {
    yield SAY('Order Sentinel', 'Envoy Malrec vouches for you. The camp is yours. Try not to break anything. The forge-mother is very attached to her anvils.');
  } else if (state.flags.peaksChoice) {
    yield SAY('Order Sentinel', 'You refused the Envoy. I should bar your way. I am not going to. Vurn has made us all tired of orders.');
  } else {
    yield SAY('Order Sentinel', 'Malrec handles diplomacy. I handle the part where diplomacy fails. Do not make me handle you.');
  }
}

export function* vela() {
  yield SAY('Scout Vela', 'The caldera is a death trap. The rock is thin, the air is thinner, and Vurn has stopped sleeping.');
  yield SAY('Scout Vela', 'He was a good commander. The best. Then he touched the key and started talking about how the Crown could be used for good. They always do.');
  if (!state.flags.velaGift) {
    yield GIVE('greaterEther', 1);
    yield FLAG('velaGift', true);
    yield SAY('Scout Vela', 'Take this. Found it on a dead pilgrim. He would want it to be useful.');
  }
  yield SAY('Scout Vela', 'There is a prisoner in the caldera. A Warden. The Order took him when Vurn started rounding up anyone who disagreed. If you can get him out, do it.');
}

export function* prisoner() {
  yield SAY('Caged Warden', 'You are not Order. Good. The Order stopped feeding me two days ago. I think they are waiting for me to become a lesson.');
  if (state.flags.freedWarden) {
    yield SAY('Caged Warden', 'The key is in Vurn\'s hands. He has not slept since he took it. A man who cannot sleep cannot be reasoned with.');
    return;
  }
  const pick = yield CHOICE([
    { text: 'Break the cage open.', value: 'free' },
    { text: 'Leave him. There is no time.', value: 'leave' },
  ]);
  if (pick === 'free') {
    yield NARRATE('The lock gives with a sound like a snapped bone. The Warden rises, stretches, and takes a breath that seems to reach all the way to his boots.');
    yield SAY('Caged Warden', 'I am in your debt. I have no sword to give. I have this.');
    yield GEAR('wardensSeal');
    yield SP(1);
    yield FLAG('freedWarden', true);
    yield SAY('Caged Warden', 'If you see Seris, tell her the old oath still holds. Even here. Especially here.');
    yield SAY('Kael', 'One more blade out of the dark. It is a start.');
  } else {
    yield SAY('Caged Warden', 'Then walk on. But when the Crown whispers, remember who you left in a cage and what it cost to be efficient.');
    yield FLAG('leftWarden', true);
  }
}

export function* peaks_boss() {
  if (state.flags.peaksBossDefeated) {
    yield NARRATE('The caldera altar is cracked. Vurn\'s sword still stands in the ash. No one has come to claim it.');
    yield SAY('Kael', 'It is over here. The mountain does not care, but the rest of us do.');
    return;
  }
  yield NARRATE('Knight-Commander Vurn turns from the altar. His armour is blackened; his eyes are bright with something that is not quite sanity.');
  yield SAY('Knight-Commander Vurn', 'You came for the key. Of course you did. Everyone comes for the key. No one asks what the key is for.');
  yield SAY('Knight-Commander Vurn', 'Vaelor is not a tyrant. He is a jailer. Three hundred years he has held the Crown so it could not choose a worse host. I can do it better. I can use it.');
  if (state.flags.peaksChoice === 'order') yield SAY('Knight-Commander Vurn', 'Malrec sent you. Malrec would guard the Crown until the world froze. I would wield it until the world was warm.');
  if (state.flags.groveChoice === 'freewood') yield SAY('Knight-Commander Vurn', 'The Freewood let you through? Then you are already lost. The green does not understand the first thing about mercy.');
  yield SAY('Kael', 'He is gone. Whatever he was, this is what the key made of him.');
  const won = yield BATTLE([
    { id: 'knightCommander', level: 9 },
  ], { boss: true, bossName: 'KNIGHT-COMMANDER VURN', canFlee: false });
  if (!won?.victory) return;
  yield NARRATE('Vurn falls. For a moment his eyes clear, and he looks almost grateful. Then the mountain wind takes the rest of him.');
  yield FLAG('peaksBossDefeated', true);
  yield KEY('emberkey_cinder', 'keyCinder');
  yield SAY('Kael', 'Three keys. The Citadel will open now.');
  if (state.flags.freedWarden) yield SAY('Caged Warden', 'The Warden oath is kept. If you go to the Citadel, I will carry word to the Order. Whatever you decide there, someone will remember it was decided cleanly.');
  if (state.flags.peaksChoice === 'order') {
    yield SAY('Envoy Malrec', 'The Order will hold the mountain. The key is yours. We will meet again at the Citadel — if there is a Citadel left.');
  } else if (state.flags.peaksChoice === 'claim') {
    yield SAY('Envoy Malrec', 'You have the key and the look of someone already wearing a crown. I hope you prove me wrong. I have never hoped that before.');
  } else {
    yield SAY('Envoy Malrec', 'You refused us, and still you did what needed doing. I do not know whether to thank you or arrest you. The Order will remember the debt either way.');
  }
  yield NARRATE('The lava river dims. Far to the east, the Hollow Citadel answers the Emberkeys with a low, patient hum.');
  yield ACT();
  yield SAVE();
  yield TOAST('Three Emberkeys resonate. The Hollow Citadel has opened.', '✧', 5200);
}

// ═══════════════════════════════════════════════════════════════
// HOLLOW CITADEL
// ═══════════════════════════════════════════════════════════════
export function* citadel_intro() {
  audio.setScene('citadel');
  refreshAct();
  yield CINEMA([
    'The Emberkeys cross the threshold before you do. Three notes of light, one for each road.',
    'The Hollow Citadel is not ruined. It is kept. Every pillar is clean, every brazier lit, every stone waiting for a king who has not moved in three hundred years.',
    'Somewhere above, the Ashen Crown is humming.',
  ], { title: 'THE HOLLOW CITADEL', kicker: 'ACT III · THE ASHEN CROWN' });
  if (state.ngPlus > 0) {
    const prev = state.legacyEnding ? ENDINGS[state.legacyEnding]?.title : 'a previous ending';
    yield NARRATE(`The Citadel remembers ${prev}. It remembers the shape of the last choice, too. Continuation ${state.ngPlus} begins where memory refuses to end.`);
  }
  yield TOAST('Climb to the Ashen Throne. The final threshold waits above.', '✦', 4800);
}

export function* citadel_hall() {
  yield NARRATE('The hall is lined with statues of kings. Each wears the same crown. Each face has been worn smooth by centuries of being remembered.');
  yield SAY('Vaelor', 'You brought the keys. I felt them turn. You are early, or late — it is difficult to tell, from here.');
  yield NARRATE('A figure stands at the far end of the hall, wrapped in ash and old light. He does not move, but the room moves around him.');
  yield SAY('Vaelor', 'I was not always a king. I was a farmer, once. Then a soldier. Then the last person standing when the world caught fire.');
  yield SAY('Vaelor', 'I took the Crown so no one else would have to. It was a good decision. It has been a good decision for three hundred years. That is the problem.');
  const pick = yield CHOICE([
    { text: 'Why did you not destroy it?', value: 'why' },
    { text: 'The world has changed. It does not need a jailer.', value: 'changed' },
    { text: 'I am here to end this.', value: 'end' },
  ]);
  if (pick === 'why') {
    yield SAY('Vaelor', 'I tried. The Crown cannot be destroyed while someone is willing to wear it. There is always someone willing. There is someone willing in this room right now.');
  } else if (pick === 'changed') {
    yield SAY('Vaelor', 'Changed. Yes. The roads are safer. The villages are smaller. The dark is still hungry. Some things change, and some things only learn better manners.');
  } else {
    yield SAY('Vaelor', 'Then you are the first honest guest I have had in a century. I will not make it easy. A king who lets the hero pass is not much of a jailer.');
  }
  if (state.flags.groveChoice === 'warden') yield SAY('Seris', 'He is not lying. The Crown is holding something back. I can feel it through the old seals.');
  if (state.flags.groveChoice === 'freewood') yield SAY('Lyra', 'The green is afraid of him. Not of his power. Of his loneliness.');
  if (state.flags.sparedWitch) yield SAY('Sable', 'The Mire remembers him. A king who came to the shrine once and asked to be forgotten.');
  yield FLAG('hallSeen', true);
  yield SAY('Vaelor', 'Come to the altar when you are ready. Bring all three keys. Bring your friends. Bring whatever you believe in.');
  yield SAY('Vaelor', 'And decide, before you climb, what kind of ending you are willing to live in.');
  yield TOAST('The Ashen Throne waits at the top of the Citadel.', '✦', 4200);
}

export function* final_boss() {
  if (state.ending) return;
  if (state.keys < 3) {
    yield SAY('The Crown', 'Three keys. You brought fewer than three. The door is very patient. Come back when you are whole.');
    return;
  }
  if (!state.flags.vaelorDefeated) {
    yield NARRATE('The Ashen Throne is a chair of black iron, and the thing seated in it has become part of the room.');
    yield SAY('Vaelor', 'So. The three roads, the three keys, the three choices. You have carried them all the way up my stairs.');
    yield SAY('Vaelor', 'I will ask once. Is there anything you want to say before the fire?');
    const lastWords = yield CHOICE([
      { text: 'I am sorry for what was done to you.', value: 'sorry' },
      { text: 'Step down. Let the world choose.', value: 'step' },
      { text: 'Nothing. Draw your blade.', value: 'fight' },
    ]);
    if (lastWords === 'sorry') {
      yield SAY('Vaelor', 'Do not be. Pity is a cold thing to die on. But thank you. It has been a long time since anyone offered me something that was not a blade.');
    } else if (lastWords === 'step') {
      yield SAY('Vaelor', 'The world has been choosing for three hundred years. It chose war, famine, and me. I am not sure it is ready for another turn.');
    } else {
      yield SAY('Vaelor', 'Honest to the end. Good. The Crown likes honesty. It finds it easier to swallow.');
    }
    yield SAY('Vaelor', 'The keys answered you. Let them answer me.');
    yield MUSIC('boss');
    yield HEAL();
    yield TOAST('The Emberkeys burn. Your wounds close. This is the last threshold.', '✧', 4200);
    const won = yield BATTLE([
      { id: 'vaelor', level: 12 },
    ], { boss: true, bossName: 'VAELOR, THE ASHEN KING', canFlee: false });
    if (!won?.victory) return;
    yield FLAG('vaelorDefeated', true);
    yield NARRATE('Vaelor falls from the throne. The Crown remains upright in the air above him, a ring of black iron and banked fire.');
    yield HEAL();
    yield SAVE();
  } else {
    yield NARRATE('Vaelor lies at the foot of the throne. The Crown waits above him, turning slowly, patient as a held breath.');
  }

  yield SAY('The Crown', 'A king is only a hand. A hand is only a shape. I have waited a long time for a shape like yours.');
  yield SAY('Vaelor', 'Do not listen to it. It does not lie. That is the worst thing about it.');
  if (hasMember('kael')) yield SAY('Kael', 'Whatever you choose, choose it as yourself. Not as the flame. Not as the village. As you.');
  if (hasMember('seris')) yield SAY('Seris', 'The Wardens can hold it. We have held worse. We will lose people. We will not lose the world.');
  if (hasMember('lyra')) yield SAY('Lyra', 'The green can unmake it. It will cost the old magic. It will cost us. But the Crown will be gone.');
  if (hasMember('sable')) yield SAY('Sable', 'The Mire taught me that some things are kept, and some things are let go. You have to know which is which.');
  if (state.flags.sparedWitch) yield SAY('The Witch of Mire', 'I have kept a shrine for three hundred years. I can tell you what a cage does to the thing inside it. And to the one holding the key.');

  const canWarden = state.flags.groveChoice === 'warden' || state.flags.peaksChoice === 'order' || state.flags.freedWarden;
  const canFreewood = state.flags.groveChoice === 'freewood';
  const choiceValue = yield CHOICE([
    { text: 'Shatter the Crown. Let the flame go free.', value: 'shatter', note: 'The world will change' },
    { text: 'Take the Crown. You can bear it.', value: 'claim', note: 'A final battle waits' },
    { text: 'Bind the Crown to the Wardens.', value: 'warden', req: !!canWarden, note: canWarden ? 'A vigil without end' : 'The Wardens do not trust you' },
    { text: 'Give the Crown to the Freewood.', value: 'freewood', req: !!canFreewood, note: canFreewood ? 'Let the green decide' : 'The Freewood did not choose you' },
    { text: 'Let it sleep with Vaelor.', value: 'mercy', note: 'Neither victory nor surrender' },
  ]);

  if (choiceValue === 'claim') {
    yield SAY('The Crown', 'Yes. You understand. A king is not a tyrant. A king is a promise that someone will be strong enough.');
    yield SAY('Kael', 'Do not —');
    yield NARRATE('The Crown descends. The room fills with a heat that has no source. Vaelor\'s body rises, empty, and the thing that wore him turns its attention to you.');
    yield SAY('The Unbound Flame', 'THEN LET US SEE WHAT YOU ARE WHEN THERE IS NO ONE LEFT TO SAVE.');
    yield MUSIC('boss');
    const won = yield BATTLE([
      { id: 'vaelorUnbound', level: 12 },
    ], { boss: true, bossName: 'THE UNBOUND FLAME', canFlee: false });
    if (!won?.victory) return;
    yield FLAG('unboundDefeated', true);
    yield END('claim');
    return;
  }
  if (choiceValue === 'shatter') {
    yield NARRATE('You bring the blade down. The Crown does not scream. It exhales — three hundred years of held breath, released all at once.');
    yield END('shatter');
  } else if (choiceValue === 'warden') {
    yield NARRATE('Seris steps forward. The Wardens\' seal opens like a green eye. The Crown fights, once, and then is still.');
    yield END('warden');
  } else if (choiceValue === 'freewood') {
    yield NARRATE('Lyra lifts her hands. The roots come through the marble, gentle and relentless, and the Crown is folded into the green.');
    yield END('freewood');
  } else {
    yield NARRATE('You do not take it. You do not break it. You set it down beside the man who carried it longest, and you let the fire dim to something like sleep.');
    yield END('mercy');
  }
}

// ═══════════════════════════════════════════════════════════════
// ENDINGS
// ═══════════════════════════════════════════════════════════════
export const ENDINGS = {
  shatter: { title: 'Dawnforge', kicker: 'EPILOGUE · THE CROWN IS BROKEN', summary: 'The flame goes free.' },
  claim: { title: 'The Ashen Crown', kicker: 'EPILOGUE · THE THRONE IS FILLED', summary: 'You become what you swore to end.' },
  warden: { title: 'The Verdant Vigil', kicker: 'EPILOGUE · THE CROWN IS KEPT', summary: 'The Wardens hold the line.' },
  freewood: { title: 'The Green Rebirth', kicker: 'EPILOGUE · THE CROWN IS UNMADE', summary: 'The old powers return to the wild.' },
  mercy: { title: 'The Long Ember', kicker: 'EPILOGUE · THE CROWN SLEEPS', summary: 'Neither victory nor surrender.' },
};

function companionLines() {
  const lines = [];
  const heroN = escapeHtml(state.heroName || 'The hero');
  if (hasMember('kael')) lines.push('Kael stayed until the last banner came down, then went back to the road. He left a whetstone on your doorstep and no note. It was the kindest thing he had ever done.');
  if (hasMember('lyra')) lines.push('Lyra returned to Greenwood and planted something that had no name. It grew anyway. She said that was the whole point.');
  if (hasMember('seris')) lines.push('Seris rebuilt the Wardens around a smaller oath: guard what can be guarded, and ask permission before you save anyone.');
  if (hasMember('sable')) lines.push('Sable went back to the Mire. The Witch was waiting. They did not embrace. They stood in the water together until the moon went down.');
  if (state.flags.sparedWitch) lines.push('The Witch of Mire still sends medicine upriver. The jars are labelled in a hand no one can read, and they work anyway.');
  if (state.flags.freedWarden) lines.push('The caged Warden kept his word. The old oath survived the mountain, and so did he.');
  if (state.flags.leftWarden) lines.push('You never learned the caged Warden\'s name. Some nights you still hear the lock give, or fail to.');
  return lines.length ? lines : [`${heroN} walked out of the Citadel alone. The road was quieter than it had any right to be.`];
}

function partySummary() {
  return state.party.map((m) => `${escapeHtml(m.name)} (L${m.level})`).join(' · ') || '—';
}

function choiceSummary() {
  const grove = state.flags.groveChoice === 'warden'
    ? 'Stood with Seris and the Wardens'
    : state.flags.groveChoice === 'freewood'
      ? 'Stood with Lyra and the Freewood'
      : 'Never chose a side in Greenwood';
  const mire = state.flags.sparedWitch
    ? 'Spared the Witch of Mire'
    : state.flags.mireBoss
      ? 'Ended the Witch of Mire'
      : 'Never reached the drowned shrine';
  const peaks = state.flags.peaksChoice === 'order'
    ? 'Allied with the Ashen Order'
    : state.flags.peaksChoice === 'claim'
      ? 'Told Malrec the Crown should be yours'
      : state.flags.peaksChoice === 'refuse'
        ? 'Refused the Ashen Order'
        : 'Climbed the Peaks alone';
  const wardenNpc = state.flags.freedWarden ? 'Freed the caged Warden' : state.flags.leftWarden ? 'Left the caged Warden behind' : 'Never found the caged Warden';
  return [
    { label: 'Greenwood', value: grove },
    { label: 'The Mire', value: mire },
    { label: 'Cinder Peaks', value: peaks },
    { label: 'The Prisoner', value: wardenNpc },
    { label: 'The Party', value: partySummary() },
    { label: 'Chronicle', value: state.ngPlus ? `Continuation ${state.ngPlus + 1}` : 'First chronicle' },
  ];
}

function continuationLine() {
  if (!state.ngPlus) return '';
  const prev = state.legacyEnding ? ENDINGS[state.legacyEnding]?.title : 'the last chronicle';
  return `<p class="eo">The flame remembers ${escapeHtml(prev)}. The Continuation begins with ash on your hands and another road under your feet.</p>`;
}

export function buildEndingData(id) {
  const meta = ENDINGS[id] || ENDINGS.shatter;
  const heroN = escapeHtml(state.heroName || 'The hero');
  const comps = companionLines().map((l) => `<p>${l}</p>`).join('');
  let body = '';
  if (id === 'shatter') {
    body = `
      <p>The Crown breaks like a held breath. For a moment there is no fire, no ash, no voice in the dark — only the sound of a room remembering how to be a room.</p>
      <p>${heroN} walks down the mountain with the Emberkeys cooling in their hands. Behind them, the Citadel settles into ordinary stone. The throne is just a chair. The crown is just a circle of bent iron on the floor.</p>
      <p>The old magic does not vanish. It thins, like a river spreading across a delta. Some people will never forgive you for it. Some will name children after the morning you made possible.</p>
      <p>Vaelor's body is buried at the crossroads where the three roads meet. No one claims the grave. Someone keeps leaving embers on it anyway.</p>
      ${comps}
      <p>The world is not fixed. It is only free. That is the harder gift.</p>`;
  } else if (id === 'claim') {
    body = `
      <p>${heroN} takes the Crown. It does not hurt. That is the first lie it tells.</p>
      <p>The Unbound Flame falls, but the fire does not go out. It settles. It learns your shape. It learns the way you say your own name, and begins saying it back in a voice that is almost yours.</p>
      <p>The roads grow safe. The villages grow quiet. The dark stays outside the walls. Every winter, someone comes to the Citadel to ask for something, and you give it to them, because you can, because you are the only one strong enough to decide.</p>
      <p>Kael does not come back. Seris sends one letter, then none. The Freewood stops singing.</p>
      ${comps}
      <p>Three hundred years from now, a farmer will climb the stairs with a sword and a bad plan. You will know exactly what to say to them. You will have had a long time to practise.</p>`;
  } else if (id === 'warden') {
    body = `
      <p>The Wardens take the Crown. Not to wear — never to wear — but to hold, in a vault of root and silver, behind nine locks and one very tired oath.</p>
      <p>${heroN} becomes the first keeper of the new vigil. It is not a hero's ending. It is a job. There are ledgers, and watches, and arguments about whether a lock can be too strong.</p>
      <p>The Crown whispers sometimes. It offers the usual things: peace, certainty, a world without fear. Some nights the offer is very hard to refuse. Those are the nights the Wardens wake each other up and sit together until dawn.</p>
      ${comps}
      <p>The world is safer than it was. It is also smaller. Every generation, someone asks whether the Crown should be destroyed. Every generation, someone answers: not yet. Not while we are still here.</p>`;
  } else if (id === 'freewood') {
    body = `
      <p>The roots take the Crown. They do not break it. They grow around it, through it, until iron and bark are the same thing and the old magic has somewhere new to live.</p>
      <p>For a season, nothing works the way it did. Lamps refuse to light. Wounds heal crooked. The roads forget their destinations. Then the green settles, and the world begins again in a different key.</p>
      <p>${heroN} stays in Greenwood until the first new moon. Lyra teaches them the names of things that have no names yet. They are not all good names. Some of them are warnings.</p>
      ${comps}
      <p>The Citadel becomes a forest. Pilgrims still climb the stairs, but now they leave offerings at the roots instead of asking for miracles. The Crown is still in there, somewhere. It is no longer a king. It is a seed.</p>`;
  } else {
    body = `
      <p>${heroN} sets the Crown down beside Vaelor. No blade. No spell. Just the sound of iron touching stone, and a king exhaling for the first time in three hundred years.</p>
      <p>They seal the throne room together. The keys go into the door. The door goes into the mountain. The mountain goes back to being a mountain.</p>
      <p>The Crown is not destroyed. It is not worn. It sleeps in the dark with the man who kept it, and perhaps that is the only mercy either of them was ever offered.</p>
      ${comps}
      <p>The world does not become perfect. The ash still falls. The roads still have teeth. But somewhere above the clouds, a fire is banked, and no one is sitting beside it, and that is enough.</p>`;
  }
  if (state.ngPlus > 0) body += continuationLine();
  return {
    id,
    title: meta.title,
    kicker: meta.kicker,
    summary: meta.summary,
    body,
    choices: choiceSummary(),
    legacy: true,
    heroName: state.heroName,
  };
}

// ═══════════════════════════════════════════════════════════════
// REGISTRY
// ═══════════════════════════════════════════════════════════════
export const STORIES = {
  hearthfall_intro,
  elder,
  smith,
  innkeeper,
  herbalist,
  child,
  seer,
  guard,
  emberfield_intro,
  emberfield_crossroads,
  wren,
  dax,
  pilgrim,
  merchant,
  greenwood_intro,
  seris,
  lyra,
  fen,
  quill,
  thea,
  bramble,
  woodchild,
  grove_confrontation,
  grove_heart_hint,
  grove_heart,
  mire_intro,
  mire_altar_hint,
  mire_sable_meet,
  sable,
  hermit,
  mudlark,
  witch,
  mire_boss,
  peaks_intro,
  peaks_camp_arrival,
  peaks_caldera_hint,
  malrec,
  hessa,
  sentinel,
  vela,
  prisoner,
  peaks_boss,
  citadel_intro,
  citadel_hall,
  final_boss,
};
