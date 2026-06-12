/* ===== Buddy 2.0 – prozeduraler Pixel-Art-Generator =====
 * Höhere Auflösung (28×30), Stil: chubby Brokkoli-Tamagotchi.
 * Köpfe aus Floret-Bumps mit Textur-Punkten und Schattierung,
 * gezackte Blatt-Arme, gelbe Blüten-Floretten in der Blüte,
 * vergilbende Blätter zur Ernte. Deterministisch (seeded RNG).
 */

export const GRID_W = 28;
export const GRID_H = 30;

export type Emotion = 'happy' | 'neutral' | 'unhappy';

export interface Pixel {
  x: number;
  y: number;
  color: string;
  sparkle?: boolean;
}

const C = {
  outline: '#33421f',
  // Kopf
  headHi: '#a9e063',
  head: '#77c043',
  headDark: '#55922c',
  headDeep: '#417322',
  // Körper
  bodyHi: '#cdeb96',
  body: '#aeda68',
  bodyShade: '#8abb4b',
  // Blatt
  leaf: '#6cb53e',
  leafHi: '#93d45c',
  vein: '#b8e286',
  // vergilbt (Ernte)
  leafY: '#b9bb4f',
  leafYHi: '#d6d276',
  veinY: '#e6e09a',
  // Ei
  egg: '#f0e4c3',
  eggShade: '#d8c69b',
  eggFace: '#e6d7ad',
  stripe: '#a78c5b',
  shadowFace: '#a8946a',
  // Blüten-Floretten
  floret: '#f2cf3d',
  floretHi: '#f9e88f',
  // Gesicht
  face: '#27331a',
  tear: '#9cd4ff',
};

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class G {
  px: (string | null)[][] = [];
  sparkle: boolean[][] = [];
  constructor() {
    for (let y = 0; y < GRID_H; y++) {
      this.px.push(new Array(GRID_W).fill(null));
      this.sparkle.push(new Array(GRID_W).fill(false));
    }
  }
  set(x: number, y: number, c: string, sp = false) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= GRID_W || y >= GRID_H) return;
    this.px[y][x] = c;
    this.sparkle[y][x] = sp;
  }
  clear(x: number, y: number) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= GRID_W || y >= GRID_H) return;
    this.px[y][x] = null;
    this.sparkle[y][x] = false;
  }
  get(x: number, y: number): string | null {
    if (x < 0 || y < 0 || x >= GRID_W || y >= GRID_H) return null;
    return this.px[y][x];
  }
  fillEllipse(cx: number, cy: number, rx: number, ry: number, c: string) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(x, y, c);
      }
    }
  }
  fillCircle(cx: number, cy: number, r: number, c: string) {
    this.fillEllipse(cx, cy, r, r, c);
  }
  /** Dunkle Außenkontur um alle gefüllten Pixel */
  outline(color: string) {
    const add: [number, number][] = [];
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        if (this.px[y][x]) continue;
        if (this.get(x + 1, y) || this.get(x - 1, y) || this.get(x, y + 1) || this.get(x, y - 1)) {
          add.push([x, y]);
        }
      }
    }
    for (const [x, y] of add) this.set(x, y, color);
  }
  toPixels(): Pixel[] {
    const out: Pixel[] = [];
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        const c = this.px[y][x];
        if (c) out.push({ x, y, color: c, sparkle: this.sparkle[y][x] || undefined });
      }
    }
    return out;
  }
}

/* ---- Bausteine ---- */

function broccoliHead(g: G, cx: number, cy: number, r: number, rng: () => number, florets = 0) {
  // Basismasse
  g.fillEllipse(cx, cy, r, r * 0.8, C.head);
  // Floret-Bumps entlang des oberen Bogens
  const n = Math.max(5, Math.round(r * 1.1));
  for (let i = 0; i < n; i++) {
    const a = Math.PI * (i / (n - 1));
    const bx = cx + Math.cos(a) * r * 0.82;
    const by = cy - Math.sin(a) * r * 0.62;
    const br = r * 0.3 + rng() * r * 0.12;
    g.fillCircle(bx, by, br, C.head);
    g.fillCircle(bx - br * 0.25, by - br * 0.4, Math.max(1, br * 0.45), C.headHi);
  }
  // Textur-Punkte (dezent) + untere Schattierung
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r * 1.15); x <= Math.ceil(cx + r * 1.15); x++) {
      const c = g.get(x, y);
      if (c !== C.head && c !== C.headHi) continue;
      if (y > cy + r * 0.34) {
        g.set(x, y, C.headDark);
      } else if (c === C.head && rng() < 0.08) {
        g.set(x, y, C.headDeep);
      }
    }
  }
  // gelbe Blüten-Floretten (Blütephase)
  let placed = 0;
  let guard = 0;
  while (placed < florets && guard++ < florets * 30) {
    const a = rng() * Math.PI;
    const rr = Math.sqrt(rng()) * r * 0.95;
    const fx = Math.round(cx + Math.cos(a) * rr);
    const fy = Math.round(cy - Math.abs(Math.sin(a)) * rr * 0.75);
    const cur = g.get(fx, fy);
    if (cur === C.head || cur === C.headHi || cur === C.headDeep || cur === C.headDark) {
      g.set(fx, fy, rng() < 0.35 ? C.floretHi : C.floret, true);
      placed++;
    }
  }
}

/** Glatte Fläche fürs Gesicht – sonst geht die Mimik in der Floret-Textur unter */
function facePlate(g: G, cx: number, fy: number) {
  const headColors = new Set([C.head, C.headHi, C.headDark, C.headDeep, C.floret, C.floretHi]);
  for (let y = fy - 1; y <= fy + 6; y++) {
    for (let x = cx - 6; x <= cx + 6; x++) {
      const dx = (x - cx) / 6.4;
      const dy = (y - (fy + 2.5)) / 4.4;
      const cur = g.get(x, y);
      if (dx * dx + dy * dy <= 1 && cur && headColors.has(cur)) g.set(x, y, C.head);
    }
  }
}

function chubbyBody(g: G, cx: number, topY: number, w: number, h: number) {
  const cy = topY + h / 2;
  g.fillEllipse(cx, cy, w / 2, h / 2, C.body);
  g.fillEllipse(cx - w * 0.16, cy - h * 0.12, w * 0.24, h * 0.3, C.bodyHi);
  // untere Schattierung
  for (let y = Math.round(cy + h * 0.18); y <= Math.ceil(cy + h / 2); y++) {
    for (let x = Math.floor(cx - w / 2); x <= Math.ceil(cx + w / 2); x++) {
      if (g.get(x, y) === C.body) g.set(x, y, C.bodyShade);
    }
  }
  // Füßchen
  const fy = Math.round(cy + h / 2);
  g.set(cx - w * 0.22, fy, C.bodyShade);
  g.set(cx - w * 0.22 + 1, fy, C.bodyShade);
  g.set(cx + w * 0.22, fy, C.bodyShade);
  g.set(cx + w * 0.22 - 1, fy, C.bodyShade);
}

/** Gezacktes Blatt; dir=1 → rechts, dir=-1 → links; slope = Hängen nach unten */
function leafArm(g: G, sx: number, sy: number, len: number, dir: 1 | -1, slope: number, yellow: boolean) {
  const leaf = yellow ? C.leafY : C.leaf;
  const hi = yellow ? C.leafYHi : C.leafHi;
  const vein = yellow ? C.veinY : C.vein;
  for (let t = 0; t <= len; t++) {
    const x = sx + t * dir;
    const y = sy + Math.floor(t * slope);
    const taper = t / len;
    // schlank: max. 2 Pixel Halbbreite, zur Spitze auslaufend
    const half = t === len ? 0 : Math.max(1, Math.round((1 - Math.abs(taper - 0.35) * 1.2) * 2.1));
    for (let dy = -half; dy <= half; dy++) {
      g.set(x, y + dy, dy === 0 ? vein : (dy < 0 ? hi : leaf));
    }
    // markante Zacken alle 3 Pixel
    if (t % 3 === 1 && t < len - 1) {
      g.set(x, y - half - 1, hi);
      g.set(x + dir, y - half - 1, hi);
      g.set(x, y + half + 1, leaf);
    }
  }
}

function eggShape(g: G, cx: number, cy: number, rx: number, ry: number) {
  g.fillEllipse(cx, cy, rx, ry, C.egg);
  // etwas spitzer oben
  for (let y = Math.floor(cy - ry); y < cy - ry * 0.45; y++) {
    for (let x = 0; x < GRID_W; x++) {
      if (g.get(x, y) === C.egg) {
        const dx = Math.abs(x - cx);
        if (dx > rx * (0.55 + 0.45 * ((y - (cy - ry)) / (ry * 0.55)))) g.clear(x, y);
      }
    }
  }
  // rechte/untere Schattierung
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (g.get(x, y) === C.egg && dx * dx + dy * dy > 0.55 && dx > 0.1) g.set(x, y, C.eggShade);
    }
  }
}

function eggStripes(g: G, cx: number, cy: number, rx: number, ry: number, avoid?: { x: number; y: number; r: number }) {
  // wenige, klare diagonale Tigerstreifen (deterministisch platziert)
  const strokes: [number, number, number][] = [
    [cx - rx * 0.55, cy - ry * 0.75, 5],
    [cx + rx * 0.05, cy - ry * 0.55, 5],
    [cx - rx * 0.75, cy + ry * 0.15, 4],
    [cx + rx * 0.15, cy + ry * 0.42, 5],
  ];
  for (const [sx, sy, len] of strokes) {
    for (let t = 0; t < len; t++) {
      const x = Math.round(sx + t);
      const y = Math.round(sy + t * 0.5);
      if (avoid) {
        const dx = x - avoid.x;
        const dy = y - avoid.y;
        if (dx * dx + dy * dy < avoid.r * avoid.r) continue;
      }
      const cur = g.get(x, y);
      if (cur === C.egg || cur === C.eggShade) g.set(x, y, C.stripe);
    }
  }
}

function shellHalf(g: G, cx: number, cy: number, flip: boolean) {
  // kleine liegende Schalenhälfte mit Zacken
  for (let dx = -3; dx <= 3; dx++) {
    g.set(cx + dx, cy + 1, C.eggShade);
    if (Math.abs(dx) <= 2) g.set(cx + dx, cy, C.egg);
  }
  g.set(cx + (flip ? -2 : 2), cy - 1, C.egg);
  g.set(cx + (flip ? 0 : 0), cy - 1, C.egg);
}

function face(g: G, cx: number, fy: number, emotion: Emotion, color: string) {
  // Augen 2×2
  for (const ex of [cx - 4, cx + 3]) {
    g.set(ex, fy, color); g.set(ex + 1, fy, color);
    g.set(ex, fy + 1, color); g.set(ex + 1, fy + 1, color);
  }
  const my = fy + 3;
  if (emotion === 'happy') {
    g.set(cx - 2, my, color);
    g.set(cx - 1, my + 1, color);
    g.set(cx, my + 1, color);
    g.set(cx + 1, my + 1, color);
    g.set(cx + 2, my, color);
  } else if (emotion === 'neutral') {
    g.set(cx - 1, my + 1, color);
    g.set(cx, my + 1, color);
    g.set(cx + 1, my + 1, color);
  } else {
    g.set(cx - 2, my + 2, color);
    g.set(cx - 1, my + 1, color);
    g.set(cx, my + 1, color);
    g.set(cx + 1, my + 1, color);
    g.set(cx + 2, my + 2, color);
    // Träne
    g.set(cx + 6, fy + 2, C.tear);
    g.set(cx + 6, fy + 3, C.tear);
  }
}

/* ---- Die 9 Stufen ---- */

export const STAGE_NAMES = [
  'Ei', 'Keimling', 'Sämling', 'Early Veg', 'Mid Veg', 'Late Veg',
  'Frühe Blüte', 'Volle Blüte', 'Erntereif',
];

export function generateBuddy(stage: number, emotion: Emotion = 'neutral'): Pixel[] {
  const s = Math.min(9, Math.max(1, stage));
  const rng = mulberry32(s * 7919 + 13);
  const g = new G();
  const cx = 14;

  switch (s) {
    case 1: { // Ei: Tigerstreifen + Gesicht als Schatten durch die Schale
      eggShape(g, cx, 16, 8, 10);
      g.fillEllipse(cx, 15.5, 5, 4.5, C.eggFace);
      eggStripes(g, cx, 16, 8, 10, { x: cx, y: 15.5, r: 6 });
      face(g, cx, 14, emotion, C.shadowFace);
      break;
    }
    case 2: { // Keimling: Kopf bricht aus dem Ei, Splitter am Boden
      // Schalen-Unterteil mit Zackenrand
      g.fillEllipse(cx, 20, 7.5, 7, C.egg);
      for (let x = cx - 8; x <= cx + 8; x++) {
        const tooth = ((x - cx + 8) % 4 < 2) ? 0 : 2;
        for (let y = 0; y < 14 + tooth; y++) {
          if (g.get(x, y) === C.egg) g.clear(x, y);
        }
      }
      for (let y = 15; y <= 27; y++) {
        for (let x = cx + 3; x <= cx + 8; x++) {
          if (g.get(x, y) === C.egg) g.set(x, y, C.eggShade);
        }
      }
      eggStripes(g, cx, 21, 7, 6);
      g.set(cx, 22, C.stripe); g.set(cx + 1, 23, C.stripe); g.set(cx, 24, C.stripe);
      // Kopf sitzt IN der Öffnung (überlappt den Zackenrand)
      broccoliHead(g, cx, 10, 6, rng);
      facePlate(g, cx, 9);
      face(g, cx, 9, emotion, C.face);
      shellHalf(g, 3, 27, true);
      shellHalf(g, 25, 27, false);
      break;
    }
    case 3: { // Sämling: geschlüpft, Schalenhälften wie Trophäen daneben
      broccoliHead(g, cx, 8, 6.5, rng);
      chubbyBody(g, cx, 13, 10, 8);
      g.fillCircle(cx - 6, 15.5, 1.4, C.body);
      g.fillCircle(cx + 6, 15.5, 1.4, C.body);
      facePlate(g, cx, 8);
      face(g, cx, 8, emotion, C.face);
      shellHalf(g, 3, 25, true);
      shellHalf(g, 25, 25, false);
      break;
    }
    case 4: { // Early Veg: erste gezackte Blatt-Arme
      broccoliHead(g, cx, 9, 7, rng);
      chubbyBody(g, cx, 14, 10, 9);
      leafArm(g, cx - 5, 17, 8, -1, 0.15, false);
      leafArm(g, cx + 5, 17, 8, 1, 0.15, false);
      facePlate(g, cx, 9);
      face(g, cx, 9, emotion, C.face);
      break;
    }
    case 5: { // Mid Veg: größer, LST-Pose (Blätter seitlich-runter)
      broccoliHead(g, cx, 9, 8.5, rng);
      chubbyBody(g, cx, 15.5, 11, 9);
      leafArm(g, cx - 5, 18.5, 9, -1, 0.35, false);
      leafArm(g, cx + 5, 18.5, 9, 1, 0.35, false);
      facePlate(g, cx, 10);
      face(g, cx, 10, emotion, C.face);
      break;
    }
    case 6: { // Late Veg: buschig, breite selbstbewusste Krone
      broccoliHead(g, cx, 10, 9.5, rng);
      chubbyBody(g, cx, 17, 11, 8);
      leafArm(g, cx - 5, 19.5, 9, -1, 0.25, false);
      leafArm(g, cx + 5, 19.5, 9, 1, 0.25, false);
      facePlate(g, cx, 11);
      face(g, cx, 11, emotion, C.face);
      break;
    }
    case 7: { // Frühe Blüte: erste gelbe Floretten
      broccoliHead(g, cx, 10, 9.5, rng, 9);
      chubbyBody(g, cx, 17, 11, 8);
      leafArm(g, cx - 5, 19.5, 9, -1, 0.35, false);
      leafArm(g, cx + 5, 19.5, 9, 1, 0.35, false);
      facePlate(g, cx, 11);
      face(g, cx, 11, emotion, C.face);
      break;
    }
    case 8: { // Volle Blüte: dichter Kopf, viele Floretten
      broccoliHead(g, cx, 10, 10, rng, 22);
      chubbyBody(g, cx, 17.5, 11, 8);
      leafArm(g, cx - 5, 20, 9, -1, 0.45, false);
      leafArm(g, cx + 5, 20, 9, 1, 0.45, false);
      facePlate(g, cx, 11);
      face(g, cx, 11, emotion, C.face);
      break;
    }
    case 9: { // Erntereif: maximale Form, vergilbende hängende Blätter
      broccoliHead(g, cx, 10.5, 10.5, rng, 40);
      chubbyBody(g, cx, 18, 11, 8);
      leafArm(g, cx - 5, 20.5, 10, -1, 0.55, true);
      leafArm(g, cx + 5, 20.5, 10, 1, 0.55, true);
      facePlate(g, cx, 12);
      face(g, cx, 12, emotion, C.face);
      break;
    }
  }

  g.outline(C.outline);
  return g.toPixels();
}
