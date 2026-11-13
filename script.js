/* ==========================================================================
   PAPER FERRIS WHEEL — script.js
   --------------------------------------------------------------------------
   Sections
     1. CONFIG ............ timings, colours, questions (tweak here!)
     2. Helpers
     3. Room (sync layer) . all rider actions go through here → Firebase later
     4. State
     5. Scene building .... city, wheel, cabins, sky bits, window frame
     6. Per-frame updates . ride, camera, sky, cabins, riders, fireflies, sound
     7. Question card
     8. Reactions
     9. Start / end screens + postcard download
    10. Wiring & main loop
   ========================================================================== */
'use strict';

/* ==========================================================================
   1. CONFIG
   ========================================================================== */
const CONFIG = {
  /* ---- Timings ---------------------------------------------------------- */
  RIDE_DURATION_SEC: 150,     // one full rotation, NOT counting the pause at the top
  QUESTION_DELAY_SEC: 1.0,    // how long the wheel rests at the top before the card unfolds
  REVEAL_HOLD_SEC: 15,        // after both answers flip, the ride continues by itself after this
  LANDING_DELAY_SEC: 2.0,     // rest at the bottom before the postcard slides in
  CAMERA_TRANSITION_MS: 1400, // side ↔ first-person zoom/fade

  /* ---- Scene ------------------------------------------------------------ */
  CABIN_COUNT: 10,
  SWAY_DEG: 3.2,              // max cabin sway (0 when prefers-reduced-motion)
  FIREFLY_COUNT: 36,
  STAR_COUNT: 90,
  CLOUD_COUNT: 6,
  CLOUD_SPEED: 9,             // px / second

  /* ---- Sky palettes ----------------------------------------------------- */
  // Every key becomes a CSS variable (skyTop → --sky-top) and is blended
  // smoothly along SKY_TIMELINE as the wheel turns.
  SKY: {
    day: {
      skyTop: '#9fd3ee', skyMid: '#c8e8f4', skyBottom: '#fbe7d6', sun: '#ffd27a', cloud: '#ffffff',
      cityFar: '#cdd9ec', cityMid: '#aebfdc', cityNear: '#9cc7a4', ground: '#b8dcae',
      wheel: '#fffaf1', wheelShade: '#e9d9c6', window: '#e8f0fa',
    },
    sunsetOrange: {
      skyTop: '#f3a77f', skyMid: '#f9c08f', skyBottom: '#ffe0a3', sun: '#ffb36b', cloud: '#ffe8d6',
      cityFar: '#e7b9a9', cityMid: '#cf9c98', cityNear: '#a7a98a', ground: '#c9b98f',
      wheel: '#fff1e2', wheelShade: '#e8c6ad', window: '#f7dcc8',
    },
    sunsetPink: {
      skyTop: '#b886b8', skyMid: '#ef98ae', skyBottom: '#ffbf9b', sun: '#ff8f7a', cloud: '#f8d3dc',
      cityFar: '#c595b2', cityMid: '#a57a9e', cityNear: '#7e7a8f', ground: '#8f7f95',
      wheel: '#f9e4ea', wheelShade: '#d9b3c3', window: '#e9c3cf',
    },
    sunsetPurple: {
      skyTop: '#4f4a8a', skyMid: '#8e6fb0', skyBottom: '#e59aa6', sun: '#ff7f86', cloud: '#b9a3cf',
      cityFar: '#6f5f97', cityMid: '#56497e', cityNear: '#423e68', ground: '#3e3a64',
      wheel: '#e2d9ef', wheelShade: '#b3a5cf', window: '#9a8bbd',
    },
    night: {
      skyTop: '#0a1433', skyMid: '#16275a', skyBottom: '#2c3f7c', sun: '#ff7f86', cloud: '#34467c',
      cityFar: '#2a3a6b', cityMid: '#1d2a55', cityNear: '#162146', ground: '#121c3d',
      wheel: '#c9cfe8', wheelShade: '#8e97c0', window: '#2a3866',
    },
  },
  // [rotation progress, palette]. 0 = boarding, 0.5 = top of the wheel, 1 = landing.
  SKY_TIMELINE: [
    [0.00, 'day'], [0.22, 'day'],
    [0.34, 'sunsetOrange'], [0.42, 'sunsetPink'], [0.50, 'sunsetPurple'],
    [0.63, 'night'], [1.00, 'night'],
  ],

  NIGHT_TINT: '#1a2350',      // cabins/frame blend towards this at night
  WINDOW_LIT: '#ffe08a',      // warm lit-window colour
  CABIN_COLORS: ['#f9c6cf', '#bfe3d8', '#fde3a7', '#d6c8f2', '#c3e6b5', '#ffd1b3', '#bcd7f2', '#f6c1e0', '#cfe8c9'],
  RIDER_CABIN_COLOR: '#f7a28b',
  FIREFLY_COLORS: ['#ff9ecf', '#7fe3d6', '#ffe27a', '#c8a8ff', '#a8f0a0'],

  /* ---- Sound (0..1) ----------------------------------------------------- */
  SOUND_FILES: {
    wind: 'assets/wind.mp3',
    creak: 'assets/wheel-creak.mp3',
    fair: 'assets/fair-music.mp3',
    crickets: 'assets/crickets.mp3',
  },
  SOUND_LEVELS: { wind: 0.35, creak: 0.22, fair: 0.3, crickets: 0.32 },

  /* ---- Reactions -------------------------------------------------------- */
  EMOJIS: ['❤️', '✨', '😂', '😳', '🥹'],
  // key → [rider, emoji index]. Rider 1: 1–5, Rider 2: 6–0
  KEYMAP: { 1: [0, 0], 2: [0, 1], 3: [0, 2], 4: [0, 3], 5: [0, 4], 6: [1, 0], 7: [1, 1], 8: [1, 2], 9: [1, 3], 0: [1, 4] },

  /* ---- Top-of-the-wheel questions -------------------------------------- */
  QUESTIONS: [
    "What's your favourite memory of us?",
    'If we could teleport anywhere right now, where?',
    "What's a tiny thing that always makes you smile?",
    "What's something you've never told me?",
    'If tonight were a song, what would it be?',
    "What's the best meal we've ever shared?",
    'What would our perfect lazy Sunday look like?',
    'Which superpower would you want for one day?',
    "What's a dream you haven't said out loud yet?",
    'What was your very first impression of me?',
    'If we opened a tiny shop together, what would it sell?',
    "What's an adventure we should go on this year?",
    'What smell instantly takes you back to childhood?',
    'What would you put in a time capsule of us?',
    'If you could relive one day, which one?',
  ],
};

// Dev helper: ?speed=20 makes the ride 20× faster (handy for testing).
const SPEED = Math.max(0.1, Number(new URLSearchParams(location.search).get('speed')) || 1);
const REDUCED_MOTION = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ==========================================================================
   2. HELPERS
   ========================================================================== */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const easeInOutSine = (t) => 0.5 - 0.5 * Math.cos(Math.PI * t);
const f1 = (n) => n.toFixed(1);

/** Small seeded random generator, so the "hand-cut" jitter is the same every visit. */
function seeded(seed) {
  return function () {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rgbCache = {};
function hexToRgb(hex) {
  if (!rgbCache[hex]) { const n = parseInt(hex.slice(1), 16); rgbCache[hex] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  return rgbCache[hex];
}
/** Blend two #rrggbb colours. */
function mixHex(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return '#' + A.map((v, i) => Math.round(lerp(v, B[i], t)).toString(16).padStart(2, '0')).join('');
}

const SVGNS = 'http://www.w3.org/2000/svg';
function svgEl(tag, attrs = {}, parent) {
  const el = document.createElementNS(SVGNS, tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(el);
  return el;
}

/** Straight-edged polygon path. */
const polyPath = (pts) => 'M' + pts.map((p) => f1(p[0]) + ' ' + f1(p[1])).join('L') + 'Z';

/** Smooth closed path through points (quadratic curves through midpoints). */
function smoothClosedPath(pts) {
  const n = pts.length;
  const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  const m0 = mid(pts[n - 1], pts[0]);
  let d = `M${f1(m0[0])} ${f1(m0[1])}`;
  for (let i = 0; i < n; i++) {
    const p = pts[i], m = mid(p, pts[(i + 1) % n]);
    d += `Q${f1(p[0])} ${f1(p[1])} ${f1(m[0])} ${f1(m[1])}`;
  }
  return d + 'Z';
}

/** A circle that looks cut out with scissors: radius wobbles a little. */
function wobblyCircle(cx, cy, r, rand, wobble = 1.4, steps = 64) {
  const pts = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2, rr = r + (rand() - 0.5) * 2 * wobble;
    pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
  }
  return smoothClosedPath(pts);
}

function roundedRectPath(x, y, w, h, r) {
  return `M${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h - r}Q${x + w} ${y + h} ${x + w - r} ${y + h}` +
         `H${x + r}Q${x} ${y + h} ${x} ${y + h - r}V${y + r}Q${x} ${y} ${x + r} ${y}Z`;
}

/* ==========================================================================
   3. ROOM — the sync layer
   --------------------------------------------------------------------------
   Every shared action (start, answers, reactions, continue) goes through
   `room`. Today LocalRoom just echoes events back on this device, because
   both riders share one screen.

   To add online 2-player later, write a FirebaseRoom with the SAME methods,
   backed by Realtime Database at rooms/{code}:
     rooms/{code}/riders/{0|1}/name      ← join()
     rooms/{code}/question, startedAt    ← start()   (host = rider 0 picks)
     rooms/{code}/answers/{0|1}          ← submitAnswer()
     rooms/{code}/reactions (push list)  ← sendReaction()
     rooms/{code}/continuedAt            ← continueRide()
   …and emit the same events from the DB listeners. Then set LOCAL_RIDERS
   to [myRiderIndex] so each phone only controls its own rider.
   ========================================================================== */
class LocalRoom {
  constructor() { this.handlers = {}; }
  on(type, fn) { (this.handlers[type] ||= []).push(fn); }
  emit(type, payload) { (this.handlers[type] || []).forEach((fn) => fn(payload)); }

  start(names) {
    const question = pickQuestion();
    this.emit('start', { names, question, startedAt: Date.now() });
  }
  submitAnswer(rider, text) { this.emit('answer', { rider, text }); }
  sendReaction(rider, emoji) { this.emit('reaction', { rider, emoji }); }
  continueRide() { this.emit('continue', {}); }
}
const room = new LocalRoom();
const LOCAL_RIDERS = [0, 1]; // which riders this device controls (both, on a shared screen)

let lastQuestion = '';
function pickQuestion() {
  const pool = CONFIG.QUESTIONS.filter((q) => q !== lastQuestion);
  lastQuestion = pool[Math.floor(Math.random() * pool.length)];
  return lastQuestion;
}

/* ==========================================================================
   4. STATE
   ========================================================================== */
const state = {
  phase: 'idle',      // idle → up → top → down → landed → end
  names: ['', ''],
  question: '',
  answers: [null, null],
  rideT: 0,           // seconds into the current half of the ride
  phaseT: 0,          // seconds in the current phase (top / landed)
  p: 0,               // rotation progress 0..1  (0 boarding, .5 top, 1 landed)
  speedNorm: 0,       // 0..1 current wheel speed
  camMode: 'side',    // 'side' | 'fp'
  camT: 0,            // animated 0 (side) → 1 (first person)
  time: 0,            // seconds since load (for sway etc.)
  questionShown: false,
  revealTimer: null,
  soundOn: false,
};

// Scene geometry (SVG user units)
const WHEEL = { cx: 500, cy: 500, r: 300, groundY: 930 };
const RIDER_CABIN_CENTER = 47;      // distance from hanging point to the rider-cabin window centre

let W = innerWidth, H = innerHeight;
const els = {};
const cabins = [];
const clouds = [];
const fireflies = [];
let midWindows = [];
let frameGeom = { m: 20, mb: 120 };

/* ==========================================================================
   5. SCENE BUILDING
   ========================================================================== */

/** A row of paper buildings. Far rows get sparse tiny windows; the mid row a full grid. */
function buildCity(group, o) {
  const rand = seeded(o.seed);
  const J = () => (rand() - 0.5) * 3.2; // hand-cut jitter
  const winLayer = svgEl('g');
  let x = o.xMin;
  while (x < o.xMax) {
    const w = lerp(o.minW, o.maxW, rand());
    const h = lerp(o.minH, o.maxH, Math.pow(rand(), 1.25));
    const top = o.baseY - h, base = o.baseY + 40;
    const roof = rand();
    const pts = [[x + J(), base], [x + J(), top + J()]];
    if (roof < 0.16) pts.push([x + w / 2 + J(), top - w * 0.38]);                          // peaked
    else if (roof < 0.3) pts.push([x + w * 0.25, top + J()], [x + w * 0.25 + J(), top - h * 0.12],
                                 [x + w * 0.75 + J(), top - h * 0.12], [x + w * 0.75, top + J()]); // stepped
    else if (roof < 0.38) pts.push([x + w * 0.46, top], [x + w * 0.48, top - 38], [x + w * 0.52, top - 38], [x + w * 0.54, top]); // antenna
    pts.push([x + w + J(), top + J()], [x + w + J(), base]);
    svgEl('path', { d: polyPath(pts) }, group);
    if (roof >= 0.38 && roof < 0.45) {
      svgEl('path', { d: `M${f1(x + w * 0.2)} ${f1(top + 1)}A${f1(w * 0.3)} ${f1(w * 0.3)} 0 0 1 ${f1(x + w * 0.8)} ${f1(top + 1)}Z` }, group); // dome
    }

    // Windows
    if (rand() > 0.1) {
      const ww = o.win.w, wh = o.win.h, sx = o.win.sx, sy = o.win.sy;
      const cols = Math.floor((w - 12) / sx), rows = Math.floor((h - 22) / sy);
      const ox = x + (w - (cols * sx - (sx - ww))) / 2;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (rand() > o.win.density) continue;
          const lit = rand() < o.win.lit;
          if (o.win.onlyLit && !lit) continue;
          const el = svgEl('rect', {
            x: f1(ox + c * sx), y: f1(top + 14 + r * sy), width: ww, height: wh, rx: 1.2,
            class: o.win.onlyLit ? 'win-far' : 'win' + (lit ? ' lit' : ''),
          }, winLayer);
          if (!o.win.onlyLit) midWindows.push(el);
        }
      }
    }
    x += w + lerp(o.gapMin, o.gapMax, rand());
  }
  group.appendChild(winLayer);
  return winLayer;
}

function buildFarAndMidCity() {
  els.farWindows = buildCity($('#city-far'), {
    seed: 11, xMin: -1700, xMax: 2700, baseY: WHEEL.groundY, minW: 40, maxW: 95, minH: 130, maxH: 400,
    gapMin: -14, gapMax: 6,
    win: { w: 4, h: 6, sx: 11, sy: 17, density: 0.28, lit: 1, onlyLit: true },
  });
  buildCity($('#city-mid'), {
    seed: 23, xMin: -1500, xMax: 2500, baseY: WHEEL.groundY, minW: 55, maxW: 115, minH: 70, maxH: 270,
    gapMin: 8, gapMax: 36,
    win: { w: 7, h: 10, sx: 15, sy: 21, density: 0.9, lit: 0.55, onlyLit: false },
  });
}

function buildForeground() {
  const g = $('#foreground');
  const rand = seeded(5);
  // Rolling paper ground
  const pts = [];
  for (let x = -3000; x <= 4000; x += 60) pts.push([x, WHEEL.groundY - 4 + Math.sin(x * 0.004) * 5 + (rand() - 0.5) * 3]);
  pts.push([4000, 2600], [-3000, 2600]);
  svgEl('path', { d: polyPath(pts), class: 'ground' }, g);

  // Bushes and lollipop trees, keeping clear of the boarding platform
  for (let x = -1800; x < 2800; x += lerp(40, 140, rand())) {
    if (x > 360 && x < 640) continue;
    if (rand() < 0.3) {
      const h = lerp(40, 75, rand()), y = WHEEL.groundY;
      svgEl('rect', { x: f1(x - 2.5), y: f1(y - h), width: 5, height: f1(h), class: 'trunk' }, g);
      svgEl('path', { d: wobblyCircle(x, y - h, lerp(16, 26, rand()), rand, 1.2, 28), class: 'tree' }, g);
    } else {
      const r = lerp(12, 24, rand());
      svgEl('path', { d: `M${f1(x - r * 1.6)} ${WHEEL.groundY + 4}Q${f1(x - r * 1.5)} ${f1(WHEEL.groundY - r)} ${f1(x - r * 0.4)} ${f1(WHEEL.groundY - r * 0.9)}Q${f1(x)} ${f1(WHEEL.groundY - r * 1.6)} ${f1(x + r * 0.6)} ${f1(WHEEL.groundY - r * 0.9)}Q${f1(x + r * 1.6)} ${f1(WHEEL.groundY - r)} ${f1(x + r * 1.6)} ${WHEEL.groundY + 4}Z`, class: 'bush' }, g);
    }
  }
}

function buildWheel() {
  const { cx, cy, r, groundY } = WHEEL;
  const rand = seeded(7);
  const sup = $('#wheel-supports'), rot = $('#wheel-rot');

  // A-frame legs + brace + boarding platform (static)
  for (const s of [-1, 1]) {
    svgEl('path', { d: polyPath([[cx - 6, cy - 6], [cx + 6, cy - 6], [cx + s * 170 + 12, groundY + 2], [cx + s * 170 - 12, groundY + 2]]), class: 'wheel-shade' }, sup);
  }
  const bx = 170 * (780 - cy) / (groundY - cy);
  svgEl('path', { d: polyPath([[cx - bx - 4, 776], [cx + bx + 4, 776], [cx + bx + 4, 786], [cx - bx - 4, 786]]), class: 'wheel-shade' }, sup);
  svgEl('path', { d: roundedRectPath(395, 900, 210, 34, 6), class: 'platform' }, sup);
  svgEl('path', { d: roundedRectPath(400, 896, 200, 10, 4), class: 'platform-top' }, sup);

  // Rotating part: spokes, lattice, rims, bulbs, hub
  const N = 16;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2, ux = Math.cos(a), uy = Math.sin(a), px = -uy, py = ux;
    svgEl('path', { d: polyPath([
      [cx + ux * 24 + px * 4, cy + uy * 24 + py * 4], [cx + ux * (r - 4) + px * 2.2, cy + uy * (r - 4) + py * 2.2],
      [cx + ux * (r - 4) - px * 2.2, cy + uy * (r - 4) - py * 2.2], [cx + ux * 24 - px * 4, cy + uy * 24 - py * 4],
    ]), class: 'wheel-shade' }, rot);
  }
  const lattice = [];
  for (let i = 0; i <= 40; i++) {
    const a = (i / 40) * Math.PI * 2, rr = i % 2 ? r - 8 : 206;
    lattice.push(`${f1(cx + rr * Math.cos(a))},${f1(cy + rr * Math.sin(a))}`);
  }
  svgEl('polyline', { points: lattice.join(' '), class: 'wheel-lattice' }, rot);
  svgEl('path', { d: wobblyCircle(cx, cy, r + 8, rand, 1.5, 90) + wobblyCircle(cx, cy, r - 7, rand, 1.5, 90), 'fill-rule': 'evenodd', class: 'wheel-paper' }, rot);
  svgEl('path', { d: wobblyCircle(cx, cy, 208, rand, 1.2, 70) + wobblyCircle(cx, cy, 199, rand, 1.2, 70), 'fill-rule': 'evenodd', class: 'wheel-paper' }, rot);
  for (let i = 0; i < 20; i++) {
    const a = ((i + 0.5) / 20) * Math.PI * 2;
    svgEl('circle', { cx: f1(cx + (r + 0.5) * Math.cos(a)), cy: f1(cy + (r + 0.5) * Math.sin(a)), r: 4.2, class: 'bulb' }, rot);
  }
  for (let k = 0; k < CONFIG.CABIN_COUNT; k++) {
    const a = Math.PI / 2 + (k / CONFIG.CABIN_COUNT) * Math.PI * 2;
    svgEl('circle', { cx: f1(cx + r * Math.cos(a)), cy: f1(cy + r * Math.sin(a)), r: 6, class: 'wheel-shade' }, rot);
  }
  // Hub with a little paper flower
  svgEl('path', { d: wobblyCircle(cx, cy, 36, rand, 1, 30), class: 'wheel-paper' }, rot);
  for (let i = 0; i < 8; i++) {
    svgEl('ellipse', { cx, cy: cy - 16, rx: 7, ry: 13, transform: `rotate(${i * 45} ${cx} ${cy})`, fill: CONFIG.RIDER_CABIN_COLOR, opacity: 0.85 }, rot);
  }
  svgEl('circle', { cx, cy, r: 8, class: 'wheel-shade' }, rot);
  els.wheelRot = rot;
}

/** Cabins hang from the rim; they don't rotate with the wheel, they sway. */
function buildCabins() {
  const g = $('#cabins');
  for (let k = 0; k < CONFIG.CABIN_COUNT; k++) {
    const isRider = k === 0;
    const w = isRider ? 78 : 56, h = isRider ? 60 : 46, hw = w / 2, y0 = 24;
    const color = isRider ? CONFIG.RIDER_CABIN_COLOR : CONFIG.CABIN_COLORS[(k - 1) % CONFIG.CABIN_COLORS.length];
    const cab = svgEl('g', { class: 'cabin' + (isRider ? ' rider-cabin' : '') }, g);
    svgEl('rect', { x: -1.6, y: 0, width: 3.2, height: y0 + 2, rx: 1.5, class: 'wheel-shade' }, cab);
    const roof = svgEl('path', { d: `M${-hw * 0.82} ${y0 + 4}Q0 ${y0 - 14} ${hw * 0.82} ${y0 + 4}Z` }, cab);
    const body = svgEl('path', {
      d: `M${-hw} ${y0 + 8}Q${-hw} ${y0 + 2} ${-hw + 6} ${y0 + 2}H${hw - 6}Q${hw} ${y0 + 2} ${hw} ${y0 + 8}` +
         `V${y0 + h - 16}Q${hw} ${y0 + h} ${hw - 16} ${y0 + h}H${-hw + 16}Q${-hw} ${y0 + h} ${-hw} ${y0 + h - 16}Z`,
    }, cab);
    const win = svgEl('rect', { x: -hw + 6, y: y0 + 8, width: w - 12, height: h * 0.52, rx: 6 }, cab);
    svgEl('rect', { x: -hw + 3, y: f1(y0 + h * 0.72), width: w - 6, height: 4, rx: 2, fill: '#ffffff', opacity: 0.45 }, cab);
    if (isRider) svgEl('path', { d: 'M0 13.5c-3.5-2.4-5.6-4.4-5.6-6.6A2.8 2.8 0 0 1 0 5.4a2.8 2.8 0 0 1 5.6 1.5c0 2.2-2.1 4.2-5.6 6.6z', fill: '#fff', opacity: 0.9, transform: `translate(0 ${y0 - 22})` }, cab);
    cabins.push({ g: cab, body, roof, win, color, isRider, phase: k * 1.7 });
  }
}

function buildSunMoon() {
  const sun = $('#sun'), rand = seeded(3);
  for (let i = 0; i < 12; i++) {
    svgEl('path', { d: 'M50 2 L54 16 L46 16Z', class: 'sun-ray', transform: `rotate(${i * 30} 50 50)` }, sun);
  }
  svgEl('path', { d: wobblyCircle(50, 50, 31, rand, 1.2, 36), class: 'sun-disc' }, sun);
  svgEl('path', { d: wobblyCircle(44, 44, 18, rand, 1, 24), class: 'sun-inner' }, sun);
  const moon = $('#moon');
  svgEl('path', { d: 'M58 8 A42 42 0 1 0 92 66 A34 34 0 1 1 58 8Z', class: 'moon-disc' }, moon);
  svgEl('circle', { cx: 36, cy: 62, r: 5, class: 'moon-crater' }, moon);
  svgEl('circle', { cx: 48, cy: 78, r: 3, class: 'moon-crater' }, moon);
}

function buildClouds() {
  const host = $('#clouds'), rand = seeded(17);
  for (let i = 0; i < CONFIG.CLOUD_COUNT; i++) {
    const w = lerp(110, 220, rand());
    const div = document.createElement('div');
    div.className = 'cloud';
    const svg = svgEl('svg', { viewBox: '0 0 200 90', width: f1(w), height: f1(w * 0.45) });
    const bumps = (dx, dy, cls) => {
      const g = svgEl('g', { class: cls, transform: `translate(${dx} ${dy})` }, svg);
      svgEl('path', { d: wobblyCircle(60, 52, 28, rand, 1.2, 24) }, g);
      svgEl('path', { d: wobblyCircle(98, 40, 36, rand, 1.2, 28) }, g);
      svgEl('path', { d: wobblyCircle(138, 54, 26, rand, 1.2, 24) }, g);
      svgEl('path', { d: roundedRectPath(34, 52, 132, 28, 14) }, g);
    };
    bumps(10, 6, 'c-back');
    bumps(0, 0, 'c-front');
    div.appendChild(svg);
    host.appendChild(div);
    clouds.push({ el: div, x: rand() * W, yFrac: lerp(0.05, 0.42, rand()), w, speed: lerp(0.6, 1.4, rand()) });
  }
}

function buildStars() {
  const host = $('#stars'), rand = seeded(29);
  for (let i = 0; i < CONFIG.STAR_COUNT; i++) {
    const s = document.createElement('div');
    const big = rand() < 0.12;
    s.className = 'star' + (big ? ' paper-star' : '');
    const size = big ? lerp(9, 14, rand()) : lerp(1.5, 3.2, rand());
    s.style.cssText = `left:${(rand() * 100).toFixed(2)}%;top:${(rand() * 68).toFixed(2)}%;width:${size}px;height:${size}px;` +
                      `--d:${lerp(2.2, 5.5, rand()).toFixed(2)}s;--delay:${(-rand() * 5).toFixed(2)}s`;
    host.appendChild(s);
  }
}

function buildFireflies() {
  const host = $('#fireflies');
  const count = REDUCED_MOTION ? Math.round(CONFIG.FIREFLY_COUNT / 3) : CONFIG.FIREFLY_COUNT;
  for (let i = 0; i < count; i++) {
    const outer = document.createElement('div');
    outer.className = 'firefly';
    const glow = document.createElement('div');
    glow.className = 'glow';
    const c = CONFIG.FIREFLY_COLORS[i % CONFIG.FIREFLY_COLORS.length];
    glow.style.cssText = `--c:${c};--s:${lerp(5, 9, Math.random()).toFixed(1)}px;` +
                         `--d:${lerp(1.8, 4.2, Math.random()).toFixed(2)}s;--delay:${(-Math.random() * 4).toFixed(2)}s`;
    outer.appendChild(glow);
    host.appendChild(outer);
    fireflies.push({
      el: outer,
      x: Math.random() * W, y: lerp(0.2, 0.95, Math.random()) * H,
      heading: Math.random() * Math.PI * 2, turn: 0,
      speed: lerp(8, 22, Math.random()),
    });
  }
}

/** The paper window frame for the first-person view. Rebuilt on resize. */
function buildFrame() {
  const svg = $('#window-frame');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.textContent = '';
  const m = clamp(Math.min(W, H) * 0.06, 16, 56);
  const mb = clamp(H * 0.17, 100, 170);
  const r = clamp(Math.min(W, H) * 0.06, 16, 54);
  frameGeom = { m, mb };
  const hole = (i) => roundedRectPath(m + i, m + i, W - 2 * (m + i), H - m - mb - 2 * i, Math.max(4, r - i * 0.6));
  const outer = `M-40 -40H${W + 40}V${H + 40}H-40Z`;
  svgEl('path', { d: outer + hole(0), 'fill-rule': 'evenodd', class: 'frame' }, svg);
  svgEl('path', { d: hole(0) + hole(9), 'fill-rule': 'evenodd', class: 'frame-lip' }, svg);
  // the seat-back at the bottom, where the riders sit
  svgEl('path', { d: roundedRectPath(m * 0.6, H - mb * 0.62, W - m * 1.2, mb * 0.62 + 30, 18), class: 'frame-seat' }, svg);
}

/** Mini night scene for the postcard (plain SVG so html2canvas can render it). */
function buildPostcardScene() {
  const rand = seeded(99), n = CONFIG.SKY.night;
  let s = `<svg xmlns="${SVGNS}" viewBox="0 0 300 200" preserveAspectRatio="xMidYMid slice"><defs>` +
    `<linearGradient id="pcsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${n.skyTop}"/><stop offset=".65" stop-color="${n.skyMid}"/><stop offset="1" stop-color="${n.skyBottom}"/></linearGradient>`;
  CONFIG.FIREFLY_COLORS.forEach((c, i) => {
    s += `<radialGradient id="pcff${i}"><stop offset="0" stop-color="#fff"/><stop offset=".3" stop-color="${c}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`;
  });
  s += `</defs><rect width="300" height="200" fill="url(#pcsky)"/>`;
  for (let i = 0; i < 40; i++) s += `<circle cx="${f1(rand() * 300)}" cy="${f1(rand() * 110)}" r="${f1(lerp(0.5, 1.4, rand()))}" fill="#fffbe8" opacity="${f1(lerp(0.4, 1, rand()))}"/>`;
  s += `<path d="M252 18 A16 16 0 1 0 265 40 A13 13 0 1 1 252 18Z" fill="#fdf2cf"/>`;
  // wheel
  const cx = 150, cy = 108, r = 58;
  s += `<g stroke="${n.wheelShade}" stroke-width="2.4" stroke-linecap="round"><line x1="${cx}" y1="${cy}" x2="${cx - 34}" y2="182"/><line x1="${cx}" y1="${cy}" x2="${cx + 34}" y2="182"/></g>`;
  s += `<g stroke="${n.wheel}" fill="none"><circle cx="${cx}" cy="${cy}" r="${r}" stroke-width="3.5"/><circle cx="${cx}" cy="${cy}" r="${r * 0.68}" stroke-width="1.5"/>`;
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; s += `<line x1="${cx}" y1="${cy}" x2="${f1(cx + r * Math.cos(a))}" y2="${f1(cy + r * Math.sin(a))}" stroke-width="1.2"/>`; }
  s += `</g><circle cx="${cx}" cy="${cy}" r="5" fill="${n.wheel}"/>`;
  for (let k = 0; k < 8; k++) {
    const a = Math.PI / 2 + (k / 8) * Math.PI * 2, x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
    const c = k === 0 ? CONFIG.RIDER_CABIN_COLOR : CONFIG.CABIN_COLORS[k % CONFIG.CABIN_COLORS.length];
    s += `<rect x="${f1(x - 6)}" y="${f1(y + 2)}" width="12" height="10" rx="3" fill="${c}"/><rect x="${f1(x - 4)}" y="${f1(y + 4)}" width="8" height="4" rx="1.5" fill="${CONFIG.WINDOW_LIT}"/>`;
  }
  // skyline
  let x = -5;
  while (x < 305) {
    const w = lerp(14, 30, rand()), h = lerp(16, 52, rand());
    if (x + w < 112 || x > 188 || h < 26) {
      s += `<rect x="${f1(x)}" y="${f1(186 - h)}" width="${f1(w)}" height="${f1(h + 20)}" fill="${n.cityMid}"/>`;
      for (let wy = 186 - h + 5; wy < 182; wy += 7) for (let wx = x + 3; wx < x + w - 4; wx += 6) {
        if (rand() < 0.4) s += `<rect x="${f1(wx)}" y="${f1(wy)}" width="2.5" height="3.5" fill="${CONFIG.WINDOW_LIT}"/>`;
      }
    }
    x += w + lerp(1, 6, rand());
  }
  s += `<rect y="184" width="300" height="20" fill="${n.ground}"/>`;
  for (let i = 0; i < 16; i++) {
    const r0 = lerp(4, 7, rand());
    s += `<circle class="pc-ff" style="--d:${f1(lerp(1.8, 4, rand()))}s;--delay:${f1(-rand() * 3)}s" cx="${f1(rand() * 300)}" cy="${f1(lerp(70, 190, rand()))}" r="${f1(r0)}" fill="url(#pcff${i % 5})"/>`;
  }
  s += '</svg>';
  $('#pc-scene').innerHTML = s; // fully generated here — no user input
}

/* ==========================================================================
   6. PER-FRAME UPDATES
   ========================================================================== */

function enterPhase(phase) {
  state.phase = phase;
  state.phaseT = 0;
  state.rideT = 0;
  els.app.dataset.phase = phase;
}

/** Advances the ride clock. Each half of the ride eases in and out, so the
 *  wheel glides to a stop at the top and again at the bottom. */
function updateRide(dt) {
  const half = CONFIG.RIDE_DURATION_SEC / 2;
  const rdt = dt * SPEED;
  switch (state.phase) {
    case 'up': {
      state.rideT += rdt;
      const x = clamp(state.rideT / half, 0, 1);
      state.p = 0.5 * easeInOutSine(x);
      state.speedNorm = Math.sin(Math.PI * x);
      if (x >= 1) enterPhase('top');
      break;
    }
    case 'top':
      state.p = 0.5; state.speedNorm = 0; state.phaseT += dt;
      if (!state.questionShown && state.phaseT > CONFIG.QUESTION_DELAY_SEC) showQuestion();
      break;
    case 'down': {
      state.rideT += rdt;
      const x = clamp(state.rideT / half, 0, 1);
      state.p = 0.5 + 0.5 * easeInOutSine(x);
      state.speedNorm = Math.sin(Math.PI * x);
      if (x >= 1) enterPhase('landed');
      break;
    }
    case 'landed':
      state.p = 1; state.speedNorm = 0; state.phaseT += dt;
      if (state.phaseT > CONFIG.LANDING_DELAY_SEC) showEnd();
      break;
    default:
      state.speedNorm = 0;
  }
}

/* ---- Sky & colours ---- */
let lastPaletteP = -1;
const night = () => smoothstep(0.5, 0.66, state.p);

function paletteAt(p) {
  const T = CONFIG.SKY_TIMELINE;
  let i = 0;
  while (i < T.length - 2 && p > T[i + 1][0]) i++;
  const [pa, na] = T[i], [pb, nb] = T[i + 1];
  const t = easeInOutSine(clamp((p - pa) / (pb - pa || 1), 0, 1));
  const A = CONFIG.SKY[na], B = CONFIG.SKY[nb], out = {};
  for (const k in A) out[k] = mixHex(A[k], B[k], t);
  return out;
}

const toCssVar = (k) => '--' + k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());

function updateColours(force) {
  // Colours only need refreshing a few times per second.
  if (!force && Math.abs(state.p - lastPaletteP) < 0.0015) return;
  lastPaletteP = state.p;
  const pal = paletteAt(state.p), nt = night();
  const root = document.documentElement.style;
  for (const k in pal) root.setProperty(toCssVar(k), pal[k]);
  const lit = smoothstep(0.42, 0.6, state.p);
  root.setProperty('--window-lit', mixHex(pal.window, CONFIG.WINDOW_LIT, lit));
  root.setProperty('--bulb', mixHex(pal.wheelShade, CONFIG.WINDOW_LIT, lit));
  const frame = mixHex(CONFIG.RIDER_CABIN_COLOR, CONFIG.NIGHT_TINT, nt * 0.45);
  root.setProperty('--frame', frame);
  root.setProperty('--frame-light', mixHex(frame, '#ffffff', 0.4));
  root.setProperty('--frame-dark', mixHex(frame, '#000000', 0.25));
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', pal.skyTop);

  for (const c of cabins) {
    const col = mixHex(c.color, CONFIG.NIGHT_TINT, nt * 0.5);
    c.body.style.fill = col;
    c.roof.style.fill = mixHex(col, '#ffffff', 0.35);
    c.win.style.fill = mixHex('#f4f8ff', c.isRider ? CONFIG.WINDOW_LIT : '#d9c27e', lit * (c.isRider ? 1 : 0.7));
  }
  els.farWindows.style.opacity = lit.toFixed(3);
}

function updateSky(dt) {
  const p = state.p, nt = night();
  // Sun sinks behind the city during sunset; the moon rises after the top.
  const sunY = lerp(0.13, 1.12, smoothstep(0.14, 0.52, p));
  const moonY = lerp(1.12, 0.12, smoothstep(0.5, 0.8, p));
  const sunSize = els.sun.getBoundingClientRect().width || 100;
  // A little parallax in first person: sky objects drift slightly as the cabin rises.
  const shift = easeInOutSine(state.camT) * (cabinHeight() - 0.5) * H * 0.08;
  els.sun.style.transform = `translate(${f1(W * 0.76 - sunSize / 2)}px, ${f1(H * sunY - sunSize / 2 + shift)}px) rotate(${f1(state.time * 2)}deg)`;
  els.moon.style.transform = `translate(${f1(W * 0.2 - sunSize / 2)}px, ${f1(H * moonY - sunSize / 2 + shift)}px)`;
  els.stars.style.opacity = smoothstep(0.5, 0.68, p).toFixed(3);
  els.stars.style.transform = `translateY(${f1(shift * 0.5)}px)`;

  // Drift clouds
  const drift = CONFIG.CLOUD_SPEED * (REDUCED_MOTION ? 0.3 : 1) * dt;
  for (const c of clouds) {
    c.x += drift * c.speed;
    if (c.x > W + 40) c.x = -c.w - 40;
    c.el.style.transform = `translate3d(${f1(c.x)}px, ${f1(c.yFrac * H + shift)}px, 0)`;
  }
  els.clouds.style.opacity = (1 - nt * 0.45).toFixed(3);
}

/* ---- Wheel & cabins ---- */
const riderCabin = { x: WHEEL.cx, y: WHEEL.cy + WHEEL.r, sway: 0 };
/** 0 at the bottom of the wheel, 1 at the top. */
const cabinHeight = () => 0.5 - 0.5 * Math.cos(state.p * Math.PI * 2);

function updateWheel() {
  const angle = state.p * 360;
  els.wheelRot.setAttribute('transform', `rotate(${angle.toFixed(3)} ${WHEEL.cx} ${WHEEL.cy})`);
  const swayAmp = REDUCED_MOTION ? 0 : CONFIG.SWAY_DEG * (0.35 + 0.65 * state.speedNorm);
  cabins.forEach((c, k) => {
    const a = ((90 + angle + (k * 360) / CONFIG.CABIN_COUNT) * Math.PI) / 180;
    const x = WHEEL.cx + WHEEL.r * Math.cos(a), y = WHEEL.cy + WHEEL.r * Math.sin(a);
    const sway = swayAmp * Math.sin(state.time * 0.85 + c.phase);
    c.g.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${sway.toFixed(2)})`);
    if (c.isRider) { riderCabin.x = x; riderCabin.y = y; riderCabin.sway = sway; }
  });
}

/* ---- Camera ---- */
function sideViewBox() {
  // Keep the whole wheel visible whatever the screen shape.
  const a = W / H;
  let h = 1000;
  if (h * a < 780) h = 780 / a;
  return { x: WHEEL.cx - (h * a) / 2, y: 1000 - h, w: h * a, h };
}
function fpViewBox() {
  // Looking out of the cabin: the city drops away as we rise (with gentle parallax).
  const a = W / H;
  let h = 640;
  if (h * a < 420) h = 420 / a;
  const cy = 0.45 * (riderCabin.y + RIDER_CABIN_CENTER) + 0.55 * 700;
  const cx = WHEEL.cx + 0.35 * (riderCabin.x - WHEEL.cx);
  return { x: cx - (h * a) / 2, y: cy - h / 2, w: h * a, h };
}

let lastVB = '';
function updateCamera(dt) {
  const target = state.camMode === 'fp' ? 1 : 0;
  const step = (dt * 1000) / (REDUCED_MOTION ? 350 : CONFIG.CAMERA_TRANSITION_MS);
  state.camT = target > state.camT ? Math.min(target, state.camT + step) : Math.max(target, state.camT - step);
  const e = easeInOutSine(state.camT);

  const A = sideViewBox();
  const B = e > 0 ? fpViewBox() : A;
  const vb = [lerp(A.x, B.x, e), lerp(A.y, B.y, e), lerp(A.w, B.w, e), lerp(A.h, B.h, e)].map((v) => v.toFixed(2)).join(' ');
  if (vb !== lastVB) { els.scene.setAttribute('viewBox', vb); lastVB = vb; }

  els.wheelLayer.style.opacity = (1 - smoothstep(0, 0.55, e)).toFixed(3);
  els.frame.style.opacity = smoothstep(0.35, 1, e).toFixed(3);
  // In first person the whole world tilts gently with the cabin's sway.
  els.stage.style.transform = e > 0.001 ? `rotate(${f1(-riderCabin.sway * 0.5 * e)}deg) scale(${(1 + 0.05 * e).toFixed(4)})` : '';
}

/* ---- Riders overlay (avatars follow the cabin, or sit on the seat in first person) ---- */
function updateRiders() {
  const e = easeInOutSine(state.camT);
  const ctm = els.scene.getScreenCTM();
  if (!ctm) return;
  const lx = riderCabin.x - Math.sin((riderCabin.sway * Math.PI) / 180) * RIDER_CABIN_CENTER;
  const ly = riderCabin.y + Math.cos((riderCabin.sway * Math.PI) / 180) * RIDER_CABIN_CENTER;
  const sx = ctm.a * lx + ctm.c * ly + ctm.e, sy = ctm.b * lx + ctm.d * ly + ctm.f;
  const scale = Math.hypot(ctm.a, ctm.b);   // screen px per scene unit
  const fx = W / 2, fy = H - frameGeom.mb * 0.62;
  const x = lerp(sx, fx, e), y = lerp(sy, fy, e);
  const av = lerp(clamp(scale * 26, 15, 38), clamp(Math.min(W, H) * 0.12, 52, 90), e);
  els.riders.style.transform = `translate(${f1(x)}px, ${f1(y)}px)`;
  els.riders.style.setProperty('--av', f1(av) + 'px');
  els.riders.style.setProperty('--name-size', f1(lerp(clamp(scale * 15, 12, 16), 20, e)) + 'px');
}

/* ---- Fireflies: slow random wander, only computed while visible ---- */
function updateFireflies(dt) {
  const vis = smoothstep(0.54, 0.7, state.p);
  els.fireflies.style.opacity = vis.toFixed(3);
  if (vis <= 0.001) return;
  if (REDUCED_MOTION) dt *= 0.15;
  const top = H * 0.12, bottom = H * 0.97;
  for (const f of fireflies) {
    f.turn += (Math.random() - 0.5) * dt * 3;
    f.turn *= 0.97;
    f.heading += f.turn * dt;
    // steer gently back when drifting off-screen
    if (f.x < 0 || f.x > W || f.y < top || f.y > bottom) {
      const toC = Math.atan2(H * 0.6 - f.y, W / 2 - f.x);
      f.heading += Math.sin(toC - f.heading) * dt * 1.5;
    }
    f.x += Math.cos(f.heading) * f.speed * dt;
    f.y += Math.sin(f.heading) * f.speed * dt;
    f.el.style.transform = `translate3d(${f1(f.x)}px, ${f1(f.y)}px, 0)`;
  }
}

/* ---- City life: a few windows switch on/off at night ---- */
let windowTimer = 0;
function updateWindows(dt) {
  windowTimer += dt;
  if (windowTimer < 1.6 || night() < 0.5 || !midWindows.length) return;
  windowTimer = 0;
  for (let i = 0; i < 3; i++) midWindows[Math.floor(Math.random() * midWindows.length)].classList.toggle('lit');
}

/* ---- Sound ----------------------------------------------------------------
   Layered loops whose volumes follow the ride. Files are optional: if one is
   missing the rest still play. Over http(s) we route through Web Audio gain
   nodes (iOS ignores <audio>.volume); from file:// we fall back to .volume. */
const Sound = {
  tracks: {},
  ctx: null,
  init() {
    for (const [name, src] of Object.entries(CONFIG.SOUND_FILES)) {
      const el = new Audio(src);
      el.loop = true; el.preload = 'auto'; el.volume = 0;
      el.addEventListener('error', () => { this.tracks[name].missing = true; });
      this.tracks[name] = { el, vol: 0, gain: null, missing: false };
    }
  },
  ensureGraph() {
    if (this.ctx || !/^https?:/.test(location.protocol) || !window.AudioContext) return;
    try {
      this.ctx = new AudioContext();
      for (const t of Object.values(this.tracks)) {
        const src = this.ctx.createMediaElementSource(t.el);
        t.gain = this.ctx.createGain();
        t.gain.gain.value = 0;
        src.connect(t.gain).connect(this.ctx.destination);
        t.el.volume = 1;
      }
    } catch (err) { this.ctx = null; }
  },
  setEnabled(on) {
    if (on) {
      this.ensureGraph();
      this.ctx?.resume();
      for (const t of Object.values(this.tracks)) if (!t.missing) t.el.play().catch(() => {});
    } else {
      for (const t of Object.values(this.tracks)) t.el.pause();
    }
  },
  /** Called every frame: crossfade fair music → crickets, creak follows wheel speed. */
  mix() {
    if (!state.soundOn) return;
    const L = CONFIG.SOUND_LEVELS, p = state.p;
    const riding = ['up', 'down'].includes(state.phase);
    const target = {
      wind: L.wind,
      creak: riding ? L.creak * (0.3 + 0.7 * state.speedNorm) : 0,
      fair: L.fair * (1 - smoothstep(0.42, 0.62, p)),
      crickets: L.crickets * smoothstep(0.5, 0.7, p),
    };
    for (const [name, t] of Object.entries(this.tracks)) {
      t.vol += (target[name] - t.vol) * 0.04; // smooth fades
      if (t.gain) t.gain.gain.value = t.vol; else t.el.volume = clamp(t.vol, 0, 1);
    }
  },
};

/* ==========================================================================
   7. QUESTION CARD
   ========================================================================== */
function showQuestion() {
  state.questionShown = true;
  const card = $('.q-card');
  $('#q-text').textContent = state.question;
  $$('.answer-card').forEach((ac) => {
    const r = Number(ac.dataset.rider);
    ac.classList.remove('flipped');
    $$('.ac-name', ac).forEach((n) => { n.textContent = state.names[r]; });
    const form = $('.ac-front', ac), ta = $('textarea', form);
    form.classList.remove('sealed');
    ta.value = '';
    ta.disabled = !LOCAL_RIDERS.includes(r);
    $('.ac-sealed', form).textContent = '✉︎ sealed — waiting for ' + state.names[1 - r] + '…';
    $('.ac-answer', ac).textContent = '';
  });
  $('#btn-continue').hidden = true;
  card.classList.remove('closing');
  $('#question').hidden = false;
  void card.offsetWidth; // restart animation
  card.classList.add('open');
  // Focus the first answer box on larger screens (avoid popping the keyboard on phones).
  if (matchMedia('(min-width: 700px)').matches) setTimeout(() => $('.answer-card textarea')?.focus(), 1400);
}

function onAnswerSubmit(ev) {
  ev.preventDefault();
  const form = ev.currentTarget;
  const rider = Number(form.closest('.answer-card').dataset.rider);
  const text = $('textarea', form).value.trim();
  if (!text) { $('textarea', form).focus(); return; }
  room.submitAnswer(rider, text);
}

room.on('answer', ({ rider, text }) => {
  if (state.phase !== 'top' || state.answers[rider] !== null) return;
  state.answers[rider] = text;
  const ac = $(`.answer-card[data-rider="${rider}"]`);
  $('.ac-front', ac).classList.add('sealed');
  $('.ac-answer', ac).textContent = text;
  // Move focus to the other rider's box if it's still open.
  const other = $(`.answer-card[data-rider="${1 - rider}"] textarea`);
  if (state.answers[1 - rider] === null && other && !other.disabled) other.focus({ preventScroll: true });

  if (state.answers.every((a) => a !== null)) {
    // Both in: flip both cards at the same moment.
    setTimeout(() => $$('.answer-card').forEach((c) => c.classList.add('flipped')), 600);
    setTimeout(() => { $('#btn-continue').hidden = false; }, 1600);
    clearTimeout(state.revealTimer);
    state.revealTimer = setTimeout(() => room.continueRide(), (CONFIG.REVEAL_HOLD_SEC + 1.6) * 1000);
  }
});

room.on('continue', () => {
  if (state.phase !== 'top') return;
  clearTimeout(state.revealTimer);
  const card = $('.q-card');
  card.classList.remove('open');
  card.classList.add('closing');
  setTimeout(() => { $('#question').hidden = true; card.classList.remove('closing'); }, 1100);
  enterPhase('down');
});

/* ==========================================================================
   8. REACTIONS
   ========================================================================== */
function buildReactionMenus() {
  $$('#controls .ctrl[data-rider]').forEach((ctrl) => {
    const rider = Number(ctrl.dataset.rider);
    const row = $('.emoji-row', ctrl), btn = $('.react-btn', ctrl);
    if (!LOCAL_RIDERS.includes(rider)) { ctrl.hidden = true; return; }
    CONFIG.EMOJIS.forEach((emoji, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = emoji;
      b.setAttribute('role', 'menuitem');
      b.setAttribute('aria-label', `${emoji} (key ${rider === 0 ? i + 1 : (i + 6) % 10})`);
      b.addEventListener('click', () => { room.sendReaction(rider, emoji); closeMenus(); });
      row.appendChild(b);
    });
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const open = row.hidden;
      closeMenus();
      row.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
    });
  });
  document.addEventListener('click', (ev) => { if (!ev.target.closest('.ctrl')) closeMenus(); });
}
function closeMenus() {
  $$('.emoji-row').forEach((r) => { r.hidden = true; });
  $$('.react-btn').forEach((b) => b.setAttribute('aria-expanded', 'false'));
}

room.on('reaction', ({ rider, emoji }) => {
  const riderEl = $(`.rider[data-rider="${rider}"]`);
  const rect = $('.avatar', riderEl).getBoundingClientRect();
  const fl = document.createElement('span');
  fl.className = 'floater';
  fl.textContent = emoji;
  const big = state.camT > 0.5;
  fl.style.left = rect.left + rect.width / 2 + 'px';
  fl.style.top = rect.top + 'px';
  fl.style.setProperty('--dx', ((rider === 0 ? -1 : 1) * (10 + Math.random() * 30)).toFixed(0) + 'px');
  fl.style.setProperty('--fs', (big ? 38 : 28) + 'px');
  fl.addEventListener('animationend', () => fl.remove());
  els.floaters.appendChild(fl);
  if (els.floaters.childElementCount > 40) els.floaters.firstElementChild.remove();
  riderEl.classList.remove('pop');
  void riderEl.offsetWidth;
  riderEl.classList.add('pop');
});

function onKeyDown(ev) {
  if (ev.key === 'Escape') closeMenus();
  if (ev.target.matches('input, textarea') || ev.metaKey || ev.ctrlKey || ev.altKey) return;
  if (!['up', 'top', 'down', 'landed'].includes(state.phase)) return;
  const hit = CONFIG.KEYMAP[ev.key];
  if (hit && LOCAL_RIDERS.includes(hit[0])) room.sendReaction(hit[0], CONFIG.EMOJIS[hit[1]]);
}

/* ==========================================================================
   9. START / END SCREENS
   ========================================================================== */
function updateBoardButton() {
  els.board.disabled = !($('#name-0').value.trim() && $('#name-1').value.trim());
}

function onBoard(ev) {
  ev.preventDefault();
  const names = [$('#name-0').value.trim(), $('#name-1').value.trim()];
  if (!names[0] || !names[1]) return;
  room.start(names);
}

room.on('start', ({ names, question }) => {
  state.names = names;
  state.question = question;
  state.answers = [null, null];
  state.questionShown = false;
  state.p = 0;
  lastPaletteP = -1;
  $$('.rider').forEach((r) => { $('.rider-name', r).textContent = names[Number(r.dataset.rider)]; });
  const start = $('#start');
  start.classList.add('leaving');
  setTimeout(() => { start.hidden = true; start.classList.remove('leaving'); }, 800);
  enterPhase('up');
});

function showEnd() {
  enterPhase('end');
  closeMenus();
  const [n0, n1] = state.names;
  $('#pc-n0').textContent = n0;
  $('#pc-n1').textContent = n1;
  $('#pc-an0').textContent = n0 + ':';
  $('#pc-an1').textContent = n1 + ':';
  $('#pc-date').textContent = new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
  $('#pc-q').textContent = state.question;
  $('#pc-a0').textContent = state.answers[0] ?? '—';
  $('#pc-a1').textContent = state.answers[1] ?? '—';
  $('#end').hidden = false;
}

async function downloadPostcard() {
  const btn = $('#btn-download');
  if (!window.html2canvas) { btn.textContent = 'Needs an internet connection'; return; }
  const wrap = $('.postcard-wrap');
  btn.disabled = true;
  wrap.classList.add('capturing'); // remove the tilt while capturing
  try {
    const canvas = await html2canvas($('#postcard'), { scale: 2, backgroundColor: null, logging: false });
    const a = document.createElement('a');
    const slug = state.names.join('-').toLowerCase().replace(/[^a-z0-9-]+/g, '') || 'ride';
    a.download = `ferris-wheel-${slug}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  } catch (err) {
    console.error(err);
  } finally {
    wrap.classList.remove('capturing');
    btn.disabled = false;
  }
}

function rideAgain() {
  $('#end').hidden = true;
  enterPhase('idle');
  state.p = 0;
  lastPaletteP = -1;
  $('#start').hidden = false;
  updateBoardButton();
  $('#btn-board').focus();
}

/* ==========================================================================
   10. WIRING & MAIN LOOP
   ========================================================================== */
function onResize() {
  W = innerWidth; H = innerHeight;
  buildFrame();
  lastVB = '';
}

let lastTime = performance.now();
function frame(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;
  state.time += dt;

  updateRide(dt);
  updateColours();
  updateWheel();
  updateCamera(dt);
  updateSky(dt);
  updateRiders();
  updateFireflies(dt);
  updateWindows(dt);
  Sound.mix();

  requestAnimationFrame(frame);
}

function init() {
  Object.assign(els, {
    app: $('#app'), stage: $('#stage'), scene: $('#scene'), wheelLayer: $('#wheel-layer'),
    sun: $('#sun'), moon: $('#moon'), stars: $('#stars'), clouds: $('#clouds'),
    fireflies: $('#fireflies'), frame: $('#window-frame'), riders: $('#riders'),
    floaters: $('#floaters'), board: $('#btn-board'),
  });

  buildFarAndMidCity();
  buildForeground();
  buildWheel();
  buildCabins();
  buildSunMoon();
  buildClouds();
  buildStars();
  buildFireflies();
  buildFrame();
  buildPostcardScene();
  buildReactionMenus();
  Sound.init();

  // Start screen
  $('#name-0').addEventListener('input', updateBoardButton);
  $('#name-1').addEventListener('input', updateBoardButton);
  $('#start-form').addEventListener('submit', onBoard);

  // Question card
  $$('.ac-front').forEach((f) => {
    f.addEventListener('submit', onAnswerSubmit);
    // Enter sends, Shift+Enter makes a new line.
    $('textarea', f).addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); f.requestSubmit(); }
    });
  });
  $('#btn-continue').addEventListener('click', () => room.continueRide());

  // Corner controls
  $('#btn-camera').addEventListener('click', (ev) => {
    state.camMode = state.camMode === 'side' ? 'fp' : 'side';
    els.app.dataset.cam = state.camMode;
    ev.currentTarget.setAttribute('aria-pressed', String(state.camMode === 'fp'));
  });
  $('#btn-sound').addEventListener('click', (ev) => {
    state.soundOn = !state.soundOn;
    ev.currentTarget.setAttribute('aria-pressed', String(state.soundOn));
    Sound.setEnabled(state.soundOn);
  });

  // End screen
  $('#btn-download').addEventListener('click', downloadPostcard);
  $('#btn-again').addEventListener('click', rideAgain);

  document.addEventListener('keydown', onKeyDown);
  addEventListener('resize', onResize);

  updateColours(true);
  requestAnimationFrame((t) => { lastTime = t; frame(t); });
  $('#name-0').focus();
}

init();
