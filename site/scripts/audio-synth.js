/**
 * KeyCatAudio — Impulse-Excited Cavity Modal Synthesizer + ThockHub Keyboard-Mod DSP Chain
 * Zero static audio samples: pure Web Audio procedural synthesis combining:
 *  - Per-stroke LCG micro-randomized physical impact impulses (no repetitive "machine-gun" takes)
 *  - Parallel resonant housing/keycap/plate bandpass cavity bank (with subtle row pitch drift)
 *  - ThockHub simulator keyboard-build DSP mod bus (Poron Foam / Tape Mod / PBT Peaking / Alu Comb)
 *  - Authentic 3-phase mechanical event timing (actuation bump/click -> bottom-out -> upstroke)
 *  - Procedurally synthesized 24ms desk early-reflection ConvolverNode + DynamicsCompressorNode
 */
(function () {
  const SWITCHES = {
    thock: {
      id: "thock",
      label: "麻将音 Thock",
      short: "THOCK",
      weight: "62g",
      color: "#c84326",
      rgb: [0.784, 0.263, 0.149],
      tag: "62g · 线性重闷",
      note: "PBT 腔体共鸣，像麻将轻碰",
    },
    tactile: {
      id: "tactile",
      label: "茶轴 Tactile",
      short: "TACTILE",
      weight: "55g",
      color: "#8a5428",
      rgb: [0.541, 0.329, 0.157],
      tag: "55g · 微段落确认",
      note: "温润微弹，码字最省心",
    },
    clicky: {
      id: "clicky",
      label: "青轴 Clicky",
      short: "CLICKY",
      weight: "50g",
      color: "#1f6b7a",
      rgb: [0.122, 0.420, 0.478],
      tag: "50g · 清脆两段",
      note: "金属弹片咔哒，存在感拉满",
    },
    linear: {
      id: "linear",
      label: "红轴 Linear",
      short: "LINEAR",
      weight: "45g",
      color: "#b52e46",
      rgb: [0.710, 0.180, 0.275],
      tag: "45g · 直上直下",
      note: "轻快顺滑，行云流水触底",
    },
  };

  function jitter(val, pct = 0.045) {
    return val * (1 + (Math.random() * 2 - 1) * pct);
  }

  class KeyCatAudioEngine {
    constructor(scopeCanvas) {
      this.scope = scopeCanvas;
      this.scopeCtx = scopeCanvas ? scopeCanvas.getContext("2d") : null;
      this.ctx = null;
      this.master = null;
      this.dryBus = null;
      this.wetConvolver = null;
      this.wetGain = null;
      this.analyser = null;
      this.data = null;
      this.enabled = true;
      this.switchId = "thock";
      this.count = 0;
      this.raf = null;
      this.activeUntil = 0;
      this.lcgState = (Date.now() ^ 0x9e3779b9) >>> 0;
      this.drawIdleLine();
    }

    getSwitchMeta(id = this.switchId) {
      return SWITCHES[id] || SWITCHES.thock;
    }

    setSwitch(id) {
      if (SWITCHES[id]) this.switchId = id;
      if (this.raf === null) this.drawIdleLine();
      return this.getSwitchMeta();
    }

    setEnabled(flag) {
      this.enabled = Boolean(flag);
      if (!this.enabled) this.drawIdleLine();
      return this.enabled;
    }

    _nextRand() {
      this.lcgState = (Math.imul(this.lcgState, 1664525) + 1013904223) >>> 0;
      return this.lcgState / 4294967296;
    }

    _ensureContext() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return false;
        this.ctx = new AudioCtx();
      }
      if (!this.dryBus) {
        this.dryBus = this.ctx.createGain();
        this.dryBus.gain.value = 1.0;

        // Procedural 24ms wooden-desk / cavity early-reflection IR (zero static asset)
        const irLen = Math.floor(this.ctx.sampleRate * 0.024);
        const irBuf = this.ctx.createBuffer(1, irLen, this.ctx.sampleRate);
        const ch = irBuf.getChannelData(0);
        let lp = 0;
        for (let i = 0; i < irLen; i++) {
          const env = Math.exp(-i / (irLen * 0.28));
          const raw = (this._nextRand() * 2 - 1) * env;
          lp = lp * 0.58 + raw * 0.42;
          ch[i] = lp * (i === 0 ? 1.0 : 0.72);
        }
        this.wetConvolver = this.ctx.createConvolver();
        this.wetConvolver.buffer = irBuf;
        this.wetGain = this.ctx.createGain();
        this.wetGain.gain.value = 0.22;

        const comp = this.ctx.createDynamicsCompressor();
        comp.threshold.value = -10;
        comp.knee.value = 12;
        comp.ratio.value = 3.5;
        comp.attack.value = 0.002;
        comp.release.value = 0.06;

        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 256;
        this.data = new Uint8Array(this.analyser.frequencyBinCount);

        this.dryBus.connect(comp);
        this.dryBus.connect(this.wetConvolver).connect(this.wetGain).connect(comp);
        comp.connect(this.analyser);
        this.analyser.connect(this.ctx.destination);
      }
      if (this.ctx.state === "suspended" && typeof this.ctx.resume === "function") {
        this.ctx.resume().catch(() => {});
      }
      return true;
    }

    /**
     * LCG physical contact impulse buffer (1.8ms..4.2ms), avoiding static buzz or repetition.
     */
    _makeImpulseBuffer(durSec, attackFrac = 0.08, decayRate = 6.2) {
      const len = Math.max(64, Math.floor(this.ctx.sampleRate * durSec));
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const ch = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        const u = i / len;
        const env = u < attackFrac ? u / Math.max(0.01, attackFrac) : Math.exp(-(u - attackFrac) * decayRate);
        ch[i] = (this._nextRand() * 2 - 1) * env;
      }
      return buf;
    }

    /**
     * Ports ThockHub's keyboard-build DSP mod chain (foam lowshelf/LPF, tape Q, cavity peaking, aluminum 18ms comb).
     */
    _buildModBus({ lpFreq = 9000, lpQ = 0.85, lowShelfDb = 0, peakFreq = 0, peakDb = 0, peakQ = 1.25, aluCombGain = 0, outGain = 1.0 }) {
      const lp = this.ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = lpFreq;
      lp.Q.value = lpQ;
      let tail = lp;

      if (lowShelfDb > 0) {
        const shelf = this.ctx.createBiquadFilter();
        shelf.type = "lowshelf";
        shelf.frequency.value = 300;
        shelf.gain.value = lowShelfDb;
        tail.connect(shelf);
        tail = shelf;
      }

      if (peakFreq > 0 && peakDb !== 0) {
        const peak = this.ctx.createBiquadFilter();
        peak.type = "peaking";
        peak.frequency.value = peakFreq;
        peak.Q.value = peakQ;
        peak.gain.value = peakDb;
        tail.connect(peak);
        tail = peak;
      }

      const busOut = this.ctx.createGain();
      busOut.gain.value = outGain;

      if (aluCombGain > 0) {
        const delay = this.ctx.createDelay(0.05);
        delay.delayTime.value = 0.018;
        const fb = this.ctx.createGain();
        fb.gain.value = aluCombGain;
        const damp = this.ctx.createBiquadFilter();
        damp.type = "lowpass";
        damp.frequency.value = 4000;
        tail.connect(delay);
        delay.connect(damp);
        damp.connect(fb);
        fb.connect(delay);
        delay.connect(busOut);
      }

      tail.connect(busOut);
      busOut.connect(this.dryBus);
      return lp;
    }

    /**
     * Excites a parallel bank of narrow bandpass housing/keycap resonators using a crisp impact impulse.
     */
    _exciteCavities(startTime, targetNode, { dur = 0.003, attackFrac = 0.08, decayRate = 6.2, preFilter = null, modes = [], tailEnv = 0.036, pitchScale = 1.0 }) {
      const src = this.ctx.createBufferSource();
      src.buffer = this._makeImpulseBuffer(dur, attackFrac, decayRate);

      let exciter = src;
      if (preFilter) {
        const pf = this.ctx.createBiquadFilter();
        pf.type = preFilter.type;
        pf.frequency.setValueAtTime(jitter(preFilter.freq * pitchScale, 0.03), startTime);
        if (preFilter.q) pf.Q.setValueAtTime(preFilter.q, startTime);
        src.connect(pf);
        exciter = pf;
      }

      for (let i = 0; i < modes.length; i++) {
        const m = modes[i];
        const bp = this.ctx.createBiquadFilter();
        bp.type = m.type || "bandpass";
        bp.frequency.setValueAtTime(jitter(m.freq * pitchScale, 0.04), startTime);
        bp.Q.setValueAtTime(m.q || 3.8, startTime);

        const g = this.ctx.createGain();
        g.gain.setValueAtTime(m.gain, startTime);
        g.gain.exponentialRampToValueAtTime(0.0008, startTime + (m.env || tailEnv));

        exciter.connect(bp).connect(g).connect(targetNode);
      }

      src.start(startTime);
    }

    _dampedMode(startTime, { fStart, fEnd, dur = 0.022, gainVal = 0.16, type = "sine" }, targetNode = this.dryBus) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(jitter(fStart), startTime);
      osc.frequency.exponentialRampToValueAtTime(Math.max(32, jitter(fEnd)), startTime + dur);
      g.gain.setValueAtTime(0.001, startTime);
      g.gain.linearRampToValueAtTime(gainVal, startTime + 0.0015);
      g.gain.exponentialRampToValueAtTime(0.0008, startTime + dur);
      osc.connect(g).connect(targetNode);
      osc.start(startTime);
      osc.stop(startTime + dur + 0.006);
    }

    playKeycap(customSwitchId) {
      const sw = this.getSwitchMeta(customSwitchId || this.switchId);
      this.count += 1;
      if (!this.enabled) return { count: this.count, sw };
      if (!this._ensureContext()) return { count: this.count, sw };

      const t0 = this.ctx.currentTime + 0.002;
      const rowPitch = 0.96 + this._nextRand() * 0.08;

      if (sw.id === "thock") {
        // ThockHub Recipe A — Gateron Oil King / Dareu Mahjong + Gasket + Poron Foam + Tape Mod + PC Plate
        const bus = this._buildModBus({
          lpFreq: 1850,
          lpQ: 1.8,
          lowShelfDb: 6.5,
          peakFreq: 210,
          peakDb: 5.0,
          peakQ: 1.4,
          outGain: 2.8,
        });
        // Lubed stem pre-glide
        this._exciteCavities(t0, bus, {
          dur: 0.0038,
          modes: [{ freq: 480, q: 1.6, gain: 0.09, env: 0.012 }],
          pitchScale: rowPitch,
        });
        // Heavy bottom-out POM-on-Nylon marble thock
        const tHit = t0 + 0.005;
        this._dampedMode(tHit, { fStart: 135 * rowPitch, fEnd: 62, dur: 0.016, gainVal: 0.16, type: "sine" }, bus);
        this._exciteCavities(tHit, bus, {
          dur: 0.0030,
          decayRate: 5.4,
          tailEnv: 0.038,
          pitchScale: rowPitch,
          modes: [
            { freq: 215, q: 4.8, gain: 0.72, env: 0.038 },
            { freq: 620, q: 5.0, gain: 0.56, env: 0.032 },
            { freq: 1320, q: 3.6, gain: 0.34, env: 0.022 },
          ],
        });
        // Muted hollow PBT upstroke
        const tUp = tHit + 0.068;
        this._exciteCavities(tUp, bus, {
          dur: 0.0022,
          tailEnv: 0.024,
          pitchScale: rowPitch,
          modes: [
            { freq: 340, q: 4.2, gain: 0.28, env: 0.022 },
            { freq: 820, q: 3.6, gain: 0.22, env: 0.018 },
          ],
        });
      } else if (sw.id === "tactile") {
        // ThockHub Recipe B — Boba U4T / Akko Lavender Purple + FR4 Plate + Lubed + Tape Mod
        const bus = this._buildModBus({
          lpFreq: 4300,
          lpQ: 1.6,
          peakFreq: 260,
          peakDb: 3.5,
          peakQ: 1.3,
          outGain: 5.8,
        });
        // Crisp rounded leaf tactile bump
        this._exciteCavities(t0, bus, {
          dur: 0.0022,
          tailEnv: 0.018,
          pitchScale: rowPitch,
          modes: [
            { freq: 460, q: 3.8, gain: 0.32, env: 0.016 },
            { freq: 1560, q: 4.2, gain: 0.38, env: 0.015 },
          ],
        });
        // Balanced warm woody bottom-out
        const tHit = t0 + 0.012;
        this._exciteCavities(tHit, bus, {
          dur: 0.0024,
          tailEnv: 0.032,
          pitchScale: rowPitch,
          modes: [
            { freq: 330, q: 4.2, gain: 0.52, env: 0.030 },
            { freq: 1180, q: 3.8, gain: 0.48, env: 0.026 },
            { freq: 2320, q: 2.8, gain: 0.28, env: 0.020 },
          ],
        });
        // Snappy return
        const tUp = tHit + 0.072;
        this._exciteCavities(tUp, bus, {
          dur: 0.0020,
          tailEnv: 0.022,
          pitchScale: rowPitch,
          modes: [
            { freq: 880, q: 3.6, gain: 0.24, env: 0.020 },
            { freq: 1860, q: 3.2, gain: 0.22, env: 0.017 },
          ],
        });
      } else if (sw.id === "clicky") {
        // ThockHub Recipe C — Cherry MX Blue / Kailh Box Jade + Aluminum Plate (HPF click-bar snap + 18ms comb)
        const bus = this._buildModBus({
          lpFreq: 11000,
          lpQ: 0.8,
          aluCombGain: 0.09,
          outGain: 3.2,
        });
        // Highpass click-jacket / click-bar dual metallic transient
        this._exciteCavities(t0, bus, {
          dur: 0.0026,
          decayRate: 7.4,
          tailEnv: 0.016,
          pitchScale: rowPitch,
          preFilter: { type: "highpass", freq: 3500 },
          modes: [
            { freq: 3850, q: 6.2, gain: 0.72, env: 0.015 },
            { freq: 6350, q: 5.0, gain: 0.56, env: 0.012 },
          ],
        });
        // Crisp plastic housing bottom-out
        const tHit = t0 + 0.013;
        this._exciteCavities(tHit, bus, {
          dur: 0.0022,
          tailEnv: 0.024,
          pitchScale: rowPitch,
          modes: [
            { freq: 310, q: 3.4, gain: 0.36, env: 0.022 },
            { freq: 2150, q: 3.0, gain: 0.34, env: 0.020 },
          ],
        });
        // Crisp return upstroke click
        const tUp = tHit + 0.070;
        this._exciteCavities(tUp, bus, {
          dur: 0.0022,
          decayRate: 7.2,
          tailEnv: 0.014,
          pitchScale: rowPitch,
          preFilter: { type: "highpass", freq: 3500 },
          modes: [
            { freq: 4300, q: 5.4, gain: 0.42, env: 0.012 },
            { freq: 6800, q: 4.0, gain: 0.28, env: 0.010 },
          ],
        });
      } else {
        // ThockHub Recipe D — HMX / Cherry MX Red + Lubed FR4/Alu Fast Clack
        const bus = this._buildModBus({
          lpFreq: 6800,
          lpQ: 0.95,
          aluCombGain: 0.07,
          outGain: 5.8,
        });
        const tHit = t0 + 0.002;
        this._exciteCavities(tHit, bus, {
          dur: 0.0020,
          decayRate: 6.8,
          tailEnv: 0.024,
          pitchScale: rowPitch,
          modes: [
            { freq: 410, q: 3.6, gain: 0.40, env: 0.022 },
            { freq: 1520, q: 3.4, gain: 0.44, env: 0.020 },
            { freq: 2940, q: 3.2, gain: 0.34, env: 0.017 },
          ],
        });
        // Light airy upstroke
        const tUp = tHit + 0.060;
        this._exciteCavities(tUp, bus, {
          dur: 0.0018,
          decayRate: 7.0,
          tailEnv: 0.018,
          pitchScale: rowPitch,
          modes: [
            { freq: 1150, q: 3.0, gain: 0.20, env: 0.016 },
            { freq: 2450, q: 2.8, gain: 0.18, env: 0.014 },
          ],
        });
      }

      this.activeUntil = performance.now() + 380;
      this._startScope();
      return { count: this.count, sw };
    }

    playPageTurn() {
      if (!this.enabled || !this._ensureContext()) return;
      const now = this.ctx.currentTime;
      const len = Math.floor(this.ctx.sampleRate * 0.11);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const ch = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        const env = Math.sin((i / len) * Math.PI);
        ch[i] = (this._nextRand() * 2 - 1) * env * 0.25;
      }
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const bp = this.ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.setValueAtTime(1600, now);
      bp.frequency.linearRampToValueAtTime(2400, now + 0.1);
      bp.Q.value = 1.2;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.58, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
      src.connect(bp).connect(g).connect(this.dryBus);
      src.start(now);
    }

    playPaperPeel() {
      if (!this.enabled || !this._ensureContext()) return;
      const now = this.ctx.currentTime;
      const len = Math.floor(this.ctx.sampleRate * 0.075);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const ch = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        const env = Math.sin((i / len) * Math.PI);
        ch[i] = (this._nextRand() * 2 - 1) * env * 0.28;
      }
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const bp = this.ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.setValueAtTime(1350, now);
      bp.frequency.linearRampToValueAtTime(2900, now + 0.07);
      bp.Q.value = 1.5;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.48, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
      src.connect(bp).connect(g).connect(this.dryBus);
      src.start(now);
    }

    playPaperStick() {
      if (!this.enabled || !this._ensureContext()) return;
      const now = this.ctx.currentTime;
      this._dampedMode(now, { fStart: 220, fEnd: 88, dur: 0.042, gainVal: 0.09, type: "sine" });
    }

    _startScope() {
      if (!this.scopeCtx || this.raf !== null) return;
      const tick = () => {
        if (performance.now() > this.activeUntil) {
          this.raf = null;
          this.drawIdleLine();
          return;
        }
        this._drawWaveform();
        this.raf = requestAnimationFrame(tick);
      };
      this.raf = requestAnimationFrame(tick);
    }

    _drawWaveform() {
      if (!this.scopeCtx || !this.analyser || !this.data) return;
      const ctx = this.scopeCtx;
      const w = this.scope.width;
      const h = this.scope.height;
      const meta = this.getSwitchMeta();
      this.analyser.getByteTimeDomainData(this.data);
      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = meta.color;
      ctx.lineWidth = 2.0;
      ctx.lineCap = "round";
      ctx.beginPath();
      for (let i = 0; i < this.data.length; i++) {
        const x = (i / (this.data.length - 1)) * w;
        const v = (this.data[i] - 128) / 128;
        const y = h * 0.5 + v * h * 0.9;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    drawIdleLine() {
      if (!this.scopeCtx) return;
      const ctx = this.scopeCtx;
      const w = this.scope.width;
      const h = this.scope.height;
      const meta = this.getSwitchMeta();
      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = 0.72;
      ctx.strokeStyle = meta.color;
      ctx.lineWidth = 1.65;
      ctx.lineCap = "round";
      ctx.beginPath();
      const freq =
        this.switchId === "clicky" ? 7.5 :
        this.switchId === "tactile" ? 4.2 :
        this.switchId === "linear" ? 2.4 : 1.6;
      const amp = this.switchId === "clicky" ? 4.4 : this.switchId === "linear" ? 2.3 : 3.4;
      for (let x = 0; x <= w; x += 2) {
        const u = x / w;
        const env = Math.sin(u * Math.PI);
        const y = h * 0.5 + Math.sin(u * Math.PI * 2 * freq) * amp * env;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  window.KeyCatAudio = KeyCatAudioEngine;
  window.KEYCAT_SWITCHES = SWITCHES;
})();
