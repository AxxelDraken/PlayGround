// ── World maps ─────────────────────────────────────────────────
// Tiles:
//  . grass   , tall grass   " flowers   = stone   _ dirt   s sand
//  # tree    T great tree    ^ mountain  ~ deep water  w shallow
//  b bridge  r rock          R boulder   f fence  g grave
//  H wall    h roof          D door      W stone wall  L pillar/lamp
//  A altar   S save crystal  C chest     o brazier  P portal
//  i sign    t stump         n tent      B bones  v lava   e void
//  x ash

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const make = (w, h, fill = '.') => ({
  w, h, g: Array.from({ length: h }, () => Array(w).fill(fill)),
});
const put = (m, x, y, ch) => { if (x >= 0 && y >= 0 && x < m.w && y < m.h) m.g[y][x] = ch; };
const get = (m, x, y) => (x >= 0 && y >= 0 && x < m.w && y < m.h ? m.g[y][x] : 'e');
function rect(m, x, y, w, h, ch) {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) put(m, i, j, ch);
}
function outline(m, x, y, w, h, ch) {
  for (let i = x; i < x + w; i++) { put(m, i, y, ch); put(m, i, y + h - 1, ch); }
  for (let j = y; j < y + h; j++) { put(m, x, j, ch); put(m, x + w - 1, j, ch); }
}
function hline(m, x1, x2, y, ch, thick = 1) {
  for (let t = 0; t < thick; t++) for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) put(m, x, y + t, ch);
}
function vline(m, x, y1, y2, ch, thick = 1) {
  for (let t = 0; t < thick; t++) for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) put(m, x + t, y, ch);
}
function scatter(m, ch, n, rng, area = null, repl = ['.']) {
  const a = area || { x: 1, y: 1, w: m.w - 2, h: m.h - 2 };
  let tries = 0;
  while (n > 0 && tries < n * 40) {
    tries++;
    const x = a.x + Math.floor(rng() * a.w);
    const y = a.y + Math.floor(rng() * a.h);
    if (repl.includes(m.g[y]?.[x])) { m.g[y][x] = ch; n--; }
  }
}
function house(m, x, y, w, h) {
  // 2 rows roof, remaining walls, door on bottom edge
  rect(m, x, y, w, Math.min(2, h), 'h');
  rect(m, x, y + Math.min(2, h), w, Math.max(0, h - Math.min(2, h)), 'H');
  put(m, x + Math.floor((w - 1) / 2), y + h - 1, 'D');
}
function tents(m, x, y, w, h) { rect(m, x, y, w, h, 'n'); }
function border(m, ch = '#', thick = 2) {
  rect(m, 0, 0, m.w, thick, ch);
  rect(m, 0, m.h - thick, m.w, thick, ch);
  rect(m, 0, 0, thick, m.h, ch);
  rect(m, m.w - thick, 0, thick, m.h, ch);
}

// ═══════════════════════════════════════════════════════════════
// HEARTHFALL — the village at the edge of the Emberfield
// ═══════════════════════════════════════════════════════════════
function buildHearthfall() {
  const m = make(36, 24, '.');
  const rng = mulberry32(7331);
  border(m, '#', 2);
  // grass variety
  scatter(m, '"', 34, rng, { x: 2, y: 2, w: 32, h: 20 });
  scatter(m, ',', 22, rng, { x: 2, y: 2, w: 32, h: 20 });
  scatter(m, '#', 16, rng, { x: 2, y: 2, w: 32, h: 20 });
  scatter(m, 'r', 8, rng, { x: 2, y: 2, w: 32, h: 20 });

  // south gate corridor
  rect(m, 15, 20, 5, 4, '_');
  put(m, 17, 22, 'P'); put(m, 16, 22, '_'); put(m, 18, 22, '_');
  put(m, 17, 23, '_');

  // central plaza
  rect(m, 13, 9, 9, 6, '=');
  put(m, 17, 9, 'A');
  put(m, 15, 10, 'o'); put(m, 19, 10, 'o');
  put(m, 14, 13, 'S');

  // roads
  vline(m, 17, 15, 21, '_', 1);
  hline(m, 7, 13, 11, '_');
  hline(m, 20, 27, 11, '_');
  vline(m, 15, 7, 8, '_');
  hline(m, 15, 17, 8, '_');
  vline(m, 7, 12, 12, '_');
  vline(m, 27, 12, 12, '_');
  hline(m, 12, 13, 11, '_');

  // buildings
  house(m, 12, 3, 7, 4);       // elder hall
  house(m, 4, 7, 7, 5);        // inn
  house(m, 25, 7, 6, 5);       // forge
  house(m, 21, 15, 5, 4);      // player's house
  // small shrine
  rect(m, 29, 17, 4, 3, 'W'); rect(m, 30, 18, 2, 1, '='); put(m, 30, 20, 'S');
  put(m, 33, 18, 'o');

  // garden
  outline(m, 9, 15, 5, 4, 'f');
  rect(m, 10, 16, 3, 2, ',');
  put(m, 11, 17, '"');

  // pond
  rect(m, 2, 18, 6, 4, '~');
  put(m, 1, 17, '~'); put(m, 8, 20, 's'); put(m, 7, 21, 's');
  put(m, 4, 17, 'w'); put(m, 3, 22, 'w');

  // decorations
  put(m, 20, 7, 'i');   // notice board
  put(m, 22, 12, 'f'); put(m, 23, 12, 'f');
  put(m, 12, 14, 'a');
  put(m, 28, 14, 'C');
  put(m, 2, 12, 'L'); put(m, 33, 12, 'L');
  scatter(m, '#', 10, rng, { x: 31, y: 2, w: 3, h: 8 });
  scatter(m, 't', 3, rng, { x: 2, y: 3, w: 2, h: 8 });

  // clear tree ring around south gate
  rect(m, 14, 20, 7, 4, '_');
  put(m, 17, 22, 'P');
  rect(m, 13, 23, 9, 1, '#');

  return m;
}

// ═══════════════════════════════════════════════════════════════
// EMBERFIELD — golden plains, old ruins and refugee camp
// ═══════════════════════════════════════════════════════════════
function buildEmberfield() {
  const m = make(40, 28, '.');
  const rng = mulberry32(9917);
  border(m, '#', 2);
  scatter(m, '#', 40, rng);
  scatter(m, '"', 50, rng);
  // tall grass fields
  rect(m, 2, 4, 7, 5, ',');
  rect(m, 13, 3, 6, 5, ',');
  rect(m, 24, 16, 9, 6, ',');
  rect(m, 31, 22, 7, 4, ',');
  rect(m, 3, 23, 6, 3, ',');
  rect(m, 30, 3, 7, 6, ',');
  scatter(m, '#', 10, rng, { x: 2, y: 4, w: 7, h: 5 }, [',']);
  scatter(m, '#', 12, rng, { x: 24, y: 16, w: 9, h: 6 }, [',']);

  // portals
  rect(m, 18, 0, 4, 3, '_');
  put(m, 20, 0, 'P'); put(m, 19, 1, '_'); put(m, 20, 1, '_'); put(m, 20, 2, '_');
  rect(m, 38, 12, 2, 4, '_');
  put(m, 39, 14, 'P'); put(m, 38, 14, '_');
  rect(m, 8, 25, 5, 3, '_');
  put(m, 10, 27, 'P'); put(m, 10, 26, '_'); put(m, 9, 26, '_');

  // roads
  vline(m, 19, 0, 13, '_', 2);
  hline(m, 10, 39, 13, '_', 2);
  vline(m, 10, 14, 27, '_', 2);
  vline(m, 20, 14, 21, '_', 1);
  hline(m, 20, 27, 21, '_', 1);
  vline(m, 27, 14, 21, '_', 1);
  hline(m, 10, 19, 21, '_', 1);
  vline(m, 14, 21, 24, '_', 1);
  hline(m, 14, 17, 24, '_', 1);

  // ruins (ash and broken walls)
  rect(m, 27, 6, 7, 6, 'x');
  outline(m, 27, 6, 7, 6, 'W');
  put(m, 27, 9, 'W'); put(m, 31, 10, 'W'); put(m, 33, 8, 'W');
  put(m, 29, 6, '='); put(m, 30, 6, '=');
  put(m, 28, 7, 'o'); put(m, 32, 7, 'o'); put(m, 28, 10, 'o'); put(m, 32, 10, 'o');
  put(m, 30, 8, 'A');
  put(m, 33, 13, 'C');
  scatter(m, 'r', 9, rng, { x: 27, y: 6, w: 7, h: 6 }, ['x']);

  // refugee camp
  tents(m, 5, 17, 3, 2);
  tents(m, 9, 18, 3, 2);
  put(m, 8, 21, 'o');
  put(m, 4, 21, 'i');
  rect(m, 4, 19, 8, 1, '_');
  // shrine glade
  rect(m, 14, 22, 5, 4, '=');
  put(m, 16, 23, 'S');
  put(m, 14, 22, 'A'); put(m, 18, 25, 'o');
  rect(m, 13, 21, 7, 1, 'f'); put(m, 16, 21, '=');

  // landmarks
  put(m, 20, 15, 'i');
  put(m, 22, 12, 'o'); put(m, 16, 16, 'r');
  put(m, 35, 20, 'C');
  scatter(m, 'r', 14, rng);
  // pond
  rect(m, 33, 24, 4, 2, 'w');

  // clear around portals
  rect(m, 18, 0, 4, 2, '_'); put(m, 20, 0, 'P');
  rect(m, 38, 13, 2, 3, '_'); put(m, 39, 14, 'P');
  rect(m, 8, 26, 5, 2, '_'); put(m, 10, 27, 'P');
  return m;
}

// ═══════════════════════════════════════════════════════════════
// GREENWOOD — the old forest, Mosswood and the Grove
// ═══════════════════════════════════════════════════════════════
function buildGreenwood() {
  const m = make(38, 26, '.');
  const rng = mulberry32(421);
  border(m, '#', 2);
  scatter(m, '#', 55, rng);
  scatter(m, 'T', 18, rng);
  scatter(m, '"', 48, rng);
  scatter(m, ',', 40, rng);
  scatter(m, 'r', 8, rng);

  // portals
  rect(m, 0, 11, 3, 4, '_');
  put(m, 0, 13, 'P');
  rect(m, 18, 0, 5, 3, '_');
  put(m, 20, 0, 'P');

  // main trails
  hline(m, 1, 19, 13, '_', 2);
  hline(m, 19, 24, 13, '_', 2);
  vline(m, 20, 1, 12, '_', 2);
  vline(m, 21, 14, 25, '_', 2);
  // grove ring
  rect(m, 16, 10, 8, 7, '.');
  outline(m, 16, 10, 8, 7, '"');
  put(m, 19, 10, 'A'); put(m, 20, 10, '.'); put(m, 19, 11, '.'); put(m, 20, 11, '.');
  rect(m, 18, 16, 4, 2, '_');
  // trails to Mosswood
  hline(m, 5, 16, 11, '_', 2);
  vline(m, 6, 12, 12, '_', 1);
  // trails to Warden camp
  hline(m, 24, 29, 11, '_', 2);
  vline(m, 29, 7, 12, '_', 1);
  // trails to Freewood
  hline(m, 22, 29, 20, '_', 2);
  vline(m, 29, 21, 22, '_', 1);

  // Mosswood village
  house(m, 4, 4, 6, 4);   // inn
  house(m, 11, 4, 5, 4);  // shop
  house(m, 5, 16, 5, 4);  // cottage
  rect(m, 3, 9, 12, 3, '=');
  put(m, 10, 9, 'o'); put(m, 14, 9, 'L');
  put(m, 3, 8, 'f'); put(m, 15, 8, 'f');
  put(m, 8, 7, 'i');
  rect(m, 17, 4, 5, 3, ',');
  put(m, 18, 3, 't'); put(m, 21, 3, 't');

  // Warden camp
  rect(m, 25, 4, 9, 7, '.');
  tents(m, 26, 5, 3, 2); tents(m, 30, 6, 3, 2);
  put(m, 25, 8, 'o'); put(m, 32, 4, 'L');
  hline(m, 25, 33, 10, 'f'); put(m, 29, 10, '_');
  put(m, 32, 9, 'C');
  put(m, 27, 9, 'i');

  // Freewood grove
  rect(m, 24, 18, 9, 5, '.');
  scatter(m, 'T', 5, rng, { x: 24, y: 18, w: 9, h: 5 }, ['.']);
  tents(m, 26, 19, 3, 2); tents(m, 31, 20, 2, 2);
  put(m, 29, 22, 'o');
  put(m, 25, 22, 'i');

  // features
  put(m, 36, 8, 'C');
  put(m, 33, 16, 'C');
  put(m, 2, 22, 'C');
  put(m, 35, 24, 'o');
  put(m, 8, 21, 'S');

  // extra clearings
  rect(m, 20, 13, 2, 2, '_');
  hline(m, 19, 22, 13, '_');
  // clear spawn/portals
  rect(m, 0, 12, 3, 3, '_'); put(m, 0, 13, 'P');
  put(m, 20, 0, 'P'); rect(m, 18, 0, 5, 3, '_');
  return m;
}

// ═══════════════════════════════════════════════════════════════
// ASHEN MIRE — drowned shrine and the witch's hut
// ═══════════════════════════════════════════════════════════════
function buildMire() {
  const m = make(36, 26, '.');
  const rng = mulberry32(8803);
  border(m, '#', 2);
  // water bog
  for (let i = 0; i < 22; i++) {
    const cx = 3 + Math.floor(rng() * 29), cy = 3 + Math.floor(rng() * 19);
    const rw = 2 + Math.floor(rng() * 4), rh = 1 + Math.floor(rng() * 3);
    rect(m, cx, cy, rw, rh, rng() < .45 ? '~' : 'w');
  }
  scatter(m, 'T', 14, rng, null, ['.', 'w', '~']);
  scatter(m, '#', 22, rng);
  scatter(m, 'w', 18, rng, null, ['.']);
  scatter(m, '"', 20, rng);
  scatter(m, 't', 10, rng, null, ['.']);

  // north portal to Emberfield
  rect(m, 17, 0, 3, 4, 'b');
  put(m, 18, 0, 'P');
  // shrine island (west)
  rect(m, 5, 4, 10, 6, '=');
  outline(m, 5, 4, 10, 6, 'W');
  put(m, 5, 6, 'W'); put(m, 6, 9, 'W'); put(m, 14, 5, 'W');
  put(m, 9, 4, 'A'); put(m, 13, 8, 'S'); put(m, 6, 5, 'o'); put(m, 12, 4, 'o');
  put(m, 8, 10, '=');
  // witch hut (east)
  house(m, 26, 17, 6, 4);
  put(m, 25, 20, 'o'); put(m, 24, 21, 'i');
  rect(m, 24, 16, 9, 6, '.');
  // paths as boardwalks
  hline(m, 9, 18, 4, 'b', 1);
  vline(m, 18, 4, 14, 'b', 1);
  hline(m, 18, 26, 14, 'b', 1);
  hline(m, 22, 26, 20, 'b', 1);
  vline(m, 22, 14, 20, 'b', 1);
  hline(m, 9, 18, 10, 'b', 1);
  vline(m, 9, 10, 15, 'b', 1);
  hline(m, 9, 22, 15, 'b', 1);
  put(m, 15, 7, 'C');
  // islands and details
  rect(m, 15, 19, 6, 4, '.');
  scatter(m, 'g', 5, rng, { x: 15, y: 19, w: 6, h: 4 }, ['.']);
  put(m, 18, 21, 't');
  put(m, 31, 12, 'C');
  put(m, 5, 18, 'C');
  put(m, 33, 8, 'o');
  // clear portal lane
  rect(m, 17, 0, 3, 3, 'b'); put(m, 18, 0, 'P');
  return m;
}

// ═══════════════════════════════════════════════════════════════
// CINDER PEAKS — Ashen Order camp and the caldera
// ═══════════════════════════════════════════════════════════════
function buildPeaks() {
  const m = make(36, 26, '.');
  const rng = mulberry32(5519);
  // ash base with lava basins and mountains
  rect(m, 0, 0, 36, 26, 'x');
  border(m, '^', 2);
  // mountain ridges
  rect(m, 2, 2, 8, 3, '^');
  rect(m, 13, 2, 8, 2, '^');
  rect(m, 27, 2, 7, 5, '^');
  rect(m, 3, 10, 4, 4, '^');
  rect(m, 29, 10, 5, 6, '^');
  rect(m, 2, 22, 9, 2, '^');
  scatter(m, '^', 20, rng, null, ['x']);
  scatter(m, 'r', 18, rng, null, ['x']);
  scatter(m, 'B', 8, rng, null, ['x']);
  scatter(m, '"', 6, rng, null, ['x']);

  // lava river
  hline(m, 5, 34, 15, 'v', 1);
  hline(m, 7, 33, 16, 'v', 1);
  for (let i = 0; i < 10; i++) {
    const x = 5 + Math.floor(rng() * 28);
    put(m, x, 14, rng() < .5 ? 'v' : 'x');
    put(m, x, 17, rng() < .5 ? 'v' : 'x');
  }
  // bridges over lava
  rect(m, 9, 14, 2, 4, 'b');
  rect(m, 20, 14, 2, 4, 'b');
  rect(m, 28, 14, 2, 4, 'b');

  // south portal to Greenwood
  rect(m, 17, 23, 3, 3, '=');
  put(m, 18, 25, 'P');
  // east portal to Citadel
  rect(m, 33, 12, 3, 3, '=');
  put(m, 35, 13, 'P');

  // camp (west)
  rect(m, 5, 5, 9, 7, 'x');
  tents(m, 6, 6, 3, 2); tents(m, 10, 7, 3, 2);
  put(m, 9, 10, 'o'); put(m, 12, 5, 'L');
  hline(m, 5, 13, 11, 'f'); put(m, 9, 11, 'x');
  put(m, 13, 9, 'C');
  put(m, 5, 12, 'i');

  // caldera approach and shrine
  rect(m, 18, 3, 12, 10, '=');
  rect(m, 18, 3, 12, 1, 'W');
  rect(m, 18, 12, 12, 1, 'W');
  put(m, 22, 9, 'A'); put(m, 29, 7, 'A');
  put(m, 19, 4, 'o'); put(m, 28, 11, 'o'); put(m, 21, 11, 'o');
  put(m, 33, 5, 'C');
  // hot spring
  rect(m, 4, 17, 6, 4, 'w');
  outline(m, 3, 16, 8, 6, 'r');
  put(m, 5, 18, 'S'); put(m, 8, 20, 'S');
  // paths
  hline(m, 9, 18, 13, '=', 1);
  hline(m, 13, 20, 19, '=', 1);
  vline(m, 13, 12, 19, '=', 1);
  vline(m, 20, 13, 14, '=', 1);
  vline(m, 21, 18, 23, '=', 1);
  hline(m, 18, 22, 23, '=', 1);
  vline(m, 18, 24, 25, '=', 1);
  put(m, 15, 20, 'C');
  put(m, 30, 21, 'C');
  put(m, 10, 19, 'i');
  // clear portal paths
  rect(m, 17, 23, 3, 3, '='); put(m, 18, 25, 'P');
  rect(m, 33, 12, 3, 3, '='); put(m, 35, 13, 'P');
  put(m, 33, 14, '=');
  return m;
}

// ═══════════════════════════════════════════════════════════════
// HOLLOW CITADEL — the throne of ash
// ═══════════════════════════════════════════════════════════════
function buildCitadel() {
  const m = make(32, 22, 'W');
  const rng = mulberry32(13);
  // main hall
  rect(m, 2, 8, 12, 8, '=');
  rect(m, 12, 6, 8, 12, '=');
  rect(m, 14, 2, 5, 12, '=');
  rect(m, 4, 10, 6, 4, '=');
  rect(m, 20, 12, 8, 6, '=');
  // side halls
  rect(m, 2, 2, 6, 5, '=');
  rect(m, 24, 2, 6, 6, '=');
  // throne room
  rect(m, 12, 2, 9, 3, '=');
  rect(m, 13, 1, 7, 1, 'W');
  put(m, 16, 3, 'A');
  put(m, 13, 3, 'o'); put(m, 19, 3, 'o');
  // pillars
  for (const [x, y] of [[5, 9], [10, 9], [5, 14], [10, 14], [14, 7], [18, 7], [14, 16], [18, 16], [21, 13], [26, 13], [21, 17], [26, 17], [3, 4], [7, 4], [25, 4], [29, 4]]) put(m, x, y, 'L');
  // entrance
  rect(m, 0, 10, 3, 4, '=');
  put(m, 0, 11, 'P');
  put(m, 3, 11, 'S');
  // chests
  put(m, 6, 3, 'C');
  put(m, 28, 5, 'C');
  put(m, 27, 15, 'C');
  // dais carpet
  rect(m, 15, 4, 3, 12, '_');
  // rubble / ash
  scatter(m, 'r', 6, rng, { x: 2, y: 2, w: 28, h: 18 }, ['=']);
  scatter(m, 'B', 5, rng, { x: 2, y: 2, w: 28, h: 18 }, ['=']);
  // portal back
  rect(m, 0, 10, 3, 4, '='); put(m, 0, 11, 'P');
  return m;
}

// ═══════════════════════════════════════════════════════════════
// ZONE DEFINITIONS
// ═══════════════════════════════════════════════════════════════
export const ZONES = {
  hearthfall: {
    id: 'hearthfall', name: 'Hearthfall', sub: 'The Emberfield', level: [1, 2],
    map: buildHearthfall(), ambient: 'village', safe: true,
    spawn: { x: 15, y: 14 },
    intro: 'hearthfall_intro',
    portals: [
      { x: 17, y: 22, to: 'emberfield', toX: 20, toY: 2, label: 'Emberfield' },
    ],
    npcs: [
      { id: 'maro', name: 'Elder Maro', x: 18, y: 8, sprite: 'elder', color: '#d9b67a', dialog: 'elder' },
      { id: 'barda', name: 'Barda', x: 27, y: 13, sprite: 'smith', color: '#c98a55', shop: 'hearthfall', dialog: 'smith' },
      { id: 'nessa', name: 'Nessa', x: 7, y: 13, sprite: 'inn', color: '#c78a8a', rest: true, dialog: 'innkeeper' },
      { id: 'yara', name: 'Yara', x: 11, y: 14, sprite: 'herbalist', color: '#8fbf7a', dialog: 'herbalist' },
      { id: 'pip', name: 'Pip', x: 21, y: 11, sprite: 'child', color: '#e0c07a', dialog: 'child' },
      { id: 'oma', name: 'Seer Oma', x: 5, y: 15, sprite: 'seer', color: '#b79bea', dialog: 'seer' },
      { id: 'rhen', name: 'Guard Rhen', x: 16, y: 19, sprite: 'guard', color: '#9b8a6a', dialog: 'guard' },
    ],
    chests: [
      { id: 'hf_chest1', x: 28, y: 14, loot: { gold: 55, item: 'tonic', n: 2 } },
      { id: 'hf_chest2', x: 30, y: 18, loot: { gold: 30, gear: 'travelerCharm' } },
    ],
    crystals: [{ id: 'hf_crystal', x: 14, y: 13 }],
    braziers: [
      { id: 'hf_b1', x: 15, y: 10 }, { id: 'hf_b2', x: 19, y: 10 },
    ],
    signs: [
      { x: 20, y: 7, text: 'NOTICE FROM THE ELDER\n\nThe Emberwake festival begins at dusk. All villagers are to bring a coal from their hearth to the square. Do not wander beyond the tree line after dark.' },
      { x: 11, y: 17, text: 'Yara\'s Garden\n\n"Please do not pick the moonpetals. They only bloom for the moon, and they are not ours."' },
    ],
    triggers: [],
    encounters: ['ashling', 'emberwolf', 'husk'], encRate: 0,
  },

  emberfield: {
    id: 'emberfield', name: 'Emberfield', sub: 'The Golden Plains', level: [2, 4],
    map: buildEmberfield(), ambient: 'plains', safe: false,
    spawn: { x: 20, y: 4 },
    intro: 'emberfield_intro',
    portals: [
      { x: 20, y: 0, to: 'hearthfall', toX: 17, toY: 20, label: 'Hearthfall' },
      { x: 39, y: 14, to: 'greenwood', toX: 2, toY: 13, label: 'Greenwood' },
      { x: 10, y: 27, to: 'mire', toX: 18, toY: 2, label: 'Ashen Mire' },
    ],
    npcs: [
      { id: 'wren', name: 'Wren', x: 7, y: 20, sprite: 'villager', color: '#b98a7a', dialog: 'wren' },
      { id: 'dax', name: 'Hunter Dax', x: 23, y: 17, sprite: 'hunter', color: '#8a9b6a', dialog: 'dax' },
      { id: 'pilgrim', name: 'Pilgrim', x: 15, y: 22, sprite: 'pilgrim', color: '#c9bda6', dialog: 'pilgrim' },
      { id: 'merchant', name: 'Wandering Merchant', x: 21, y: 16, sprite: 'merchant', color: '#c0a060', shop: 'mosswood', dialog: 'merchant' },
    ],
    chests: [
      { id: 'ef_chest1', x: 33, y: 20, loot: { item: 'locket' } },
      { id: 'ef_chest2', x: 36, y: 8, loot: { gold: 70, item: 'ether' } },
      { id: 'ef_chest3', x: 30, y: 9, loot: { gold: 40, gear: 'embersteel' } },
    ],
    crystals: [{ id: 'ef_crystal', x: 16, y: 23 }],
    braziers: [
      { id: 'ef_brazier1', x: 28, y: 7 }, { id: 'ef_brazier2', x: 32, y: 7 },
      { id: 'ef_brazier3', x: 28, y: 10 }, { id: 'ef_brazier4', x: 32, y: 10 },
    ],
    signs: [
      { x: 20, y: 15, text: 'ROADWARDEN\'S MARK\n\nHearthfall — north. Greenwood — east. Ashen Mire — south.\n\n"Beware the tall grass after dusk. The flame does not always sleep."' },
      { x: 4, y: 21, text: 'Refugee Camp\n\nNo walls, no gate, no wish to be here. We came from Mosswood when the roots began to scream.' },
    ],
    triggers: [
      { x: 17, y: 13, r: 3, once: 'emberfield_crossroads', story: 'emberfield_crossroads' },
    ],
    encounters: ['ashling', 'emberwolf', 'bandit', 'husk'], encRate: .12,
  },

  greenwood: {
    id: 'greenwood', name: 'Greenwood', sub: 'The Old Forest', level: [4, 7],
    map: buildGreenwood(), ambient: 'forest', safe: false,
    spawn: { x: 2, y: 13 },
    intro: 'greenwood_intro',
    portals: [
      { x: 0, y: 13, to: 'emberfield', toX: 38, toY: 14, label: 'Emberfield' },
      { x: 20, y: 0, to: 'peaks', toX: 18, toY: 24, label: 'Cinder Peaks' },
    ],
    npcs: [
      { id: 'seris', name: 'Seris', x: 22, y: 15, sprite: 'warden', color: '#79c98b', dialog: 'seris', cond: (s) => !s.flags.groveChoice },
      { id: 'lyra', name: 'Lyra', x: 16, y: 15, sprite: 'mage', color: '#f0774d', dialog: 'lyra', cond: (s) => !s.flags.groveChoice },
      { id: 'mosskeep', name: 'Innkeeper Fen', x: 7, y: 10, sprite: 'inn', color: '#c78a8a', rest: true, dialog: 'fen' },
      { id: 'mossmerchant', name: 'Trader Quill', x: 13, y: 6, sprite: 'merchant', color: '#c0a060', shop: 'mosswood', dialog: 'quill' },
      { id: 'wardencaptain', name: 'Captain Thea', x: 30, y: 12, sprite: 'guard', color: '#9b8a6a', dialog: 'thea', cond: (s) => s.flags.groveChoice !== 'freewood' },
      { id: 'freeelder', name: 'Elder Bramble', x: 30, y: 21, sprite: 'elder', color: '#8fbf7a', dialog: 'bramble', cond: (s) => s.flags.groveChoice !== 'warden' },
      { id: 'woodchild', name: 'Fenn', x: 10, y: 16, sprite: 'child', color: '#d8c07a', dialog: 'woodchild' },
    ],
    chests: [
      { id: 'gw_chest1', x: 36, y: 8, loot: { gold: 120, item: 'greaterTonic', n: 2 } },
      { id: 'gw_chest2', x: 33, y: 16, loot: { gear: 'thornfang' } },
      { id: 'gw_chest3', x: 2, y: 22, loot: { gold: 90, item: 'feather' } },
    ],
    crystals: [{ id: 'gw_crystal', x: 8, y: 21 }],
    braziers: [{ id: 'gw_b1', x: 10, y: 9 }, { id: 'gw_b2', x: 29, y: 20 }],
    sparkles: [
      { id: 'gw_herb1', x: 35, y: 24, item: 'moonpetal' },
      { id: 'gw_herb2', x: 4, y: 22, item: 'moonpetal' },
      { id: 'gw_herb3', x: 33, y: 12, item: 'moonpetal' },
    ],
    signs: [
      { x: 8, y: 7, text: 'MOSSwood\n\n"Under the old boughs, we keep the old ways. The Warden protects. The Freewood remembers."' },
      { x: 27, y: 9, text: 'WARDEN CAMP\n\nNo one enters the Grove without the Captain\'s leave.\n\nThe forest is not well.' },
      { x: 25, y: 22, text: 'THE FREEWOOD\n\n"Root and river, wind and bone — no crown owns the green."' },
    ],
    triggers: [
      { x: 19, y: 14, r: 2, once: 'groveScene', story: 'grove_confrontation', cond: (s) => !s.flags.groveChoice },
      { x: 19, y: 9, r: 2, once: 'groveHeartSeen', story: 'grove_heart_hint', cond: (s) => s.flags.groveChoice },
    ],
    encounters: ['thornling', 'blightwolf', 'emberwolf', 'cultist'], encRate: .14,
    boss: { altar: { x: 19, y: 10 }, trigger: 'grove_heart' },
  },

  mire: {
    id: 'mire', name: 'Ashen Mire', sub: 'The Drowned Shrine', level: [7, 9],
    map: buildMire(), ambient: 'mire', safe: false,
    spawn: { x: 18, y: 3 },
    intro: 'mire_intro',
    portals: [
      { x: 18, y: 0, to: 'emberfield', toX: 10, toY: 26, label: 'Emberfield' },
    ],
    npcs: [
      { id: 'sable', name: 'Sable', x: 24, y: 20, sprite: 'rogue', color: '#a58ae0', dialog: 'sable', cond: (s) => !s.flags.mireBoss },
      { id: 'hermit', name: 'Hermit Goll', x: 17, y: 21, sprite: 'pilgrim', color: '#7f9b8a', dialog: 'hermit' },
      { id: 'witchnpc', name: 'The Witch of Mire', x: 29, y: 21, sprite: 'witch', color: '#8fd0a8', dialog: 'witch', shop: 'mire', cond: (s) => s.flags.sparedWitch },
      { id: 'bogchild', name: 'Mudlark', x: 33, y: 10, sprite: 'child', color: '#9bbf77', dialog: 'mudlark' },
    ],
    chests: [
      { id: 'mi_chest1', x: 15, y: 7, loot: { gold: 160, item: 'greaterEther' } },
      { id: 'mi_chest2', x: 31, y: 12, loot: { gear: 'mireglass' } },
      { id: 'mi_chest3', x: 5, y: 18, loot: { gold: 120, item: 'feather' } },
    ],
    crystals: [{ id: 'mi_crystal', x: 13, y: 8 }],
    braziers: [{ id: 'mi_b1', x: 6, y: 5 }, { id: 'mi_b2', x: 12, y: 4 }, { id: 'mi_b3', x: 33, y: 8 }],
    signs: [
      { x: 24, y: 21, text: 'A hanging bundle of bones and reeds.\n\n"THE MIRE KEEPS WHAT IT TAKES.\nTURN BACK, OR PAY THE TOLL."' },
    ],
    triggers: [
      { x: 10, y: 7, r: 2, once: 'mireShrineSeen', story: 'mire_altar_hint' },
      { x: 22, y: 20, r: 2, once: 'mireSableMeet', story: 'mire_sable_meet', cond: (s) => !s.flags.mireBoss },
    ],
    encounters: ['bogtoad', 'drowned', 'blightwolf', 'cultist'], encRate: .15,
    boss: { altar: { x: 9, y: 4 }, trigger: 'mire_boss' },
  },

  peaks: {
    id: 'peaks', name: 'Cinder Peaks', sub: 'The Ashen Order', level: [9, 11],
    map: buildPeaks(), ambient: 'peaks', safe: false,
    spawn: { x: 18, y: 23 },
    intro: 'peaks_intro',
    portals: [
      { x: 18, y: 25, to: 'greenwood', toX: 20, toY: 2, label: 'Greenwood' },
      { x: 35, y: 13, to: 'citadel', toX: 1, toY: 11, label: 'Hollow Citadel', locked: (s) => s.keys < 3 },
    ],
    npcs: [
      { id: 'malrec', name: 'Envoy Malrec', x: 9, y: 9, sprite: 'envoy', color: '#d9a05a', dialog: 'malrec' },
      { id: 'orderSmith', name: 'Forge-Mother Hessa', x: 12, y: 8, sprite: 'smith', color: '#c98a55', shop: 'peaks', dialog: 'hessa' },
      { id: 'orderGuard', name: 'Order Sentinel', x: 6, y: 9, sprite: 'guard', color: '#b08060', dialog: 'sentinel' },
      { id: 'scout', name: 'Scout Vela', x: 15, y: 18, sprite: 'hunter', color: '#8a9b6a', dialog: 'vela' },
      { id: 'prisoner', name: 'Caged Warden', x: 30, y: 9, sprite: 'warden', color: '#79c98b', dialog: 'prisoner' },
    ],
    chests: [
      { id: 'pk_chest1', x: 13, y: 9, loot: { gold: 200, item: 'greaterTonic', n: 3 } },
      { id: 'pk_chest2', x: 33, y: 5, loot: { gold: 240, gear: 'stormiron' } },
      { id: 'pk_chest3', x: 30, y: 21, loot: { item: 'elixir' } },
      { id: 'pk_chest4', x: 15, y: 20, loot: { gold: 180, gear: 'emberheart' } },
    ],
    crystals: [{ id: 'pk_crystal', x: 6, y: 18 }],
    braziers: [{ id: 'pk_b1', x: 9, y: 10 }, { id: 'pk_b2', x: 19, y: 4 }, { id: 'pk_b3', x: 28, y: 11 }],
    signs: [
      { x: 5, y: 12, text: 'CAMP OF THE ASHEN ORDER\n\n"THE FLAME IS A CROWN.\nTHE CROWN IS A BURDEN.\nWE BEAR IT, SO YOU NEED NOT."' },
      { x: 10, y: 19, text: 'The bridge cools. Something below is still moving.' },
    ],
    triggers: [
      { x: 10, y: 12, r: 2, once: 'peaksCampSeen', story: 'peaks_camp_arrival' },
      { x: 22, y: 11, r: 3, once: 'calderaSeen', story: 'peaks_caldera_hint' },
    ],
    encounters: ['cinderhound', 'rockmaw', 'shade', 'ashknight'], encRate: .16,
    boss: { altar: { x: 22, y: 9 }, trigger: 'peaks_boss' },
  },

  citadel: {
    id: 'citadel', name: 'Hollow Citadel', sub: 'The Throne of Ash', level: [12, 14],
    map: buildCitadel(), ambient: 'citadel', safe: false,
    spawn: { x: 2, y: 11 },
    intro: 'citadel_intro',
    portals: [
      { x: 0, y: 11, to: 'peaks', toX: 33, toY: 14, label: 'Cinder Peaks' },
    ],
    npcs: [],
    chests: [
      { id: 'ci_chest1', x: 6, y: 3, loot: { gold: 300, item: 'elixir' } },
      { id: 'ci_chest2', x: 28, y: 5, loot: { gear: 'crownFragment', gold: 200 } },
      { id: 'ci_chest3', x: 27, y: 15, loot: { gold: 260, item: 'greaterTonic', n: 3 } },
    ],
    crystals: [{ id: 'ci_crystal', x: 3, y: 12 }],
    braziers: [{ id: 'ci_b1', x: 13, y: 3 }, { id: 'ci_b2', x: 19, y: 3 }],
    signs: [],
    triggers: [
      { x: 16, y: 6, r: 3, once: 'citadelHall', story: 'citadel_hall' },
    ],
    encounters: ['ashknight', 'shade', 'cinderhound'], encRate: .13,
    boss: { altar: { x: 16, y: 3 }, trigger: 'final_boss' },
  },
};

export const ZONE_ORDER = ['hearthfall', 'emberfield', 'greenwood', 'mire', 'peaks', 'citadel'];
