# KeyCat · Design System (`DESIGN.md`)

## Palette & Switch Color Coding (Verified >= 4.5:1 on `#f4efe4`)
- `--paper`: `#f4efe4` (warm yellowed xuan paper)
- `--ink`: `#2a2622` (charcoal pine-soot ink, primary text)
- `--ink-soft`: `#4e4740` (primary body prose)
- `--ink-muted`: `#635a51` (secondary hints & labels, >= 5.2:1)
- `--accent`: `#d14b2c` (cinnabar vermilion primary accent)
- `--accent-ink`: `#b3381c` (small vermilion ink labels, >= 4.8:1)
- **Switch Color Sync**:
  - Thock `62g`: `#c84326` (`rgb(200, 67, 38)`)
  - Tactile `55g`: `#8a5428` (`rgb(138, 84, 40)`)
  - Clicky `50g`: `#1f6b7a` (`rgb(31, 107, 122)`)
  - Linear `45g`: `#b52e46` (`rgb(181, 46, 70)`)

## Physics, Acoustics & Motion Architecture
- **No bouncy CSS curves**: Transitions stick strictly to `cubic-bezier(0.16, 1, 0.3, 1)` (`ease-out-expo`).
- **Bottom-Entering Cat Arm & Colored Vinyl Swap (`#bgmTurntable`, `#bgmSwapBtn`)**: Extended real KeyCat forearm PNG enters seamlessly from `bottom: 0`. Four royalty-free Kevin MacLeod BGM tracks pair with 4 color-coded vinyl SVGs (`vinyl-record*.svg`). Clicking `换碟` runs a two-branch choreography: if playing, pauses spin while holding paw on disc -> slides paw + disc together off-screen -> swaps colored disc & track -> slides back up and resumes; if paused, lands paw onto disc without playing -> swaps off-screen -> brings new disc back up and releases paw cleanly to rest.
- **Pinch-Any-Corner Sticky Notes (`spring-notes.js`)**: Separated `.sticky-shadow` behind `.desk-note` inside `.sticky-note-wrap` avoids clipped corner shadows. `pointerdown` sets `transform-origin` opposite the grabbed `(gx, gy)` corner to lift that corner first, transitions cleanly to free desk drag, and settles top-down onto the new resting spot.
- **ThockHub-Calibrated Switch Acoustics (`audio-synth.js`)**: Pure zero-asset Web Audio synthesis merging ThockHub's keyboard-build DSP mod chain (`lowshelf 300Hz` Poron foam warmth, `lowpass` + `Q=1.8` tape mod, `200–260Hz` cavity peaking EQ, and `18ms` aluminum micro-comb feedback) with per-stroke LCG impulses driving parallel resonant bandpass cavities (`thock` ~ Oil King / Mahjong Foam+Tape+PC, `tactile` ~ Boba U4T / Lavender FR4+Tape, `clicky` ~ MX Blue / Box Jade Alu HPF snap, `linear` ~ HMX / MX Red Lubed Alu Clack), routed into a 24ms desk ConvolverNode + compressor.
- **Two-Act Motion & Damping (`blog.js`)**: Act I (`#stage-runway`, `260vh`) pairs vertical layered parallax (`0.62x–1.60x`) from Scene 01 (`3.6s` accelerating one-stroke `KeyCat`) to Scene 02 (`键猫与声`). Act II (`#editorialFlow`) flows naturally down expandable vertical paper sections (`游乐场 -> 随笔 -> 联系`) so growing card grids never clip. Desktop uses `dt`-normalized Lenis-style exponential scroll damping across wheel, scrollbar drag, and scene jumps (`DESKTOP_WHEEL_LAMBDA = 6.2`, `DESKTOP_NAV_LAMBDA = 5.0`); mobile keeps native touch inertia unintercepted while lagging the paper shader and `.folio-watermark` (`--wm-lag-y`, `MOBILE_LAG_LAMBDA = 9.5`).
- **Editorial Title Watermarks (`watermark-arcade.svg`, `watermark-essays.svg`)**: Subtle ink-line freehand SVG vignettes (`streamline-freehand` from Iconify) blended via `mix-blend-mode: multiply` behind the upper-left title area of `游乐场` (Scene 03) and `纸上随笔` (Scene 04) only; Scene 05 stays boundless clean paper.
- **Signature Echo (`finale-brush.js`)**: 34-bristle dry-brush cursive `"Say Hi."` (`2.85s` accelerating draw) + interactive ephemeral visitor water-cloth (`水写布`) brush strokes in Scene 05.
