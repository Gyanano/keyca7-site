import React, { useEffect, useId, useRef, useImperativeHandle, forwardRef } from "react";

export type SignatureTheme = "transparent" | "light" | "paper" | "dark";

export interface KeyCatSignatureProps {
  /** Image URL or data URI for keycat-signature.png */
  src?: string;
  /** Writing animation duration in seconds (default: 3.1) */
  duration?: number;
  /** Initial delay before writing starts in seconds (default: 0.2) */
  delay?: number;
  /** Hold duration after completion before looping, in seconds (default: 1.8) */
  hold?: number;
  /** Continuously loop with a smooth fade-out */
  loop?: boolean;
  /** Automatically play on mount (default: true) */
  autoplay?: boolean;
  /** Soft brush-tip mask feather radius (default: 2.2) */
  feather?: number;
  /** Background theme preset (default: "transparent") */
  theme?: SignatureTheme;
  /** Click anywhere to replay (default: true) */
  interactive?: boolean;
  /** Optional progress override in [0, 1] for controlled scrubbing */
  progress?: number;
  /** Fired when a writing cycle starts */
  onStart?: () => void;
  /** Fired when writing finishes */
  onComplete?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export interface KeyCatSignatureHandle {
  play: () => void;
  pause: () => void;
  replay: () => void;
  seek: (progress: number) => void;
}

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
] as const;

const THEME_BG: Record<SignatureTheme, string> = {
  transparent: "transparent",
  light: "#ffffff",
  paper: "radial-gradient(circle at 50% 45%, #fdfbf7 0%, #f4efe6 100%)",
  dark: "radial-gradient(circle at 50% 45%, #16161b 0%, #0b0b0e 100%)",
};

function appleEase(u: number): number {
  const c = Math.max(0, Math.min(1, u));
  return 0.5 * (1 - Math.cos(Math.PI * Math.pow(c, 0.92)));
}

export const KeyCatSignature = forwardRef<KeyCatSignatureHandle, KeyCatSignatureProps>(
  function KeyCatSignature(
    {
      src = "/assets/keycat-signature.png",
      duration = 3.1,
      delay = 0.2,
      hold = 1.8,
      loop = false,
      autoplay = true,
      feather = 2.2,
      theme = "transparent",
      interactive = true,
      progress,
      onStart,
      onComplete,
      className,
      style,
    },
    ref
  ) {
    const uid = useId().replace(/:/g, "");
    const svgRef = useRef<SVGSVGElement | null>(null);
    const pathRefs = useRef<(SVGPathElement | null)[]>([]);
    const lengthsRef = useRef<number[]>([]);
    const stateRef = useRef({
      playing: false,
      raf: null as number | null,
      elapsed: 0,
      lastTs: 0,
      completed: false,
    });

    const applyProgress = (normP: number) => {
      const p = Math.max(0, Math.min(1, normP));
      STROKES.forEach((s, i) => {
        const el = pathRefs.current[i];
        const len = lengthsRef.current[i] || 1;
        if (!el) return;
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
      });
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
          if (svgRef.current) svgRef.current.style.opacity = "1";
          applyProgress(0);
        } else if (st.elapsed <= delay + duration) {
          if (svgRef.current) svgRef.current.style.opacity = "1";
          applyProgress((st.elapsed - delay) / duration);
        } else {
          applyProgress(1);
          if (!st.completed) {
            st.completed = true;
            onComplete?.();
          }
          if (!loop) {
            st.playing = false;
            st.raf = null;
            return;
          }
          const post = st.elapsed - (delay + duration);
          if (post < hold) {
            if (svgRef.current) svgRef.current.style.opacity = "1";
          } else if (post < hold + fade) {
            const f = (post - hold) / fade;
            if (svgRef.current) {
              svgRef.current.style.opacity = String(Math.max(0, 1 - Math.pow(f, 1.4)));
            }
          } else {
            st.elapsed = 0;
            st.completed = false;
            if (svgRef.current) svgRef.current.style.opacity = "1";
            applyProgress(0);
            onStart?.();
          }
        }
        st.raf = requestAnimationFrame(tick);
      };
      st.raf = requestAnimationFrame(tick);
    };

    const replay = () => {
      pause();
      stateRef.current.elapsed = 0;
      stateRef.current.completed = false;
      if (svgRef.current) svgRef.current.style.opacity = "1";
      applyProgress(0);
      play();
    };

    const seek = (p: number) => {
      pause();
      const clamped = Math.max(0, Math.min(1, p));
      if (svgRef.current) svgRef.current.style.opacity = "1";
      stateRef.current.elapsed = delay + clamped * duration;
      applyProgress(clamped);
    };

    useImperativeHandle(ref, () => ({ play, pause, replay, seek }));

    useEffect(() => {
      lengthsRef.current = STROKES.map((_, i) => {
        const el = pathRefs.current[i];
        if (!el) return 1;
        const len = el.getTotalLength();
        el.style.strokeDasharray = `${len} ${len + 4}`;
        el.style.strokeDashoffset = `${len}`;
        el.style.opacity = "0";
        return len;
      });

      if (typeof progress === "number") {
        seek(progress);
      } else if (autoplay) {
        replay();
      }
      return () => pause();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [duration, delay, hold, loop, autoplay]);

    useEffect(() => {
      if (typeof progress === "number") {
        seek(progress);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [progress]);

    const maskId = `kc-mask-${uid}`;
    const blurId = `kc-blur-${uid}`;

    return (
      <div
        className={className}
        onClick={interactive ? replay : undefined}
        style={{
          width: "100%",
          aspectRatio: "16 / 9",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: THEME_BG[theme],
          cursor: interactive ? "pointer" : "default",
          userSelect: "none",
          overflow: "hidden",
          ...style,
        }}
      >
        <svg
          ref={svgRef}
          viewBox="0 0 1024 576"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="KeyCat handwritten brush signature"
          style={{
            width: "100%",
            height: "100%",
            display: "block",
            filter: theme === "dark" ? "drop-shadow(0 0 22px rgba(210, 34, 34, 0.22))" : undefined,
          }}
        >
          <defs>
            <filter id={blurId} x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation={feather} />
            </filter>
            <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="576">
              <rect x="0" y="0" width="1024" height="576" fill="#000000" />
              <g filter={`url(#${blurId})`}>
                {STROKES.map((s, i) => (
                  <path
                    key={s.id}
                    ref={(el) => {
                      pathRefs.current[i] = el;
                    }}
                    d={s.d}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth={s.width}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
              </g>
            </mask>
          </defs>
          <image
            href={src}
            x="0"
            y="0"
            width="1024"
            height="576"
            preserveAspectRatio="xMidYMid meet"
            mask={`url(#${maskId})`}
          />
        </svg>
      </div>
    );
  }
);

export default KeyCatSignature;
