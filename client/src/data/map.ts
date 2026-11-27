// The Map view: a small, custom-drawn Hyrule (not game art) split into
// regions. Each region gathers the catalog's areas that lie inside it,
// wears that region's tone from look.ts, and is drawn as a soft island
// on a 640x420 board. Coarse outline points are smoothed into curves.

import type { Tone } from "./look";

export interface MapRegion {
  id: string;
  name: string;
  /** Short label drawn on the map. */
  label: string;
  tone: Tone;
  icon: string;
  areas: string[];
  outline: Array<[number, number]>;
  labelAt: [number, number];
}

export const MAP_W = 640;
export const MAP_H = 420;

export const MAP_REGIONS: MapRegion[] = [
  {
    id: "desert",
    name: "Desert Colossus",
    label: "Desert",
    tone: "spirit",
    icon: "spirit-medallion",
    areas: ["Haunted Wasteland", "Desert Colossus", "Spirit Temple"],
    outline: [[22, 78], [104, 52], [142, 92], [134, 168], [142, 236], [104, 276], [40, 266], [14, 186]],
    labelAt: [78, 166],
  },
  {
    id: "gerudo",
    name: "Gerudo Valley",
    label: "Gerudo",
    tone: "spirit",
    icon: "gerudo-pass",
    areas: ["Gerudo Valley", "Gerudo's Fortress"],
    outline: [[160, 104], [212, 128], [222, 178], [200, 232], [158, 236], [150, 170]],
    labelAt: [186, 176],
  },
  {
    id: "ganon",
    name: "Ganon's Castle",
    label: "Ganon",
    tone: "ganon",
    icon: "boss-key",
    areas: ["Ganon's Castle"],
    outline: [[266, 8], [330, 4], [344, 30], [304, 46], [262, 34]],
    labelAt: [303, 28],
  },
  {
    id: "castle",
    name: "Hyrule Castle",
    label: "Castle",
    tone: "light",
    icon: "zeldas-letter",
    areas: ["Hyrule Castle", "Hyrule Castle Grounds", "Hyrule Castle Town", "Hyrule Castle Town (ruins)", "Temple of Time"],
    outline: [[244, 62], [318, 54], [366, 84], [372, 132], [300, 146], [238, 122]],
    labelAt: [304, 102],
  },
  {
    id: "mountain",
    name: "Death Mountain",
    label: "Death\nMountain",
    tone: "fire",
    icon: "goron-ruby",
    areas: ["Death Mountain Trail", "Dodongo's Cavern", "Goron City", "Death Mountain Crater", "Fire Temple"],
    outline: [[392, 30], [466, 10], [534, 42], [540, 92], [488, 112], [420, 106], [386, 72]],
    labelAt: [462, 58],
  },
  {
    id: "kakariko",
    name: "Kakariko Village",
    label: "Kakariko",
    tone: "village",
    icon: "token",
    areas: ["Kakariko Village", "Kakariko Graveyard", "Bottom of the Well", "Shadow Temple"],
    outline: [[396, 124], [478, 122], [498, 160], [462, 178], [402, 162]],
    labelAt: [446, 150],
  },
  {
    id: "zora",
    name: "Zora's Domain",
    label: "Zora",
    tone: "water",
    icon: "zora-sapphire",
    areas: ["Zora's River", "Zora's Domain", "Zora's Fountain", "Inside Jabu-Jabu's Belly", "Ice Cavern"],
    outline: [[556, 62], [614, 84], [624, 168], [592, 214], [544, 198], [520, 148], [532, 100]],
    labelAt: [574, 140],
  },
  {
    id: "field",
    name: "Hyrule Field",
    label: "Hyrule\nField",
    tone: "field",
    icon: "running-man",
    areas: ["Hyrule Field"],
    outline: [[232, 160], [300, 172], [390, 184], [458, 198], [474, 256], [428, 302], [330, 314], [244, 296], [214, 240]],
    labelAt: [418, 278],
  },
  {
    id: "ranch",
    name: "Lon Lon Ranch",
    label: "Lon Lon",
    tone: "ranch",
    icon: "lon-lon-milk",
    areas: ["Lon Lon Ranch"],
    outline: [[292, 206], [336, 196], [372, 216], [372, 250], [334, 266], [294, 254], [280, 230]],
    labelAt: [327, 236],
  },
  {
    id: "forest",
    name: "Kokiri Forest",
    label: "Kokiri\nForest",
    tone: "forest",
    icon: "kokiri-emerald",
    areas: ["Kokiri Forest", "Inside the Deku Tree", "Lost Woods", "Sacred Forest Meadow", "Forest Temple"],
    outline: [[500, 222], [562, 230], [620, 256], [624, 340], [572, 394], [498, 384], [470, 330], [484, 272]],
    labelAt: [550, 312],
  },
  {
    id: "lake",
    name: "Lake Hylia",
    label: "Lake Hylia",
    tone: "water",
    icon: "water-medallion",
    areas: ["Lake Hylia", "Water Temple"],
    outline: [[254, 334], [340, 330], [394, 352], [388, 398], [302, 414], [238, 394]],
    labelAt: [314, 374],
  },
];

/** Region id for each catalog area. */
export const REGION_OF_AREA: ReadonlyMap<string, string> = new Map(
  MAP_REGIONS.flatMap((r) => r.areas.map((a) => [a, r.id] as const)),
);

/**
 * Adds a gently jittered midpoint on every edge so islands read as
 * coastlines, not ovals. Deterministic, so the map never shifts.
 */
export function roughen(points: ReadonlyArray<[number, number]>, seed: number, amount = 7): Array<[number, number]> {
  let h = seed * 2654435761;
  const rand = () => {
    h = (h ^ (h >>> 15)) * 2246822519;
    h = (h ^ (h >>> 13)) * 3266489917;
    h ^= h >>> 16;
    return ((h >>> 0) % 1000) / 1000 - 0.5;
  };
  const out: Array<[number, number]> = [];
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    out.push([x1, y1]);
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const j = rand() * amount * 2;
    out.push([Math.round((x1 + x2) / 2 + (-dy / len) * j), Math.round((y1 + y2) / 2 + (dx / len) * j)]);
  }
  return out;
}

/** Closed Catmull-Rom curve through the points, as an SVG path. */
export function smoothPath(points: ReadonlyArray<[number, number]>, tension = 0.5): string {
  const n = points.length;
  const p = (i: number) => points[(i + n) % n];
  let d = `M${points[0][0]},${points[0][1]}`;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = p(i - 1);
    const [x1, y1] = p(i);
    const [x2, y2] = p(i + 1);
    const [x3, y3] = p(i + 2);
    const k = tension / 3;
    const c1x = x1 + (x2 - x0) * k;
    const c1y = y1 + (y2 - y0) * k;
    const c2x = x2 - (x3 - x1) * k;
    const c2y = y2 - (y3 - y1) * k;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${x2},${y2}`;
  }
  return `${d}Z`;
}
