// Subset a TrueType font and emit PDF Type0 / Identity-H objects so the
// checklist can use Marcellus SC and Inter, including glyphs like é and ·
// that WinAnsi + Helvetica cannot keep.

import { PdfDoc, strBytes } from "./pdf-write.ts";

function u16(b: Uint8Array, o: number): number {
  return (b[o] << 8) | b[o + 1];
}
function u32(b: Uint8Array, o: number): number {
  return ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
}
function i16(b: Uint8Array, o: number): number {
  const v = u16(b, o);
  return v > 0x7fff ? v - 0x10000 : v;
}
function w16(b: Uint8Array, o: number, v: number): void {
  b[o] = (v >> 8) & 0xff;
  b[o + 1] = v & 0xff;
}
function w32(b: Uint8Array, o: number, v: number): void {
  b[o] = (v >>> 24) & 0xff;
  b[o + 1] = (v >>> 16) & 0xff;
  b[o + 2] = (v >>> 8) & 0xff;
  b[o + 3] = v & 0xff;
}

interface Table {
  offset: number;
  length: number;
}

function tablesOf(buf: Uint8Array): Map<string, Table> {
  const n = u16(buf, 4);
  const tables = new Map<string, Table>();
  for (let i = 0; i < n; i++) {
    const o = 12 + i * 16;
    const tag = String.fromCharCode(buf[o], buf[o + 1], buf[o + 2], buf[o + 3]);
    tables.set(tag, { offset: u32(buf, o + 8), length: u32(buf, o + 12) });
  }
  return tables;
}

function sliceTbl(buf: Uint8Array, t: Table): Uint8Array {
  return buf.subarray(t.offset, t.offset + t.length);
}

function must(tables: Map<string, Table>, tag: string): Table {
  const t = tables.get(tag);
  if (!t) throw new Error(`font is missing the ${tag} table`);
  return t;
}

function parseCmap4(t: Uint8Array, off: number): Map<number, number> {
  const map = new Map<number, number>();
  const segCount = u16(t, off + 6) >> 1;
  const endOff = off + 14;
  const startOff = endOff + 2 * segCount + 2;
  const deltaOff = startOff + 2 * segCount;
  const rangeOff = deltaOff + 2 * segCount;
  for (let i = 0; i < segCount; i++) {
    const end = u16(t, endOff + 2 * i);
    const start = u16(t, startOff + 2 * i);
    const delta = i16(t, deltaOff + 2 * i);
    const ro = u16(t, rangeOff + 2 * i);
    for (let c = start; c <= end; c++) {
      let gid: number;
      if (ro === 0) gid = (c + delta) & 0xffff;
      else {
        const p = rangeOff + 2 * i + ro + 2 * (c - start);
        gid = u16(t, p);
        if (gid !== 0) gid = (gid + delta) & 0xffff;
      }
      if (gid !== 0) map.set(c, gid);
      if (c === 0xffff) break;
    }
  }
  return map;
}

function parseCmap12(t: Uint8Array, off: number): Map<number, number> {
  const map = new Map<number, number>();
  const nGroups = u32(t, off + 12);
  let p = off + 16;
  for (let i = 0; i < nGroups; i++) {
    const start = u32(t, p);
    const end = u32(t, p + 4);
    let gid = u32(t, p + 8);
    for (let c = start; c <= end; c++) map.set(c, gid++);
    p += 12;
  }
  return map;
}

function readCmap(buf: Uint8Array, tables: Map<string, Table>): Map<number, number> {
  const t = sliceTbl(buf, must(tables, "cmap"));
  const num = u16(t, 2);
  const recs: Array<{ p: number; e: number; off: number }> = [];
  for (let i = 0; i < num; i++) {
    recs.push({ p: u16(t, 4 + i * 8), e: u16(t, 6 + i * 8), off: u32(t, 8 + i * 8) });
  }
  const rank = (r: { p: number; e: number }) =>
    r.p === 3 && r.e === 10 ? 4 : r.p === 0 && r.e === 4 ? 3 : r.p === 3 && r.e === 1 ? 2 : r.p === 0 ? 1 : 0;
  recs.sort((a, b) => rank(b) - rank(a));
  for (const r of recs) {
    const format = u16(t, r.off);
    if (format === 12) return parseCmap12(t, r.off);
    if (format === 4) return parseCmap4(t, r.off);
  }
  throw new Error("font has no usable cmap");
}

function readLoca(buf: Uint8Array, tables: Map<string, Table>, numGlyphs: number): number[] {
  const fmt = u16(sliceTbl(buf, must(tables, "head")), 50);
  const t = sliceTbl(buf, must(tables, "loca"));
  const loca: number[] = [];
  if (fmt === 0) {
    for (let i = 0; i <= numGlyphs; i++) loca.push(u16(t, i * 2) * 2);
  } else {
    for (let i = 0; i <= numGlyphs; i++) loca.push(u32(t, i * 4));
  }
  return loca;
}

function readHmtx(buf: Uint8Array, tables: Map<string, Table>, numGlyphs: number): { adv: number[]; lsb: number[] } {
  const nH = u16(sliceTbl(buf, must(tables, "hhea")), 34);
  const t = sliceTbl(buf, must(tables, "hmtx"));
  const adv = new Array<number>(numGlyphs);
  const lsb = new Array<number>(numGlyphs);
  let o = 0;
  let last = 0;
  for (let i = 0; i < nH; i++) {
    last = u16(t, o);
    adv[i] = last;
    lsb[i] = i16(t, o + 2);
    o += 4;
  }
  for (let i = nH; i < numGlyphs; i++) {
    adv[i] = last;
    lsb[i] = i16(t, o);
    o += 2;
  }
  return { adv, lsb };
}

function componentGids(glyf: Uint8Array, loca: number[], gid: number): number[] {
  const start = loca[gid];
  const end = loca[gid + 1];
  if (end <= start) return [];
  if (i16(glyf, start) >= 0) return [];
  const out: number[] = [];
  let o = start + 10;
  for (;;) {
    const flags = u16(glyf, o);
    out.push(u16(glyf, o + 2));
    o += 4;
    o += flags & 1 ? 4 : 2;
    if (flags & 0x8) o += 2;
    else if (flags & 0x40) o += 4;
    else if (flags & 0x80) o += 8;
    if (!(flags & 0x20)) break;
  }
  return out;
}

function remapGlyph(data: Uint8Array, map: Map<number, number>): Uint8Array {
  if (data.length < 2 || i16(data, 0) >= 0) return data;
  const out = new Uint8Array(data);
  let o = 10;
  for (;;) {
    const flags = u16(out, o);
    const neu = map.get(u16(out, o + 2));
    if (neu === undefined) throw new Error("composite refers to a dropped glyph");
    w16(out, o + 2, neu);
    o += 4;
    o += flags & 1 ? 4 : 2;
    if (flags & 0x8) o += 2;
    else if (flags & 0x40) o += 4;
    else if (flags & 0x80) o += 8;
    if (!(flags & 0x20)) break;
  }
  return out;
}

function checksum(buf: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < buf.length; i += 4) {
    const v = ((buf[i] ?? 0) << 24) | ((buf[i + 1] ?? 0) << 16) | ((buf[i + 2] ?? 0) << 8) | (buf[i + 3] ?? 0);
    sum = (sum + v) >>> 0;
  }
  return sum;
}

function pad4(data: Uint8Array): Uint8Array {
  const n = (4 - (data.length & 3)) & 3;
  if (!n) return data;
  const out = new Uint8Array(data.length + n);
  out.set(data);
  return out;
}

function writeTag(b: Uint8Array, o: number, tag: string): void {
  b[o] = tag.charCodeAt(0);
  b[o + 1] = tag.charCodeAt(1);
  b[o + 2] = tag.charCodeAt(2);
  b[o + 3] = tag.charCodeAt(3);
}

function buildTtf(tableMap: Map<string, Uint8Array>): Uint8Array {
  const tags = [...tableMap.keys()].sort();
  const numTables = tags.length;
  let searchRange = 1;
  let entrySelector = 0;
  while (searchRange << 1 <= numTables) {
    searchRange <<= 1;
    entrySelector++;
  }
  searchRange *= 16;
  const rangeShift = numTables * 16 - searchRange;
  let offset = 12 + 16 * numTables;
  const recs: Array<{ tag: string; checksum: number; offset: number; length: number; data: Uint8Array }> = [];
  for (const tag of tags) {
    const data = tableMap.get(tag)!;
    const padded = pad4(data);
    recs.push({ tag, checksum: checksum(padded), offset, length: data.length, data: padded });
    offset += padded.length;
  }
  const out = new Uint8Array(offset);
  w32(out, 0, 0x00010000);
  w16(out, 4, numTables);
  w16(out, 6, searchRange);
  w16(out, 8, entrySelector);
  w16(out, 10, rangeShift);
  for (let i = 0; i < recs.length; i++) {
    const r = recs[i];
    const o = 12 + i * 16;
    writeTag(out, o, r.tag);
    w32(out, o + 4, r.checksum);
    w32(out, o + 8, r.offset);
    w32(out, o + 12, r.length);
    out.set(r.data, r.offset);
  }
  const head = recs.find((r) => r.tag === "head");
  if (!head) throw new Error("subset is missing head");
  w32(out, head.offset + 8, (0xb1b0afba - checksum(out)) >>> 0);
  return out;
}

function postscriptName(nameTbl: Uint8Array): string {
  const count = u16(nameTbl, 2);
  const storage = u16(nameTbl, 4);
  // Prefer Mac Roman (1,0) or Windows Unicode (3,1) name id 6.
  let fallback = "Font";
  for (let i = 0; i < count; i++) {
    const o = 6 + i * 12;
    const plat = u16(nameTbl, o);
    const enc = u16(nameTbl, o + 2);
    const id = u16(nameTbl, o + 6);
    const len = u16(nameTbl, o + 8);
    const off = u16(nameTbl, o + 10);
    if (id !== 6 && id !== 4) continue;
    const bytes = nameTbl.subarray(storage + off, storage + off + len);
    let s: string;
    if (plat === 3 || enc === 1) {
      const units: number[] = [];
      for (let j = 0; j < bytes.length; j += 2) units.push(u16(bytes, j));
      s = String.fromCharCode(...units);
    } else s = String.fromCharCode(...bytes);
    s = s.replace(/[^\x21-\x7E]/g, "").replace(/[\[\]()<>{}/%]/g, "");
    if (!s) continue;
    if (id === 6) return s;
    fallback = s;
  }
  return fallback || "Font";
}

function subsetTag(gids: number[]): string {
  let h = 2166136261;
  for (const g of gids) h = Math.imul(h ^ g, 16777619);
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let n = h >>> 0;
  let s = "";
  for (let i = 0; i < 6; i++) {
    s += A[n % 26];
    n = Math.floor(n / 26);
  }
  return s;
}

function hexUtf16(cp: number): string {
  if (cp <= 0xffff) return cp.toString(16).toUpperCase().padStart(4, "0");
  const v = cp - 0x10000;
  const hi = 0xd800 + (v >> 10);
  const lo = 0xdc00 + (v & 0x3ff);
  return hi.toString(16).toUpperCase().padStart(4, "0") + lo.toString(16).toUpperCase().padStart(4, "0");
}

export interface EmbeddedFont {
  name: string;
  unitsPerEm: number;
  ascent: number;
  descent: number;
  capHeight: number;
  bbox: [number, number, number, number];
  flags: number;
  stemV: number;
  italicAngle: number;
  subsetTtf: Uint8Array;
  widthOf(text: string, fontSize: number): number;
  encode(text: string): string;
  widthArray(): string;
  toUnicodeCmap(): string;
}

export function embedFont(ttf: Uint8Array, text: string, opts: { serif?: boolean } = {}): EmbeddedFont {
  const tables = tablesOf(ttf);
  if (!tables.has("glyf") || !tables.has("loca")) {
    throw new Error("only TrueType (glyf) fonts can be embedded");
  }
  const head = sliceTbl(ttf, must(tables, "head"));
  const hhea = sliceTbl(ttf, must(tables, "hhea"));
  const maxp = sliceTbl(ttf, must(tables, "maxp"));
  const numGlyphs = u16(maxp, 4);
  const unitsPerEm = u16(head, 18);
  const cmap = readCmap(ttf, tables);
  const loca = readLoca(ttf, tables, numGlyphs);
  const glyf = sliceTbl(ttf, must(tables, "glyf"));
  const metrics = readHmtx(ttf, tables, numGlyphs);

  const needed = new Set<number>([0]);
  for (const ch of text) {
    const gid = cmap.get(ch.codePointAt(0)!) ?? 0;
    needed.add(gid);
  }
  const stack = [...needed];
  while (stack.length) {
    const gid = stack.pop()!;
    for (const c of componentGids(glyf, loca, gid)) {
      if (!needed.has(c)) {
        needed.add(c);
        stack.push(c);
      }
    }
  }

  const oldGids = [0, ...[...needed].filter((g) => g !== 0).sort((a, b) => a - b)];
  const oldToNew = new Map<number, number>();
  oldGids.forEach((g, i) => oldToNew.set(g, i));
  const newNum = oldGids.length;

  const newGlyphs: Uint8Array[] = oldGids.map((g) => {
    const raw = glyf.subarray(loca[g], loca[g + 1]);
    const remapped = remapGlyph(raw, oldToNew);
    if (remapped.length & 1) {
      const padded = new Uint8Array(remapped.length + 1);
      padded.set(remapped);
      return padded;
    }
    return remapped;
  });

  const newLoca = new Uint8Array((newNum + 1) * 4);
  const glyfParts: Uint8Array[] = [];
  let glyfOff = 0;
  for (let i = 0; i < newNum; i++) {
    w32(newLoca, i * 4, glyfOff);
    glyfParts.push(newGlyphs[i]);
    glyfOff += newGlyphs[i].length;
  }
  w32(newLoca, newNum * 4, glyfOff);
  const newGlyf = new Uint8Array(glyfOff);
  let go = 0;
  for (const g of glyfParts) {
    newGlyf.set(g, go);
    go += g.length;
  }

  const newHmtx = new Uint8Array(newNum * 4);
  for (let i = 0; i < newNum; i++) {
    w16(newHmtx, i * 4, metrics.adv[oldGids[i]]);
    w16(newHmtx, i * 4 + 2, metrics.lsb[oldGids[i]]);
  }

  // cmap format 12 covering every kept character.
  const cps = [...new Set([...text].map((ch) => ch.codePointAt(0)!))].sort((a, b) => a - b);
  const groups: Array<[number, number, number]> = [];
  for (const cp of cps) {
    const gid = oldToNew.get(cmap.get(cp) ?? 0) ?? 0;
    if (gid === 0 && cp !== 0) {
      // Keep a mapping even for .notdef so missing letters are not silent in ToUnicode.
    }
    const last = groups[groups.length - 1];
    if (last && cp === last[1] + 1 && gid === last[2] + (last[1] - last[0]) + 1) {
      last[1] = cp;
    } else groups.push([cp, cp, gid]);
  }
  const cmapLen = 16 + groups.length * 12;
  const cmapBody = new Uint8Array(12 + 8 + cmapLen);
  w16(cmapBody, 2, 1);
  w16(cmapBody, 4, 3);
  w16(cmapBody, 6, 10);
  w32(cmapBody, 8, 12);
  w16(cmapBody, 12, 12);
  w32(cmapBody, 16, cmapLen);
  w32(cmapBody, 24, groups.length);
  groups.forEach((g, i) => {
    const o = 28 + i * 12;
    w32(cmapBody, o, g[0]);
    w32(cmapBody, o + 4, g[1]);
    w32(cmapBody, o + 8, g[2]);
  });

  const newHead = new Uint8Array(head);
  w32(newHead, 8, 0);
  w16(newHead, 50, 1);
  const newHhea = new Uint8Array(hhea);
  w16(newHhea, 34, newNum);
  const newMaxp = new Uint8Array(maxp);
  w16(newMaxp, 4, newNum);

  const srcPost = sliceTbl(ttf, must(tables, "post"));
  const newPost = new Uint8Array(32);
  w32(newPost, 0, 0x00030000);
  newPost.set(srcPost.subarray(4, 16), 4);

  const tableMap = new Map<string, Uint8Array>([
    ["head", newHead],
    ["hhea", newHhea],
    ["maxp", newMaxp],
    ["loca", newLoca],
    ["glyf", newGlyf],
    ["hmtx", newHmtx],
    ["cmap", cmapBody],
    ["name", new Uint8Array(sliceTbl(ttf, must(tables, "name")))],
    ["post", newPost],
  ]);
  const os2tbl = tables.get("OS/2");
  if (os2tbl) tableMap.set("OS/2", new Uint8Array(sliceTbl(ttf, os2tbl)));
  for (const tag of ["cvt ", "fpgm", "prep", "gasp"]) {
    const t = tables.get(tag);
    if (t) tableMap.set(tag, new Uint8Array(sliceTbl(ttf, t)));
  }

  const subsetTtf = buildTtf(tableMap);
  const scale = 1000 / unitsPerEm;
  const toPdf = (v: number) => Math.round(v * scale);
  const bbox: [number, number, number, number] = [
    toPdf(i16(head, 36)),
    toPdf(i16(head, 38)),
    toPdf(i16(head, 40)),
    toPdf(i16(head, 42)),
  ];
  let ascent = toPdf(i16(hhea, 4));
  let descent = toPdf(i16(hhea, 6));
  let capHeight = ascent;
  let weight = 400;
  if (os2tbl) {
    const os2 = sliceTbl(ttf, os2tbl);
    const typoAscent = i16(os2, 68);
    const typoDescent = i16(os2, 70);
    if (typoAscent) ascent = toPdf(typoAscent);
    if (typoDescent) descent = toPdf(typoDescent);
    if (os2.length >= 88 && u16(os2, 0) >= 2) {
      const cap = i16(os2, 86);
      if (cap) capHeight = toPdf(cap);
    }
    weight = u16(os2, 4) || 400;
  }

  const ps = postscriptName(sliceTbl(ttf, must(tables, "name")));
  const name = `${subsetTag(oldGids)}+${ps}`;
  const italicAngle = i16(srcPost, 4) + i16(srcPost, 6) / 65536;
  const flags = 32 | (opts.serif ? 2 : 0);
  const stemV = Math.round(0.14 * weight);

  const newAdv = oldGids.map((g) => toPdf(metrics.adv[g]));
  const charToGid = new Map<number, number>();
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    charToGid.set(cp, oldToNew.get(cmap.get(cp) ?? 0) ?? 0);
  }

  const font: EmbeddedFont = {
    name,
    unitsPerEm,
    ascent,
    descent,
    capHeight,
    bbox,
    flags,
    stemV,
    italicAngle,
    subsetTtf,
    widthOf(str, fontSize) {
      let w = 0;
      for (const ch of str) {
        const gid = charToGid.get(ch.codePointAt(0)!) ?? 0;
        w += (newAdv[gid] * fontSize) / 1000;
      }
      return w;
    },
    encode(str) {
      let hex = "";
      for (const ch of str) {
        const gid = charToGid.get(ch.codePointAt(0)!) ?? 0;
        hex += gid.toString(16).toUpperCase().padStart(4, "0");
      }
      return hex;
    },
    widthArray() {
      return `[ 0 [${newAdv.join(" ")}] ]`;
    },
    toUnicodeCmap() {
      const pairs: string[] = [];
      const seen = new Set<number>();
      for (const [cp, gid] of charToGid) {
        if (seen.has(gid)) continue;
        seen.add(gid);
        pairs.push(`<${gid.toString(16).toUpperCase().padStart(4, "0")}> <${hexUtf16(cp)}>`);
      }
      const chunks: string[] = [];
      for (let i = 0; i < pairs.length; i += 100) {
        const slice = pairs.slice(i, i + 100);
        chunks.push(`${slice.length} beginbfchar\n${slice.join("\n")}\nendbfchar`);
      }
      return [
        "/CIDInit /ProcSet findresource begin",
        "12 dict begin",
        "begincmap",
        "/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def",
        "/CMapName /Adobe-Identity-UCS def",
        "/CMapType 2 def",
        "1 begincodespacerange",
        "<0000> <FFFF>",
        "endcodespacerange",
        ...chunks,
        "endcmap",
        "CMapName currentdict /CMap defineresource pop",
        "end",
        "end",
      ].join("\n");
    },
  };
  return font;
}

export function addType0Font(doc: PdfDoc, font: EmbeddedFont): number {
  const fileId = doc.addStream(font.subsetTtf, ` /Length1 ${font.subsetTtf.length}`);
  const [x0, y0, x1, y1] = font.bbox;
  const descId = doc.add(
    `<< /Type /FontDescriptor /FontName /${font.name} /Flags ${font.flags} ` +
      `/FontBBox [${x0} ${y0} ${x1} ${y1}] /ItalicAngle ${font.italicAngle} ` +
      `/Ascent ${font.ascent} /Descent ${font.descent} /CapHeight ${font.capHeight} ` +
      `/StemV ${font.stemV} /FontFile2 ${fileId} 0 R >>`,
  );
  const cidId = doc.add(
    `<< /Type /Font /Subtype /CIDFontType2 /BaseFont /${font.name} ` +
      `/CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> ` +
      `/FontDescriptor ${descId} 0 R /W ${font.widthArray()} /CIDToGIDMap /Identity /DW 1000 >>`,
  );
  const toUniId = doc.addStream(strBytes(font.toUnicodeCmap()));
  return doc.add(
    `<< /Type /Font /Subtype /Type0 /BaseFont /${font.name} /Encoding /Identity-H ` +
      `/DescendantFonts [${cidId} 0 R] /ToUnicode ${toUniId} 0 R >>`,
  );
}
