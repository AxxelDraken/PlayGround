// ── Pixel-art foundation for Emberwake (16-bit JRPG style) ─────────────────
// Logical viewport 320×180, 16×16 tiles, crisp pixels, no smoothing.
//
// All drawing happens at integer pixel coordinates into offscreen canvases
// that are blitted at integer scale. Colors are hand-picked: warm amber
// lights, earthy village tones, cool blue-purple shadows.

export const TAU = Math.PI * 2;
export function withAlpha(hex, a) {
  if (!hex || hex[0] !== '#') return hex;
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
export const TILE = 16;
export const VW = 320;
export const VH = 180;

// ── palette ──────────────────────────────────────────────────────────────
export const PAL = {
  // world
  sky: '#121620',
  fog: '#1c1a28',
  earth: '#8c7356', earthD: '#6e5a42', earthL: '#c9b28a',
  stone: '#8a8474', stoneD: '#6a6454', stoneL: '#b8b4a8',
  grass: '#5d744a', grassD: '#455c38', grassL: '#94a874',
  path: '#7e6c54', pathD: '#62523e', pathL: '#b8a488',
  timber: '#a67c5c', timberD: '#7d583c', timberL: '#d4b086',
  roof: '#5c3a2e', roofD: '#422a22', roofL: '#9e6a50',
  thatch: '#9a7248',
  amber: '#f0c27a', amberD: '#e09040', amberL: '#ffe0b0',
  shadow: '#36344a', shadowD: '#242234', shadowL: '#6a6684',
  violet: '#7a6ea6', violetD: '#504872', violetL: '#aca8c8',
  water: '#3a5c70', waterD: '#284252', waterL: '#7aa8c0',
  leaf: '#5e7e4c', leafD: '#3e5c34', leafL: '#9ec884',
  flower: '#d87a40', flowerL: '#f4b070',
  ink: '#e8ddc8', inkD: '#b8ac90', inkL: '#f4ecd8',
  outline: '#282028',
  // characters
  skin: '#e0c8a8', skinD: '#b89670',
  hair: '#5a3a2a',
  cloth: '#6a7a94', clothD: '#4a5a6a',
  pants: '#3a4a5a', boots: '#282228',
};

export const CHAR_PALS = {
  hero:     { skin: PAL.skin, hair: '#5a3a2a', cloth: '#6a8aa4', clothD: '#4a6a7a', pants: '#3a4a5a', boots: PAL.boots, accent: PAL.amber, hat: null },
  maro:     { skin: '#c9a07a', hair: '#a89080', cloth: '#6a5a7a', clothD: '#4a405a', pants: '#38324a', boots: PAL.boots, accent: PAL.violet, hat: null },
  barda:    { skin: '#c9a07a', hair: '#3a2a2a', cloth: '#7a4a2a', clothD: '#5a321a', pants: '#4a3222', boots: PAL.boots, accent: '#c98a55', hat: null },
  nessa:    { skin: '#d0a888', hair: '#6a4a3a', cloth: '#8a4a4a', clothD: '#5a2e2e', pants: '#4a3a40', boots: PAL.boots, accent: '#c78a8a', hat: null },
  yara:     { skin: '#c9a07a', hair: '#4a5a3a', cloth: '#5a6a4a', clothD: '#3e4a34', pants: '#3a4a3a', boots: PAL.boots, accent: '#8fbf7a', hat: null },
  pip:      { skin: '#e8d0a8', hair: '#d0a050', cloth: '#7a5a3a', clothD: '#5a3e22', pants: '#5a4a3a', boots: '#3a2a22', accent: '#e0c07a', hat: null },
  oma:      { skin: '#b98262', hair: '#5a4a6a', cloth: '#5a4a7a', clothD: '#3a2e4a', pants: '#3a2e4a', boots: PAL.boots, accent: PAL.violet, hat: 'veil' },
  rhen:     { skin: '#c9a07a', hair: '#282228', cloth: '#6a6a5a', clothD: '#4a4a3a', pants: '#3a3a30', boots: '#282228', accent: '#9b8a6a', hat: 'helm' },
  kael:     { skin: '#c9a07a', hair: '#4a3a2a', cloth: '#5a4a4a', clothD: '#3a2e2e', pants: '#3a3238', boots: '#282228', accent: PAL.amber, hat: null },
  villager: { skin: '#c9a07a', hair: '#5a3a2a', cloth: '#7a6a5a', clothD: '#5a4a3a', pants: '#4a3a30', boots: PAL.boots, accent: '#c9bda6', hat: null },
  child:    { skin: '#e8d0a8', hair: '#d0a050', cloth: '#7a5a3a', clothD: '#5a3e22', pants: '#5a4a3a', boots: '#3a2a22', accent: '#e0c07a', hat: null },
};

// ── pixel primitives ─────────────────────────────────────────────────────
export function px(ctx, x, y, c) {
  ctx.fillStyle = c;
  ctx.fillRect(x | 0, y | 0, 1, 1);
}
export function pr(ctx, x, y, w, h, c) {
  ctx.fillStyle = c;
  ctx.fillRect(x | 0, y | 0, Math.max(0, w | 0), Math.max(0, h | 0));
}
export function lineV(ctx, x, y, h, c) {
  ctx.fillStyle = c;
  for (let i = 0; i < h; i++) ctx.fillRect(x | 0, (y + i) | 0, 1, 1);
}
export function lineH(ctx, x, y, w, c) {
  ctx.fillStyle = c;
  for (let i = 0; i < w; i++) ctx.fillRect((x + i) | 0, y | 0, 1, 1);
}
export function box(ctx, x, y, w, h, c) {
  pr(ctx, x, y, w, h, c);
}

// make an offscreen 1:1 canvas, draw into it, cache by key
const tileCache = new Map();
const spriteCache = new Map();
export function tileCanvas(key, w, h, draw) {
  let c = tileCache.get(key);
  if (!c) {
    c = document.createElement('canvas');
    c.width = w; c.height = h;
    const t = c.getContext('2d');
    t.imageSmoothingEnabled = false;
    draw(t, w, h);
    tileCache.set(key, c);
  }
  return c;
}
export function spriteCanvas(key, w, h, draw) {
  let c = spriteCache.get(key);
  if (!c) {
    c = document.createElement('canvas');
    c.width = w; c.height = h;
    const t = c.getContext('2d');
    t.imageSmoothingEnabled = false;
    draw(t, w, h);
    spriteCache.set(key, c);
  }
  return c;
}

// deterministic per-tile noise
export function hash2(x, y) {
  let n = (x * 374761393 + y * 668265263) | 0;
  n = (n ^ (n >> 13)) * 1274126177;
  return ((n ^ (n >> 16)) >>> 0) / 4294967295;
}

// ── bitmap font (6×8 cell, 5px glyph + 1px spacing) ──────────────────────
// Rows are strings of 5 chars: '#' = ink, '.' = blank.
const GLYPH = {
  ' ': ['.....','.....','.....','.....','.....','.....','.....','.....'],
  '!': ['..#..','..#..','..#..','..#..','..#..','.....','..#..','.....'],
  '"': ['.##..','.#.#.','.....','.....','.....','.....','.....','.....'],
  '#': ['..#..','.###.','..#..','#####','..#..','..#..','.....','.....'],
  '$': ['..#..','.#..#','..##.','...#.','.##..','#...#','..##.','.....'],
  '%': ['#...#','#..##','..#.#.','.#..#','#..#.','#...#','.....','.....'],
  '&': ['.###.','#...#','.#.##','..#.#','.#..#','#...#','.###.','.....'],
  "'": ['..#..','.#.#.','.....','.....','.....','.....','.....','.....'],
  '(': ['..#..','.#.#.','#...#','#...#','#...#','.#.#.','..#..','.....'],
  ')': ['..#..','.#.#.','#...#','#...#','#...#','.#.#.','..#..','.....'],
  '*': ['..#..','.#.#.','..#..','#####','..#..','.#.#.','..#..','.....'],
  '+': ['.....','..#..','..#..','#####','..#..','..#..','.....','.....'],
  ',': ['.....','.....','.....','.....','.....','..#..','..#..','.#...'],
  '-': ['.....','.....','.....','#####','.....','.....','.....','.....'],
  '.': ['.....','.....','.....','.....','.....','.....','..#..','.....'],
  '/': ['#...#','#...#','..#..','..#..','.##..','..#..','#...#','.....'],
  '0': ['.###.','#...#','#.#.#','#.#.#','#.#.#','#...#','.###.','.....'],
  '1': ['..#..','.##..','..#..','..#..','..#..','..#..','.###.','.....'],
  '2': ['.###.','#...#','....#','...#.','..#..','.#...','#####','.....'],
  '3': ['.###.','#...#','....#','..##.','....#','#...#','.###.','.....'],
  '4': ['.....','#...#','#...#','#.#.#','#####','....#','....#','.....'],
  '5': ['#####','#....','####.','....#','....#','#...#','.###.','.....'],
  '6': ['.###.','#....','####.','#...#','#...#','#...#','.###.','.....'],
  '7': ['#####','....#','...#.','..#..','..#..','..#..','..#..','.....'],
  '8': ['.###.','#...#','.###.','#...#','#...#','#...#','.###.','.....'],
  '9': ['.###.','#...#','#...#','.####','....#','...#.','..##.','.....'],
  ':': ['.....','.....','..#..','.....','..#..','.....','.....','.....'],
  ';': ['.....','.....','..#..','.....','..#..','..#..','.#...','.....'],
  '<': ['.....','...#.','..#..','.#...','..#..','...#.','.....','.....'],
  '=': ['.....','.....','.....','#####','.....','.....','.....','.....'],
  '>': ['.....','.#...','..#..','...#.','..#..','.#...','.....','.....'],
  '?': ['.###.','#...#','....#','...#.','..#..','.....','..#..','.....'],
  '@': ['.###.','#...#','#.#.#','#.#.#','#.#.#','#...#','.###.','.....'],
  'A': ['.....','.###.','#...#','#...#','#####','#...#','#...#','.....'],
  'B': ['####.','#...#','####.','#...#','#...#','#...#','####.','.....'],
  'C': ['.###.','#...#','#....','#....','#....','#...#','.###.','.....'],
  'D': ['####.','#...#','#...#','#...#','#...#','#...#','####.','.....'],
  'E': ['#####','#....','#####','#....','#....','#....','#####','.....'],
  'F': ['#####','#....','####.','#....','#....','#....','#....','.....'],
  'G': ['.###.','#...#','#....','#..##','#.#.#','#...#','.###.','.....'],
  'H': ['#...#','#...#','#####','#...#','#...#','#...#','#...#','.....'],
  'I': ['#####','..#..','..#..','..#..','..#..','..#..','#####','.....'],
  'J': ['....#','....#','....#','....#','#...#','#...#','#.#.','.###.'],
  'K': ['#...#','#.#..','#..##','#.#..','#...#','#...#','#...#','.....'],
  'L': ['#....','#....','#....','#....','#....','#....','#####','.....'],
  'M': ['#...#','##.##','#.#.#','#...#','#...#','#...#','#...#','.....'],
  'N': ['#...#','##..#','#.#.#','#..##','#...#','#...#','#...#','.....'],
  'O': ['.###.','#...#','#...#','#...#','#...#','#...#','.###.','.....'],
  'P': ['####.','#...#','####.','#....','#....','#....','#....','.....'],
  'Q': ['.###.','#...#','#...#','#.#.#','#..#.','#...#','.###.','.....'],
  'R': ['####.','#...#','####.','#.#..','#..#.','#...#','#...#','.....'],
  'S': ['.###.','#....','.##..','....#','....#','#...#','.###.','.....'],
  'T': ['#####','..#..','..#..','..#..','..#..','..#..','..#..','.....'],
  'U': ['#...#','#...#','#...#','#...#','#...#','#...#','.###.','.....'],
  'V': ['#...#','#...#','#...#','#.#.#','#.#.#','.###.','.....','.....'],
  'W': ['#...#','#.#.#','#.#.#','#.#.#','##.##','#...#','#...#','.....'],
  'X': ['#...#','.#.#.','..#..','.#.#.','#...#','#...#','#...#','.....'],
  'Y': ['#...#','.#.#.','..#..','..#..','..#..','..#..','..#..','.....'],
  'Z': ['#####','...#.','..#..','.#.#.','#...#','#...#','#####','.....'],
  '[': ['.##..','#...#','#....','#....','#....','#...#','.##..','.....'],
  '\\': ['#....','#....','..#..','..#..','..#..','#...#','#...#','.....'],
  ']': ['.##..','#...#','....#','....#','....#','#...#','.##..','.....'],
  '^': ['.....','..#..','.#.#.','#...#','.....','.....','.....','.....'],
  '_': ['.....','.....','.....','.....','.....','.....','#####','.....'],
  '`': ['..#..','.....','.....','.....','.....','.....','.....','.....'],
  'a': ['.....','.....','.##..','#...#','.####','#...#','#...#','.####'],
  'b': ['.....','#....','#...#','####.','#...#','#...#','#...#','####.'],
  'c': ['.....','.....','.###.','#....','#....','#....','#...#','.###.'],
  'd': ['.....','....#','#...#','#.###','#.#.#','#.#.#','#...#','#.###'],
  'e': ['.....','.....','.###.','#....','####.','#...#','#...#','.###.'],
  'f': ['.....','..#..','..#..','.####','..#..','..#..','..#..','.....'],
  'g': ['.....','.....','.###.','#...#','#...#','.####','....#','.###.'],
  'h': ['.....','#....','#...#','####.','#...#','#...#','#...#','.....'],
  'i': ['.....','..#..','.....','..#..','..#..','..#..','..#..','.###.'],
  'j': ['.....','...#.','.....','...#.','...#.','...#.','#...#','.###.'],
  'k': ['.....','#....','#...#','#..#.','#.#..','#...#','#...#','.....'],
  'l': ['.....','..#..','.....','..#..','..#..','..#..','..#..','.....'],
  'm': ['.....','.....','##.##','#.#.#','#.#.#','#.#.#','#.#.#','.....'],
  'n': ['.....','.....','####.','#...#','#...#','#...#','#...#','.....'],
  'o': ['.....','.....','.###.','#...#','#...#','#...#','#...#','.###.'],
  'p': ['.....','.....','.###.','#...#','#...#','.####','#....','#....'],
  'q': ['.....','.....','.###.','#...#','#...#','.####','....#','....#'],
  'r': ['.....','.....','##...','#.#..','#...#','#....','#....','.....'],
  's': ['.....','.....','.###.','#....','.##..','....#','#...#','.###.'],
  't': ['.....','..#..','..#..','.####','..#..','..#..','..#..','..#..'],
  'u': ['.....','.....','#...#','#...#','#...#','#...#','#...#','.###.'],
  'v': ['.....','.....','#...#','#...#','#.#.#','#.#.#','.###.','.....'],
  'w': ['.....','.....','#...#','#.#.#','#.#.#','#.#.#','##.##','.....'],
  'x': ['.....','.....','#...#','.#.#.','..#..','.#.#.','#...#','.....'],
  'y': ['.....','.....','#...#','#...#','#.###','....#','#...#','#.###'],
  'z': ['.....','.....','#####','...#.','..#..','.#.#.','#...#','#####'],
  '{': ['..#..','.#...','#....','#....','#....','.#...','..#..','.....'],
  '|': ['.....','..#..','..#..','..#..','..#..','..#..','..#..','.....'],
  '}': ['..#..','...#.','....#','....#','....#','...#.','..#..','.....'],
  '~': ['.....','.....','.....','.#.#.','#.#.#','.....','.....','.....'],
  'é': ['.....','.###.','#...#','#...#','#####','#...#','#...#','.###.'],
  'è': ['.....','.###.','#...#','#...#','#####','#...#','#...#','.....'],
  'ê': ['.....','.###.','#...#','#...#','#####','#...#','#...#','.....'],
  'à': ['.....','.###.','#...#','#...#','#...#','#...#','#...#','.###.'],
};

export function glyphRows(code) {
  const ch = String.fromCodePoint(code);
  return GLYPH[ch] || GLYPH['?'];
}

// measure wrapped text
export function measureText(text, scale = 1) {
  let w = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code === 10) { w = 0; continue; }
    w += 6 * scale;
  }
  return w;
}

export function drawText(ctx, text, x, y, opts = {}) {
  const color = opts.color || PAL.ink;
  const scale = opts.scale || 1;
  const wrap = opts.wrap !== undefined ? opts.wrap : 44;
  const maxWidth = opts.maxWidth != null ? opts.maxWidth : wrap * 6 * scale;
  const align = opts.align || 'left';
  const lines = wrapText(text, maxWidth, scale);
  let oy = y;
  for (const line of lines) {
    let lx = x;
    if (align === 'center') lx = x - (line.length * 6 * scale) / 2;
    else if (align === 'right') lx = x - line.length * 6 * scale;
    for (let i = 0; i < line.length; i++) {
      const rows = glyphRows(line.charCodeAt(i));
      for (let r = 0; r < 8; r++) {
        const row = rows[r];
        for (let c = 0; c < 5; c++) {
          if (row[c] === '#') pr(ctx, lx + c * scale, oy + r * scale, scale, scale, color);
        }
      }
      lx += 6 * scale;
    }
    oy += 9 * scale;
  }
  return { width: lines.reduce((m, l) => Math.max(m, l.length * 6 * scale), 0), height: lines.length * 9 * scale };
}

function wrapText(text, maxWidth, scale) {
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const trial = cur ? cur + ' ' + w : w;
    if (measureText(trial, scale) > maxWidth && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = trial;
    }
    if (cur.includes('\n')) {
      const parts = cur.split('\n');
      for (let p = 0; p < parts.length - 1; p++) lines.push(parts[p]);
      cur = parts[parts.length - 1];
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [''];
}

// ── pixel windows ────────────────────────────────────────────────────────
// 9-slice frame from a tiny pixel pattern: border dark, inner shaded.
const FRAME_CACHE = new Map();
function framePattern() {
  const c = document.createElement('canvas'); c.width = 8; c.height = 8;
  const t = c.getContext('2d'); t.imageSmoothingEnabled = false;
  // pattern: outer border, bevel inner
  const P = [
    '11111111',
    '12222221',
    '12333331',
    '12344331',
    '12344331',
    '12333331',
    '12222221',
    '11111111',
  ];
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const v = P[y][x];
    let c_;
    if (v === '1') c_ = '#282028';        // outer dark
    else if (v === '2') c_ = '#4a3a4a';  // bevel
    else if (v === '3') c_ = '#362e3a';  // inner dark
    else c_ = '#261e26';                 // inner
    t.fillStyle = c_; t.fillRect(x, y, 1, 1);
  }
  return c;
}
export function drawWindow(ctx, x, y, w, h, opts = {}) {
  const pat = framePattern();
  const s = opts.scale || 1;
  const tw = pat.width, th = pat.height;
  const fill = opts.fill || '#261e26';
  // inner fill
  ctx.fillStyle = fill;
  ctx.fillRect(x + 1 * s, y + 1 * s, w - 2 * s, h - 2 * s);
  // 9-slice border
  const slices = [
    // top-left, top, top-right
    [0, 0, 1, 1, x, y, s, s], [1, 0, 6, 1, x + s, y, w - 2 * s, s], [7, 0, 1, 1, x + w - s, y, s, s],
    [0, 1, 1, 6, x, y + s, s, h - 2 * s], null, [7, 1, 1, 6, x + w - s, y + s, s, h - 2 * s],
    [0, 7, 1, 1, x, y + h - s, s, s], [1, 7, 6, 1, x + s, y + h - s, w - 2 * s, s], [7, 7, 1, 1, x + w - s, y + h - s, s, s],
  ];
  for (const sl of slices) {
    if (!sl) continue;
    const [sx, sy, sw, sh, dx, dy, dw, dh] = sl;
    ctx.drawImage(pat, sx, sy, sw, sh, dx | 0, dy | 0, dw | 0, dh | 0);
  }
  if (opts.accent) {
    ctx.fillStyle = opts.accent;
    // accent hairline inside top edge
    pr(ctx, x + 1 * s, y + 2 * s, w - 2 * s, s, opts.accent);
  }
}

// small pixel button / choice row
export function drawChoice(ctx, x, y, w, h, label, selected, opts = {}) {
  const acc = opts.accent || PAL.amber;
  const base = selected ? '#3a2e3a' : '#261e26';
  drawWindow(ctx, x, y, w, h, { fill: base, accent: selected ? acc : null });
  drawText(ctx, label, x + 8, y + Math.round(h / 2) - 3, {
    color: selected ? PAL.amberL : PAL.ink,
    scale: 1,
  });
}

// cursor arrow
export function drawArrow(ctx, x, y, dir, color = PAL.amber, scale = 1) {
  const s = scale;
  ctx.fillStyle = color;
  if (dir === 'down') {
    pr(ctx, x, y, 2 * s, 4 * s, color);
    pr(ctx, x - s, y + 3 * s, 4 * s, s, color);
  } else if (dir === 'right') {
    pr(ctx, x, y, 4 * s, 2 * s, color);
    pr(ctx, x + 3 * s, y - s, s, 4 * s, color);
  }
}
