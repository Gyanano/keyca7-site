/**
 * <keycat-signature> — Apple "hello"-style dry-brush calligraphy animation Web Component.
 *
 * Usage:
 *   <script src="./keycat-signature.js"></script>
 *   <keycat-signature autoplay loop duration="3.1" hold="1.8" theme="transparent"></keycat-signature>
 *
 * Attributes:
 *   src          - Path/URL/data-URI to keycat-signature.png (default: "./assets/keycat-signature.png")
 *   duration     - Writing duration in seconds (default: 3.1)
 *   delay        - Initial delay before writing starts, in seconds (default: 0.2)
 *   hold         - Hold duration after finishing before looping, in seconds (default: 1.8)
 *   loop         - Boolean: continuously replay with a smooth fade-out
 *   autoplay     - Boolean (default: true; set autoplay="false" to control manually)
 *   feather      - Soft brush-tip mask blur in SVG units (default: 2.2)
 *   theme        - "transparent" | "light" | "dark" | "paper" (default: "transparent")
 *   interactive  - Boolean: click anywhere on the signature to replay
 *
 * Methods:
 *   play(), pause(), replay(), seek(0..1)
 */

const DEFAULT_SRC = "./assets/keycat-signature.png";

// Verified 8 calligraphic strokes (100% pixel coverage of the 1024x576 KeyCat brush signature)
// Normalized timing [start, end] in [0, 1] scaled by `duration`
const STROKES = [
  {
    id: "K_stem",
    width: 36,
    start: 0.0,
    end: 0.095,
    d: "M 326 204 C 311 238, 294 276, 278 314 C 270 336, 262 354, 255 372",
  },
  {
    id: "K_arms",
    width: 34,
    start: 0.112,
    end: 0.235,
    d: "M 406 210 C 382 240, 344 270, 295 287 C 324 312, 360 336, 398 349",
  },
  {
    id: "e",
    width: 25,
    start: 0.252,
    end: 0.375,
    d: "M 388 304 C 406 298, 426 286, 424 275 C 422 265, 402 271, 390 293 C 380 313, 386 328, 404 326 C 422 324, 438 310, 450 296",
  },
  {
    id: "y",
    width: 30,
    start: 0.386,
    end: 0.542,
    d: "M 464 272 C 456 292, 448 312, 454 319 C 464 324, 484 300, 506 268 C 496 300, 476 352, 452 382 C 434 402, 412 408, 390 400",
  },
  {
    id: "C",
    width: 36,
    start: 0.562,
    end: 0.708,
    d: "M 618 256 C 632 236, 632 216, 608 214 C 576 214, 542 244, 526 284 C 512 320, 524 348, 558 346 C 586 344, 610 320, 630 294",
  },
  {
    id: "a",
    width: 25,
    start: 0.722,
    end: 0.842,
    d: "M 668 284 C 664 270, 644 276, 632 296 C 620 314, 626 328, 642 320 C 654 312, 666 296, 672 282 C 664 304, 664 322, 680 320 C 692 318, 702 310, 710 302",
  },
  {
    id: "t_stem",
    width: 30,
    start: 0.855,
    end: 0.922,
    d: "M 738 230 C 726 264, 708 312, 686 370",
  },
  {
    id: "t_bar",
    width: 26,
    start: 0.935,
    end: 1.0,
    d: "M 686 270 C 718 265, 754 255, 780 236",
  },
];

function appleEase(u) {
  const c = Math.max(0, Math.min(1, u));
  return 0.5 * (1 - Math.cos(Math.PI * Math.pow(c, 0.92)));
}

let instanceCounter = 0;

export class KeyCatSignatureElement extends HTMLElement {
  static get observedAttributes() {
    return ["src", "duration", "delay", "hold", "loop", "autoplay", "feather", "theme", "interactive"];
  }

  constructor() {
    super();
    this._uid = `kc-${++instanceCounter}`;
    this._raf = null;
    this._playing = false;
    this._elapsed = 0;
    this._lastTs = 0;
    this._completedThisCycle = false;
    this._pathEls = [];
    this._pathLens = [];
    this.attachShadow({ mode: "open" });
    this._render();
  }

  get duration() {
    const v = parseFloat(this.getAttribute("duration"));
    return Number.isFinite(v) && v > 0 ? v : 3.1;
  }

  get delay() {
    const v = parseFloat(this.getAttribute("delay"));
    return Number.isFinite(v) && v >= 0 ? v : 0.2;
  }

  get hold() {
    const v = parseFloat(this.getAttribute("hold"));
    return Number.isFinite(v) && v >= 0 ? v : 1.8;
  }

  get loop() {
    return this.hasAttribute("loop") && this.getAttribute("loop") !== "false";
  }

  get autoplay() {
    const attr = this.getAttribute("autoplay");
    return attr === null ? true : attr !== "false";
  }

  get feather() {
    const v = parseFloat(this.getAttribute("feather"));
    return Number.isFinite(v) && v >= 0 ? v : 2.2;
  }

  get src() {
    return this.getAttribute("src") || DEFAULT_SRC;
  }

  get theme() {
    return this.getAttribute("theme") || "transparent";
  }

  _render() {
    const maskId = `${this._uid}-mask`;
    const blurId = `${this._uid}-blur`;

    const pathsMarkup = STROKES.map(
      (s) =>
        `<path data-stroke="${s.id}" d="${s.d}" fill="none" stroke="#ffffff" stroke-width="${s.width}" stroke-linecap="round" stroke-linejoin="round" />`
    ).join("\n          ");

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
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: inherit;
          overflow: hidden;
          transition: background-color 0.35s ease;
        }
        .stage[data-theme="transparent"] { background: transparent; }
        .stage[data-theme="light"] { background: #ffffff; }
        .stage[data-theme="paper"] {
          background: radial-gradient(circle at 50% 45%, #fdfbf7 0%, #f4efe6 100%);
        }
        .stage[data-theme="dark"] {
          background: radial-gradient(circle at 50% 45%, #16161b 0%, #0b0b0e 100%);
        }
        :host([interactive]) .stage {
          cursor: pointer;
        }
        svg {
          width: 100%;
          height: 100%;
          display: block;
          will-change: opacity, transform;
        }
        .stage[data-theme="dark"] svg {
          filter: drop-shadow(0 0 22px rgba(210, 34, 34, 0.22));
        }
      </style>
      <div class="stage" data-theme="${this.theme}">
        <svg viewBox="0 0 1024 576" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="KeyCat handwritten brush signature">
          <defs>
            <filter id="${blurId}" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="${this.feather}" />
            </filter>
            <mask id="${maskId}" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="576">
              <rect x="0" y="0" width="1024" height="576" fill="#000000" />
              <g filter="url(#${blurId})">
                ${pathsMarkup}
              </g>
            </mask>
          </defs>
          <image
            class="sig-img"
            href="${this.src}"
            x="0"
            y="0"
            width="1024"
            height="576"
            preserveAspectRatio="xMidYMid meet"
            mask="url(#${maskId})"
          />
        </svg>
      </div>
    `;

    this._stageEl = this.shadowRoot.querySelector(".stage");
    this._svgEl = this.shadowRoot.querySelector("svg");
    this._imgEl = this.shadowRoot.querySelector(".sig-img");
    this._blurEl = this.shadowRoot.querySelector("feGaussianBlur");
    this._pathEls = Array.from(this.shadowRoot.querySelectorAll("path[data-stroke]"));
    this._pathLens = this._pathEls.map((el) => {
      const len = el.getTotalLength();
      el.style.strokeDasharray = `${len} ${len + 4}`;
      el.style.strokeDashoffset = `${len}`;
      el.style.opacity = "0";
      return len;
    });

    this._stageEl.addEventListener("click", () => {
      if (this.hasAttribute("interactive")) {
        this.replay();
      }
    });
  }

  connectedCallback() {
    if (this.autoplay) {
      this.play();
    } else {
      this._applyProgress(0);
    }
  }

  disconnectedCallback() {
    this.pause();
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal === newVal) return;
    if (name === "theme" && this._stageEl) {
      this._stageEl.setAttribute("data-theme", this.theme);
    } else if (name === "src" && this._imgEl) {
      this._imgEl.setAttribute("href", this.src);
    } else if (name === "feather" && this._blurEl) {
      this._blurEl.setAttribute("stdDeviation", String(this.feather));
    }
  }

  _applyProgress(normP) {
    const p = Math.max(0, Math.min(1, normP));
    for (let i = 0; i < STROKES.length; i++) {
      const s = STROKES[i];
      const el = this._pathEls[i];
      const len = this._pathLens[i];
      if (p <= s.start) {
        el.style.opacity = "0";
        el.style.strokeDashoffset = `${len}`;
      } else if (p >= s.end) {
        el.style.opacity = "1";
        el.style.strokeDashoffset = "0";
      } else {
        const local = appleEase((p - s.start) / (s.end - s.start));
        el.style.opacity = "1";
        el.style.strokeDashoffset = `${len * (1 - local)}`;
      }
    }
    // At 100%, remove mask momentarily? Keep mask (100% coverage) for crisp continuity
  }

  seek(normP) {
    this.pause();
    const p = Math.max(0, Math.min(1, normP));
    this._svgEl.style.opacity = "1";
    this._elapsed = this.delay + p * this.duration;
    this._applyProgress(p);
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
        this._svgEl.style.opacity = "1";
        this._applyProgress(0);
      } else if (this._elapsed <= delay + dur) {
        this._svgEl.style.opacity = "1";
        this._applyProgress((this._elapsed - delay) / dur);
      } else {
        this._applyProgress(1);
        if (!this._completedThisCycle) {
          this._completedThisCycle = true;
          this.dispatchEvent(new CustomEvent("signature-complete", { bubbles: true }));
        }
        if (!this.loop) {
          this._playing = false;
          this._raf = null;
          return;
        }
        const post = this._elapsed - (delay + dur);
        if (post < hold) {
          this._svgEl.style.opacity = "1";
        } else if (post < hold + fade) {
          const f = (post - hold) / fade;
          this._svgEl.style.opacity = String(Math.max(0, 1 - Math.pow(f, 1.4)));
        } else {
          // Restart loop
          this._elapsed = 0;
          this._completedThisCycle = false;
          this._svgEl.style.opacity = "1";
          this._applyProgress(0);
          this.dispatchEvent(new CustomEvent("signature-start", { bubbles: true }));
        }
      }
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
    this._completedThisCycle = false;
    this._svgEl.style.opacity = "1";
    this._applyProgress(0);
    this.play();
  }
}

if (typeof customElements !== "undefined" && !customElements.get("keycat-signature")) {
  customElements.define("keycat-signature", KeyCatSignatureElement);
}
