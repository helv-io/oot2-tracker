#!/usr/bin/env python3
"""Fetch and optimize the official remake art the tracker uses.

Every image is Nintendo's official art for The Legend of Zelda: Ocarina of
Time on Nintendo Switch 2 (in-game icons, renders, logo and key art),
downloaded once from Zelda Wiki's file pages for the game and committed to
the repo, so the live site never hotlinks.

    python3 scripts/official-art.py [--raw DIR]

Needs Pillow with WebP and AVIF support. Writes:
  client/assets/official/icons/*.webp   96x96 item and section icons
  client/assets/official/art/*          hero key art and logo (AVIF + WebP)
  client/assets/official/SOURCES.md     each file and where it came from
  client/src/data/art.generated.ts      imports for the bundler
  client/icon-*.png, apple-touch-icon.png, favicon.png, og-image.jpg
"""
import json, os, sys, time, urllib.parse, urllib.request
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = sys.argv[sys.argv.index("--raw") + 1] if "--raw" in sys.argv else "/tmp/oot-assets/raw"
OUT = os.path.join(ROOT, "client", "assets", "official")
UA = {"User-Agent": "oot2-tracker art fetch (github.com/helv-io/oot2-tracker)"}

# slug -> Zelda Wiki file name (without "File:" and extension guess).
ICONS = {
    # sections and stats
    "token": "OoTNS2 Token Icon.png",
    "token-map": "OoTNS2 Token Map Icon.png",
    "piece-of-heart": "OoTNS2 Piece of Heart Icon.png",
    "heart": "OoTNS2 Heart Icon.png",
    "magic-beans": "OoTNS2 Magic Beans Icon.png",
    "empty-bottle": "OoTNS2 Empty Bottle Icon.png",
    "ocarina-of-time": "OoTNS2 Ocarina of Time Icon.png",
    "fairy-ocarina": "OoTNS2 Fairy Ocarina Icon.png",
    "great-fairy-fountain": "OoTNS2 Great Fairy's Fountain Icon.png",
    "happy-mask-shop": "OoTNS2 Happy Mask Shop Icon.png",
    "proving-grounds": "OoTNS2 Gerudo Proving Grounds Icon.png",
    "bazaar": "OoTNS2 Bazaar Icon.png",
    "target": "OoTNS2 Target Icon.png",
    "dungeon-map": "OoTNS2 Dungeon Map Icon.png",
    "boss-key": "OoTNS2 Boss Key Icon.png",
    "small-key": "OoTNS2 Small Key Icon.png",
    "treasure-chest": "OoTNS2 Treasure Chest Icon.png",
    "compass": "OoTNS2 Compass Icon.png",
    # stones and medallions
    "kokiri-emerald": "OoTNS2 Kokiri Emerald Icon.png",
    "goron-ruby": "OoTNS2 Goron Ruby Icon.png",
    "zora-sapphire": "OoTNS2 Zora Sapphire Icon.png",
    "forest-medallion": "OoTNS2 Forest Medallion Icon.png",
    "fire-medallion": "OoTNS2 Fire Medallion Icon.png",
    "water-medallion": "OoTNS2 Water Medallion Icon.png",
    "shadow-medallion": "OoTNS2 Shadow Medallion Icon.png",
    "spirit-medallion": "OoTNS2 Spirit Medallion Icon.png",
    "light-medallion": "OoTNS2 Light Medallion Icon.png",
    # quest items
    "zeldas-letter": "OoTNS2 Zelda's Letter Icon.png",
    "goron-bracelet": "OoTNS2 Goron Bracelet Icon.png",
    "bottled-letter": "OoTNS2 Bottled Letter Icon.png",
    "master-sword": "OoTNS2 Master Sword Icon.png",
    "hookshot": "OoTNS2 Hookshot Icon.png",
    "longshot": "OoTNS2 Longshot Icon.png",
    "fairy-bow": "OoTNS2 Fairy Bow Icon.png",
    "megaton-hammer": "OoTNS2 Megaton Hammer Icon.png",
    "iron-boots": "OoTNS2 Iron Boots Icon.png",
    "hover-boots": "OoTNS2 Hover Boots Icon.png",
    "lenses-of-truth": "OoTNS2 Lenses of Truth Icon.png",
    "gerudo-pass": "OoTNS2 Gerudo Pass Icon.png",
    "silver-gauntlets": "OoTNS2 Silver Gauntlets Icon.png",
    "golden-gauntlets": "OoTNS2 Golden Gauntlets Icon.png",
    "light-arrow": "OoTNS2 Light Arrow Icon.png",
    "fire-arrow": "OoTNS2 Fire Arrow Icon.png",
    "ice-arrow": "OoTNS2 Ice Arrow Icon.png",
    "boss": "OoTNS2 Boss Icon.png",
    # rewards and wallets
    "adults-wallet": "OoTNS2 Adult's Wallet Icon.png",
    "giants-wallet": "OoTNS2 Giant's Wallet Icon.png",
    "echo-gem": "OoTNS2 Echo Gem Icon.png",
    "bombchu": "OoTNS2 Bombchu Icon.png",
    "gold-rupee": "OoTNS2 Gold Rupee Icon.png",
    "red-potion": "OoTNS2 Red Potion Icon.png",
    "big-poe": "OoTNS2 Big Poe Icon.png",
    "bug": "OoTNS2 Bug Icon.png",
    # songs
    "zeldas-lullaby": "OoTNS2 Zelda's Lullaby Icon.png",
    "eponas-song": "OoTNS2 Epona's Song Icon.png",
    "sarias-song": "OoTNS2 Saria's Song Icon.png",
    "suns-song": "OoTNS2 Sun's Song Icon.png",
    "song-of-time": "OoTNS2 Song of Time Icon.png",
    "song-of-storms": "OoTNS2 Song of Storms Icon.png",
    "minuet-of-forest": "OoTNS2 Minuet of the Forest Icon.png",
    "bolero-of-fire": "OoTNS2 Bolero of Fire Icon.png",
    "serenade-of-water": "OoTNS2 Serenade of Water Icon.png",
    "requiem-of-spirit": "OoTNS2 Requiem of Spirit Icon.png",
    "nocturne-of-shadow": "OoTNS2 Nocturne of Shadow Icon.png",
    "prelude-of-light": "OoTNS2 Prelude of Light Icon.png",
    "scarecrow-song": "OoTNS2 Scarecrow Song Icon.png",
    # upgrades
    "deku-stick-bag-2": "OoTNS2 Bigger Deku-Stick Bag Icon.png",
    "deku-stick-bag-3": "OoTNS2 Biggest Deku-Stick Bag Icon.png",
    "deku-nut-bag-2": "OoTNS2 Bigger Deku-Nut Bag Icon.png",
    "deku-nut-bag-3": "OoTNS2 Biggest Deku-Nut Bag Icon.png",
    "deku-seed-bag-2": "OoTNS2 Bigger Deku-Seed Bag Icon.png",
    "deku-seed-bag-3": "OoTNS2 Biggest Deku-Seed Bag Icon.png",
    "bomb-bag": "OoTNS2 Bomb Bag Icon.png",
    "bomb-bag-2": "OoTNS2 Bigger Bomb Bag Icon.png",
    "bomb-bag-3": "OoTNS2 Biggest Bomb Bag Icon.png",
    "quiver": "OoTNS2 Quiver Icon.png",
    "quiver-2": "OoTNS2 Bigger Quiver Icon.png",
    "quiver-3": "OoTNS2 Biggest Quiver Icon.png",
    "silver-scale": "OoTNS2 Silver Scale Icon.png",
    "golden-scale": "OoTNS2 Golden Scale Icon.png",
    # Great Fairy gifts
    "dins-fire": "OoTNS2 Din's Fire Icon.png",
    "farores-wind": "OoTNS2 Farore's Wind Icon.png",
    "nayrus-love": "OoTNS2 Nayru's Love Icon.png",
    "gift-improved-spin": "OoTNS2 Gift of Improved Spin Icon.png",
    "gift-doubled-magic": "OoTNS2 Gift of Doubled Magic Icon.png",
    "gift-halved-damage": "OoTNS2 Gift of Halved Damage Icon.png",
    # masks
    "keaton-mask": "OoTNS2 Keaton Mask Icon.png",
    "skull-mask": "OoTNS2 Skull Mask Icon.png",
    "spooky-mask": "OoTNS2 Spooky Mask Icon.png",
    "bunny-hood": "OoTNS2 Bunny Hood Icon.png",
    "mask-of-truth": "OoTNS2 Mask of Truth Icon.png",
    # trading sequence
    "pocket-egg": "OoTNS2 Pocket Egg Icon.png",
    "cojiro": "OoTNS2 Cojiro Icon.png",
    "odd-mushroom": "OoTNS2 Odd Mushroom Icon.png",
    "odd-poultice": "OoTNS2 Odd Poultice Icon.png",
    "poachers-saw": "OoTNS2 Poacher's Saw Icon.png",
    "broken-goron-sword": "OoTNS2 Broken Goron Sword Icon.png",
    "prescription": "OoTNS2 Prescription Icon.png",
    "eyeball-frog": "OoTNS2 Eyeball Frog Icon.png",
    "eye-drops": "OoTNS2 Specialty Eye Drops Icon.png",
    "biggoron-receipt": "OoTNS2 Biggoron Receipt Icon.png",
    "biggoron-sword": "OoTNS2 Biggoron Sword Icon.png",
    "giants-knife": "OoTNS2 Giant's Knife Icon.png",
    # gear
    "kokiri-sword": "OoTNS2 Kokiri Sword Icon.png",
    "deku-shield": "OoTNS2 Deku Shield Icon.png",
    "hylian-shield": "OoTNS2 Hylian Shield Icon.png",
    "mirror-shield": "OoTNS2 Mirror Shield Icon.png",
    "goron-tunic": "OoTNS2 Goron Tunic Icon.png",
    "zora-tunic": "OoTNS2 Zora Tunic Icon.png",
    # side quests, minigames, places
    "lon-lon-milk": "OoTNS2 Lon Lon Milk Icon.png",
    "sinking-lure": "OoTNS2 Sinking Lure Icon.png",
    "fishing-rod": "OoTNS2 Fishing Rod Icon.png",
    "fishing": "OoTNS2 Fishing Icon.png",
    "shooting-gallery": "OoTNS2 Shooting Gallery Icon.png",
    "bombchu-bowling": "OoTNS2 Bombchu Bowling Alley Icon.png",
    "horseback-archery": "OoTNS2 Horseback Archery Icon.png",
    "cucco-game": "OoTNS2 Cucco-Findin' Game Icon.png",
    "dampe-race": "OoTNS2 Dampé Race Icon.png",
    "grave-digging": "OoTNS2 Heart-Pounding Grave-Digging Tour Icon.png",
    "obstacle-course": "OoTNS2 Obstacle Course Icon.png",
    "treasure-chest-shop": "OoTNS2 Treasure-Chest Shop Icon.png",
    "frog-tenors": "OoTNS2 Fabulous Five Froggish Tenors Icon.png",
    "running-man": "OoTNS2 Running Man Icon.png",
    "diving-lesson": "OoTNS2 Diving Lesson Icon.png",
    "forest-stage": "OoTNS2 Forest Stage Icon.png",
    "ghost-shop": "OoTNS2 Ghost Shop Icon.png",
    "potion-shop": "OoTNS2 Potion Shop Icon.png",
    "grannys-cauldron": "OoTNS2 Granny's Cauldron Icon.png",
    "kokiri-shop": "OoTNS2 Kokiri Shop Icon.png",
    "goron-shop": "OoTNS2 Goron Shop Icon.png",
    "zora-shop": "OoTNS2 Zora Shop Icon.png",
    "bean-seller": "OoTNS2 Bean Seller Icon.png",
    "haunted-house": "OoTNS2 Haunted House Icon.png",
    "gossip-stone": "OoTNS2 ZN Gossip Quests Icon.png",
    "fairy": "OoTNS2 Fairy Icon.png",
    "business-scrub-seed": "OoTNS2 Business Scrub Seed Icon.png",
    "deku-stick": "OoTNS2 Deku Stick Icon.png",
    "bomb": "OoTNS2 Bomb Icon.png",
    "blue-fire": "OoTNS2 Blue Fire Icon.png",
    "fairy-slingshot": "OoTNS2 Fairy Slingshot Icon.png",
    "boomerang": "OoTNS2 Boomerang Icon.png",
}
ART = {
    # slug: (file, [(width, format), ...])
    "key-art": ("OoTNS2 Key Artwork 4.png", [(1600, "avif"), (1600, "webp"), (800, "avif"), (800, "webp")]),
    "logo": ("OoTNS2 English Logo.png", [(640, "webp"), (640, "avif")]),
    "heart-container": ("OoTNS2 Heart Container Render.png", [(96, "webp")]),
}


def api(params):
    q = urllib.parse.urlencode({**params, "format": "json"})
    req = urllib.request.Request("https://zeldawiki.wiki/w/api.php?" + q, headers=UA)
    return json.load(urllib.request.urlopen(req))


def fetch(names):
    """Download any missing originals; return {name: file page URL}."""
    os.makedirs(RAW, exist_ok=True)
    pages = {}
    names = sorted(set(names))
    for i in range(0, len(names), 40):
        d = api({"action": "query", "titles": "|".join("File:" + n for n in names[i : i + 40]), "prop": "imageinfo", "iiprop": "url"})
        for p in d["query"]["pages"].values():
            name = p["title"][5:]
            if "imageinfo" not in p:
                sys.exit(f"missing on Zelda Wiki: {name}")
            info = p["imageinfo"][0]
            pages[name] = info["descriptionurl"]
            dest = os.path.join(RAW, name)
            if not os.path.exists(dest):
                data = urllib.request.urlopen(urllib.request.Request(info["url"], headers=UA)).read()
                open(dest, "wb").write(data)
                time.sleep(0.1)
    return pages


def square(im, size, pad=0.04):
    im = im.convert("RGBA")
    # Trim to the visible art; a faint glow (alpha < 48) doesn't count.
    box = im.getchannel("A").point(lambda a: 255 if a >= 48 else 0).getbbox()
    if box:
        im = im.crop(box)
    inner = round(size * (1 - 2 * pad))
    im.thumbnail((inner, inner), Image.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.alpha_composite(im, ((size - im.width) // 2, (size - im.height) // 2))
    return canvas


def save(im, path, fmt):
    if fmt == "webp":
        im.save(path, "WEBP", quality=86, method=6)
    elif fmt == "avif":
        im.save(path, "AVIF", quality=62, speed=4)
    elif fmt == "png":
        im.save(path, "PNG", optimize=True)
    elif fmt == "jpg":
        im.convert("RGB").save(path, "JPEG", quality=84, optimize=True, progressive=True)


def custom_triforce(size):
    """The one Triforce used across the app and README.

    The remake only ships a gold Triforce as a 58px Threads of Time icon,
    too small to scale, so this redraws it in the same style: burnished
    gold, a darker rim, and a soft glow."""
    from PIL import ImageDraw, ImageFilter
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
    d = ImageDraw.Draw(mask)
    for t in tris:
        d.polygon(t, fill=255)
    # vertical gold gradient
    grad = Image.new("RGBA", (S, S))
    gd = ImageDraw.Draw(grad)
    stops = [(0.0, (246, 231, 182)), (0.55, (214, 182, 101)), (1.0, (160, 124, 52))]
    for y in range(S):
        f = min(1.0, max(0.0, (y - top) / h))
        for (a, ca), (b, cb) in zip(stops, stops[1:]):
            if a <= f <= b:
                k = (f - a) / (b - a)
                c = tuple(round(ca[i] + (cb[i] - ca[i]) * k) for i in range(3))
                break
        gd.line([(0, y), (S, y)], fill=c + (255,))
    body = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    body.paste(grad, (0, 0), mask)
    rim = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    rd = ImageDraw.Draw(rim)
    for t in tris:
        rd.polygon(t, outline=(122, 95, 34, 255), width=max(2, S // 90))
    glow_mask = mask.filter(ImageFilter.GaussianBlur(S * 0.05)).point(lambda a: int(a * 0.55))
    glow = Image.new("RGBA", (S, S), (240, 214, 140, 0))
    glow.putalpha(glow_mask)
    out = Image.alpha_composite(glow, body)
    out = Image.alpha_composite(out, rim)
    return out.resize((size, size), Image.LANCZOS)


def app_icon(src, size, maskable=False):
    """Official Ocarina of Time icon on the remake's deep-forest green."""
    bg = Image.new("RGBA", (size, size), (16, 28, 20, 255))
    # soft radial glow behind the item
    glow = Image.new("L", (size, size), 0)
    for r in range(size // 2, 0, -2):
        v = int(70 * (1 - r / (size / 2)) ** 1.4)
        Image.Image.paste(glow, v, (size // 2 - r, size // 2 - r, size // 2 + r, size // 2 + r), mask=_disc(2 * r))
    gold = Image.new("RGBA", (size, size), (178, 149, 74, 255))
    bg = Image.composite(gold, bg, glow)
    item = square(src, round(size * (0.62 if maskable else 0.82)), pad=0)
    bg.alpha_composite(item, ((size - item.width) // 2, (size - item.height) // 2))
    return bg


def _disc(d):
    m = Image.new("L", (d, d), 0)
    from PIL import ImageDraw
    ImageDraw.Draw(m).ellipse((0, 0, d - 1, d - 1), fill=255)
    return m


def main():
    names = list(ICONS.values()) + [f for f, _ in ART.values()] + ["OoTNS2 Key Artwork.png"]
    pages = fetch(names)
    os.makedirs(os.path.join(OUT, "icons"), exist_ok=True)
    os.makedirs(os.path.join(OUT, "art"), exist_ok=True)
    lines = ["// Generated by scripts/official-art.py. Do not edit.", ""]
    icon_names = []
    for slug, name in sorted(ICONS.items()):
        out = os.path.join(OUT, "icons", f"{slug}.webp")
        save(square(Image.open(os.path.join(RAW, name)), 96), out, "webp")
        var = "i_" + slug.replace("-", "_")
        lines.append(f'import {var} from "../../assets/official/icons/{slug}.webp";')
        icon_names.append((slug, var))
    # Custom Triforce (no usable remake asset at this size).
    save(custom_triforce(96), os.path.join(OUT, "icons", "triforce.webp"), "webp")
    lines.append('import i_triforce from "../../assets/official/icons/triforce.webp";')
    icon_names.append(("triforce", "i_triforce"))
    icon_names.sort()
    art_vars = []
    for slug, (name, outs) in ART.items():
        im = Image.open(os.path.join(RAW, name)).convert("RGBA")
        for width, fmt in outs:
            h = round(im.height * width / im.width)
            out = os.path.join(OUT, "art", f"{slug}-{width}.{fmt}")
            save(im.resize((width, h), Image.LANCZOS), out, fmt)
            var = f"a_{slug.replace('-', '_')}_{width}_{fmt}"
            lines.append(f'import {var} from "../../assets/official/art/{slug}-{width}.{fmt}";')
            art_vars.append((f"{slug}-{width}-{fmt}", var))
    lines += ["", "export const ICONS = {"]
    lines += [f'  "{s}": {v},' for s, v in icon_names]
    lines += ["} as const;", "", "export type IconName = keyof typeof ICONS;", "", "export const ART = {"]
    lines += [f'  "{s}": {v},' for s, v in art_vars]
    lines += ["} as const;", ""]
    open(os.path.join(ROOT, "client", "src", "data", "art.generated.ts"), "w").write("\n".join(lines))

    # PWA and favicon icons, plus the link-preview image.
    ocarina = Image.open(os.path.join(RAW, ICONS["ocarina-of-time"]))
    client = os.path.join(ROOT, "client")
    save(app_icon(ocarina, 192), os.path.join(client, "icon-192.png"), "png")
    save(app_icon(ocarina, 512), os.path.join(client, "icon-512.png"), "png")
    save(app_icon(ocarina, 512, maskable=True), os.path.join(client, "icon-maskable-512.png"), "png")
    save(app_icon(ocarina, 180), os.path.join(client, "apple-touch-icon.png"), "png")
    save(app_icon(ocarina, 48), os.path.join(client, "favicon.png"), "png")
    key = Image.open(os.path.join(RAW, "OoTNS2 Key Artwork.png")).convert("RGB")
    w, h = key.size
    crop_h = round(w * 630 / 1200)
    top = max(0, (h - crop_h) // 2)
    save(key.crop((0, top, w, top + crop_h)).resize((1200, 630), Image.LANCZOS), os.path.join(client, "og-image.jpg"), "jpg")

    used = sorted(set(names))
    md = [
        "# Official art",
        "",
        "Every image in this folder, and the app icons and link preview in `client/`, is official",
        "Nintendo art for *The Legend of Zelda: Ocarina of Time* on Nintendo Switch 2: in-game icons,",
        "renders, the English logo and key art. © Nintendo. Files were downloaded once from Zelda Wiki's",
        "galleries for the game, resized and converted to WebP/AVIF by `scripts/official-art.py`,",
        "and are served from this site; nothing is hotlinked. This is a non-commercial fan project and is",
        "not affiliated with Nintendo.",
        "",
        "| Original file | Source page |",
        "| --- | --- |",
    ]
    md += [f"| {n} | {pages[n]} |" for n in used]
    md += [
        "",
        "## Custom pieces",
        "",
        "Drawn here because the remake has no usable asset at the needed size, in the same style:",
        "",
        "- `icons/triforce.webp`: the remake's only gold Triforce is a 58px Threads of Time icon, so",
        "  this is a redraw in its burnished-gold style. The README banners and dividers use the same shape.",
        "- `client/icon-*.png`, `favicon.png`: the official Ocarina of Time icon on a plain night-green tile.",
        "- The Map view's Hyrule (`client/src/data/map.ts`): drawn here as soft regional islands. It is",
        "  not the game's map art, and no N64 or 3DS map is used.",
        "",
        "## Audio",
        "",
        "Nintendo publishes no downloadable recording of the Switch 2 remake's music or sound effects:",
        "Zelda Wiki's remake galleries host no audio files, and the soundtrack only streams in the",
        "Nintendo Music app, which can't be saved. Ripping a stream or trailer would break those",
        "services' terms, so both sounds are original renditions made by `scripts/make-audio.py`:",
        "",
        "- `client/assets/audio/lullaby.{webm,m4a}`: Zelda's Lullaby (composed by Koji Kondo,",
        "  © Nintendo) performed by a synthesized ocarina over a quiet harp, mono, about 38 s, looped.",
        "  Not the remake's recording.",
        "- `client/assets/audio/item-get.{webm,m4a}`: a short original \"item get\" style flourish, mono,",
        "  2.4 s. Not the game's jingle.",
        "",
        "If Nintendo releases the remake soundtrack for download, replace these and list the source here.",
    ]
    open(os.path.join(OUT, "SOURCES.md"), "w").write("\n".join(md) + "\n")
    print(f"{len(icon_names)} icons, {len(art_vars)} art files")


if __name__ == "__main__":
    main()
