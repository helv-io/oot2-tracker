// A small hand-rolled PDF writer (no dependencies) that renders the
// full checklist as a printable document: section headings, a checkbox
// square per item, and the item's name, detail, and area/age/time tags.
// Checked items are drawn with a filled gold box and an X.
//
// Fonts are the same as the site: Marcellus SC for the title and section
// headers, Inter for the body. Both are subset and embedded as Identity-H
// Type0 fonts, so accented letters (Dampé) and the middle dot stay intact.
// The page stays white so a print is not a grey wash.

import { SECTIONS } from "./data/catalog.ts";
import { SECTION_LOOK, TONE_COLOR, type Tone } from "./data/look.ts";
import { addType0Font, embedFont, type EmbeddedFont } from "./lib/pdf-font.ts";
import { PdfDoc, strBytes } from "./lib/pdf-write.ts";

const PAGE_W = 612; // US Letter
const PAGE_H = 792;
// Bezel sits outside the content: a double gold rule, Hylian corner
// ornaments and small Triforce accents. Content starts at MARGIN so
// nothing collides with the frame.
const FRAME_OUTER = 20;
const FRAME_INNER = 26;
const MARGIN = 56;
const CONTENT_W = PAGE_W - MARGIN * 2;
const GOLD_STROKE = "0.68 0.54 0.22";
const GOLD_LIGHT = "0.86 0.74 0.42";
const ICON_PT = 15;
const ICON_GAP = 4;

const FONT_DIR = "/assets/fonts/pdf";
const ICON_DIR = "/assets/pdf/icons";

export type PdfAssets = {
  marcellus: Uint8Array;
  inter: Uint8Array;
  icons: Record<string, Uint8Array>;
};

async function fetchBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`PDF asset missing: ${url}`);
  return new Uint8Array(await res.arrayBuffer());
}

/** Load the printable fonts and section icons (browser: from /assets). */
export async function loadPdfAssets(): Promise<PdfAssets> {
  const names = [...new Set(Object.values(SECTION_LOOK).map((p) => p.icon))];
  const [marcellus, inter, ...iconBytes] = await Promise.all([
    fetchBytes(`${FONT_DIR}/MarcellusSC-Regular.ttf`),
    fetchBytes(`${FONT_DIR}/Inter-Regular.ttf`),
    ...names.map((n) => fetchBytes(`${ICON_DIR}/${n}.jpg`)),
  ]);
  const icons: Record<string, Uint8Array> = {};
  names.forEach((n, i) => {
    icons[n] = iconBytes[i];
  });
  return { marcellus, inter, icons };
}

function hexRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function rgbOp(rgb: [number, number, number]): string {
  return `${rgb[0].toFixed(3)} ${rgb[1].toFixed(3)} ${rgb[2].toFixed(3)}`;
}

function toneRgb(tone: Tone): [number, number, number] {
  return hexRgb(TONE_COLOR[tone]);
}

function jpegSize(b: Uint8Array): { w: number; h: number } {
  let i = 2;
  while (i + 8 < b.length) {
    if (b[i] !== 0xff) break;
    let marker = b[i + 1];
    while (marker === 0xff && i + 2 < b.length) {
      i++;
      marker = b[i + 1];
    }
    const sof =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (sof) return { h: (b[i + 5] << 8) | b[i + 6], w: (b[i + 7] << 8) | b[i + 8] };
    if (marker === 0xd8 || marker === 0xd9 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    const len = (b[i + 2] << 8) | b[i + 3];
    i += 2 + len;
  }
  throw new Error("JPEG has no size");
}

function fmt(n: number): string {
  return n.toFixed(2);
}

/** Three triangles, apex at (cx, apexY). PDF y grows upward. */
function triforcePath(cx: number, apexY: number, side: number): string {
  const h = side * 0.866025;
  const half = side / 2;
  const midY = apexY - h / 2;
  const baseY = apexY - h;
  const tris: Array<Array<[number, number]>> = [
    [[cx, apexY], [cx + half / 2, midY], [cx - half / 2, midY]],
    [[cx - half / 2, midY], [cx, baseY], [cx - half, baseY]],
    [[cx + half / 2, midY], [cx + half, baseY], [cx, baseY]],
  ];
  return tris
    .map(
      (tri) =>
        `${fmt(tri[0][0])} ${fmt(tri[0][1])} m ${fmt(tri[1][0])} ${fmt(tri[1][1])} l ${fmt(tri[2][0])} ${fmt(tri[2][1])} l h`,
    )
    .join(" ");
}

function diamond(cx: number, cy: number, r: number): string {
  return `${fmt(cx)} ${fmt(cy + r)} m ${fmt(cx + r)} ${fmt(cy)} l ${fmt(cx)} ${fmt(cy - r)} l ${fmt(cx - r)} ${fmt(cy)} l h`;
}

/** Stepped L-bracket, inward hooks and a tiny diamond at the inner corner. */
function cornerOrnament(ox: number, oy: number, hx: number, vy: number): string {
  const mid = FRAME_INNER - FRAME_OUTER;
  const arm = 30;
  const ix = ox + hx * (mid + 3.2);
  const iy = oy + vy * (mid + 3.2);
  const tick = 4.2;
  const ops: string[] = [];
  ops.push(
    `${fmt(ix)} ${fmt(iy + vy * arm)} m ${fmt(ix)} ${fmt(iy)} l ${fmt(ix + hx * arm)} ${fmt(iy)} l S`,
  );
  // A second, shorter inner L for the double-rule motif.
  const ix2 = ox + hx * (mid + 5.6);
  const iy2 = oy + vy * (mid + 5.6);
  const arm2 = 18;
  ops.push(
    `0.45 w ${fmt(ix2)} ${fmt(iy2 + vy * arm2)} m ${fmt(ix2)} ${fmt(iy2)} l ${fmt(ix2 + hx * arm2)} ${fmt(iy2)} l S 0.7 w`,
  );
  ops.push(
    `${fmt(ix)} ${fmt(iy + vy * arm)} m ${fmt(ix + hx * tick)} ${fmt(iy + vy * (arm - tick))} l S`,
  );
  ops.push(
    `${fmt(ix + hx * arm)} ${fmt(iy)} m ${fmt(ix + hx * (arm - tick))} ${fmt(iy + vy * tick)} l S`,
  );
  ops.push(`${GOLD_LIGHT} rg ${diamond(ix, iy, 1.5)} f ${GOLD_STROKE} RG`);
  return ops.join("\n");
}

/** Drawn on every page, last, so the frame is never covered. Light ink, print-friendly. */
function bezelOps(): string {
  const cx = PAGE_W / 2;
  const topOuter = PAGE_H - FRAME_OUTER;
  const topInner = PAGE_H - FRAME_INNER;
  const gap = 16;
  const side = 13;
  const h = side * 0.866025;
  // Sit each Triforce on the double rule, breaking the lines around it.
  const topApex = (topOuter + topInner) / 2 + h / 2;
  const botApex = (FRAME_OUTER + FRAME_INNER) / 2 + h / 2;

  const topY = topOuter;
  const botY = FRAME_OUTER;
  const leftX = FRAME_OUTER;
  const rightX = PAGE_W - FRAME_OUTER;
  const inTop = topInner;
  const inBot = FRAME_INNER;
  const inLeft = FRAME_INNER;
  const inRight = PAGE_W - FRAME_INNER;

  return [
    "q",
    "1 J 1 j",
    `${GOLD_STROKE} RG`,
    // Outer rule, broken at the top and bottom centres for the Triforces.
    `0.95 w`,
    `${fmt(leftX)} ${fmt(botY)} m ${fmt(leftX)} ${fmt(topY)} l S`,
    `${fmt(rightX)} ${fmt(botY)} m ${fmt(rightX)} ${fmt(topY)} l S`,
    `${fmt(leftX)} ${fmt(topY)} m ${fmt(cx - gap)} ${fmt(topY)} l S`,
    `${fmt(cx + gap)} ${fmt(topY)} m ${fmt(rightX)} ${fmt(topY)} l S`,
    `${fmt(leftX)} ${fmt(botY)} m ${fmt(cx - gap)} ${fmt(botY)} l S`,
    `${fmt(cx + gap)} ${fmt(botY)} m ${fmt(rightX)} ${fmt(botY)} l S`,
    // Inner rule, same breaks.
    `0.5 w`,
    `${fmt(inLeft)} ${fmt(inBot)} m ${fmt(inLeft)} ${fmt(inTop)} l S`,
    `${fmt(inRight)} ${fmt(inBot)} m ${fmt(inRight)} ${fmt(inTop)} l S`,
    `${fmt(inLeft)} ${fmt(inTop)} m ${fmt(cx - gap)} ${fmt(inTop)} l S`,
    `${fmt(cx + gap)} ${fmt(inTop)} m ${fmt(inRight)} ${fmt(inTop)} l S`,
    `${fmt(inLeft)} ${fmt(inBot)} m ${fmt(cx - gap)} ${fmt(inBot)} l S`,
    `${fmt(cx + gap)} ${fmt(inBot)} m ${fmt(inRight)} ${fmt(inBot)} l S`,
    // Corner ornaments: top-left, top-right, bottom-left, bottom-right.
    `0.7 w`,
    cornerOrnament(leftX, topY, 1, -1),
    cornerOrnament(rightX, topY, -1, -1),
    cornerOrnament(leftX, botY, 1, 1),
    cornerOrnament(rightX, botY, -1, 1),
    // Triforce accents, stroke only so they stay light on the page.
    `0.7 w ${triforcePath(cx, topApex, side)} S`,
    `0.7 w ${triforcePath(cx, botApex, side)} S`,
    // Tiny diamonds at the midpoints of the left and right rules.
    `${GOLD_LIGHT} rg`,
    `${diamond(leftX, PAGE_H / 2, 2)} f`,
    `${diamond(rightX, PAGE_H / 2, 2)} f`,
    "Q",
  ].join("\n");
}

function wrap(text: string, fontSize: number, maxWidth: number, font: EmbeddedFont): string[] {
  const words = text.normalize("NFC").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (current && font.widthOf(next, fontSize) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function allPdfText(): string {
  const parts: string[] = [
    "THE LEGEND OF ZELDA: OCARINA OF TIME",
    "The Ultimate 100% Checklist · Nintendo Switch 2 Remake",
    "Progress when printed:  of  items complete. Print this, keep it by the console, and tick each box with a pen as Hyrule gives up its secrets.",
    "0123456789/()·  ",
  ];
  for (const section of SECTIONS) {
    parts.push(section.title, section.blurb);
    for (const item of section.items) {
      parts.push(item.name, item.detail);
      if (item.area) parts.push(item.area);
      if (item.age) parts.push(`${item.age} Link`);
      if (item.time && item.time !== "Any") parts.push(item.time);
    }
  }
  return parts.join("\n");
}

interface PageBuilder {
  ops: string[];
  y: number;
}

export async function buildChecklistPdf(
  checkedKeys: ReadonlySet<string>,
  assets?: PdfAssets,
): Promise<Blob> {
  const loaded = assets ?? (await loadPdfAssets());
  const corpus = allPdfText();
  const display = embedFont(loaded.marcellus, corpus, { serif: true });
  const body = embedFont(loaded.inter, corpus, { serif: false });

  const doc = new PdfDoc();
  const fBody = addType0Font(doc, body);
  const fDisplay = addType0Font(doc, display);

  const iconIds: Record<string, number> = {};
  for (const [name, bytes] of Object.entries(loaded.icons)) {
    const { w, h } = jpegSize(bytes);
    iconIds[name] = doc.addStream(
      bytes,
      ` /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`,
    );
  }
  const xObjectDir = Object.entries(iconIds)
    .map(([name, id]) => `/Im_${name} ${id} 0 R`)
    .join(" ");

  const pages: PageBuilder[] = [];
  let page: PageBuilder = { ops: [], y: PAGE_H - MARGIN };
  pages.push(page);

  const newPage = () => {
    page = { ops: [], y: PAGE_H - MARGIN };
    pages.push(page);
  };
  const ensure = (height: number) => {
    if (page.y - height < MARGIN) newPage();
  };
  const text = (
    str: string,
    x: number,
    size: number,
    font: EmbeddedFont,
    fontRes: "F1" | "F2",
    color: [number, number, number] = [0.13, 0.09, 0.04],
    tracking = 0,
  ) => {
    // Tc is text state and survives ET, so always set it (0 when there is no tracking).
    page.ops.push(
      `BT /${fontRes} ${size} Tf ${rgbOp(color)} rg ${tracking.toFixed(2)} Tc 1 0 0 1 ${x.toFixed(1)} ${page.y.toFixed(1)} Tm <${font.encode(str)}> Tj ET`,
    );
  };
  const line = (size: number, leading = 1.25) => {
    page.y -= size * leading;
  };

  // ---- Title block ----
  text("THE LEGEND OF ZELDA: OCARINA OF TIME", MARGIN, 18, display, "F2", [0.48, 0.36, 0.06], 0.55);
  line(18, 1.45);
  text("The Ultimate 100% Checklist · Nintendo Switch 2 Remake", MARGIN, 11, body, "F1", [0.13, 0.09, 0.04]);
  line(11, 1.65);
  const done = checkedKeys.size;
  const total = SECTIONS.reduce((n, s) => n + s.items.length, 0);
  for (const l of wrap(
    `Progress when printed: ${done} of ${total} items complete. Print this, keep it by the console, and tick each box with a pen as Hyrule gives up its secrets.`,
    10,
    CONTENT_W,
    body,
  )) {
    text(l, MARGIN, 10, body, "F1", [0.35, 0.27, 0.14]);
    line(10);
  }
  line(10, 1.2);
  page.ops.push(
    `0.79 0.64 0.15 RG 1.6 w ${MARGIN} ${page.y.toFixed(1)} m ${(PAGE_W - MARGIN).toFixed(1)} ${page.y.toFixed(1)} l S`,
  );
  line(12, 1.4);

  // ---- Sections ----
  for (const section of SECTIONS) {
    ensure(64);
    const look = SECTION_LOOK[section.id];
    const color = toneRgb(look?.tone ?? "light");
    const icon = look?.icon;
    const hasIcon = icon !== undefined && iconIds[icon] !== undefined;
    const title = `${section.title}  (${section.items.filter((i) => checkedKeys.has(i.id)).length}/${section.items.length})`;
    const titleX = hasIcon ? MARGIN + ICON_PT + ICON_GAP : MARGIN;
    if (hasIcon) {
      const cap = (13 * display.capHeight) / 1000;
      const iconY = page.y + cap / 2 - ICON_PT / 2 + 1.2;
      page.ops.push(`q ${ICON_PT} 0 0 ${ICON_PT} ${MARGIN.toFixed(1)} ${iconY.toFixed(1)} cm /Im_${icon} Do Q`);
    }
    text(title, titleX, 13, display, "F2", color, 0.15);
    line(13, 1.2);
    page.ops.push(
      `${rgbOp(color)} RG 0.7 w ${MARGIN} ${page.y.toFixed(1)} m ${(PAGE_W - MARGIN).toFixed(1)} ${page.y.toFixed(1)} l S`,
    );
    line(8, 1.15);
    for (const l of wrap(section.blurb, 9, CONTENT_W, body)) {
      text(l, MARGIN, 9, body, "F1", [0.4, 0.32, 0.16]);
      line(9, 1.2);
    }
    line(8, 1.1);

    for (const item of section.items) {
      const meta = [item.area, item.age ? `${item.age} Link` : null, item.time && item.time !== "Any" ? item.time : null]
        .filter(Boolean)
        .join(" · ");
      const nameLines = wrap(item.name, 10.5, CONTENT_W - 18, body);
      const detailLines = wrap(item.detail, 9, CONTENT_W - 18, body);
      const height =
        nameLines.length * 10.5 * 1.22 +
        (meta ? 8 * 1.3 : 0) +
        detailLines.length * 9 * 1.22 +
        7;
      ensure(height);

      const topY = page.y;
      const isDone = checkedKeys.has(item.id);
      page.ops.push(
        `0.48 0.36 0.06 RG 1.1 w ${MARGIN} ${(topY - 8.5).toFixed(1)} 9 9 re S`,
      );
      if (isDone) {
        page.ops.push(
          `0.79 0.64 0.15 rg ${MARGIN + 1.2} ${(topY - 7.3).toFixed(1)} 6.6 6.6 re f`,
        );
        page.ops.push(
          `0.13 0.09 0.04 RG 1.2 w ${MARGIN + 2} ${(topY - 6.5).toFixed(1)} m ${MARGIN + 7} ${(topY - 1.5).toFixed(1)} l S ${MARGIN + 2} ${(topY - 1.5).toFixed(1)} m ${MARGIN + 7} ${(topY - 6.5).toFixed(1)} l S`,
        );
      }
      const x = MARGIN + 15;
      for (const l of nameLines) {
        text(l, x, 10.5, body, "F1", [0.13, 0.09, 0.04]);
        line(10.5, 1.22);
      }
      if (meta) {
        text(meta, x, 8, body, "F1", [0.48, 0.36, 0.06]);
        line(8, 1.3);
      }
      for (const l of detailLines) {
        text(l, x, 9, body, "F1", [0.25, 0.19, 0.1]);
        line(9, 1.22);
      }
      line(7, 1);
    }
    line(12, 1.6);
  }

  const pagesId = doc.reserve();
  const bezel = bezelOps();
  const resources =
    `<< /Font << /F1 ${fBody} 0 R /F2 ${fDisplay} 0 R >>` +
    (xObjectDir ? ` /XObject << ${xObjectDir} >>` : "") +
    ` >>`;
  const pageObjIds: number[] = [];
  for (const p of pages) {
    const contentId = doc.addStream(strBytes(`${p.ops.join("\n")}\n${bezel}`));
    pageObjIds.push(
      doc.add(
        `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
          `/Contents ${contentId} 0 R /Resources ${resources} >>`,
      ),
    );
  }
  doc.set(
    pagesId,
    `<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjIds.length} >>`,
  );
  const catalogId = doc.add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  return new Blob([doc.assemble(catalogId)], { type: "application/pdf" });
}
