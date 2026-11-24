import React, { useEffect, useRef, useImperativeHandle, forwardRef } from "react";

export type BrushPreset = "dry-brush" | "sumi" | "neon";
export type BrushMode = "one-stroke" | "classic";

export interface KeyCatBrushProps {
  /** "one-stroke" (default, continuous fine brush, T horizontal-first) | "classic" (8-stroke) */
  mode?: BrushMode;
  /** Brush ink hex color (default: "#c0241c") */
  color?: string;
  /** Solid background color or "transparent" (default: "#ffffff") */
  bg?: string;
  /** Brush style preset (default: "dry-brush") */
  preset?: BrushPreset;
  /** Writing duration in seconds (default: 3.4) */
  duration?: number;
  /** Initial delay before writing starts, in seconds (default: 0.25) */
  delay?: number;
  /** Hold duration before looping, in seconds (default: 1.8) */
  hold?: number;
  /** Loop continuously with smooth fade-out */
  loop?: boolean;
  /** Play automatically on mount (default: true) */
  autoplay?: boolean;
  /** Click canvas to replay (default: true) */
  interactive?: boolean;
  /** Brush thickness multiplier 0.4..1.8 (default: 1.0) */
  thickness?: number;
  /** Dry-brush 飞白 intensity 0..1 (default: 0.48) */
  dryness?: number;
  /** Add subtle organic ink micro-droplets on fast flicks */
  splatter?: boolean;
  /** Deterministic seed for bristle pattern (default: 42) */
  seed?: number;
  /** Optional controlled progress 0..1 */
  progress?: number;
  onStart?: () => void;
  onComplete?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export interface KeyCatBrushHandle {
  play: () => void;
  pause: () => void;
  replay: () => void;
  seek: (progress: number) => void;
  toDataURL: (type?: string) => string;
}

const VIEW_W = 1024;
const VIEW_H = 576;

const ONE_STROKE_CHAIN = [
  { seg: [[324, 206], [308, 246], [286, 298], [260, 366]], p: [0.85, 1.0, 0.42] },
  { seg: [[260, 366], [286, 316], [344, 256], [402, 210]], p: [0.24, 0.20, 0.34] },
  { seg: [[402, 210], [374, 240], [338, 268], [296, 286]], p: [0.42, 0.88, 0.96] },
  { seg: [[296, 286], [322, 310], [352, 330], [376, 334]], p: [0.96, 0.84, 0.44] },
  { seg: [[376, 334], [386, 332], [386, 312], [398, 300]], p: [0.36, 0.28, 0.56] },
  { seg: [[398, 300], [416, 292], [430, 280], [424, 270]], p: [0.56, 0.68, 0.62] },
  { seg: [[424, 270], [414, 262], [394, 274], [386, 298]], p: [0.62, 0.84, 0.96] },
  { seg: [[386, 298], [380, 318], [392, 330], [412, 324]], p: [0.96, 0.86, 0.62] },
  { seg: [[412, 324], [434, 316], [450, 292], [462, 274]], p: [0.54, 0.30, 0.68] },
  { seg: [[462, 274], [454, 296], [446, 316], [456, 322]], p: [0.74, 0.92, 0.72] },
  { seg: [[456, 322], [468, 324], [486, 296], [504, 270]], p: [0.64, 0.42, 0.76] },
  { seg: [[504, 270], [492, 304], [472, 354], [446, 384]], p: [0.88, 0.96, 0.78] },
  { seg: [[446, 384], [428, 402], [408, 408], [396, 398]], p: [0.74, 0.52, 0.30] },
  { seg: [[396, 398], [392, 386], [424, 378], [466, 344]], p: [0.24, 0.20, 0.24] },
  { seg: [[466, 344], [502, 312], [534, 258], [574, 224]], p: [0.24, 0.22, 0.32] },
  { seg: [[574, 224], [602, 206], [628, 212], [622, 242]], p: [0.34, 0.52, 0.44] },
  { seg: [[622, 242], [634, 218], [616, 208], [588, 216]], p: [0.46, 0.76, 0.92] },
  { seg: [[588, 216], [556, 228], [532, 260], [522, 296]], p: [0.92, 1.0, 1.0] },
  { seg: [[522, 296], [514, 330], [532, 348], [564, 344]], p: [1.0, 0.92, 0.74] },
  { seg: [[564, 344], [596, 338], [630, 304], [664, 280]], p: [0.64, 0.34, 0.52] },
  { seg: [[664, 280], [656, 270], [636, 278], [626, 302]], p: [0.56, 0.82, 0.94] },
  { seg: [[626, 302], [618, 320], [630, 330], [648, 318]], p: [0.94, 0.82, 0.58] },
  { seg: [[648, 318], [660, 308], [668, 292], [672, 280]], p: [0.52, 0.38, 0.68] },
  { seg: [[672, 280], [666, 302], [664, 322], [678, 322]], p: [0.78, 0.92, 0.66] },
  { seg: [[678, 322], [692, 318], [682, 284], [688, 268]], p: [0.50, 0.26, 0.72] },
  // T: horizontal bar FIRST, then whip-loop to top, then vertical stem SECOND
  { seg: [[688, 268], [722, 262], [756, 252], [782, 234]], p: [0.86, 0.94, 0.52] },
  { seg: [[782, 234], [776, 222], [752, 218], [738, 232]], p: [0.36, 0.22, 0.74] },
  { seg: [[738, 232], [726, 266], [708, 316], [686, 372]], p: [0.94, 0.96, 0.08] },
];

const CLASSIC_STROKES = [
  {
    id: "K_stem",
    maxHalfW: 16.5,
    start: 0.0,
    end: 0.10,
    nibAngle: -0.35,
    segments: [
      [[326, 204], [311, 238], [294, 276], [278, 314]],
      [[278, 314], [270, 336], [262, 354], [255, 372]],
    ],
    pressure: [[0.0, 0.70], [0.07, 1.0], [0.46, 0.88], [0.78, 0.58], [0.94, 0.24], [1.0, 0.06]],
  },
  {
    id: "K_arms",
    maxHalfW: 14.5,
    start: 0.118,
    end: 0.245,
    nibAngle: -0.55,
    segments: [
      [[406, 208], [382, 240], [344, 270], [295, 287]],
      [[295, 287], [324, 312], [360, 336], [398, 349]],
    ],
    pressure: [[0.0, 0.12], [0.16, 0.54], [0.47, 0.96], [0.54, 1.0], [0.76, 0.64], [0.93, 0.24], [1.0, 0.05]],
  },
  {
    id: "e",
    maxHalfW: 10.5,
    start: 0.262,
    end: 0.382,
    nibAngle: -0.45,
    segments: [
      [[388, 304], [406, 298], [426, 286], [424, 275]],
      [[424, 275], [422, 265], [402, 271], [390, 293]],
      [[390, 293], [380, 313], [386, 328], [404, 326]],
      [[404, 326], [422, 324], [438, 310], [450, 296]],
    ],
    pressure: [[0.0, 0.34], [0.22, 0.72], [0.46, 0.95], [0.68, 0.88], [0.88, 0.44], [1.0, 0.10]],
  },
  {
    id: "y",
    maxHalfW: 12.8,
    start: 0.394,
    end: 0.550,
    nibAngle: -0.40,
    segments: [
      [[464, 272], [456, 292], [448, 312], [454, 319]],
      [[454, 319], [464, 324], [484, 300], [506, 268]],
      [[506, 268], [496, 300], [476, 352], [452, 382]],
      [[452, 382], [434, 402], [412, 408], [390, 400]],
    ],
    pressure: [[0.0, 0.76], [0.16, 0.86], [0.34, 0.54], [0.47, 0.98], [0.68, 0.82], [0.85, 0.52], [0.96, 0.22], [1.0, 0.05]],
  },
  {
    id: "C",
    maxHalfW: 15.5,
    start: 0.570,
    end: 0.714,
    nibAngle: -0.35,
    segments: [
      [[618, 256], [632, 236], [632, 216], [608, 214]],
      [[608, 214], [576, 214], [542, 244], [526, 284]],
      [[526, 284], [512, 320], [524, 348], [558, 346]],
      [[558, 346], [586, 344], [610, 320], [630, 294]],
    ],
    pressure: [[0.0, 0.16], [0.14, 0.66], [0.32, 0.92], [0.55, 1.0], [0.75, 0.88], [0.90, 0.44], [1.0, 0.08]],
  },
  {
    id: "a",
    maxHalfW: 10.2,
    start: 0.728,
    end: 0.846,
    nibAngle: -0.45,
    segments: [
      [[668, 284], [664, 270], [644, 276], [632, 296]],
      [[632, 296], [620, 314], [626, 328], [642, 320]],
      [[642, 320], [654, 312], [666, 296], [672, 282]],
      [[672, 282], [664, 304], [664, 322], [680, 320]],
      [[680, 320], [692, 318], [702, 310], [710, 302]],
    ],
    pressure: [[0.0, 0.54], [0.22, 0.92], [0.45, 0.58], [0.64, 0.82], [0.82, 0.86], [0.94, 0.42], [1.0, 0.10]],
  },
  {
    id: "t_bar",
    maxHalfW: 11.2,
    start: 0.860,
    end: 0.922,
    nibAngle: -0.15,
    segments: [[[686, 270], [718, 265], [754, 255], [780, 236]]],
    pressure: [[0.0, 0.82], [0.15, 0.96], [0.55, 0.70], [0.82, 0.38], [0.95, 0.16], [1.0, 0.04]],
  },
  {
    id: "t_stem",
    maxHalfW: 13.0,
    start: 0.935,
    end: 1.0,
    nibAngle: -0.35,
    segments: [[[738, 230], [726, 264], [708, 312], [686, 370]]],
    pressure: [[0.0, 0.72], [0.12, 0.98], [0.56, 0.84], [0.84, 0.44], [1.0, 0.06]],
  },
];

interface Sample {
  x: number;
  y: number;
  s: number;
  dist: number;
  nx: number;
  ny: number;
  pressure: number;
}

interface StrokeTrack {
  id: string;
  maxHalfW: number;
  start: number;
  end: number;
  samples: Sample[];
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash1(i: number, seed: number) {
  let n = Math.imul(i ^ seed, 374761393);
  n = (n ^ (n >>> 13)) * 1274126177;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function noise1D(x: number, seed: number) {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return hash1(i, seed) * (1 - u) + hash1(i + 1, seed) * u;
}

function fbm1D(x: number, seed: number) {
  return 0.62 * noise1D(x, seed) + 0.38 * noise1D(x * 2.3 + 17.1, seed + 101);
}

function appleEase(u: number) {
  const c = Math.max(0, Math.min(1, u));
  return 0.5 * (1 - Math.cos(Math.PI * Math.pow(c, 0.94)));
}

function evalPressure(profile: number[][], s: number) {
  if (s <= profile[0][0]) return profile[0][1];
  const last = profile[profile.length - 1];
  if (s >= last[0]) return last[1];
  for (let i = 0; i < profile.length - 1; i++) {
    const [s0, p0] = profile[i];
    const [s1, p1] = profile[i + 1];
    if (s >= s0 && s <= s1) {
      const u = (s - s0) / (s1 - s0);
      const sm = u * u * (3 - 2 * u);
      return p0 + (p1 - p0) * sm;
    }
  }
  return last[1];
}

function parseHexColor(hex: string): [number, number, number] {
  const clean = (hex || "#c0241c").replace("#", "").trim();
  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16),
      parseInt(clean[1] + clean[1], 16),
      parseInt(clean[2] + clean[2], 16),
    ];
  }
  if (clean.length === 6) {
    return [
      parseInt(clean.slice(0, 2), 16),
      parseInt(clean.slice(2, 4), 16),
      parseInt(clean.slice(4, 6), 16),
    ];
  }
  return [192, 36, 28];
}

function shadeRgb(rgb: [number, number, number], factor: number): [number, number, number] {
  return [
    Math.max(0, Math.min(255, Math.round(rgb[0] * factor))),
    Math.max(0, Math.min(255, Math.round(rgb[1] * factor))),
    Math.max(0, Math.min(255, Math.round(rgb[2] * factor))),
  ];
}

function buildOneStroke(): StrokeTrack[] {
  const raw: [number, number, number][] = [];
  const steps = 64;
  for (const item of ONE_STROKE_CHAIN) {
    const [p0, p1, p2, p3] = item.seg;
    const [pr0, prM, pr1] = item.p;
    for (let i = 0; i <= steps; i++) {
      if (raw.length > 0 && i === 0) continue;
      const t = i / steps;
      const mt = 1 - t;
      raw.push([
        mt ** 3 * p0[0] + 3 * mt ** 2 * t * p1[0] + 3 * mt * t ** 2 * p2[0] + t ** 3 * p3[0],
        mt ** 3 * p0[1] + 3 * mt ** 2 * t * p1[1] + 3 * mt * t ** 2 * p2[1] + t ** 3 * p3[1],
        mt * mt * pr0 + 2 * mt * t * prM + t * t * pr1,
      ]);
    }
  }
  const cum = [0];
  for (let i = 1; i < raw.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]));
  }
  const totalLen = cum[cum.length - 1] || 1;
  const count = Math.max(400, Math.ceil(totalLen / 1.5));
  const samples: Sample[] = [];
  let j = 0;
  for (let k = 0; k <= count; k++) {
    const target = (k / count) * totalLen;
    while (j < cum.length - 2 && cum[j + 1] < target) j++;
    const segLen = cum[j + 1] - cum[j] || 1;
    const frac = Math.max(0, Math.min(1, (target - cum[j]) / segLen));
    samples.push({
      x: raw[j][0] + (raw[j + 1][0] - raw[j][0]) * frac,
      y: raw[j][1] + (raw[j + 1][1] - raw[j][1]) * frac,
      pressure: raw[j][2] + (raw[j + 1][2] - raw[j][2]) * frac,
      s: k / count,
      dist: target,
      nx: 0,
      ny: 1,
    });
  }
  const smP = samples.map((_, i) => {
    let sum = 0;
    let wSum = 0;
    for (let d = -4; d <= 4; d++) {
      const idx = Math.max(0, Math.min(samples.length - 1, i + d));
      const w = 5 - Math.abs(d);
      sum += samples[idx].pressure * w;
      wSum += w;
    }
    return sum / wSum;
  });
  const nibNx = Math.cos(-0.42);
  const nibNy = Math.sin(-0.42);
  for (let k = 0; k < samples.length; k++) {
    const prev = samples[Math.max(0, k - 2)];
    const next = samples[Math.min(samples.length - 1, k + 2)];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    const bx = (-dy / len) * 0.72 + nibNx * 0.28;
    const by = (dx / len) * 0.72 + nibNy * 0.28;
    const blen = Math.hypot(bx, by) || 1;
    samples[k].nx = bx / blen;
    samples[k].ny = by / blen;
    samples[k].pressure = smP[k];
  }
  return [{ id: "one_stroke", maxHalfW: 9.2, start: 0, end: 1, samples }];
}

function buildClassic(): StrokeTrack[] {
  return CLASSIC_STROKES.map((stroke) => {
    const raw: [number, number][] = [];
    const steps = 90;
    for (const seg of stroke.segments) {
      const [p0, p1, p2, p3] = seg;
      for (let i = 0; i <= steps; i++) {
        if (raw.length > 0 && i === 0) continue;
        const t = i / steps;
        const mt = 1 - t;
        raw.push([
          mt ** 3 * p0[0] + 3 * mt ** 2 * t * p1[0] + 3 * mt * t ** 2 * p2[0] + t ** 3 * p3[0],
          mt ** 3 * p0[1] + 3 * mt ** 2 * t * p1[1] + 3 * mt * t ** 2 * p2[1] + t ** 3 * p3[1],
        ]);
      }
    }
    const cum = [0];
    for (let i = 1; i < raw.length; i++) {
      cum.push(cum[i - 1] + Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]));
    }
    const totalLen = cum[cum.length - 1] || 1;
    const count = Math.max(24, Math.ceil(totalLen / 1.6));
    const samples: Sample[] = [];
    let j = 0;
    for (let k = 0; k <= count; k++) {
      const target = (k / count) * totalLen;
      while (j < cum.length - 2 && cum[j + 1] < target) j++;
      const segLen = cum[j + 1] - cum[j] || 1;
      const frac = Math.max(0, Math.min(1, (target - cum[j]) / segLen));
      samples.push({
        x: raw[j][0] + (raw[j + 1][0] - raw[j][0]) * frac,
        y: raw[j][1] + (raw[j + 1][1] - raw[j][1]) * frac,
        s: k / count,
        dist: target,
        nx: 0,
        ny: 1,
        pressure: evalPressure(stroke.pressure, k / count),
      });
    }
    const nibNx = Math.cos(stroke.nibAngle);
    const nibNy = Math.sin(stroke.nibAngle);
    for (let k = 0; k < samples.length; k++) {
      const prev = samples[Math.max(0, k - 2)];
      const next = samples[Math.min(samples.length - 1, k + 2)];
      const dx = next.x - prev.x;
      const dy = next.y - prev.y;
      const len = Math.hypot(dx, dy) || 1;
      const bx = (-dy / len) * 0.78 + nibNx * 0.22;
      const by = (dx / len) * 0.78 + nibNy * 0.22;
      const blen = Math.hypot(bx, by) || 1;
      samples[k].nx = bx / blen;
      samples[k].ny = by / blen;
    }
    return { id: stroke.id, maxHalfW: stroke.maxHalfW, start: stroke.start, end: stroke.end, samples };
  });
}

const CACHE_ONE_STROKE = buildOneStroke();
const CACHE_CLASSIC = buildClassic();

function buildBristles(seed: number, strokeIdx: number, preset: BrushPreset, isOneStroke: boolean) {
  const rng = mulberry32(seed * 7919 + strokeIdx * 104729 + 13);
  const count = isOneStroke ? 34 : preset === "sumi" ? 52 : 44;
  const widthScale = isOneStroke ? 0.78 : 1.0;
  return Array.from({ length: count }, (_, i) => {
    const lin = (i / (count - 1)) * 2 - 1;
    const u = Math.max(-1.08, Math.min(1.08, lin + (rng() - 0.5) * 0.14));
    const absU = Math.abs(u);
    const isStray = absU > 0.80;
    return {
      u,
      absU,
      baseWidth: (isStray ? 0.45 + rng() * 0.55 : 1.35 - absU * 0.65 + rng() * 0.65) * widthScale,
      inkLoad: 1.04 - absU * 0.50 + (rng() - 0.5) * 0.20,
      freq: 0.022 + rng() * 0.042,
      phase: rng() * 100,
      wanderAmp: (0.28 + absU * 1.0) * widthScale,
      wanderFreq: 0.015 + rng() * 0.02,
      shade: 0.84 + rng() * 0.26,
      noiseSeed: Math.floor(rng() * 100000),
    };
  });
}

export const KeyCatBrush = forwardRef<KeyCatBrushHandle, KeyCatBrushProps>(function KeyCatBrush(
  {
    mode = "one-stroke",
    color = "#c0241c",
    bg = "#ffffff",
    preset = "dry-brush",
    duration = 3.4,
    delay = 0.25,
    hold = 1.8,
    loop = false,
    autoplay = true,
    interactive = true,
    thickness = 1.0,
    dryness = 0.48,
    splatter = false,
    seed = 42,
    progress,
    onStart,
    onComplete,
    className,
    style,
  },
  ref
) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const inkRef = useRef<HTMLCanvasElement | null>(null);
  const strokes = mode === "classic" ? CACHE_CLASSIC : CACHE_ONE_STROKE;

  const stateRef = useRef({
    playing: false,
    raf: null as number | null,
    elapsed: 0,
    lastTs: 0,
    completed: false,
    fadeOpacity: 1,
    lastDrawnIdx: strokes.map(() => 0),
    bristles: strokes.map((_, i) => buildBristles(seed, i, preset, mode !== "classic")),
  });

  const resetInk = () => {
    const ink = inkRef.current;
    if (!ink) return;
    ink.getContext("2d")?.clearRect(0, 0, ink.width, ink.height);
    stateRef.current.lastDrawnIdx = strokes.map(() => 0);
  };

  const composite = () => {
    const canvas = canvasRef.current;
    const ink = inkRef.current;
    if (!canvas || !ink) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (bg && bg !== "transparent") {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.save();
    ctx.globalAlpha = stateRef.current.fadeOpacity;
    ctx.drawImage(ink, 0, 0);
    ctx.restore();
  };

  const drawStrokeRange = (strokeIdx: number, fromIdx: number, toIdx: number) => {
    const ink = inkRef.current;
    if (!ink || toIdx <= fromIdx) return;
    const ctx = ink.getContext("2d");
    if (!ctx) return;

    const stroke = strokes[strokeIdx];
    const samples = stroke.samples;
    const bristles = stateRef.current.bristles[strokeIdx];
    const rgb = parseHexColor(color);
    const effDry = preset === "sumi" ? dryness * 0.42 : dryness;

    ctx.save();
    ctx.scale(ink.width / VIEW_W, ink.height / VIEW_H);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (preset === "neon") {
      ctx.shadowColor = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.55)`;
      ctx.shadowBlur = 9;
    }

    for (let b = 0; b < bristles.length; b++) {
      const br = bristles[b];
      const col = shadeRgb(rgb, br.shade);
      const colStr = `${col[0]}, ${col[1]}, ${col[2]}`;
      for (let i = fromIdx; i < toIdx; i++) {
        const p0 = samples[i];
        const p1 = samples[i + 1];
        if (!p1) break;

        const isHairline = p0.pressure < 0.34;
        if (isHairline && br.absU > 0.55) continue;

        const nVal = fbm1D(p0.dist * br.freq + br.phase, br.noiseSeed);
        const dryThreshold = isHairline
          ? (1 - br.inkLoad) * 0.40 + effDry * 0.25 * br.absU
          : (1 - br.inkLoad) * 0.68 +
            effDry * (0.24 + 0.55 * br.absU) +
            (1 - p0.pressure) * (0.28 + 0.42 * br.absU);
        if (nVal < dryThreshold * 0.76) continue;

        const inkStrength = Math.max(0, Math.min(1, (nVal - dryThreshold * 0.58) / 0.36));
        const alpha = isHairline
          ? Math.min(0.82, 0.38 + 0.48 * inkStrength)
          : Math.min(0.96, (0.34 + 0.66 * inkStrength) * (0.48 + 0.52 * p0.pressure));
        if (alpha < 0.05) continue;

        const hw0 = stroke.maxHalfW * thickness * p0.pressure;
        const hw1 = stroke.maxHalfW * thickness * p1.pressure;
        const w0 = (noise1D(p0.dist * br.wanderFreq + br.phase, br.noiseSeed + 7) - 0.5) * br.wanderAmp * thickness;
        const w1 = (noise1D(p1.dist * br.wanderFreq + br.phase, br.noiseSeed + 7) - 0.5) * br.wanderAmp * thickness;

        ctx.strokeStyle = `rgba(${colStr}, ${alpha.toFixed(3)})`;
        ctx.lineWidth = Math.max(0.45, br.baseWidth * thickness * (0.50 + 0.56 * p0.pressure));
        ctx.beginPath();
        ctx.moveTo(p0.x + p0.nx * (br.u * hw0 + w0), p0.y + p0.ny * (br.u * hw0 + w0));
        ctx.lineTo(p1.x + p1.nx * (br.u * hw1 + w1), p1.y + p1.ny * (br.u * hw1 + w1));
        ctx.stroke();
      }
    }
    ctx.restore();
  };

  const drawUpTo = (normP: number) => {
    const p = Math.max(0, Math.min(1, normP));
    for (let i = 0; i < strokes.length; i++) {
      const st = strokes[i];
      const total = st.samples.length - 1;
      const target =
        p <= st.start
          ? 0
          : p >= st.end
          ? total
          : Math.round(appleEase((p - st.start) / (st.end - st.start)) * total);
      if (target > stateRef.current.lastDrawnIdx[i]) {
        drawStrokeRange(i, stateRef.current.lastDrawnIdx[i], target);
        stateRef.current.lastDrawnIdx[i] = target;
      }
    }
  };

  const pause = () => {
    const st = stateRef.current;
    st.playing = false;
    if (st.raf !== null) {
      cancelAnimationFrame(st.raf);
      st.raf = null;
    }
  };

  const play = () => {
    const st = stateRef.current;
    if (st.playing) return;
    st.playing = true;
    st.lastTs = performance.now();
    if (st.elapsed === 0) onStart?.();

    const tick = (now: number) => {
      if (!st.playing) return;
      const dt = Math.min(0.05, (now - st.lastTs) / 1000);
      st.lastTs = now;
      st.elapsed += dt;
      const fade = 0.45;

      if (st.elapsed < delay) {
        st.fadeOpacity = 1;
      } else if (st.elapsed <= delay + duration) {
        st.fadeOpacity = 1;
        drawUpTo((st.elapsed - delay) / duration);
      } else {
        drawUpTo(1);
        if (!st.completed) {
          st.completed = true;
          onComplete?.();
        }
        if (!loop) {
          composite();
          st.playing = false;
          st.raf = null;
          return;
        }
        const post = st.elapsed - (delay + duration);
        if (post < hold) {
          st.fadeOpacity = 1;
        } else if (post < hold + fade) {
          st.fadeOpacity = Math.max(0, 1 - Math.pow((post - hold) / fade, 1.4));
        } else {
          st.elapsed = 0;
          st.completed = false;
          st.fadeOpacity = 1;
          resetInk();
          onStart?.();
        }
      }
      composite();
      st.raf = requestAnimationFrame(tick);
    };
    st.raf = requestAnimationFrame(tick);
  };

  const replay = () => {
    pause();
    const st = stateRef.current;
    st.elapsed = 0;
    st.completed = false;
    st.fadeOpacity = 1;
    resetInk();
    composite();
    play();
  };

  const seek = (p: number) => {
    pause();
    const clamped = Math.max(0, Math.min(1, p));
    const st = stateRef.current;
    st.fadeOpacity = 1;
    st.elapsed = delay + clamped * duration;
    resetInk();
    drawUpTo(clamped);
    composite();
  };

  useImperativeHandle(ref, () => ({
    play,
    pause,
    replay,
    seek,
    toDataURL: (type = "image/png") => canvasRef.current?.toDataURL(type) || "",
  }));

  useEffect(() => {
    if (!inkRef.current) inkRef.current = document.createElement("canvas");
    stateRef.current.bristles = strokes.map((_, i) => buildBristles(seed, i, preset, mode !== "classic"));
    stateRef.current.lastDrawnIdx = strokes.map(() => 0);

    const resize = () => {
      const wrap = wrapRef.current;
      const canvas = canvasRef.current;
      const ink = inkRef.current;
      if (!wrap || !canvas || !ink) return;
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const w = Math.max(512, Math.round((rect.width || VIEW_W) * dpr));
      const h = Math.max(288, Math.round((rect.height || VIEW_H) * dpr));
      canvas.width = w;
      canvas.height = h;
      ink.width = w;
      ink.height = h;
      const curP =
        typeof progress === "number"
          ? progress
          : stateRef.current.elapsed <= delay
          ? 0
          : Math.min(1, (stateRef.current.elapsed - delay) / duration);
      resetInk();
      drawUpTo(curP);
      composite();
    };

    resize();
    const ro = new ResizeObserver(resize);
    if (wrapRef.current) ro.observe(wrapRef.current);

    if (typeof progress === "number") {
      seek(progress);
    } else if (autoplay) {
      replay();
    }

    return () => {
      pause();
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, color, bg, preset, duration, delay, hold, loop, autoplay, thickness, dryness, splatter, seed]);

  useEffect(() => {
    if (typeof progress === "number") seek(progress);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress]);

  return (
    <div
      ref={wrapRef}
      className={className}
      onClick={interactive ? replay : undefined}
      style={{
        width: "100%",
        aspectRatio: "16 / 9",
        position: "relative",
        cursor: interactive ? "pointer" : "default",
        userSelect: "none",
        overflow: "hidden",
        ...style,
      }}
    >
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
    </div>
  );
});

export default KeyCatBrush;
