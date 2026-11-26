#!/usr/bin/env python3
"""Build docs/social-preview.png, the GitHub social preview image.

GitHub wants 1280x640 PNG, under 1 MB. Important content (Link, the
logo, the Triforce, the tagline) stays inside a 40 px safe border.
GitHub has no API for the preview, so after changing this file a human
uploads it in the repo Settings: Settings, General, Social preview.

    python3 scripts/social-preview.py
    python3 scripts/social-preview.py --raw /path/to/oot-assets/raw
"""
from __future__ import annotations

import os
import sys

from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = (
    sys.argv[sys.argv.index("--raw") + 1]
    if "--raw" in sys.argv
    else "/tmp/oot-assets/raw"
)
OUT = os.path.join(ROOT, "docs", "social-preview.png")
WOFF = os.path.join(
    ROOT, "node_modules", "@fontsource", "marcellus-sc", "files", "marcellus-sc-latin-400-normal.woff"
)
W, H = 1280, 640
SAFE = 40


def custom_triforce(size: int) -> Image.Image:
    """The same burnished-gold Triforce used in the app and README."""
    from PIL import ImageDraw as D

    S = size * 4
    pad = S * 0.12
    side = S - 2 * pad
    h = side * 0.866
    top = (S - h) / 2
    cx = S / 2
    half = side / 2
    tris = [
        [(cx, top), (cx + half / 2, top + h / 2), (cx - half / 2, top + h / 2)],
        [(cx - half / 2, top + h / 2), (cx, top + h), (cx - half, top + h)],
        [(cx + half / 2, top + h / 2), (cx + half, top + h), (cx, top + h)],
    ]
    mask = Image.new("L", (S, S), 0)
    d = D.Draw(mask)
    for t in tris:
        d.polygon(t, fill=255)
    grad = Image.new("RGBA", (S, S))
    gd = D.Draw(grad)
    stops = [(0.0, (246, 231, 182)), (0.55, (214, 182, 101)), (1.0, (160, 124, 52))]
    for y in range(S):
        f = min(1.0, max(0.0, (y - top) / h))
        c = stops[-1][1]
        for (a, ca), (b, cb) in zip(stops, stops[1:]):
            if a <= f <= b:
                k = (f - a) / (b - a)
                c = tuple(round(ca[i] + (cb[i] - ca[i]) * k) for i in range(3))
                break
        gd.line([(0, y), (S, y)], fill=c + (255,))
    body = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    body.paste(grad, (0, 0), mask)
    rim = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    rd = D.Draw(rim)
    for t in tris:
        rd.polygon(t, outline=(122, 95, 34, 255), width=max(2, S // 90))
    glow_mask = mask.filter(ImageFilter.GaussianBlur(S * 0.05)).point(lambda a: int(a * 0.55))
    glow = Image.new("RGBA", (S, S), (240, 214, 140, 0))
    glow.putalpha(glow_mask)
    out = Image.alpha_composite(glow, body)
    out = Image.alpha_composite(out, rim)
    return out.resize((size, size), Image.LANCZOS)


def text_image(text: str, size: int, tracking: float, fill: tuple[int, int, int]) -> Image.Image:
    """Render Marcellus SC with letter-spacing, tight cropped, RGBA."""
    ttf = "/tmp/marcellus-sc.ttf"
    if not os.path.exists(ttf):
        TTFont(WOFF).save(ttf)
    font = ImageFont.truetype(ttf, size)
    # Measure with tracking.
    widths = []
    for ch in text:
        bbox = font.getbbox(ch)
        widths.append(bbox[2] - bbox[0])
    total = sum(widths) + tracking * (len(text) - 1)
    ascent, descent = font.getmetrics()
    img = Image.new("RGBA", (int(total) + 8, ascent + descent + 8), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    x = 4
    y = 4
    for i, ch in enumerate(text):
        draw.text((x, y), ch, font=font, fill=fill + (255,))
        x += widths[i] + tracking
    bbox = img.getbbox()
    return img.crop(bbox) if bbox else img


def main() -> None:
    src = os.path.join(RAW, "OoTNS2 Key Artwork.png")
    key = Image.open(src).convert("RGB")
    kw, kh = key.size
    crop_h = kw / 2  # 2:1, GitHub's ratio
    # A little off the top keeps Link's boots and the logo inside the safe area.
    top = 50
    canvas = (
        key.crop((0, top, kw, int(top + crop_h)))
        .resize((W, H), Image.LANCZOS)
        .convert("RGBA")
    )

    # The official logo is already painted into this key art, on the right.
    # Center the added pieces on that block (measured at this crop and scale).
    logo_cx = 924
    logo_bottom = 551

    tag = text_image("oot.helv.io", 26, tracking=3.4, fill=(232, 214, 150))
    tri = custom_triforce(26)
    gap = 10
    group_w = tag.width + 2 * (tri.width + gap)
    group_x = int(logo_cx - group_w / 2)
    tag_x = group_x + tri.width + gap
    tag_y = logo_bottom + 8
    # Vertically centre the Triforces on the tagline.
    tri_y = tag_y + int((tag.height - tri.height) / 2)
    assert group_x >= SAFE, f"left Triforce x {group_x} crosses the safe border"
    assert group_x + group_w <= W - SAFE, f"right edge {group_x + group_w} crosses the safe border"
    assert tag_y >= SAFE and tag_y + tag.height <= H - SAFE, (
        f"tagline y {tag_y}..{tag_y + tag.height} crosses the safe border"
    )

    sm = Image.new("L", (tag.width + 20, tag.height + 20), 0)
    sm.paste(tag.split()[-1], (10, 10))
    sm = sm.filter(ImageFilter.GaussianBlur(3.5))
    sh = Image.new("RGBA", sm.size, (8, 14, 10, 0))
    sh.putalpha(sm.point(lambda a: int(a * 0.75)))
    canvas.alpha_composite(sh, (tag_x - 10, tag_y - 10))
    canvas.alpha_composite(tag, (tag_x, tag_y))
    canvas.alpha_composite(tri, (group_x, tri_y))
    canvas.alpha_composite(tri, (tag_x + tag.width + gap, tri_y))

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    rgb = canvas.convert("RGB")
    # A 1280x640 photo as 24-bit PNG is over GitHub's 1 MB cap, so
    # quantize with dithering. At 256 colours it still looks clean.
    out = rgb.quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG)
    out.save(OUT, "PNG", optimize=True, compress_level=9)
    size = os.path.getsize(OUT)
    if size > 1_000_000:
        raise SystemExit(f"{OUT} is {size} bytes, over GitHub's 1 MB limit")
    print(f"wrote {OUT} ({W}x{H}, {size} bytes)")


if __name__ == "__main__":
    main()
