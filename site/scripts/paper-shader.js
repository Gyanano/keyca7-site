/**
 * KeyCatPaperShader — Real-time WebGL2 procedural xuan-paper fiber light
 * & multi-color fluid ink-bleed ripple shader.
 */
(function () {
  const MAX_RIPPLES = 8;

  const VS_GL2 = `#version 300 es
    in vec2 aPos;
    out vec2 vUv;
    void main() {
      vUv = aPos * 0.5 + 0.5;
      gl_Position = vec4(aPos, 0.0, 1.0);
    }
  `;

  const FS_GL2 = `#version 300 es
    precision highp float;
    in vec2 vUv;
    out vec4 fragColor;

    uniform vec2 uRes;
    uniform float uTime;
    uniform vec2 uMouse;
    uniform float uScroll;
    uniform float uDissolve;
    uniform vec4 uRipples[${MAX_RIPPLES}];
    uniform vec3 uRippleColor[${MAX_RIPPLES}];

    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
        u.y
      );
    }

    float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      for (int i = 0; i < 4; i++) {
        v += a * noise(p);
        p *= 2.04;
        a *= 0.5;
      }
      return v;
    }

    void main() {
      vec2 aspect = vec2(uRes.x / max(uRes.y, 1.0), 1.0);
      vec2 uv = vUv;
      vec2 p = (uv - 0.5) * aspect;

      float grainFine = noise(gl_FragCoord.xy * 0.36);
      float fiberA = fbm(gl_FragCoord.xy * 0.022 + vec2(3.1, 7.4));
      float fiberB = fbm(gl_FragCoord.xy * 0.075 * vec2(1.35, 0.65) + vec2(12.7, 2.9));
      float paperMask = (fiberA - 0.5) * 0.026 + (fiberB - 0.5) * 0.018 + (grainFine - 0.5) * 0.022;

      vec3 basePaper = vec3(0.9569, 0.9373, 0.8941);
      vec3 cottonGlow = vec3(0.992, 0.980, 0.953);
      vec3 vermilion = vec3(0.8196, 0.2941, 0.1725);
      vec3 sumiInk = vec3(0.1647, 0.1490, 0.1333);

      vec2 stageFocus = vec2(0.5, mix(0.38, 0.52, clamp(uScroll * 1.4, 0.0, 1.0)));
      vec2 mouseFocus = mix(stageFocus, uMouse, 0.42);
      float lightDist = length((uv - mouseFocus) * aspect);
      float grazingLight = exp(-lightDist * lightDist * 2.15) * 0.34;

      float catHaloDist = length((uv - vec2(0.5, mix(0.88, 0.48, smoothstep(0.05, 0.26, uScroll)))) * aspect);
      float catHalo = exp(-catHaloDist * catHaloDist * 4.5) * 0.048 * (1.0 - smoothstep(0.40, 0.58, uScroll));

      vec3 col = mix(basePaper, cottonGlow, grazingLight);
      col += paperMask;
      col = mix(col, vermilion, catHalo);

      if (uDissolve > 0.005) {
        float mist = fbm(p * 3.2 + vec2(uTime * 0.04, -uScroll * 2.4));
        col = mix(col, sumiInk, uDissolve * smoothstep(0.38, 0.78, mist) * 0.032);
      }

      for (int i = 0; i < ${MAX_RIPPLES}; i++) {
        vec4 rp = uRipples[i];
        float age = rp.z;
        float strength = rp.w;
        if (strength <= 0.001 || age < 0.0 || age > 1.0) continue;

        vec2 d = (uv - rp.xy) * aspect;
        float dist = length(d);
        float bleedNoise = fbm(d * 14.0 + vec2(float(i) * 4.7, age * 1.5));
        float targetR = (0.04 + age * 0.38) * (0.85 + 0.32 * bleedNoise);
        float ring = exp(-pow((dist - targetR) / (0.024 + age * 0.034), 2.0));
        float coreWash = exp(-dist * dist / (0.004 + age * 0.018)) * (1.0 - age) * 0.36;
        float fade = pow(1.0 - age, 1.45) * strength;
        float inkAmt = clamp((ring * 0.16 + coreWash * 0.14) * fade * (0.7 + 0.6 * bleedNoise), 0.0, 0.26);

        col = mix(col, uRippleColor[i], inkAmt);
      }

      float vig = smoothstep(0.35, 1.05, length(p));
      col *= 1.0 - vig * 0.025;

      fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `;

  function parseRippleRgb(input) {
    if (Array.isArray(input) && input.length >= 3) {
      return [Number(input[0]) || 0, Number(input[1]) || 0, Number(input[2]) || 0];
    }
    if (typeof input === "string" && /^#[0-9a-f]{6}$/i.test(input.trim())) {
      const hex = input.trim().slice(1);
      return [
        parseInt(hex.slice(0, 2), 16) / 255,
        parseInt(hex.slice(2, 4), 16) / 255,
        parseInt(hex.slice(4, 6), 16) / 255,
      ];
    }
    return input === false ? [0.1647, 0.1490, 0.1333] : [0.8196, 0.2941, 0.1725];
  }

  function compileShader(gl, type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  class PaperShaderEngine {
    constructor(canvas) {
      this.canvas = canvas;
      this.gl = null;
      this.program = null;
      this.enabled = true;
      this.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      this.raf = null;
      this.startTs = performance.now();
      this.mouse = { x: 0.5, y: 0.42, tx: 0.5, ty: 0.42 };
      this.scroll = 0;
      this.dissolve = 0;
      this.ripples = Array.from({ length: MAX_RIPPLES }, () => ({
        x: 0.5, y: 0.5, born: -999, dur: 1.6, strength: 0, color: [0.8196, 0.2941, 0.1725],
      }));
      this.rippleCursor = 0;

      if (!canvas || this.reduced) return;
      this._initGL();
    }

    _initGL() {
      const gl = this.canvas.getContext("webgl2", {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        powerPreference: "low-power",
      });
      if (!gl) return;

      const vs = compileShader(gl, gl.VERTEX_SHADER, VS_GL2);
      const fs = compileShader(gl, gl.FRAGMENT_SHADER, FS_GL2);
      if (!vs || !fs) return;

      const prog = gl.createProgram();
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        gl.deleteProgram(prog);
        return;
      }

      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, "aPos");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

      this.gl = gl;
      this.program = prog;
      this.uniforms = {
        res: gl.getUniformLocation(prog, "uRes"),
        time: gl.getUniformLocation(prog, "uTime"),
        mouse: gl.getUniformLocation(prog, "uMouse"),
        scroll: gl.getUniformLocation(prog, "uScroll"),
        dissolve: gl.getUniformLocation(prog, "uDissolve"),
        ripples: gl.getUniformLocation(prog, "uRipples"),
        color: gl.getUniformLocation(prog, "uRippleColor"),
      };

      this.resize();
      window.addEventListener("resize", () => this.resize());
      window.addEventListener("pointermove", (e) => {
        this.mouse.tx = Math.max(0, Math.min(1, e.clientX / Math.max(1, window.innerWidth)));
        this.mouse.ty = 1.0 - Math.max(0, Math.min(1, e.clientY / Math.max(1, window.innerHeight)));
      }, { passive: true });

      document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
          this.stop();
        } else if (this.enabled) {
          this.start();
        }
      });

      this.start();
    }

    isWebGL() {
      return Boolean(this.gl);
    }

    resize() {
      if (!this.gl) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.max(1, Math.floor(window.innerWidth * dpr));
      const h = Math.max(1, Math.floor(window.innerHeight * dpr));
      if (this.canvas.width !== w || this.canvas.height !== h) {
        this.canvas.width = w;
        this.canvas.height = h;
        this.gl.viewport(0, 0, w, h);
      }
    }

    setScrollProgress(scrollP, dissolveAmount) {
      this.scroll = scrollP;
      this.dissolve = dissolveAmount;
    }

    triggerRipple(normX, normY, colorOrBool = true, strength = 1.0) {
      const slot = this.ripples[this.rippleCursor];
      this.rippleCursor = (this.rippleCursor + 1) % MAX_RIPPLES;
      slot.x = normX;
      slot.y = 1.0 - normY;
      slot.born = (performance.now() - this.startTs) * 0.001;
      slot.dur = 1.45 + Math.random() * 0.45;
      slot.strength = strength;
      slot.color = parseRippleRgb(colorOrBool);
    }

    setEnabled(val) {
      this.enabled = Boolean(val);
      this.canvas.style.opacity = this.enabled ? "1" : "0";
      if (this.enabled && !this.reduced) {
        this.start();
      } else {
        this.stop();
      }
    }

    start() {
      if (!this.gl || this.raf !== null) return;
      const tick = (now) => {
        if (!this.enabled || document.hidden) {
          this.raf = null;
          return;
        }
        this._draw((now - this.startTs) * 0.001);
        this.raf = requestAnimationFrame(tick);
      };
      this.raf = requestAnimationFrame(tick);
    }

    stop() {
      if (this.raf !== null) {
        cancelAnimationFrame(this.raf);
        this.raf = null;
      }
    }

    _draw(t) {
      const gl = this.gl;
      if (!gl || !this.program) return;

      this.mouse.x += (this.mouse.tx - this.mouse.x) * 0.08;
      this.mouse.y += (this.mouse.ty - this.mouse.y) * 0.08;

      gl.useProgram(this.program);
      gl.uniform2f(this.uniforms.res, this.canvas.width, this.canvas.height);
      gl.uniform1f(this.uniforms.time, t);
      gl.uniform2f(this.uniforms.mouse, this.mouse.x, this.mouse.y);
      gl.uniform1f(this.uniforms.scroll, this.scroll);
      gl.uniform1f(this.uniforms.dissolve, this.dissolve);

      const rpData = new Float32Array(MAX_RIPPLES * 4);
      const colorData = new Float32Array(MAX_RIPPLES * 3);
      for (let i = 0; i < MAX_RIPPLES; i++) {
        const r = this.ripples[i];
        const age = r.strength > 0 ? (t - r.born) / r.dur : 2.0;
        rpData[i * 4] = r.x;
        rpData[i * 4 + 1] = r.y;
        rpData[i * 4 + 2] = age;
        rpData[i * 4 + 3] = age >= 0 && age <= 1 ? r.strength : 0;
        colorData[i * 3] = r.color[0];
        colorData[i * 3 + 1] = r.color[1];
        colorData[i * 3 + 2] = r.color[2];
        if (age > 1.0) r.strength = 0;
      }
      gl.uniform4fv(this.uniforms.ripples, rpData);
      gl.uniform3fv(this.uniforms.color, colorData);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
  }

  window.KeyCatPaperShader = PaperShaderEngine;
})();
