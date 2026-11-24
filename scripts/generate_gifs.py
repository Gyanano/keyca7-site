"""Generate HD Apple-'hello'-style brush-writing GIFs for KeyCat signature."""
import os
import numpy as np
import cv2
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_PATH = os.path.join(ROOT, "site", "assets", "keycat-signature.png")
EXPORT_DIR = os.path.join(ROOT, "exports")
os.makedirs(EXPORT_DIR, exist_ok=True)

# Exact verified 8 calligraphic strokes (100.00% foreground pixel coverage)
STROKES = [
    # (name, stroke_width, start_sec, end_sec, cubic_bezier_segments)
    ("K_stem", 36, 0.20, 0.48, [
        ((326, 204), (311, 238), (294, 276), (278, 314)),
        ((278, 314), (270, 336), (262, 354), (255, 372)),
    ]),
    ("K_arms", 34, 0.53, 0.90, [
        ((406, 210), (382, 240), (344, 270), (295, 287)),
        ((295, 287), (324, 312), (360, 336), (398, 349)),
    ]),
    ("e", 25, 0.95, 1.32, [
        ((388, 304), (406, 298), (426, 286), (424, 275)),
        ((424, 275), (422, 265), (402, 271), (390, 293)),
        ((390, 293), (380, 313), (386, 328), (404, 326)),
        ((404, 326), (422, 324), (438, 310), (450, 296)),
    ]),
    ("y", 30, 1.35, 1.82, [
        ((464, 272), (456, 292), (448, 312), (454, 319)),
        ((454, 319), (464, 324), (484, 300), (506, 268)),
        ((506, 268), (496, 300), (476, 352), (452, 382)),
        ((452, 382), (434, 402), (412, 408), (390, 400)),
    ]),
    ("C", 36, 1.88, 2.32, [
        ((618, 256), (632, 236), (632, 216), (608, 214)),
        ((608, 214), (576, 214), (542, 244), (526, 284)),
        ((526, 284), (512, 320), (524, 348), (558, 346)),
        ((558, 346), (586, 344), (610, 320), (630, 294)),
    ]),
    ("a", 25, 2.36, 2.72, [
        ((668, 284), (664, 270), (644, 276), (632, 296)),
        ((632, 296), (620, 314), (626, 328), (642, 320)),
        ((642, 320), (654, 312), (666, 296), (672, 282)),
        ((672, 282), (664, 304), (664, 322), (680, 320)),
        ((680, 320), (692, 318), (702, 310), (710, 302)),
    ]),
    ("t_stem", 30, 2.76, 2.98, [
        ((738, 230), (726, 264), (708, 312), (686, 370)),
    ]),
    ("t_bar", 26, 3.03, 3.28, [
        ((686, 270), (718, 265), (754, 255), (780, 236)),
    ]),
]


def sample_cubic(p0, p1, p2, p3, n=120):
    t = np.linspace(0.0, 1.0, n)[:, None]
    return (
        ((1 - t) ** 3) * p0
        + 3 * ((1 - t) ** 2) * t * p1
        + 3 * (1 - t) * (t ** 2) * p2
        + (t ** 3) * p3
    )


def build_arclength_stroke(segments):
    pts = np.vstack([
        sample_cubic(
            np.array(s[0], float),
            np.array(s[1], float),
            np.array(s[2], float),
            np.array(s[3], float),
        )
        for s in segments
    ])
    diffs = np.diff(pts, axis=0)
    seg_lens = np.hypot(diffs[:, 0], diffs[:, 1])
    cum = np.concatenate([[0.0], np.cumsum(seg_lens)])
    total = cum[-1] if cum[-1] > 0 else 1.0
    return pts, cum / total


def apple_ease(u):
    """Smooth calligraphic ease-in-out (Apple 'hello' style)."""
    u = max(0.0, min(1.0, u))
    # Smooth blend: gentle acceleration out, silky deceleration into flick
    return 0.5 * (1.0 - np.cos(np.pi * (u ** 0.92)))


def render_mask_at_time(t_sec, H, W, precomputed):
    mask = np.zeros((H, W), dtype=np.uint8)
    for name, width, t0, t1, pts, norm_s in precomputed:
        if t_sec <= t0:
            continue
        if t_sec >= t1:
            sub = pts
        else:
            p = apple_ease((t_sec - t0) / (t1 - t0))
            idx = int(np.searchsorted(norm_s, p))
            idx = max(1, min(idx, len(pts) - 1))
            # Interpolate exact tip position for silky sub-pixel motion
            s0, s1 = norm_s[idx - 1], norm_s[idx]
            frac = (p - s0) / (s1 - s0) if s1 > s0 else 1.0
            tip = pts[idx - 1] * (1.0 - frac) + pts[idx] * frac
            sub = np.vstack([pts[:idx], tip[None, :]])
        if len(sub) >= 2:
            cv2.polylines(
                mask,
                [np.round(sub).astype(np.int32)],
                False,
                255,
                thickness=width,
                lineType=cv2.LINE_AA,
            )
            # Round cap at leading tip for organic brush head
            tip_pt = tuple(np.round(sub[-1]).astype(int))
            cv2.circle(mask, tip_pt, max(1, width // 2), 255, -1, lineType=cv2.LINE_AA)
            start_pt = tuple(np.round(sub[0]).astype(int))
            cv2.circle(mask, start_pt, max(1, width // 2), 255, -1, lineType=cv2.LINE_AA)

    # Soft feathered brush-front reveal
    mask = cv2.GaussianBlur(mask, (9, 9), 2.2)
    return mask.astype(np.float32) / 255.0


def build_frames(src_rgba, fps=30):
    H, W = src_rgba.shape[:2]
    precomputed = []
    for name, width, t0, t1, segs in STROKES:
        pts, norm_s = build_arclength_stroke(segs)
        precomputed.append((name, width, t0, t1, pts, norm_s))

    write_end = 3.35
    hold_sec = 1.65
    fade_sec = 0.45
    total_sec = write_end + hold_sec + fade_sec

    src_rgb = src_rgba[..., :3].astype(np.float32)
    src_alpha = src_rgba[..., 3].astype(np.float32) / 255.0

    # Render animation frames (write phase at full fps, hold as 1 long frame, fade at full fps)
    rgba_frames = []
    durations_ms = []

    dt = 1.0 / fps
    t = 0.0
    while t <= write_end + 1e-6:
        m = render_mask_at_time(t, H, W, precomputed)
        a = np.clip(src_alpha * m, 0.0, 1.0)
        frame = np.dstack([src_rgb, a * 255.0]).astype(np.uint8)
        rgba_frames.append(frame)
        durations_ms.append(int(round(1000 / fps)))
        t += dt

    # Full crisp hold frame (original unmasked signature, zero blur)
    rgba_frames.append(src_rgba.copy())
    durations_ms.append(int(round(hold_sec * 1000)))

    # Gentle fade-out for seamless social-media loop
    n_fade = max(1, int(round(fade_sec * fps)))
    for i in range(1, n_fade + 1):
        fade_alpha = 1.0 - (i / n_fade) ** 1.4
        frame = src_rgba.copy()
        frame[..., 3] = np.round(src_rgba[..., 3].astype(np.float32) * fade_alpha).astype(np.uint8)
        rgba_frames.append(frame)
        durations_ms.append(int(round(1000 / fps)))

    return rgba_frames, durations_ms


def save_solid_gif(rgba_frames, durations_ms, bg_rgb, out_path):
    bg = np.array(bg_rgb, dtype=np.float32)[None, None, :]
    rgb_imgs = []
    for f in rgba_frames:
        a = (f[..., 3:4].astype(np.float32)) / 255.0
        comp = np.round(f[..., :3].astype(np.float32) * a + bg * (1.0 - a)).astype(np.uint8)
        rgb_imgs.append(Image.fromarray(comp, mode="RGB"))

    # Build a single ultra-clean 256-color palette from the full-visibility hold frame
    # so there is ZERO dithering grain and ZERO palette flicker across frames
    ref_frame = rgb_imgs[-1 - 14]  # hold frame
    palette_img = ref_frame.quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    p_frames = [im.quantize(palette=palette_img, dither=Image.Dither.NONE) for im in rgb_imgs]

    p_frames[0].save(
        out_path,
        save_all=True,
        append_images=p_frames[1:],
        duration=durations_ms,
        loop=0,
        optimize=True,
        disposal=2,
    )
    print(f"Saved {out_path} ({os.path.getsize(out_path) / 1024:.1f} KB, {len(p_frames)} frames)")


def save_transparent_gif(rgba_frames, durations_ms, out_path):
    # Build a 255-color palette from the opaque signature pixels (index 255 reserved for transparency)
    hold = rgba_frames[-1 - 14]
    # Composite on white temporarily only to quantize the crimson ink shades cleanly
    rgb_hold = Image.fromarray(hold[..., :3], mode="RGB")
    pal_img = rgb_hold.quantize(colors=255, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)

    p_frames = []
    for f in rgba_frames:
        alpha = f[..., 3]
        rgb = Image.fromarray(f[..., :3], mode="RGB")
        q = np.array(rgb.quantize(palette=pal_img, dither=Image.Dither.NONE))
        q[alpha < 28] = 255  # transparent index
        pim = Image.fromarray(q, mode="P")
        pim.putpalette(pal_img.getpalette())
        p_frames.append(pim)

    p_frames[0].save(
        out_path,
        save_all=True,
        append_images=p_frames[1:],
        duration=durations_ms,
        loop=0,
        transparency=255,
        disposal=2,
        optimize=True,
    )
    print(f"Saved {out_path} ({os.path.getsize(out_path) / 1024:.1f} KB, {len(p_frames)} frames)")


def save_contact_sheet(rgba_frames, out_path):
    """Save 8 keyframe previews so we can visually verify stroke progression."""
    indices = [12, 24, 36, 48, 62, 76, 88, 100]
    indices = [min(i, len(rgba_frames) - 1) for i in indices]
    tiles = []
    for idx in indices:
        f = rgba_frames[idx]
        a = f[..., 3:4].astype(np.float32) / 255.0
        comp = np.round(f[..., :3] * a + 255.0 * (1.0 - a)).astype(np.uint8)
        crop = comp[185:430, 235:800]
        tile = Image.fromarray(crop).resize((380, 165), Image.Resampling.LANCZOS)
        tiles.append(tile)
    sheet = Image.new("RGB", (380 * 4, 165 * 2), (245, 245, 245))
    for i, t in enumerate(tiles):
        sheet.paste(t, ((i % 4) * 380, (i // 4) * 165))
    sheet.save(out_path)
    print(f"Saved contact sheet: {out_path}")


def main():
    src_rgba = np.array(Image.open(SRC_PATH).convert("RGBA"))
    print("Rendering animation frames (1024x576 @ 30fps)...")
    rgba_frames, durations_ms = build_frames(src_rgba, fps=30)

    save_solid_gif(
        rgba_frames, durations_ms, (255, 255, 255),
        os.path.join(EXPORT_DIR, "keycat-signature-hd-white.gif"),
    )
    save_solid_gif(
        rgba_frames, durations_ms, (13, 13, 16),
        os.path.join(EXPORT_DIR, "keycat-signature-hd-dark.gif"),
    )
    save_transparent_gif(
        rgba_frames, durations_ms,
        os.path.join(EXPORT_DIR, "keycat-signature-hd-transparent.gif"),
    )

    scratch_sheet = os.path.join(EXPORT_DIR, "contact_sheet.png")
    save_contact_sheet(rgba_frames, scratch_sheet)


if __name__ == "__main__":
    main()
