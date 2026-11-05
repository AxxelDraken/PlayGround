// ── Status effects ─────────────────────────────────────────────
export const STATUSES = {
  burn:      { name: 'Burn',      icon: '✹', tone: 'bad',  desc: 'Takes fire damage at the end of each turn.' },
  poison:    { name: 'Poison',    icon: '☣', tone: 'bad',  desc: 'Takes nature damage at the end of each turn.' },
  chill:     { name: 'Chill',     icon: '❄', tone: 'bad',  desc: 'Speed reduced by 25%.' },
  stun:      { name: 'Stun',      icon: '✧', tone: 'bad',  desc: 'Loses the next turn.' },
  weaken:    { name: 'Weaken',    icon: '▽', tone: 'bad',  desc: 'Attack reduced by 25%.' },
  defDown:   { name: 'Sundered',  icon: '◇', tone: 'bad',  desc: 'Defence reduced by 30%.' },
  resDown:   { name: 'Unwoven',   icon: '◈', tone: 'bad',  desc: 'Resistance reduced by 30%.' },
  atkUp:     { name: 'Empowered', icon: '▲', tone: 'good', desc: 'Attack increased by 30%.' },
  magUp:     { name: 'Attuned',   icon: '✦', tone: 'good', desc: 'Magic increased by 30%.' },
  defUp:     { name: 'Warded',    icon: '◆', tone: 'good', desc: 'Defence increased by 30%.' },
  resUp:     { name: 'Shielded',  icon: '◉', tone: 'good', desc: 'Resistance increased by 30%.' },
  agiUp:     { name: 'Hastened',  icon: '≫', tone: 'good', desc: 'Speed increased by 35%.' },
  critUp:    { name: 'Focused',   icon: '✸', tone: 'good', desc: 'Critical chance increased by 25%.' },
  evade:     { name: 'Veiled',    icon: '☾', tone: 'good', desc: 'High chance to evade physical attacks.' },
  regen:     { name: 'Regrowth',  icon: '❧', tone: 'good', desc: 'Restores HP at the end of each turn.' },
  shield:    { name: 'Aegis',     icon: '⛨', tone: 'good', desc: 'Absorbs incoming damage.' },
  taunt:     { name: 'Provoked',  icon: '◎', tone: 'good', desc: 'Draws enemy attacks.' },
  mark:      { name: 'Death Mark',icon: '☠', tone: 'bad',  desc: 'Takes 25% more damage.' },
};

// ── Skills ─────────────────────────────────────────────────────
// kind: phys | mag | heal | revive | buff | cleanse | special
export const SKILLS = {
  // VANGUARD
  shieldBash:   { name: 'Shield Bash',   icon: '⛨', mp: 5,  target: 'enemy', kind: 'phys', power: 1.35, element: 'earth', status: { id: 'stun', chance: .35, turns: 1 }, desc: 'Slam a foe with your shield. 35% chance to stun.' },
  ironSkin:     { name: 'Iron Skin',     icon: '◆', passive: true, mods: { def: 8, hpPct: .10 }, desc: '+8 Defence and +10% max HP.' },
  provoke:      { name: 'Provoke',       icon: '◎', mp: 4,  target: 'self', kind: 'buff', statuses: [{ id: 'defUp', turns: 3 }, { id: 'taunt', turns: 2 }], desc: 'Raise your guard and draw enemy attacks for 2 turns.' },
  bulwark:      { name: 'Bulwark',       icon: '⬢', passive: true, mods: { hpPct: .14, res: 5 }, desc: '+14% max HP and +5 Resistance.' },
  crushingBlow: { name: 'Crushing Blow', icon: '⚒', mp: 9,  target: 'enemy', kind: 'phys', power: 2.0, element: 'earth', status: { id: 'defDown', chance: .45, turns: 3 }, desc: 'A shattering strike. 45% chance to sunder defence.' },
  emberGuard:   { name: 'Ember Guard',   icon: '❖', mp: 10, target: 'allAllies', kind: 'buff', statuses: [{ id: 'defUp', turns: 3 }, { id: 'shield', turns: 4, value: 38 }], desc: 'Ward the whole party with a 38-point ember aegis.' },
  counter:      { name: 'Vengeance',     icon: '↺', passive: true, special: 'counter', mods: { def: 2 }, desc: '35% chance to counter physical attackers.' },
  earthshatter: { name: 'Earthshatter',  icon: '❂', mp: 14, target: 'allEnemies', kind: 'phys', power: 1.35, element: 'earth', status: { id: 'stun', chance: .25, turns: 1 }, desc: 'Fracture the ground beneath all foes. May stun.' },
  unbroken:     { name: 'Unbroken',      icon: '✶', passive: true, special: 'reviveOnce', desc: 'Once per battle, survive a fatal blow with 1 HP.' },
  titansWrath:  { name: "Titan's Wrath", icon: '⛰', mp: 20, target: 'allEnemies', kind: 'phys', power: 2.1, element: 'earth', status: { id: 'defDown', chance: .5, turns: 3 }, desc: 'Call the mountain\'s fury down upon every enemy.' },

  // EMBERWEAVER
  emberbolt:   { name: 'Emberbolt',     icon: '✦', mp: 4,  target: 'enemy', kind: 'mag', power: 1.4, element: 'fire', status: { id: 'burn', chance: .3, turns: 3 }, desc: 'A lance of living flame. May ignite the target.' },
  flameWard:   { name: 'Flame Ward',    icon: '⬡', passive: true, mods: { res: 5, fireRes: .2 }, desc: '+5 Resistance and 20% fire resistance.' },
  kindle:      { name: 'Kindle',        icon: '✹', mp: 6,  target: 'enemy', kind: 'mag', power: 1.15, element: 'fire', status: { id: 'burn', chance: .85, turns: 3 }, desc: 'Set a foe ablaze. Nearly always burns.' },
  scorch:      { name: 'Scorch',        icon: '❈', mp: 12, target: 'allEnemies', kind: 'mag', power: 1.25, element: 'fire', status: { id: 'burn', chance: .5, turns: 3 }, desc: 'A wave of cinders washes over all enemies.' },
  focus:       { name: 'Focus',         icon: '✧', mp: 4,  target: 'self', kind: 'buff', statuses: [{ id: 'magUp', turns: 3 }], desc: 'Attune to the ember. Magic +30% for 3 turns.' },
  cinderLance: { name: 'Cinder Lance',  icon: '➶', mp: 10, target: 'enemy', kind: 'mag', power: 2.1, element: 'fire', pierce: .3, desc: 'A piercing spear of ember. Ignores 30% resistance.' },
  phoenixPlume:{ name: 'Phoenix Plume', icon: '☤', mp: 12, target: 'deadAlly', kind: 'revive', power: .55, desc: 'Revive a fallen ally with 55% of their HP.' },
  inferno:     { name: 'Inferno',       icon: '✺', mp: 18, target: 'allEnemies', kind: 'mag', power: 1.9, element: 'fire', status: { id: 'burn', chance: .6, turns: 3 }, desc: 'A roaring firestorm consumes the battlefield.' },
  ashenVeil:   { name: 'Ashen Veil',    icon: '❋', passive: true, special: 'mpRegen', mods: { fireRes: .1 }, desc: 'Recover 4 MP at the start of each turn and gain +10% fire resistance.' },
  sunflare:    { name: 'Sunflare',      icon: '☀', mp: 24, target: 'allEnemies', kind: 'mag', power: 2.7, element: 'fire', status: { id: 'burn', chance: .75, turns: 3 }, desc: 'Unmake the dark with a shard of the sun.' },

  // SHADOWBLADE
  backstab:    { name: 'Backstab',      icon: '†', mp: 4,  target: 'enemy', kind: 'phys', power: 1.5, element: 'shadow', critBonus: .25, desc: 'Strike from the dark. High critical chance.' },
  venomEdge:   { name: 'Venom Edge',    icon: '☣', mp: 6,  target: 'enemy', kind: 'phys', power: 1.2, element: 'shadow', status: { id: 'poison', chance: .8, turns: 3 }, desc: 'A poisoned blade. Likely to poison.' },
  smoke:       { name: 'Smoke Veil',    icon: '☾', mp: 5,  target: 'self', kind: 'buff', statuses: [{ id: 'evade', turns: 2 }], desc: 'Vanish in smoke. Evade most physical attacks for 2 turns.' },
  twinFangs:   { name: 'Twin Fangs',    icon: '⑂', mp: 8,  target: 'enemy', kind: 'phys', power: .95, element: 'shadow', hits: 2, desc: 'Two rapid strikes.' },
  nightfall:   { name: 'Nightfall',     icon: '☽', mp: 12, target: 'allEnemies', kind: 'phys', power: 1.3, element: 'shadow', status: { id: 'weaken', chance: .45, turns: 3 }, desc: 'Darkness sweeps the field, weakening all foes.' },
  assassinate: { name: 'Assassinate',   icon: '☠', mp: 14, target: 'enemy', kind: 'phys', power: 2.6, element: 'shadow', execute: .35, critBonus: .15, desc: 'Devastating against wounded foes (doubled below 35% HP).' },
  bloodPact:   { name: 'Blood Pact',    icon: '♰', passive: true, special: 'lifesteal', mods: { lifesteal: .18 }, desc: 'Heal for 18% of physical damage dealt.' },
  umbralCloak: { name: 'Umbral Cloak',  icon: '◐', passive: true, mods: { agi: 3, evade: .08 }, desc: '+3 Agility, +8% evade chance.' },
  deathMark:   { name: 'Death Mark',    icon: '⟁', mp: 8,  target: 'enemy', kind: 'buff', statuses: [{ id: 'mark', turns: 3 }, { id: 'poison', turns: 3 }], desc: 'Mark a foe: it takes 25% more damage and is poisoned.' },
  thousandCuts:{ name: 'Thousand Cuts', icon: '✷', mp: 20, target: 'allEnemies', kind: 'phys', power: .62, element: 'shadow', hits: 5, desc: 'Five blinding strikes scattered across the enemy line.' },

  // WARDEN
  mend:        { name: 'Mend',         icon: '❧', mp: 4,  target: 'ally', kind: 'heal', power: 1.0, desc: 'Restore HP to one ally.' },
  barkskin:    { name: 'Barkskin',     icon: '⛨', mp: 4,  target: 'ally', kind: 'buff', statuses: [{ id: 'defUp', turns: 3 }], desc: 'Harden an ally\'s skin. Defence +30%.' },
  thornLash:   { name: 'Thorn Lash',   icon: '➶', mp: 5,  target: 'enemy', kind: 'mag', power: 1.35, element: 'nature', desc: 'A whip of living thorns.' },
  regen:       { name: 'Regrowth',     icon: '✿', mp: 6,  target: 'ally', kind: 'buff', statuses: [{ id: 'regen', turns: 4 }], desc: 'Grant an ally regeneration for 4 turns.' },
  verdantChorus:{ name: 'Verdant Chorus', icon: '♫', mp: 12, target: 'allAllies', kind: 'heal', power: .8, desc: 'A song of green restores the whole party.' },
  purge:       { name: 'Purge',        icon: '✧', mp: 4,  target: 'ally', kind: 'cleanse', desc: 'Remove all negative statuses from an ally.' },
  naturesWrath:{ name: "Nature's Wrath",icon: '❃', mp: 13, target: 'allEnemies', kind: 'mag', power: 1.45, element: 'nature', status: { id: 'poison', chance: .5, turns: 3 }, desc: 'The wilds rise against every enemy.' },
  bloom:       { name: 'Bloom',        icon: '✾', mp: 14, target: 'deadAlly', kind: 'revive', power: .6, desc: 'Return a fallen ally to life with 60% HP.' },
  ancientPact: { name: 'Ancient Pact', icon: '❦', passive: true, special: 'mpRegen2', mods: { mag: 6, res: 4 }, desc: '+6 Magic, +4 Resistance, recover 3 MP each turn.' },
  worldroot:   { name: 'Worldroot',    icon: '❧', mp: 22, target: 'allAllies', kind: 'heal', power: 1.4, statuses: [{ id: 'regen', turns: 3 }, { id: 'shield', turns: 3, value: 30 }], desc: 'Ancient roots mend, shield, and sustain the party.' },

  // STORMCALLER
  spark:       { name: 'Spark',        icon: '⚡', mp: 4,  target: 'enemy', kind: 'mag', power: 1.35, element: 'storm', status: { id: 'stun', chance: .2, turns: 1 }, desc: 'A crackling arc. May stun.' },
  chain:       { name: 'Chain Lightning', icon: '≋', mp: 9, target: 'allEnemies', kind: 'mag', power: 1.1, element: 'storm', desc: 'Lightning leaps between all enemies.' },
  staticField: { name: 'Static Field', icon: '❉', mp: 12, target: 'allEnemies', kind: 'mag', power: .8, element: 'storm', status: { id: 'stun', chance: .55, turns: 1 }, desc: 'A charged field. 55% chance to stun each foe.' },
  windward:    { name: 'Windward',     icon: '≫', mp: 8,  target: 'allAllies', kind: 'buff', statuses: [{ id: 'agiUp', turns: 3 }], desc: 'Tailwind. Party speed +35% for 3 turns.' },
  thunderclap: { name: 'Thunderclap',  icon: '☈', mp: 11, target: 'enemy', kind: 'mag', power: 2.0, element: 'storm', status: { id: 'stun', chance: .3, turns: 1 }, desc: 'A deafening bolt from a clear sky.' },
  stormEye:    { name: 'Storm Eye',    icon: '◉', passive: true, mods: { mag: 5, crit: .06 }, desc: '+5 Magic, +6% critical chance.' },
  frostbind:   { name: 'Frostbind',    icon: '❄', mp: 7,  target: 'enemy', kind: 'mag', power: 1.2, element: 'frost', status: { id: 'chill', chance: .85, turns: 3 }, desc: 'Bind a foe in ice. Almost always chills.' },
  tempest:     { name: 'Tempest',      icon: '☂', mp: 16, target: 'allEnemies', kind: 'mag', power: 1.7, element: 'storm', desc: 'A howling storm batters every enemy.' },
  conduction:  { name: 'Conduction',   icon: '⌁', passive: true, special: 'stormBoost', mods: { res: 4 }, desc: 'Storm damage +20%. +4 Resistance.' },
  maelstrom:   { name: 'Maelstrom',    icon: '🌀', mp: 23, target: 'allEnemies', kind: 'mag', power: 2.55, element: 'storm', status: { id: 'stun', chance: .4, turns: 1 }, desc: 'Tear open the sky. Heavy damage, may stun.' },

  // RONIN
  iaiSlash:    { name: 'Iai Slash',    icon: '⚔', mp: 4,  target: 'enemy', kind: 'phys', power: 1.4, element: 'phys', critBonus: .2, desc: 'A single, perfect draw-cut.' },
  focusStance: { name: 'Focus Stance', icon: '✧', mp: 3,  target: 'self', kind: 'buff', statuses: [{ id: 'critUp', turns: 3 }, { id: 'atkUp', turns: 3 }], desc: 'Centre your spirit. Attack and critical chance up.' },
  whirlwind:   { name: 'Whirlwind',    icon: '↻', mp: 9,  target: 'allEnemies', kind: 'phys', power: 1.2, element: 'phys', desc: 'Spin through the enemy line.' },
  ironWill:    { name: 'Iron Will',    icon: '⛨', passive: true, mods: { atk: 6, hpPct: .08 }, desc: '+6 Attack and +8% max HP.' },
  crescentMoon:{ name: 'Crescent Moon', icon: '☾', mp: 8,  target: 'enemy', kind: 'phys', power: 1.0, element: 'phys', hits: 2, desc: 'Two sweeping cuts in one breath.' },
  bladeDance:  { name: 'Blade Dance',  icon: '✸', mp: 12, target: 'allEnemies', kind: 'phys', power: 1.0, element: 'phys', hits: 3, randomHits: true, desc: 'Three wild strikes at random foes.' },
  bloodlust:   { name: 'Bloodlust',    icon: '♰', passive: true, special: 'lifesteal', desc: 'Heal for 15% of physical damage dealt.' },
  zanshin:     { name: 'Zanshin',      icon: '◈', passive: true, special: 'counter25', mods: { agi: 3 }, desc: '25% chance to counter attackers, and +3 Agility.' },
  sever:       { name: 'Sever',        icon: '⟊', mp: 10, target: 'enemy', kind: 'phys', power: 2.2, element: 'phys', pierce: .5, desc: 'A cut that ignores 50% of defence.' },
  muramasa:    { name: 'Muramasa',     icon: '✹', mp: 20, target: 'enemy', kind: 'phys', power: 3.6, element: 'phys', critBonus: .3, desc: 'The cursed blade. Colossal single-target damage.' },
};

// ── Skill trees ────────────────────────────────────────────────
// tier = row, col = 0..2. `req` references node ids.
function n(id, tier, col, opts = {}) {
  const skill = SKILLS[id] || {};
  return {
    id, tier, col, sp: opts.sp ?? 1,
    name: opts.name || skill.name || id,
    kind: opts.kind || (skill.passive ? 'passive' : 'skill'),
    desc: opts.desc || skill.desc || '',
    icon: opts.icon || skill.icon || '✦',
    req: opts.req || [],
  };
}

export const TREES = {
  vanguard: [
    n('shieldBash', 0, 1),
    n('ironSkin', 1, 0, { req: ['shieldBash'] }),
    n('provoke', 1, 1, { req: ['shieldBash'] }),
    n('bulwark', 1, 2, { req: ['shieldBash'] }),
    n('crushingBlow', 2, 0, { req: ['ironSkin'] }),
    n('emberGuard', 2, 1, { req: ['provoke'] }),
    n('counter', 2, 2, { req: ['bulwark'] }),
    n('earthshatter', 3, 0, { req: ['crushingBlow'] }),
    n('unbroken', 3, 2, { req: ['counter'] }),
    n('titansWrath', 4, 1, { req: ['earthshatter'], sp: 2 }),
  ],
  emberweaver: [
    n('emberbolt', 0, 1),
    n('kindle', 1, 0, { req: ['emberbolt'] }),
    n('flameWard', 1, 1, { req: ['emberbolt'] }),
    n('focus', 1, 2, { req: ['emberbolt'] }),
    n('scorch', 2, 0, { req: ['kindle'] }),
    n('cinderLance', 2, 1, { req: ['flameWard'] }),
    n('phoenixPlume', 2, 2, { req: ['focus'] }),
    n('inferno', 3, 0, { req: ['scorch'] }),
    n('ashenVeil', 3, 2, { req: ['phoenixPlume'] }),
    n('sunflare', 4, 1, { req: ['inferno'], sp: 2 }),
  ],
  shadowblade: [
    n('backstab', 0, 1),
    n('venomEdge', 1, 0, { req: ['backstab'] }),
    n('smoke', 1, 1, { req: ['backstab'] }),
    n('twinFangs', 1, 2, { req: ['backstab'] }),
    n('nightfall', 2, 0, { req: ['venomEdge'] }),
    n('umbralCloak', 2, 1, { req: ['smoke'] }),
    n('deathMark', 2, 2, { req: ['twinFangs'] }),
    n('assassinate', 3, 0, { req: ['nightfall'] }),
    n('bloodPact', 3, 2, { req: ['deathMark'] }),
    n('thousandCuts', 4, 1, { req: ['assassinate'], sp: 2 }),
  ],
  warden: [
    n('mend', 0, 1),
    n('barkskin', 1, 0, { req: ['mend'] }),
    n('thornLash', 1, 1, { req: ['mend'] }),
    n('regen', 1, 2, { req: ['mend'] }),
    n('verdantChorus', 2, 0, { req: ['barkskin'] }),
    n('purge', 2, 1, { req: ['thornLash'] }),
    n('naturesWrath', 2, 2, { req: ['regen'] }),
    n('bloom', 3, 0, { req: ['verdantChorus'] }),
    n('ancientPact', 3, 2, { req: ['naturesWrath'] }),
    n('worldroot', 4, 1, { req: ['bloom'], sp: 2 }),
  ],
  stormcaller: [
    n('spark', 0, 1),
    n('chain', 1, 0, { req: ['spark'] }),
    n('windward', 1, 1, { req: ['spark'] }),
    n('frostbind', 1, 2, { req: ['spark'] }),
    n('staticField', 2, 0, { req: ['chain'] }),
    n('thunderclap', 2, 1, { req: ['windward'] }),
    n('stormEye', 2, 2, { req: ['frostbind'] }),
    n('tempest', 3, 0, { req: ['staticField'] }),
    n('conduction', 3, 2, { req: ['stormEye'] }),
    n('maelstrom', 4, 1, { req: ['tempest'], sp: 2 }),
  ],
  ronin: [
    n('iaiSlash', 0, 1),
    n('focusStance', 1, 0, { req: ['iaiSlash'] }),
    n('whirlwind', 1, 1, { req: ['iaiSlash'] }),
    n('ironWill', 1, 2, { req: ['iaiSlash'] }),
    n('crescentMoon', 2, 0, { req: ['focusStance'] }),
    n('bladeDance', 2, 1, { req: ['whirlwind'] }),
    n('zanshin', 2, 2, { req: ['ironWill'] }),
    n('sever', 3, 0, { req: ['crescentMoon'] }),
    n('bloodlust', 3, 2, { req: ['zanshin'] }),
    n('muramasa', 4, 1, { req: ['sever'], sp: 2 }),
  ],
};

// ── Classes ────────────────────────────────────────────────────
export const CLASSES = {
  vanguard: {
    id: 'vanguard', name: 'Vanguard', role: 'Bulwark', sigil: '⛨', color: '#e2a15f',
    weapon: 'Greatblade', element: 'earth',
    desc: 'A shield against the dark. Endures what would break others and answers with crushing force.',
    base: { hp: 132, mp: 28, atk: 14, def: 17, mag: 5, res: 9, agi: 7, luck: 5 },
    grow: { hp: 15, mp: 2.2, atk: 1.7, def: 2.1, mag: .3, res: 1.1, agi: .6, luck: .35 },
    tree: TREES.vanguard, start: ['shieldBash'],
  },
  emberweaver: {
    id: 'emberweaver', name: 'Emberweaver', role: 'Pyromancer', sigil: '✹', color: '#f0774d',
    weapon: 'Emberstaff', element: 'fire',
    desc: 'Carries a shard of the first flame. Burns the field, and may yet learn to heal with fire.',
    base: { hp: 88, mp: 62, atk: 7, def: 8, mag: 17, res: 13, agi: 8, luck: 6 },
    grow: { hp: 8, mp: 6, atk: .5, def: .9, mag: 2.3, res: 1.5, agi: .8, luck: .5 },
    tree: TREES.emberweaver, start: ['emberbolt'],
  },
  shadowblade: {
    id: 'shadowblade', name: 'Shadowblade', role: 'Assassin', sigil: '☾', color: '#a58ae0',
    weapon: 'Twin Daggers', element: 'shadow',
    desc: 'One quiet step, one red moment. Strikes first, strikes twice, and is gone before the answer.',
    base: { hp: 96, mp: 38, atk: 16, def: 9, mag: 6, res: 8, agi: 16, luck: 11 },
    grow: { hp: 9.5, mp: 3, atk: 2.0, def: 1.0, mag: .6, res: .9, agi: 2.0, luck: 1.0 },
    tree: TREES.shadowblade, start: ['backstab'],
  },
  warden: {
    id: 'warden', name: 'Warden', role: 'Lifebinder', sigil: '❧', color: '#79c98b',
    weapon: 'Thornstaff', element: 'nature',
    desc: 'Listens to the old roots. Mends wounds, summons the wild, and brings the fallen back to the light.',
    base: { hp: 110, mp: 56, atk: 9, def: 11, mag: 14, res: 16, agi: 9, luck: 6 },
    grow: { hp: 11, mp: 4.8, atk: .9, def: 1.3, mag: 1.9, res: 1.8, agi: .8, luck: .5 },
    tree: TREES.warden, start: ['mend'],
  },
  stormcaller: {
    id: 'stormcaller', name: 'Stormcaller', role: 'Elementalist', sigil: '⚡', color: '#76b8ec',
    weapon: 'Stormrod', element: 'storm',
    desc: 'The sky answers when you speak. Lightning and frost break formations before they can close.',
    base: { hp: 90, mp: 58, atk: 8, def: 8, mag: 16, res: 12, agi: 12, luck: 7 },
    grow: { hp: 8.5, mp: 5.6, atk: .6, def: .85, mag: 2.2, res: 1.3, agi: 1.4, luck: .6 },
    tree: TREES.stormcaller, start: ['spark'],
  },
  ronin: {
    id: 'ronin', name: 'Ronin', role: 'Blademaster', sigil: '⚔', color: '#e07a6b',
    weapon: 'Katana', element: 'phys',
    desc: 'A wandering sword with no lord. Reads a fight in a breath, and ends it in the next.',
    base: { hp: 114, mp: 32, atk: 17, def: 10, mag: 5, res: 8, agi: 13, luck: 9 },
    grow: { hp: 12, mp: 2.6, atk: 2.2, def: 1.1, mag: .3, res: .8, agi: 1.6, luck: .7 },
    tree: TREES.ronin, start: ['iaiSlash'],
  },
};

export const ORIGINS = {
  hearthbound: {
    id: 'hearthbound', name: 'Child of the Hearth', glyph: '✧',
    blurb: 'Raised among the village fires. The people of Hearthfall know your name, and your hands know work.',
    perk: '+10% max HP · +2 Defence · begin with 2 Ember Tonics',
    bonuses: { hpPct: .1, def: 2 }, items: { tonic: 2 },
  },
  scholar: {
    id: 'scholar', name: 'Ashen Scholar', glyph: '❈',
    blurb: 'You studied the old runes until the old world answered. Knowledge is a weapon that never dulls.',
    perk: '+3 Magic · +2 Resistance · begin with 2 Aether Draughts',
    bonuses: { mag: 3, res: 2 }, items: { ether: 2 },
  },
  outcast: {
    id: 'outcast', name: 'Road Outcast', glyph: '☾',
    blurb: 'Cast out young, you learned the roads, the smugglers, and the price of a quiet step.',
    perk: '+3 Agility · +2 Luck · begin with 2 Smoke Bombs',
    bonuses: { agi: 3, luck: 2 }, items: { smoke: 2 },
  },
};

export const PALETTES = [
  { skin: '#d9a982', hair: '#4a2f22', accent: '#f0a15a', cloth: '#5a3a2a' },
  { skin: '#e6bc98', hair: '#8e3f2f', accent: '#f0d18a', cloth: '#3f4a3a' },
  { skin: '#b98262', hair: '#1e2230', accent: '#7fd1c0', cloth: '#2c3547' },
  { skin: '#c99b78', hair: '#a9b3c2', accent: '#c9a6e8', cloth: '#3a2d4a' },
  { skin: '#8d5f45', hair: '#1b1512', accent: '#8fd07f', cloth: '#263b2c' },
  { skin: '#e3b192', hair: '#d9c9a6', accent: '#7db9e8', cloth: '#27384e' },
];

export const COMPANIONS = {
  kael: {
    id: 'kael', name: 'Kael', classId: 'ronin', palette: 1, title: 'The Ashen Blade',
    bio: 'A wandering swordsman who owes your village a debt. Speaks little. Cuts deeply.',
    levelOffset: 0,
  },
  lyra: {
    id: 'lyra', name: 'Lyra', classId: 'emberweaver', palette: 3, title: 'Freewood Ember',
    bio: 'A young flame-singer of the Freewood. Believes the old powers should belong to no one.',
    levelOffset: 0,
  },
  seris: {
    id: 'seris', name: 'Seris', classId: 'warden', palette: 4, title: 'Warden of the Grove',
    bio: 'A sworn Warden of the Order. Believes the flame must be guarded, whatever the cost.',
    levelOffset: 0,
  },
  sable: {
    id: 'sable', name: 'Sable', classId: 'shadowblade', palette: 2, title: 'Mire-Born',
    bio: 'Raised in the drowned marsh by the Witch of Mire. Owes you a life, and follows.',
    levelOffset: 0,
  },
};
