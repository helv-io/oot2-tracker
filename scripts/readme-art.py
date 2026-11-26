#!/usr/bin/env python3
"""Draw the README's SVG banner and region-coloured dividers.

GitHub strips CSS from READMEs, so the colour lives in these SVGs. Text
is converted to outlines with fontTools (Marcellus SC, OFL), so the
banners look the same everywhere without loading a font.

    python3 scripts/readme-art.py
"""
import os
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "docs", "art")
FONT = os.path.join(ROOT, "node_modules", "@fontsource", "marcellus-sc", "files", "marcellus-sc-latin-400-normal.woff")

# Region tones, the same muted palette as client/src/data/look.ts.
TONES = {
    "forest": "#5f8a5a",
    "fire": "#b0614b",
    "water": "#4f80a6",
    "shadow": "#7c679a",
    "spirit": "#bf8650",
    "light": "#b89a4e",
    "ice": "#7fb0bb",
}

font = TTFont(FONT)
cmap = font.getBestCmap()
glyphs = font.getGlyphSet()
hmtx = font["hmtx"]
UPM = font["head"].unitsPerEm


def text_path(text, size, tracking=0.0):
    """SVG path data for text at the origin (baseline y=0); returns (d, width)."""
    pen = SVGPathPen(glyphs)
    scale = size / UPM
    x = 0.0
    for ch in text:
        gname = cmap.get(ord(ch))
        if gname is None:
            x += size * 0.3
            continue
        tp = TransformPen(pen, (scale, 0, 0, -scale, x, 0))
        glyphs[gname].draw(tp)
        x += hmtx[gname][0] * scale + tracking * size
    return pen.getCommands(), x - tracking * size


def centered(text, size, cx, baseline, fill, tracking=0.0, extra=""):
    d, w = text_path(text, size, tracking)
    return f'<path transform="translate({cx - w / 2:.1f} {baseline})" d="{d}" fill="{fill}"{extra}/>'


def triforce(cx, top, side, grad="url(#gold)", stroke="#7a5f22"):
    """Three triangles, the classic Triforce, apex at (cx, top)."""
    h = side * 0.866
    half = side / 2
    tris = [
        [(cx, top), (cx + half / 2, top + h / 2), (cx - half / 2, top + h / 2)],
        [(cx - half / 2, top + h / 2), (cx, top + h), (cx - half, top + h)],
        [(cx + half / 2, top + h / 2), (cx + half, top + h), (cx, top + h)],
    ]
    return "".join(
        f'<polygon points="{" ".join(f"{x:.1f},{y:.1f}" for x, y in t)}" fill="{grad}" stroke="{stroke}" stroke-width="1" stroke-linejoin="round"/>'
        for t in tris
    )


def gold_defs():
    return (
        '<linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">'
        '<stop offset="0" stop-color="#f6e7b6"/><stop offset="0.55" stop-color="#d6b665"/><stop offset="1" stop-color="#a8853a"/>'
        "</linearGradient>"
    )


def banner(dark):
    W, H = 1200, 360
    bg = (
        '<radialGradient id="bg" cx="0.5" cy="0.35" r="0.8">'
        + ('<stop offset="0" stop-color="#1f3327"/><stop offset="1" stop-color="#0b110d"/>' if dark else '<stop offset="0" stop-color="#fbf8f1"/><stop offset="1" stop-color="#eadfc6"/>')
        + "</radialGradient>"
    )
    title_fill = "#f4ead2" if dark else "#2a241a"
    sub_fill = "url(#gold)" if dark else "#8c6d22"
    rule = "#c9a95c" if dark else "#b89a4e"
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-label="Ocarina of Time 100% Checklist">',
        f"<defs>{bg}{gold_defs()}"
        '<filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="10" result="b"/>'
        '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>',
        f'<rect width="{W}" height="{H}" rx="18" fill="url(#bg)"/>',
        f'<rect x="10" y="10" width="{W - 20}" height="{H - 20}" rx="12" fill="none" stroke="{rule}" stroke-opacity="0.45"/>',
    ]
    # faint sparkles (fairy dust)
    import random
    rnd = random.Random(7)
    for _ in range(38):
        x, y, r = rnd.uniform(30, W - 30), rnd.uniform(30, H - 70), rnd.uniform(0.8, 2.2)
        parts.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{r:.1f}" fill="{"#e6cd8a" if dark else "#b89a4e"}" opacity="{rnd.uniform(0.15, 0.5):.2f}"/>')
    parts.append(f'<g filter="url(#glow)">{triforce(W / 2, 34, 104)}</g>')
    parts.append(centered("The Legend of Zelda", 22, W / 2, 178, sub_fill, tracking=0.22))
    parts.append(centered("Ocarina of Time", 66, W / 2, 246, title_fill, tracking=0.04))
    # rule with a small diamond
    parts.append(f'<line x1="{W / 2 - 230}" y1="272" x2="{W / 2 - 14}" y2="272" stroke="{rule}" stroke-width="1.2"/>')
    parts.append(f'<line x1="{W / 2 + 14}" y1="272" x2="{W / 2 + 230}" y2="272" stroke="{rule}" stroke-width="1.2"/>')
    parts.append(f'<rect x="{W / 2 - 5}" y="267" width="10" height="10" transform="rotate(45 {W / 2} 272)" fill="url(#gold)"/>')
    parts.append(centered("100% Checklist", 26, W / 2, 312, sub_fill, tracking=0.3))
    # region stripe along the bottom edge
    n = len(TONES)
    seg = (W - 160) / n
    for i, color in enumerate(TONES.values()):
        parts.append(f'<rect x="{80 + i * seg + 3:.1f}" y="{H - 26}" width="{seg - 6:.1f}" height="4" rx="2" fill="{color}"/>')
    parts.append("</svg>")
    return "".join(parts)


def divider(tone, dark):
    W, H = 900, 34
    c = TONES[tone]
    line = c
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-label="">'
        f"<defs>{gold_defs()}</defs>"
        f'<line x1="40" y1="{H / 2}" x2="{W / 2 - 30}" y2="{H / 2}" stroke="{line}" stroke-width="1.5" stroke-linecap="round" opacity="0.8"/>'
        f'<line x1="{W / 2 + 30}" y1="{H / 2}" x2="{W - 40}" y2="{H / 2}" stroke="{line}" stroke-width="1.5" stroke-linecap="round" opacity="0.8"/>'
        f'<circle cx="{W / 2 - 40}" cy="{H / 2}" r="2.5" fill="{c}"/><circle cx="{W / 2 + 40}" cy="{H / 2}" r="2.5" fill="{c}"/>'
        f'{triforce(W / 2, 4, 30)}'
        "</svg>"
    )


def main():
    os.makedirs(OUT, exist_ok=True)
    for dark in (True, False):
        open(os.path.join(OUT, f"banner-{'dark' if dark else 'light'}.svg"), "w").write(banner(dark))
    for tone in TONES:
        open(os.path.join(OUT, f"divider-{tone}.svg"), "w").write(divider(tone, True))
    print("wrote", sorted(os.listdir(OUT)))


if __name__ == "__main__":
    main()
