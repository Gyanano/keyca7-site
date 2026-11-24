/**
 * KeyCatStickyNotes — Pinch-any-corner 3D peel-and-stick realistic sticky notes.
 * Operates on `.sticky-note-wrap` containing separate `.sticky-shadow` behind `.desk-note`
 * so corner-curl shadows never cut across text.
 */
(function () {
  class StickyNotesController {
    constructor(selector) {
      this.wraps = Array.from(document.querySelectorAll(selector));
      this.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      this.items = [];
      this.raf = null;
      this.topZ = 16;
      if (!this.wraps.length) return;
      this._bind();
    }

    _isDesktopInteractive() {
      return !this.reduced && window.innerWidth >= 860;
    }

    _bind() {
      this.wraps.forEach((wrap, idx) => {
        const note = wrap.querySelector(".desk-note");
        const shadow = wrap.querySelector(".sticky-shadow");
        if (!note) return;

        const baseRot = parseFloat(wrap.dataset.rot || "0");
        const homeX = (Math.random() - 0.5) * 32;
        const homeY = (Math.random() - 0.5) * 24;
        const homeRot = baseRot + (Math.random() - 0.5) * 4.8;

        const state = {
          wrap,
          note,
          shadow,
          idx,
          x: homeX,
          y: homeY,
          vx: 0,
          vy: 0,
          rot: homeRot,
          vrot: 0,
          homeX,
          homeY,
          homeRot,
          targetRot: homeRot,
          // Pinch corner state
          gx: 0.5,
          gy: 0.85,
          peelTiltX: 4.5, // resting gentle bottom curl
          peelTiltY: 0,
          targetTiltX: 4.5,
          targetTiltY: 0,
          peelAmt: 0,
          detached: false,
          dragging: false,
          resetting: false,
          downX: 0,
          downY: 0,
          startX: 0,
          startY: 0,
          lastX: 0,
          lastY: 0,
          lastT: 0,
        };
        this.items.push(state);
        if (this._isDesktopInteractive()) {
          this._apply(state);
        }

        note.addEventListener("pointerdown", (e) => {
          if (!this._isDesktopInteractive()) return;
          if (e.target.closest("button, a")) return;

          const rect = note.getBoundingClientRect();
          const gx = Math.max(0, Math.min(1, (e.clientX - rect.left) / Math.max(1, rect.width)));
          const gy = Math.max(0, Math.min(1, (e.clientY - rect.top) / Math.max(1, rect.height)));

          state.gx = gx;
          state.gy = gy;
          // Pivot paper lift opposite the pinched corner!
          note.style.transformOrigin = `${((1 - gx) * 100).toFixed(0)}% ${((1 - gy) * 100).toFixed(0)}%`;

          state.dragging = true;
          state.detached = false;
          state.resetting = false;
          state.vx = 0;
          state.vy = 0;
          state.downX = e.clientX;
          state.downY = e.clientY;
          state.startX = e.clientX - state.x;
          state.startY = e.clientY - state.y;
          state.lastX = e.clientX;
          state.lastY = e.clientY;
          state.lastT = performance.now();

          this.topZ += 1;
          wrap.style.zIndex = String(this.topZ);
          wrap.classList.add("is-peeling");
          window.__keycatAudio?.playPaperPeel?.();

          // Immediate subtle corner pinch response before dragging out
          state.targetTiltX = (gy - 0.35) * 16;
          state.targetTiltY = (0.5 - gx) * 14;
          state.peelAmt = 0.25;
          this._startLoop();
          note.setPointerCapture(e.pointerId);
        });

        note.addEventListener("pointermove", (e) => {
          if (!state.dragging) return;
          const now = performance.now();
          const dt = Math.max(8, now - state.lastT);
          const dx = e.clientX - state.lastX;
          const dy = e.clientY - state.lastY;
          state.vx = (dx / dt) * 16;
          state.vy = (dy / dt) * 16;

          const totalDist = Math.hypot(e.clientX - state.downX, e.clientY - state.downY);
          if (!state.detached && totalDist >= 18) {
            state.detached = true;
            wrap.classList.add("is-peeled");
            note.style.transformOrigin = "50% 18%";
          }

          if (!state.detached) {
            // Stage 1: Pinched corner peels upward while adhesive resists
            const pullRatio = Math.min(1, totalDist / 18);
            state.x = state.startX ? (state.downX - state.startX) + (e.clientX - state.downX) * 0.24 : state.x;
            state.y = state.startY ? (state.downY - state.startY) + (e.clientY - state.downY) * 0.24 : state.y;
            state.peelAmt = 0.25 + pullRatio * 0.65;
            state.targetTiltX = (state.gy - 0.25) * (18 + pullRatio * 12);
            state.targetTiltY = (0.5 - state.gx) * (16 + pullRatio * 12);
          } else {
            // Stage 2: Detached free positioning inside viewport bounds
            const wRect = wrap.getBoundingClientRect();
            const minX = -(wRect.left - state.x) + 18;
            const maxX = window.innerWidth - (wRect.right - state.x) - 18;
            const minY = -(wRect.top - state.y) + 74;
            const maxY = window.innerHeight - (wRect.bottom - state.y) - 18;

            const nx = e.clientX - state.startX;
            const ny = e.clientY - state.startY;
            state.x = Math.max(minX, Math.min(maxX, nx));
            state.y = Math.max(minY, Math.min(maxY, ny));
            state.peelAmt = 1;
            state.rot = state.targetRot + Math.max(-9, Math.min(9, state.vx * 0.42));
            state.targetTiltX = 6 + Math.max(-8, Math.min(10, -state.vy * 0.45));
            state.targetTiltY = Math.max(-10, Math.min(10, state.vx * 0.55));
          }

          state.lastX = e.clientX;
          state.lastY = e.clientY;
          state.lastT = now;
          this._apply(state);
        });

        const release = (e) => {
          if (!state.dragging) return;
          state.dragging = false;
          wrap.classList.remove("is-peeling", "is-peeled");

          // Stage 3: Top-down paste settle — glued edge sticks down first, leaving gentle bottom curl
          note.style.transformOrigin = "50% 6%";
          state.targetTiltX = 4.5;
          state.targetTiltY = 0;
          state.peelAmt = 0;
          if (state.detached) {
            state.targetRot = Math.max(-8, Math.min(8, baseRot + Math.max(-3.8, Math.min(3.8, state.vx * 0.24))));
            state.vx *= 0.36;
            state.vy *= 0.36;
          } else {
            state.vx = 0;
            state.vy = 0;
          }
          window.__keycatAudio?.playPaperStick?.();
          try {
            note.releasePointerCapture(e.pointerId);
          } catch (_) {}
          this._startLoop();
        };

        note.addEventListener("pointerup", release);
        note.addEventListener("pointercancel", release);
      });
    }

    resetAll() {
      this.items.forEach((s) => {
        s.resetting = true;
        s.detached = false;
        s.targetRot = s.homeRot;
        s.targetTiltX = 4.5;
        s.targetTiltY = 0;
        s.peelAmt = 0;
        s.note.style.transformOrigin = "50% 6%";
      });
      this._startLoop();
    }

    _apply(s) {
      s.wrap.style.transform = `translate3d(${s.x.toFixed(2)}px, ${s.y.toFixed(2)}px, 0) rotate(${s.rot.toFixed(2)}deg)`;
      s.note.style.transform = `perspective(760px) rotateX(${s.peelTiltX.toFixed(2)}deg) rotateY(${s.peelTiltY.toFixed(2)}deg) scale(${(1 + s.peelAmt * 0.025).toFixed(4)})`;
      if (s.shadow) {
        const sLift = s.peelAmt * 14;
        const sShiftX = -s.peelTiltY * 0.55;
        s.shadow.style.transform = `translate3d(${sShiftX.toFixed(1)}px, ${(4 + sLift).toFixed(1)}px, 0) scale(${(0.96 + s.peelAmt * 0.07).toFixed(3)})`;
        s.shadow.style.opacity = String((0.72 + s.peelAmt * 0.28).toFixed(2));
      }
    }

    _startLoop() {
      if (this.raf !== null) return;
      const tick = () => {
        let moving = false;
        for (const s of this.items) {
          // Smooth corner-tilt interpolation even while dragging
          s.peelTiltX += (s.targetTiltX - s.peelTiltX) * 0.24;
          s.peelTiltY += (s.targetTiltY - s.peelTiltY) * 0.24;

          if (s.dragging) {
            this._apply(s);
            moving = true;
            continue;
          }

          if (s.resetting) {
            s.x += (s.homeX - s.x) * 0.16;
            s.y += (s.homeY - s.y) * 0.16;
            s.rot += (s.homeRot - s.rot) * 0.18;
            this._apply(s);
            if (Math.abs(s.x - s.homeX) < 0.3 && Math.abs(s.y - s.homeY) < 0.3 && Math.abs(s.rot - s.homeRot) < 0.08 && Math.abs(s.peelTiltX - 4.5) < 0.15) {
              s.x = s.homeX;
              s.y = s.homeY;
              s.rot = s.homeRot;
              s.peelTiltX = 4.5;
              s.peelTiltY = 0;
              s.vx = 0;
              s.vy = 0;
              s.resetting = false;
              this._apply(s);
            } else {
              moving = true;
            }
            continue;
          }

          s.vx *= 0.72;
          s.vy *= 0.72;
          s.x += s.vx;
          s.y += s.vy;

          const rotDiff = s.targetRot - s.rot;
          s.vrot = (s.vrot + rotDiff * 0.16) * 0.76;
          s.rot += s.vrot;
          this._apply(s);

          if (
            Math.abs(s.vx) > 0.05 ||
            Math.abs(s.vy) > 0.05 ||
            Math.abs(rotDiff) > 0.08 ||
            Math.abs(s.vrot) > 0.04 ||
            Math.abs(s.targetTiltX - s.peelTiltX) > 0.12 ||
            Math.abs(s.targetTiltY - s.peelTiltY) > 0.12
          ) {
            moving = true;
          }
        }
        if (moving) {
          this.raf = requestAnimationFrame(tick);
        } else {
          this.raf = null;
        }
      };
      this.raf = requestAnimationFrame(tick);
    }
  }

  window.KeyCatSpringNotes = StickyNotesController;
})();
