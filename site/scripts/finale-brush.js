/**
 * KeyCatFinaleBrush — Scene 05 「Say Hi. 活墨题签 · 宣纸水写布」
 * Echoes Scene 01's 34-bristle dry-brush calligraphy (`KeyCat`) with an accelerating
 * multi-stroke cursive "Say Hi." that also lets visitors paint ephemeral cinnabar strokes.
 */
(function () {
  const LOGICAL_W = 720;
  const LOGICAL_H = 164;

  function seededRng(seed) {
    let s = (seed >>> 0) || 4096;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function accelEase(u) {
    const c = Math.max(0, Math.min(1, u));
    return 0.16 * c + 0.84 * Math.pow(c, 2.25);
  }

  function evalCubic(p0, p1, p2, p3, t) {
    const m = 1 - t;
    return [
      m * m * m * p0[0] + 3 * m * m * t * p1[0] + 3 * m * t * t * p2[0] + t * t * t * p3[0],
      m * m * m * p0[1] + 3 * m * m * t * p1[1] + 3 * m * t * t * p2[1] + t * t * t * p3[1],
    ];
  }

  function sampleSegments(segments, stepsPerSeg = 22) {
    const pts = [];
    for (let si = 0; si < segments.length; si++) {
      const [p0, p1, p2, p3] = segments[si];
      for (let i = si === 0 ? 0 : 1; i <= stepsPerSeg; i++) {
        const t = i / stepsPerSeg;
        const [x, y] = evalCubic(p0, p1, p2, p3, t);
        pts.push({ x, y });
      }
    }
    return pts;
  }

  // Hand-crafted calligraphic cursive strokes for "Say Hi." inside 720x164
  function buildSayHiStrokes() {
    const rawStrokes = [
      {
        // "S" sweeping curve
        start: 0.0,
        end: 0.22,
        baseWidth: 11.8,
        pts: sampleSegments([
          [[198, 42], [174, 24], [128, 34], [134, 60]],
          [[134, 60], [140, 82], [194, 82], [186, 108]],
          [[186, 108], [178, 126], [134, 124], [122, 108]],
        ], 22),
      },
      {
        // "ay" connected cursive flow
        start: 0.19,
        end: 0.54,
        baseWidth: 11.0,
        pts: sampleSegments([
          // lead-in & 'a' oval
          [[188, 106], [202, 102], [224, 80], [238, 76]],
          [[238, 76], [216, 70], [202, 92], [212, 108]],
          [[212, 108], [224, 120], [244, 104], [250, 78]],
          // 'a' stem down -> bridge into 'y'
          [[250, 78], [248, 96], [250, 114], [268, 106]],
          [[268, 106], [278, 100], [286, 82], [290, 76]],
          // 'y' cup
          [[290, 76], [288, 104], [304, 116], [322, 96]],
          [[322, 96], [330, 86], [334, 76], [336, 74]],
          // 'y' descender loop -> exit tail
          [[336, 74], [332, 108], [320, 148], [298, 146]],
          [[298, 146], [282, 144], [304, 114], [354, 96]],
        ], 18),
      },
      {
        // "H" left pillar
        start: 0.50,
        end: 0.64,
        baseWidth: 12.2,
        pts: sampleSegments([
          [[416, 36], [412, 62], [404, 90], [398, 116]],
        ], 20),
      },
      {
        // "H" right pillar
        start: 0.62,
        end: 0.76,
        baseWidth: 12.2,
        pts: sampleSegments([
          [[474, 34], [470, 62], [462, 90], [456, 116]],
        ], 20),
      },
      {
        // "H" crossbar + glide into "i"
        start: 0.72,
        end: 0.90,
        baseWidth: 10.6,
        pts: sampleSegments([
          [[396, 78], [428, 76], [458, 72], [486, 74]],
          [[486, 74], [496, 75], [504, 74], [506, 76]],
          [[506, 76], [502, 98], [508, 116], [534, 102]],
        ], 18),
      },
      {
        // dot over "i"
        start: 0.89,
        end: 0.95,
        baseWidth: 9.8,
        pts: sampleSegments([
          [[508, 50], [512, 46], [517, 50], [514, 55]],
        ], 10),
      },
      {
        // "." crisp period stamp
        start: 0.94,
        end: 1.0,
        baseWidth: 10.5,
        pts: sampleSegments([
          [[558, 108], [562, 104], [568, 108], [564, 114]],
        ], 10),
      },
    ];

    rawStrokes.forEach((st) => {
      const n = st.pts.length;
      for (let i = 0; i < n; i++) {
        const prev = st.pts[Math.max(0, i - 1)];
        const next = st.pts[Math.min(n - 1, i + 1)];
        const dx = next.x - prev.x;
        const dy = next.y - prev.y;
        const len = Math.hypot(dx, dy) || 1;
        const u = i / Math.max(1, n - 1);
        const speedFactor = Math.max(0.55, Math.min(1.25, 4.5 / Math.max(1.5, len)));
        const taper = u < 0.08 ? 0.55 + (u / 0.08) * 0.45 : u > 0.88 ? 1 - ((u - 0.88) / 0.12) * 0.52 : 1;
        st.pts[i].nx = -dy / len;
        st.pts[i].ny = dx / len;
        st.pts[i].w = st.baseWidth * taper * speedFactor;
      }
    });
    return rawStrokes;
  }

  function buildBristles(seed, strokeIdx) {
    const rng = seededRng(seed + strokeIdx * 97);
    const bristles = [];
    for (let i = 0; i < 34; i++) {
      const spread = (i / 33 - 0.5) * 2;
      bristles.push({
        offset: spread + (rng() - 0.5) * 0.12,
        widthFrac: 0.16 + rng() * 0.24,
        alpha: 0.28 + (1 - Math.abs(spread)) * 0.46 + rng() * 0.16,
        inkLimit: 0.28 + rng() * 0.72,
        wobbleFreq: 4 + rng() * 9,
        wobblePhase: rng() * Math.PI * 2,
      });
    }
    return bristles;
  }

  class KeyCatFinaleBrush {
    constructor(canvas, getShader) {
      this.canvas = canvas;
      this.ctx = canvas ? canvas.getContext("2d") : null;
      this.getShader = getShader;
      this.strokes = buildSayHiStrokes();
      this.bristleSets = this.strokes.map((_, idx) => buildBristles(2026, idx));
      this.seed = 2026;
      this.accent = "#d14b2c";
      this.hasPlayed = false;
      this.settled = false;
      this.playRaf = null;
      this.userRaf = null;
      this.userStrokes = [];
      this.activeStroke = null;
      this.lastDrawnIdx = this.strokes.map(() => 0);

      if (!this.ctx) return;
      this.inkCanvas = document.createElement("canvas");
      this.inkCtx = this.inkCanvas.getContext("2d");

      this._resize();
      window.addEventListener("resize", () => {
        this._resize();
        if (this.settled) this.settle();
      });
      this._bindVisitorBrush();
    }

    _resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.dpr = dpr;
      this.canvas.width = LOGICAL_W * dpr;
      this.canvas.height = LOGICAL_H * dpr;
      this.inkCanvas.width = LOGICAL_W * dpr;
      this.inkCanvas.height = LOGICAL_H * dpr;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.inkCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    _resetInk() {
      this.inkCtx.clearRect(0, 0, LOGICAL_W, LOGICAL_H);
      this.lastDrawnIdx = this.strokes.map(() => 0);
    }

    _drawRange(sIdx, fromIdx, toIdx) {
      if (toIdx <= fromIdx) return;
      const st = this.strokes[sIdx];
      const pts = st.pts;
      const bristles = this.bristleSets[sIdx];
      const ctx = this.inkCtx;
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = this.accent;

      for (let b = 0; b < bristles.length; b++) {
        const br = bristles[b];
        const edgeRatio = Math.abs(br.offset);
        if (edgeRatio > br.inkLimit + 0.25) continue;

        ctx.globalAlpha = br.alpha;
        ctx.beginPath();
        let started = false;
        for (let i = fromIdx; i <= toIdx; i++) {
          const p = pts[i];
          const u = i / Math.max(1, pts.length - 1);
          if (edgeRatio > br.inkLimit && u > 0.35 && Math.sin(u * 38 + br.wobblePhase) > 0.15) {
            started = false;
            continue;
          }
          const wob = Math.sin(u * br.wobbleFreq + br.wobblePhase) * 0.55;
          const off = br.offset * p.w * 0.5 + wob;
          const x = p.x + p.nx * off;
          const y = p.y + p.ny * off;
          ctx.lineWidth = Math.max(0.75, p.w * br.widthFrac);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    _composite() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, LOGICAL_W, LOGICAL_H);
      ctx.drawImage(this.inkCanvas, 0, 0, LOGICAL_W, LOGICAL_H);

      const now = performance.now();
      let hasAlive = false;
      for (let i = this.userStrokes.length - 1; i >= 0; i--) {
        const ust = this.userStrokes[i];
        const age = now - ust.born;
        const life = ust === this.activeStroke ? 1 : Math.max(0, 1 - age / 9000);
        if (life <= 0) {
          this.userStrokes.splice(i, 1);
          continue;
        }
        hasAlive = true;
        ctx.save();
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = ust.color;
        for (const seg of ust.segs) {
          ctx.globalAlpha = seg.alpha * life;
          ctx.lineWidth = seg.w;
          ctx.beginPath();
          ctx.moveTo(seg.x0, seg.y0);
          ctx.lineTo(seg.x1, seg.y1);
          ctx.stroke();
        }
        ctx.restore();
      }
      return hasAlive;
    }

    _renderProgress(p) {
      for (let i = 0; i < this.strokes.length; i++) {
        const st = this.strokes[i];
        const maxIdx = st.pts.length - 1;
        let target = 0;
        if (p <= st.start) target = 0;
        else if (p >= st.end) target = maxIdx;
        else {
          const u = (p - st.start) / (st.end - st.start);
          target = Math.round(accelEase(u) * maxIdx);
        }
        if (target > this.lastDrawnIdx[i]) {
          this._drawRange(i, this.lastDrawnIdx[i], target);
          this.lastDrawnIdx[i] = target;
        }
      }
      this._composite();
    }

    play() {
      if (!this.ctx) return;
      if (this.playRaf !== null) cancelAnimationFrame(this.playRaf);
      this.hasPlayed = true;
      this.settled = false;
      this._resetInk();

      const startT = performance.now();
      const dur = 2850;
      const tick = (now) => {
        const raw = Math.min(1, (now - startT) / dur);
        this._renderProgress(accelEase(raw));
        if (raw < 1) {
          this.playRaf = requestAnimationFrame(tick);
        } else {
          this.playRaf = null;
          this.settled = true;
        }
      };
      this.playRaf = requestAnimationFrame(tick);
    }

    settle() {
      if (!this.ctx) return;
      if (this.playRaf !== null) {
        cancelAnimationFrame(this.playRaf);
        this.playRaf = null;
      }
      this.hasPlayed = true;
      this.settled = true;
      this._resetInk();
      this._renderProgress(1);
    }

    _toLogical(e) {
      const r = this.canvas.getBoundingClientRect();
      return {
        x: ((e.clientX - r.left) / Math.max(1, r.width)) * LOGICAL_W,
        y: ((e.clientY - r.top) / Math.max(1, r.height)) * LOGICAL_H,
      };
    }

    _bindVisitorBrush() {
      let lx = 0;
      let ly = 0;
      let lt = 0;
      this.canvas.addEventListener("pointerdown", (e) => {
        const pt = this._toLogical(e);
        lx = pt.x;
        ly = pt.y;
        lt = performance.now();
        this.activeStroke = { born: lt, color: this.accent, segs: [] };
        this.userStrokes.push(this.activeStroke);
        this.canvas.setPointerCapture(e.pointerId);
        const sh = this.getShader?.();
        sh?.triggerRipple(
          e.clientX / Math.max(1, window.innerWidth),
          e.clientY / Math.max(1, window.innerHeight),
          this.accent,
          0.55
        );
        this._ensureUserLoop();
      });

      this.canvas.addEventListener("pointermove", (e) => {
        if (!this.activeStroke) return;
        const pt = this._toLogical(e);
        const now = performance.now();
        const dist = Math.hypot(pt.x - lx, pt.y - ly);
        if (dist < 1.2) return;
        const dt = Math.max(6, now - lt);
        const speed = dist / dt;
        const mainW = Math.max(2.2, Math.min(8.5, 7.2 - speed * 2.2));
        this.activeStroke.segs.push({ x0: lx, y0: ly, x1: pt.x, y1: pt.y, w: mainW, alpha: 0.72 });
        if (speed > 0.35) {
          this.activeStroke.segs.push({
            x0: lx + 2.5,
            y0: ly - 2.2,
            x1: pt.x + 3.2,
            y1: pt.y - 2.4,
            w: 1.2,
            alpha: 0.38,
          });
        }
        this.activeStroke.born = now;
        lx = pt.x;
        ly = pt.y;
        lt = now;
        this._composite();
      });

      const end = (e) => {
        if (!this.activeStroke) return;
        this.activeStroke.born = performance.now();
        this.activeStroke = null;
        try {
          this.canvas.releasePointerCapture(e.pointerId);
        } catch (_) {}
      };
      this.canvas.addEventListener("pointerup", end);
      this.canvas.addEventListener("pointercancel", end);
    }

    _ensureUserLoop() {
      if (this.userRaf !== null) return;
      const tick = () => {
        const alive = this._composite();
        if (alive) {
          this.userRaf = requestAnimationFrame(tick);
        } else {
          this.userRaf = null;
        }
      };
      this.userRaf = requestAnimationFrame(tick);
    }
  }

  window.KeyCatFinaleBrush = KeyCatFinaleBrush;
})();
