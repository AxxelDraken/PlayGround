// ── Items, gear & loot ─────────────────────────────────────────
export const ITEMS = {
  // consumables
  tonic: {
    name: 'Ember Tonic', type: 'consumable', icon: '✚', price: 32, target: 'ally',
    heal: 48, desc: 'A warm draught of emberleaf. Restores 48 HP to one ally.',
  },
  greaterTonic: {
    name: 'Greater Tonic', type: 'consumable', icon: '✚', price: 95, target: 'ally',
    heal: 150, desc: 'Distilled hearthroot. Restores 150 HP to one ally.',
  },
  ether: {
    name: 'Aether Draught', type: 'consumable', icon: '◈', price: 42, target: 'ally',
    mp: 28, desc: 'Condensed starlight. Restores 28 MP to one ally.',
  },
  greaterEther: {
    name: 'Greater Draught', type: 'consumable', icon: '◈', price: 110, target: 'ally',
    mp: 70, desc: 'A storm in a bottle. Restores 70 MP.',
  },
  antidote: {
    name: 'Cleansing Ash', type: 'consumable', icon: '✧', price: 26, target: 'ally',
    cleanse: true, desc: 'Bitter ash that purges poison, burn and other ailments.',
  },
  smoke: {
    name: 'Smoke Bomb', type: 'consumable', icon: '☾', price: 22, target: 'self',
    flee: true, desc: 'A burst of grey smoke. Escape from most battles, or repel weak foes for 120 steps.',
  },
  feather: {
    name: 'Phoenix Feather', type: 'consumable', icon: '☤', price: 90, target: 'deadAlly',
    revive: .45, desc: 'Revive a fallen ally with 45% HP.',
  },
  elixir: {
    name: 'Ember Elixir', type: 'consumable', icon: '❖', price: 320, target: 'ally',
    heal: 9999, mp: 999, desc: 'The old alchemists\' final work. Fully restores HP and MP.',
  },
  bomb: {
    name: 'Fire Flask', type: 'consumable', icon: '✹', price: 58, target: 'allEnemies',
    power: 78, element: 'fire', desc: 'Hurls fire at all enemies. Deals 78 fixed fire damage.',
  },
  // quest / key items
  locket: {
    name: 'Tarnished Locket', type: 'quest', icon: '❖', price: 0,
    desc: 'A small locket engraved with the name "Wren". Someone in Emberfield is missing this.',
  },
  moonpetal: {
    name: 'Moonpetal', type: 'quest', icon: '❀', price: 0,
    desc: 'A silver flower that blooms only in deep shade. The Witch of Mire wants three.',
  },
  emberkey_thorn: {
    name: 'Emberkey of Thorn', type: 'key', icon: '✿', price: 0,
    desc: 'A key of living wood, warm to the touch. One of the three seals on the Ashen Crown.',
  },
  emberkey_tide: {
    name: 'Emberkey of Tide', type: 'key', icon: '≋', price: 0,
    desc: 'A key of black pearl and brine. The mire whispers when you hold it.',
  },
  emberkey_cinder: {
    name: 'Emberkey of Cinder', type: 'key', icon: '✹', price: 0,
    desc: 'A key of fused ash and iron. It remembers the mountain that made it.',
  },
  hearthsigil: {
    name: 'Hearthsigil', type: 'key', icon: '✧', price: 0,
    desc: 'The old ward of Hearthfall. It pulses when the flame is in danger.',
  },
  // weapons
  wornBlade: {
    name: 'Worn Blade', type: 'gear', slot: 'weapon', icon: '⚔', price: 40,
    stats: { atk: 2 }, desc: 'Chipped, but it remembers how to cut. Attack +2.',
  },
  embersteel: {
    name: 'Embersteel Edge', type: 'gear', slot: 'weapon', icon: '⚔', price: 190,
    stats: { atk: 5, mag: 1 }, desc: 'Hearthfall steel, quenched in ember oil. Attack +5, Magic +1.',
  },
  thornfang: {
    name: 'Thornfang', type: 'gear', slot: 'weapon', icon: '⟊', price: 340,
    stats: { atk: 7, agi: 2 }, desc: 'A living blade grown, not forged. Attack +7, Agility +2.',
  },
  mireglass: {
    name: 'Mireglass Rod', type: 'gear', slot: 'weapon', icon: '✧', price: 360,
    stats: { mag: 7, res: 2 }, desc: 'Black glass that hums with drowned secrets. Magic +7, Resistance +2.',
  },
  stormiron: {
    name: 'Stormiron Sabre', type: 'gear', slot: 'weapon', icon: '⚡', price: 520,
    stats: { atk: 9, agi: 2 }, desc: 'Lightning folded into steel. Attack +9, Agility +2.',
  },
  dawnblade: {
    name: 'Dawnblade', type: 'gear', slot: 'weapon', icon: '☀', price: 920,
    stats: { atk: 12, mag: 5, luck: 2 }, desc: 'Forged in the first light of the world. Attack +12, Magic +5, Luck +2.',
  },
  // charms
  travelerCharm: {
    name: 'Traveler\'s Charm', type: 'gear', slot: 'charm', icon: '❖', price: 120,
    stats: { hp: 18, res: 2 }, desc: 'A small carved sparrow. Max HP +18, Resistance +2.',
  },
  emberheart: {
    name: 'Emberheart', type: 'gear', slot: 'charm', icon: '✹', price: 260,
    stats: { mag: 4, mp: 12 }, desc: 'A coal that never cools. Magic +4, Max MP +12.',
  },
  wardensSeal: {
    name: 'Warden\'s Seal', type: 'gear', slot: 'charm', icon: '❧', price: 300,
    stats: { def: 5, res: 5 }, desc: 'A badge of the old green order. Defence +5, Resistance +5.',
  },
  shadowPin: {
    name: 'Shadow Pin', type: 'gear', slot: 'charm', icon: '☾', price: 280,
    stats: { agi: 4, luck: 3 }, desc: 'A needle of black iron. Agility +4, Luck +3.',
  },
  crownFragment: {
    name: 'Crown Fragment', type: 'gear', slot: 'charm', icon: '♛', price: 700,
    stats: { atk: 3, def: 3, mag: 3, res: 3, agi: 3, luck: 3 }, desc: 'A shard of the Ashen Crown. All stats +3. It watches you.',
  },
  heirloom: {
    name: 'Emberwake Heirloom', type: 'gear', slot: 'charm', icon: '✦', price: 0,
    stats: { hp: 25, mp: 15, luck: 4 }, desc: 'Carried across a previous chronicle. Max HP +25, Max MP +15, Luck +4.',
  },
};

export const SHOP_STOCK = {
  hearthfall: ['tonic', 'ether', 'antidote', 'embersteel', 'travelerCharm', 'smoke'],
  mosswood: ['tonic', 'greaterTonic', 'ether', 'greaterEther', 'antidote', 'thornfang', 'wardensSeal', 'feather'],
  mire: ['greaterTonic', 'greaterEther', 'antidote', 'feather', 'mireglass', 'shadowPin', 'bomb'],
  peaks: ['greaterTonic', 'greaterEther', 'feather', 'elixir', 'stormiron', 'dawnblade', 'crownFragment', 'bomb'],
};

export const SELL_RATE = 0.5;
