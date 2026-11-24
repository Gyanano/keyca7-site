/**
 * <keycat-brush> — Pure HTML5 Canvas Procedural Dry-Brush Calligraphy Component.
 * Default mode: "one-stroke" — Single unbroken continuous fine-brush calligraphy
 * (Apple "hello" style, with final 't' drawn horizontal-first then vertical).
 *
 * Usage:
 *   <script src="./keycat-brush.js"></script>
 *   <keycat-brush autoplay loop mode="one-stroke" color="#c0241c" bg="#ffffff"></keycat-brush>
 *
 * Attributes:
 *   mode         - "one-stroke" (default, continuous fine brush) | "classic" (8-stroke bold)
 *   color        - Brush ink hex color (default: "#c0241c")
 *   bg           - Background color or "transparent" (default: "#ffffff")
 *   preset       - "dry-brush" | "sumi" | "neon" (default: "dry-brush")
 *   duration     - Writing duration in seconds (default: 3.4)
 *   delay        - Initial delay in seconds (default: 0.25)
 *   hold         - Hold time before looping in seconds (default: 1.8)
 *   loop         - Boolean: continuously replay with smooth fade-out
 *   autoplay     - Boolean (default: true; set autoplay="false" for manual control)
 *   interactive  - Boolean: click canvas to replay
 *   thickness    - Brush thickness multiplier 0.4..1.8 (default: 1.0)
 *   dryness      - Dry-brush 飞白 intensity 0..1 (default: 0.48)
 *   splatter     - Boolean: add subtle organic ink micro-droplets on fast flicks
 *   seed         - Integer seed for deterministic bristle pattern (default: 42)
 */

(function () {
  const VIEW_W = 1024;
  const VIEW_H = 576;

  // =========================================================================
  // MODE 1: ONE-STROKE CONTINUOUS FINE BRUSH ("一笔连写 · 细笔刷 · T先横后竖")
  // Every segment is chained seamlessly (each segment's start == previous end),
  // with per-segment start/end pressure [pStart, pMid, pEnd] so downstrokes are
  // crisp and expressive while connecting ligatures glide as airy hairlines.
  // =========================================================================
  const ONE_STROKE_CHAIN = [
    // --- K: vertical stem down ---
    { seg: [[324, 206], [308, 246], [286, 298], [260, 366]], p: [0.85, 1.0, 0.42] },
    // --- K: airy hairline sweep back up-right to upper arm tip ---
    { seg: [[260, 366], [286, 316], [344, 256], [402, 210]], p: [0.24, 0.20, 0.34] },
    // --- K: crisp upper arm down-left into junction ---
    { seg: [[402, 210], [374, 240], [338, 268], [296, 286]], p: [0.42, 0.88, 0.96] },
    // --- K: lower leg kick down-right, flowing into 'e' ---
    { seg: [[296, 286], [322, 310], [352, 330], [376, 334]], p: [0.96, 0.84, 0.44] },
    // --- Ligature K -> e crossbar ---
    { seg: [[376, 334], [386, 332], [386, 312], [398, 300]], p: [0.36, 0.28, 0.56] },

    // --- e: crossbar up-right -> top loop -> down belly -> bottom -> exit ---
    { seg: [[398, 300], [416, 292], [430, 280], [424, 270]], p: [0.56, 0.68, 0.62] },
    { seg: [[424, 270], [414, 262], [394, 274], [386, 298]], p: [0.62, 0.84, 0.96] },
    { seg: [[386, 298], [380, 318], [392, 330], [412, 324]], p: [0.96, 0.86, 0.62] },
    // --- Ligature e -> y top-left ---
    { seg: [[412, 324], [434, 316], [450, 292], [462, 274]], p: [0.54, 0.30, 0.68] },

    // --- y: down into cup -> up to right peak -> sweeping descender ---
    { seg: [[462, 274], [454, 296], [446, 316], [456, 322]], p: [0.74, 0.92, 0.72] },
    { seg: [[456, 322], [468, 324], [486, 296], [504, 270]], p: [0.64, 0.42, 0.76] },
    { seg: [[504, 270], [492, 304], [472, 354], [446, 384]], p: [0.88, 0.96, 0.78] },
    { seg: [[446, 384], [428, 402], [408, 408], [396, 398]], p: [0.74, 0.52, 0.30] },
    // --- Ligature y tail: graceful cursive return loop sweeping up into C ---
    { seg: [[396, 398], [392, 386], [424, 378], [466, 344]], p: [0.24, 0.20, 0.24] },
    { seg: [[466, 344], [502, 312], [534, 258], [574, 224]], p: [0.24, 0.22, 0.32] },
    { seg: [[574, 224], [602, 206], [628, 212], [622, 242]], p: [0.34, 0.52, 0.44] },

    // --- C: curl back over the bold arch -> thick left spine -> bottom sweep ---
    { seg: [[622, 242], [634, 218], [616, 208], [588, 216]], p: [0.46, 0.76, 0.92] },
    { seg: [[588, 216], [556, 228], [532, 260], [522, 296]], p: [0.92, 1.0, 1.0] },
    { seg: [[522, 296], [514, 330], [532, 348], [564, 344]], p: [1.0, 0.92, 0.74] },
    // --- Ligature C -> a top-right ---
    { seg: [[564, 344], [596, 338], [630, 304], [664, 280]], p: [0.64, 0.34, 0.52] },

    // --- a: counter-clockwise oval -> down right stem -> exit ---
    { seg: [[664, 280], [656, 270], [636, 278], [626, 302]], p: [0.56, 0.82, 0.94] },
    { seg: [[626, 302], [618, 320], [630, 330], [648, 318]], p: [0.94, 0.82, 0.58] },
    { seg: [[648, 318], [660, 308], [668, 292], [672, 280]], p: [0.52, 0.38, 0.68] },
    { seg: [[672, 280], [666, 302], [664, 322], [678, 322]], p: [0.78, 0.92, 0.66] },

    // --- Ligature a -> T horizontal crossbar LEFT start (先横!) ---
    { seg: [[678, 322], [692, 318], [682, 284], [688, 268]], p: [0.50, 0.26, 0.72] },

    // --- T: HORIZONTAL BAR FIRST (left -> upper-right flourish) ---
    { seg: [[688, 268], [722, 262], [756, 252], [782, 234]], p: [0.86, 0.94, 0.52] },

    // --- T: graceful whip-loop back from right tip to top of vertical stem ---
    { seg: [[782, 234], [776, 222], [752, 218], [738, 232]], p: [0.36, 0.22, 0.74] },

    // --- T: VERTICAL STEM SECOND (top -> slashing down-left dry taper!) ---
    { seg: [[738, 232], [726, 266], [708, 316], [686, 372]], p: [0.94, 0.96, 0.08] },
  ];

  // =========================================================================
  // MODE 2: CLASSIC 8-STROKE (also updated so 't' is horizontal-first, then vertical!)
  // =========================================================================
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
    // T horizontal FIRST!
    {
      id: "t_bar",
      maxHalfW: 11.2,
      start: 0.860,
      end: 0.922,
      nibAngle: -0.15,
      segments: [[[686, 270], [718, 265], [754, 255], [780, 236]]],
      pressure: [[0.0, 0.82], [0.15, 0.96], [0.55, 0.70], [0.82, 0.38], [0.95, 0.16], [1.0, 0.04]],
    },
    // T vertical SECOND!
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

  // Fast deterministic PRNG (Mulberry32)
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hash1(i, seed) {
    let n = Math.imul(i ^ seed, 374761393);
    n = (n ^ (n >>> 13)) * 1274126177;
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  }

  function noise1D(x, seed) {
    const i = Math.floor(x);
    const f = x - i;
    const u = f * f * (3 - 2 * f);
    return hash1(i, seed) * (1 - u) + hash1(i + 1, seed) * u;
  }

  function fbm1D(x, seed) {
    return 0.62 * noise1D(x, seed) + 0.38 * noise1D(x * 2.3 + 17.1, seed + 101);
  }

  function appleEase(u) {
    const c = Math.max(0, Math.min(1, u));
    return 0.5 * (1 - Math.cos(Math.PI * Math.pow(c, 0.94)));
  }

  function brushAccelerateEase(u) {
    const c = Math.max(0, Math.min(1, u));
    return 0.16 * c + 0.84 * Math.pow(c, 2.35);
  }

  function evalPressure(profile, s) {
    if (s <= profile[0][0]) return profile[0][1];
    const last = profile[profile.length - 1];
    if (s >= last[0]) return last[1];
    for (let i = 0; i < profile.length - 1; i++) {
      const [s0, p0] = profile[i];
      const [s1, p1] = profile[i + 1];
      if (s >= s0 && s <= s1) {
        const u = (s - s0) / (s1 - s0);
        const smooth = u * u * (3 - 2 * u);
        return p0 + (p1 - p0) * smooth;
      }
    }
    return last[1];
  }

  function parseHexColor(hex) {
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

  function shadeRgb(rgb, factor) {
    return [
      Math.max(0, Math.min(255, Math.round(rgb[0] * factor))),
      Math.max(0, Math.min(255, Math.round(rgb[1] * factor))),
      Math.max(0, Math.min(255, Math.round(rgb[2] * factor))),
    ];
  }

  function buildOneStrokeSamples() {
    const raw = [];
    const stepsPerSeg = 64;
    for (const item of ONE_STROKE_CHAIN) {
      const [p0, p1, p2, p3] = item.seg;
      const [pr0, prM, pr1] = item.p;
      for (let i = 0; i <= stepsPerSeg; i++) {
        if (raw.length > 0 && i === 0) continue;
        const t = i / stepsPerSeg;
        const mt = 1 - t;
        const x =
          mt * mt * mt * p0[0] +
          3 * mt * mt * t * p1[0] +
          3 * mt * t * t * p2[0] +
          t * t * t * p3[0];
        const y =
          mt * mt * mt * p0[1] +
          3 * mt * mt * t * p1[1] +
          3 * mt * t * t * p2[1] +
          t * t * t * p3[1];
        // Quadratic Bezier interpolation of pressure along the segment
        const pr = mt * mt * pr0 + 2 * mt * t * prM + t * t * pr1;
        raw.push([x, y, pr]);
      }
    }

    const cum = [0];
    for (let i = 1; i < raw.length; i++) {
      cum.push(cum[i - 1] + Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]));
    }
    const totalLen = cum[cum.length - 1] || 1;
    const count = Math.max(400, Math.ceil(totalLen / 1.5));
    const samples = [];
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

    // Smooth pressure slightly to eliminate any abrupt jumps at segment joins
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

    return [
      {
        id: "one_stroke",
        maxHalfW: 9.2, // Fine sleek brush!
        start: 0.0,
        end: 1.0,
        samples,
        totalLen,
      },
    ];
  }

  function buildClassicStrokeSamples() {
    return CLASSIC_STROKES.map((stroke) => {
      const raw = [];
      const stepsPerSeg = 90;
      for (const seg of stroke.segments) {
        const [p0, p1, p2, p3] = seg;
        for (let i = 0; i <= stepsPerSeg; i++) {
          if (raw.length > 0 && i === 0) continue;
          const t = i / stepsPerSeg;
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
      const samples = [];
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
      return {
        id: stroke.id,
        maxHalfW: stroke.maxHalfW,
        start: stroke.start,
        end: stroke.end,
        samples,
        totalLen,
      };
    });
  }

  function buildBristles(seed, strokeIdx, preset, isOneStroke) {
    const rng = mulberry32(seed * 7919 + strokeIdx * 104729 + 13);
    const count = isOneStroke ? 34 : preset === "sumi" ? 52 : 44;
    const bristles = [];
    for (let i = 0; i < count; i++) {
      const lin = (i / (count - 1)) * 2 - 1;
      const jitter = (rng() - 0.5) * 0.14;
      const u = Math.max(-1.08, Math.min(1.08, lin + jitter));
      const absU = Math.abs(u);
      const isStray = absU > 0.80;
      const widthScale = isOneStroke ? 0.78 : 1.0;
      bristles.push({
        u,
        absU,
        baseWidth:
          (isStray ? 0.45 + rng() * 0.55 : 1.35 - absU * 0.65 + rng() * 0.65) * widthScale,
        inkLoad: 1.04 - absU * 0.50 + (rng() - 0.5) * 0.20,
        freq: 0.022 + rng() * 0.042,
        phase: rng() * 100,
        wanderAmp: (0.28 + absU * 1.0) * widthScale,
        wanderFreq: 0.015 + rng() * 0.02,
        shade: 0.84 + rng() * 0.26,
        noiseSeed: Math.floor(rng() * 100000),
      });
    }
    return bristles;
  }

  function buildSplatters(seed, strokes) {
    const rng = mulberry32(seed * 31337 + 99);
    const drops = [];
    const lastIdx = strokes.length - 1;
    const targets =
      strokes.length === 1
        ? [
            { idx: 0, s: 0.14, count: 3 },
            { idx: 0, s: 0.46, count: 4 },
            { idx: 0, s: 0.88, count: 4 },
            { idx: 0, s: 0.97, count: 5 },
          ]
        : [
            { idx: 1, s: 0.92, count: 4 },
            { idx: 3, s: 0.88, count: 4 },
            { idx: lastIdx - 1, s: 0.90, count: 4 },
            { idx: lastIdx, s: 0.94, count: 5 },
          ];

    for (const t of targets) {
      const st = strokes[t.idx];
      if (!st) continue;
      const si = Math.min(st.samples.length - 1, Math.floor(t.s * (st.samples.length - 1)));
      const pt = st.samples[si];
      for (let k = 0; k < t.count; k++) {
        const ang = rng() * Math.PI * 2;
        const rad = 7 + rng() * 20;
        drops.push({
          strokeIdx: t.idx,
          triggerS: Math.min(1, t.s + rng() * 0.03),
          x: pt.x + Math.cos(ang) * rad,
          y: pt.y + Math.sin(ang) * rad,
          r: 0.6 + rng() * 1.5,
          alpha: 0.45 + rng() * 0.45,
        });
      }
    }
    return drops;
  }

  const CACHE_ONE_STROKE = buildOneStrokeSamples();
  const CACHE_CLASSIC = buildClassicStrokeSamples();

  class KeyCatBrushElement extends HTMLElement {
    static get observedAttributes() {
      return [
        "mode", "color", "bg", "preset", "duration", "delay", "hold",
        "loop", "autoplay", "interactive", "thickness", "dryness", "splatter", "seed", "easing",
      ];
    }

    constructor() {
      super();
      this._raf = null;
      this._playing = false;
      this._elapsed = 0;
      this._lastTs = 0;
      this._completed = false;
      this._fadeOpacity = 1;

      this.attachShadow({ mode: "open" });
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: block;
            width: 100%;
            max-width: 1024px;
            aspect-ratio: 16 / 9;
            position: relative;
            user-select: none;
            -webkit-user-select: none;
          }
          .stage {
            width: 100%;
            height: 100%;
            border-radius: inherit;
            overflow: hidden;
            position: relative;
          }
          :host([interactive]) .stage { cursor: pointer; }
          canvas {
            width: 100%;
            height: 100%;
            display: block;
          }
        </style>
        <div class="stage">
          <canvas></canvas>
        </div>
      `;

      this._stage = this.shadowRoot.querySelector(".stage");
      this._canvas = this.shadowRoot.querySelector("canvas");
      this._ctx = this._canvas.getContext("2d");
      this._inkCanvas = document.createElement("canvas");
      this._inkCtx = this._inkCanvas.getContext("2d");

      this._setupModeData();

      this._stage.addEventListener("click", () => {
        if (this.hasAttribute("interactive")) this.replay();
      });

      this._ro = new ResizeObserver(() => this._resize());
    }

    get mode() { return this.getAttribute("mode") || "one-stroke"; }
    get color() { return this.getAttribute("color") || "#c0241c"; }
    get bg() { return this.getAttribute("bg") || "#ffffff"; }
    get preset() { return this.getAttribute("preset") || "dry-brush"; }
    get duration() {
      const v = parseFloat(this.getAttribute("duration"));
      return Number.isFinite(v) && v > 0 ? v : 3.4;
    }
    get delay() {
      const v = parseFloat(this.getAttribute("delay"));
      return Number.isFinite(v) && v >= 0 ? v : 0.25;
    }
    get easing() { return this.getAttribute("easing") || "apple"; }
    get hold() {
      const v = parseFloat(this.getAttribute("hold"));
      return Number.isFinite(v) && v >= 0 ? v : 1.8;
    }
    get loop() { return this.hasAttribute("loop") && this.getAttribute("loop") !== "false"; }
    get autoplay() {
      const a = this.getAttribute("autoplay");
      return a === null ? true : a !== "false";
    }
    get thickness() {
      const v = parseFloat(this.getAttribute("thickness"));
      return Number.isFinite(v) ? Math.max(0.35, Math.min(2.0, v)) : 1.0;
    }
    get dryness() {
      const v = parseFloat(this.getAttribute("dryness"));
      return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.48;
    }
    get splatter() { return this.hasAttribute("splatter") && this.getAttribute("splatter") !== "false"; }
    get seed() {
      const v = parseInt(this.getAttribute("seed"), 10);
      return Number.isFinite(v) ? v : 42;
    }

    _setupModeData() {
      const isOne = this.mode !== "classic";
      this._strokes = isOne ? CACHE_ONE_STROKE : CACHE_CLASSIC;
      this._lastDrawnIdx = this._strokes.map(() => 0);
      this._bristles = this._strokes.map((_, i) => buildBristles(this.seed, i, this.preset, isOne));
      this._splatters = buildSplatters(this.seed, this._strokes);
      this._splatterDrawn = this._splatters.map(() => false);
    }

    _resize() {
      const rect = this._stage.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const w = Math.max(512, Math.round((rect.width || VIEW_W) * dpr));
      const h = Math.max(288, Math.round((rect.height || VIEW_H) * dpr));
      if (this._canvas.width !== w || this._canvas.height !== h) {
        this._canvas.width = w;
        this._canvas.height = h;
        this._inkCanvas.width = w;
        this._inkCanvas.height = h;
        const p = this._currentNormalizedProgress();
        this._resetInkLayer();
        this._drawUpTo(p);
        this._composite();
      }
    }

    _currentNormalizedProgress() {
      if (this._elapsed <= this.delay) return 0;
      return Math.min(1, (this._elapsed - this.delay) / this.duration);
    }

    _resetInkLayer() {
      this._inkCtx.clearRect(0, 0, this._inkCanvas.width, this._inkCanvas.height);
      this._lastDrawnIdx = this._strokes.map(() => 0);
      this._splatterDrawn = this._splatters.map(() => false);
    }

    _drawStrokeRange(strokeIdx, fromIdx, toIdx) {
      if (toIdx <= fromIdx) return;
      const stroke = this._strokes[strokeIdx];
      const samples = stroke.samples;
      const bristles = this._bristles[strokeIdx];
      const ctx = this._inkCtx;

      const scaleX = this._inkCanvas.width / VIEW_W;
      const scaleY = this._inkCanvas.height / VIEW_H;
      const rgb = parseHexColor(this.color);
      const dryness = this.preset === "sumi" ? this.dryness * 0.42 : this.dryness;
      const thickMul = this.thickness;

      ctx.save();
      ctx.scale(scaleX, scaleY);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (this.preset === "neon") {
        ctx.shadowColor = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.55)`;
        ctx.shadowBlur = 9;
      }

      for (let b = 0; b < bristles.length; b++) {
        const br = bristles[b];
        const col = shadeRgb(rgb, br.shade);
        const baseColorStr = `${col[0]}, ${col[1]}, ${col[2]}`;

        for (let i = fromIdx; i < toIdx; i++) {
          const p0 = samples[i];
          const p1 = samples[i + 1];
          if (!p1) break;

          // Keep core bristles intact on thin connecting hairlines so the one-stroke never breaks completely
          const isHairline = p0.pressure < 0.34;
          if (isHairline && br.absU > 0.55) continue;

          const nVal = fbm1D(p0.dist * br.freq + br.phase, br.noiseSeed);
          const dryThreshold = isHairline
            ? (1 - br.inkLoad) * 0.40 + dryness * 0.25 * br.absU
            : (1 - br.inkLoad) * 0.68 +
              dryness * (0.24 + 0.55 * br.absU) +
              (1 - p0.pressure) * (0.28 + 0.42 * br.absU);

          if (nVal < dryThreshold * 0.76) continue;

          const inkStrength = Math.max(0, Math.min(1, (nVal - dryThreshold * 0.58) / 0.36));
          const alpha = isHairline
            ? Math.min(0.82, 0.38 + 0.48 * inkStrength)
            : Math.min(0.96, (0.34 + 0.66 * inkStrength) * (0.48 + 0.52 * p0.pressure));
          if (alpha < 0.05) continue;

          const hw0 = stroke.maxHalfW * thickMul * p0.pressure;
          const hw1 = stroke.maxHalfW * thickMul * p1.pressure;

          const w0 = (noise1D(p0.dist * br.wanderFreq + br.phase, br.noiseSeed + 7) - 0.5) * br.wanderAmp * thickMul;
          const w1 = (noise1D(p1.dist * br.wanderFreq + br.phase, br.noiseSeed + 7) - 0.5) * br.wanderAmp * thickMul;

          const x0 = p0.x + p0.nx * (br.u * hw0 + w0);
          const y0 = p0.y + p0.ny * (br.u * hw0 + w0);
          const x1 = p1.x + p1.nx * (br.u * hw1 + w1);
          const y1 = p1.y + p1.ny * (br.u * hw1 + w1);

          ctx.strokeStyle = `rgba(${baseColorStr}, ${alpha.toFixed(3)})`;
          ctx.lineWidth = Math.max(0.45, br.baseWidth * thickMul * (0.50 + 0.56 * p0.pressure));
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(x1, y1);
          ctx.stroke();
        }
      }

      if (this.splatter || this.preset === "sumi") {
        const endS = samples[toIdx] ? samples[toIdx].s : 1;
        ctx.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.75)`;
        for (let d = 0; d < this._splatters.length; d++) {
          const drop = this._splatters[d];
          if (!this._splatterDrawn[d] && drop.strokeIdx === strokeIdx && endS >= drop.triggerS) {
            this._splatterDrawn[d] = true;
            ctx.globalAlpha = drop.alpha;
            ctx.beginPath();
            ctx.arc(drop.x, drop.y, drop.r * thickMul, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      ctx.restore();
    }

    _drawUpTo(normP) {
      const p = Math.max(0, Math.min(1, normP));
      for (let i = 0; i < this._strokes.length; i++) {
        const st = this._strokes[i];
        const totalSamples = st.samples.length - 1;
        let targetIdx = 0;
        if (p <= st.start) {
          targetIdx = 0;
        } else if (p >= st.end) {
          targetIdx = totalSamples;
        } else {
          const ratio = (p - st.start) / (st.end - st.start);
          const local = this.easing === "accelerate" ? brushAccelerateEase(ratio) : appleEase(ratio);
          targetIdx = Math.round(local * totalSamples);
        }
        if (targetIdx > this._lastDrawnIdx[i]) {
          this._drawStrokeRange(i, this._lastDrawnIdx[i], targetIdx);
          this._lastDrawnIdx[i] = targetIdx;
        }
      }
    }

    _composite() {
      const ctx = this._ctx;
      const w = this._canvas.width;
      const h = this._canvas.height;
      ctx.clearRect(0, 0, w, h);

      if (this.bg && this.bg !== "transparent") {
        ctx.fillStyle = this.bg;
        ctx.fillRect(0, 0, w, h);
      }

      ctx.save();
      ctx.globalAlpha = this._fadeOpacity;
      ctx.drawImage(this._inkCanvas, 0, 0);
      ctx.restore();
    }

    connectedCallback() {
      this._ro.observe(this._stage);
      this._resize();
      if (this.autoplay) {
        this.play();
      } else {
        this._composite();
      }
    }

    disconnectedCallback() {
      this.pause();
      this._ro.disconnect();
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (oldVal === newVal) return;
      if (["mode", "seed", "preset"].includes(name)) {
        this._setupModeData();
      }
      if (["mode", "color", "bg", "preset", "thickness", "dryness", "splatter", "seed"].includes(name)) {
        const p = this._currentNormalizedProgress();
        this._resetInkLayer();
        this._drawUpTo(p);
        this._composite();
      }
    }

    seek(normP) {
      this.pause();
      const p = Math.max(0, Math.min(1, normP));
      this._fadeOpacity = 1;
      this._elapsed = this.delay + p * this.duration;
      this._resetInkLayer();
      this._drawUpTo(p);
      this._composite();
    }

    randomize() {
      this.setAttribute("seed", String(Math.floor(Math.random() * 100000)));
      this.replay();
    }

    toDataURL(type = "image/png") {
      return this._canvas.toDataURL(type);
    }

    play() {
      if (this._playing) return;
      this._playing = true;
      this._lastTs = performance.now();
      if (this._elapsed === 0) {
        this.dispatchEvent(new CustomEvent("signature-start", { bubbles: true }));
      }

      const tick = (now) => {
        if (!this._playing) return;
        const dt = Math.min(0.05, (now - this._lastTs) / 1000);
        this._lastTs = now;
        this._elapsed += dt;

        const delay = this.delay;
        const dur = this.duration;
        const hold = this.hold;
        const fade = 0.45;

        if (this._elapsed < delay) {
          this._fadeOpacity = 1;
        } else if (this._elapsed <= delay + dur) {
          this._fadeOpacity = 1;
          this._drawUpTo((this._elapsed - delay) / dur);
        } else {
          this._drawUpTo(1);
          if (!this._completed) {
            this._completed = true;
            this.dispatchEvent(new CustomEvent("signature-complete", { bubbles: true }));
          }
          if (!this.loop) {
            this._composite();
            this._playing = false;
            this._raf = null;
            return;
          }
          const post = this._elapsed - (delay + dur);
          if (post < hold) {
            this._fadeOpacity = 1;
          } else if (post < hold + fade) {
            const f = (post - hold) / fade;
            this._fadeOpacity = Math.max(0, 1 - Math.pow(f, 1.4));
          } else {
            this._elapsed = 0;
            this._completed = false;
            this._fadeOpacity = 1;
            this._resetInkLayer();
            this.dispatchEvent(new CustomEvent("signature-start", { bubbles: true }));
          }
        }
        this._composite();
        this._raf = requestAnimationFrame(tick);
      };
      this._raf = requestAnimationFrame(tick);
    }

    pause() {
      this._playing = false;
      if (this._raf !== null) {
        cancelAnimationFrame(this._raf);
        this._raf = null;
      }
    }

    replay() {
      this.pause();
      this._elapsed = 0;
      this._completed = false;
      this._fadeOpacity = 1;
      this._resetInkLayer();
      this._composite();
      this.play();
    }
  }

  if (typeof customElements !== "undefined" && !customElements.get("keycat-brush")) {
    customElements.define("keycat-brush", KeyCatBrushElement);
  }
  window.KeyCatBrushElement = KeyCatBrushElement;
})();
