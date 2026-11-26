// A small hand-rolled PDF writer (no dependencies) that renders the
// full checklist as a printable document: section headings, a checkbox
// square per item, and the item's name, detail, and area/age/time tags.
// Checked items are drawn with a filled gold box and an X.

import { SECTIONS } from "./data/catalog.ts";

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

function sanitize(text: string): string {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\u2014/g, "-")
    .replace(/\u2013/g, "-")
    .replace(/…/g, "...")
    .replace(/[^\x20-\x7E]/g, "");
}

function escapePdf(text: string): string {
  return sanitize(text)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

// Rough Helvetica average glyph width (~0.5 em), good enough for wrap.
function wrap(text: string, fontSize: number, maxWidth: number): string[] {
  const maxChars = Math.max(12, Math.floor(maxWidth / (fontSize * 0.485)));
  const words = sanitize(text).split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (!current) {
      current = word;
    } else if ((current + " " + word).length <= maxChars) {
      current += " " + word;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

interface PageBuilder {
  ops: string[];
  y: number;
}

export function buildChecklistPdf(checkedKeys: ReadonlySet<string>): Blob {
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
    font: "F1" | "F2",
    color: [number, number, number] = [0.13, 0.09, 0.04],
  ) => {
    page.ops.push(
      `BT /${font} ${size} Tf ${color[0]} ${color[1]} ${color[2]} rg 1 0 0 1 ${x.toFixed(1)} ${page.y.toFixed(1)} Tm (${escapePdf(str)}) Tj ET`,
    );
  };
  const line = (size: number, leading = 1.25) => {
    page.y -= size * leading;
  };

  // ---- Title block ----
  text("THE LEGEND OF ZELDA: OCARINA OF TIME", MARGIN, 19, "F2", [0.48, 0.36, 0.06]);
  line(19, 1.5);
  text("The Ultimate 100% Checklist - Nintendo Switch 2 Remake", MARGIN, 12.5, "F2");
  line(12.5, 1.6);
  const done = checkedKeys.size;
  const total = SECTIONS.reduce((n, s) => n + s.items.length, 0);
  for (const l of wrap(
    `Progress when printed: ${done} of ${total} items complete. Print this, keep it by the console, and tick each box with a pen as Hyrule gives up its secrets.`,
    10,
    CONTENT_W,
  )) {
    text(l, MARGIN, 10, "F1", [0.35, 0.27, 0.14]);
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
    const secDone = section.items.filter((i) => checkedKeys.has(i.id)).length;
    text(
      `${section.title}  (${secDone}/${section.items.length})`,
      MARGIN,
      14,
      "F2",
      [0.16, 0.26, 0.14],
    );
    line(14, 1.35);
    for (const l of wrap(section.blurb, 9, CONTENT_W)) {
      text(l, MARGIN, 9, "F1", [0.4, 0.32, 0.16]);
      line(9, 1.2);
    }
    line(8, 1.1);

    for (const item of section.items) {
      const meta = [item.area, item.age ? `${item.age} Link` : null, item.time && item.time !== "Any" ? item.time : null]
        .filter(Boolean)
        .join(" - ");
      const nameLines = wrap(item.name, 10.5, CONTENT_W - 18);
      const detailLines = wrap(item.detail, 9, CONTENT_W - 18);
      const height =
        nameLines.length * 10.5 * 1.22 +
        (meta ? 8.5 * 1.3 : 0) +
        detailLines.length * 9 * 1.22 +
        7;
      ensure(height);

      const topY = page.y;
      const isDone = checkedKeys.has(item.id);
      // checkbox square
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
        text(l, x, 10.5, "F2");
        line(10.5, 1.22);
      }
      if (meta) {
        text(meta, x, 8.5, "F1", [0.48, 0.36, 0.06]);
        line(8.5, 1.3);
      }
      for (const l of detailLines) {
        text(l, x, 9, "F1", [0.25, 0.19, 0.1]);
        line(9, 1.22);
      }
      line(7, 1);
    }
    line(12, 1.6);
  }

  // ---- Assemble the PDF document ----
  // Object ids: 1 Catalog, 2 Pages, 3 Helvetica, 4 Helvetica-Bold,
  // then alternating Page / content-stream objects per page.
  const objects = new Map<number, string>();
  objects.set(1, "<< /Type /Catalog /Pages 2 0 R >>");
  objects.set(3, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  objects.set(4, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");

  const pageObjIds: number[] = [];
  let nextId = 5;
  for (const p of pages) {
    const pageId = nextId++;
    const contentId = nextId++;
    pageObjIds.push(pageId);
    objects.set(
      pageId,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Contents ${contentId} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >>`,
    );
    const stream = `${p.ops.join("\n")}\n${bezelOps()}`;
    objects.set(contentId, `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  }
  objects.set(
    2,
    `<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjIds.length} >>`,
  );

  const maxId = Math.max(...objects.keys());
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = new Array(maxId + 1).fill(0);
  for (let id = 1; id <= maxId; id++) {
    const body = objects.get(id);
    if (!body) continue;
    offsets[id] = pdf.length;
    pdf += `${id} 0 obj\n${body}\nendobj\n`;
  }
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${maxId + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= maxId; id++) {
    pdf += `${String(offsets[id] ?? 0).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${maxId + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}
