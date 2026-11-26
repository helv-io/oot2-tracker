// A small hand-rolled PDF writer (no dependencies) that renders the
// full checklist as a printable document: section headings, a checkbox
// square per item, and the item's name, detail, and area/age/time tags.
// Checked items are drawn with a filled gold box and an X.

import { SECTIONS } from "./data/catalog";

const PAGE_W = 612; // US Letter
const PAGE_H = 792;
const MARGIN = 46;
const CONTENT_W = PAGE_W - MARGIN * 2;

function sanitize(text: string): string {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/—/g, "-")
    .replace(/–/g, "-")
    .replace(/…/g, "...")
    .replace(/[^\x20-\x7E]/g, "");
}

function escapePdf(text: string): string {
  return sanitize(text)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

// Rough Helvetica average glyph width (~0.5 em) — good enough for wrap.
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
    const stream = p.ops.join("\n");
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
