// The Map view: Nintendo's official stylized map of Hyrule for the Switch 2
// remake (see client/assets/official/SOURCES.md), with a tappable hotspot
// over each region. Each region gathers the catalog's areas that lie
// inside it and wears that region's tone from look.ts.
//
// Coordinates are in the cropped map's own units (MAP_W x MAP_H, 3 source
// pixels each). Shapes are loose polygons, smoothed into curves.

import type { Tone } from "./look";

export interface MapRegion {
  id: string;
  name: string;
  /** Short label, drawn on the map. */
  label: string;
  tone: Tone;
  icon: string;
  areas: string[];
  /** One or more polygons that make up the hotspot. */
  shapes: Array<Array<[number, number]>>;
  labelAt: [number, number];
}

export const MAP_W = 580;
export const MAP_H = 433;

export const MAP_REGIONS: MapRegion[] = [
  {
    id: "desert",
    name: "Desert Colossus",
    label: "Desert",
    tone: "spirit",
    icon: "spirit-medallion",
    areas: ["Haunted Wasteland", "Desert Colossus", "Spirit Temple"],
    shapes: [
      [[20, 93], [40, 65], [88, 55], [120, 69], [136, 99], [124, 133], [85, 141], [64, 157], [58, 190], [40, 197], [22, 170], [14, 125]],
    ],
    labelAt: [56, 115],
  },
  {
    id: "gerudo",
    name: "Gerudo Valley",
    label: "Gerudo",
    tone: "spirit",
    icon: "gerudo-pass",
    areas: ["Gerudo Valley", "Gerudo's Fortress"],
    shapes: [
      [[72, 143], [125, 137], [150, 165], [156, 205], [132, 229], [96, 229], [76, 199], [66, 165]],
    ],
    labelAt: [110, 191],
  },
  {
    id: "ganon",
    name: "Ganon's Castle",
    label: "Ganon",
    tone: "ganon",
    icon: "boss-key",
    areas: ["Ganon's Castle"],
    shapes: [
      [[196, 27], [222, 17], [260, 27], [276, 45], [258, 59], [222, 55], [198, 53]],
    ],
    labelAt: [236, 43],
  },
  {
    id: "castle",
    name: "Hyrule Castle",
    label: "Castle",
    tone: "light",
    icon: "zeldas-letter",
    areas: ["Hyrule Castle", "Hyrule Castle Grounds", "Hyrule Castle Town", "Hyrule Castle Town (ruins)", "Temple of Time"],
    shapes: [
      [[186, 65], [228, 59], [270, 65], [280, 115], [282, 161], [250, 171], [210, 165], [192, 135], [182, 95]],
    ],
    labelAt: [232, 115],
  },
  {
    id: "mountain",
    name: "Death Mountain",
    label: "Mountain",
    tone: "fire",
    icon: "goron-ruby",
    areas: ["Death Mountain Trail", "Dodongo's Cavern", "Goron City", "Death Mountain Crater", "Fire Temple"],
    shapes: [
      [[295, 17], [340, 8], [390, 8], [430, 51], [462, 93], [430, 107], [380, 101], [332, 115], [298, 89], [288, 49]],
    ],
    labelAt: [378, 61],
  },
  {
    id: "kakariko",
    name: "Kakariko Village",
    label: "Kakariko",
    tone: "village",
    icon: "token",
    areas: ["Kakariko Village", "Kakariko Graveyard", "Bottom of the Well", "Shadow Temple"],
    shapes: [
      [[322, 137], [358, 129], [400, 133], [432, 149], [426, 177], [380, 183], [340, 181], [318, 165]],
    ],
    labelAt: [374, 159],
  },
  {
    id: "zora",
    name: "Zora's Domain",
    label: "Zora",
    tone: "water",
    icon: "zora-sapphire",
    areas: ["Zora's River", "Zora's Domain", "Zora's Fountain", "Inside Jabu-Jabu's Belly", "Ice Cavern"],
    shapes: [
      [[430, 181], [460, 161], [500, 145], [540, 165], [556, 205], [550, 237], [500, 247], [450, 235], [426, 211]],
      [[318, 205], [365, 195], [428, 201], [430, 225], [380, 229], [322, 223]],
    ],
    labelAt: [502, 197],
  },
  {
    id: "field",
    name: "Hyrule Field",
    label: "Field",
    tone: "field",
    icon: "running-man",
    areas: ["Hyrule Field"],
    shapes: [
      [[160, 175], [260, 169], [310, 197], [320, 235], [306, 295], [260, 317], [200, 311], [150, 295], [144, 235]],
    ],
    labelAt: [244, 287],
  },
  {
    id: "ranch",
    name: "Lon Lon Ranch",
    label: "Lon Lon",
    tone: "ranch",
    icon: "lon-lon-milk",
    areas: ["Lon Lon Ranch"],
    shapes: [
      [[174, 201], [218, 191], [252, 205], [248, 241], [206, 257], [174, 241]],
    ],
    labelAt: [212, 227],
  },
  {
    id: "forest",
    name: "Kokiri Forest",
    label: "Forest",
    tone: "forest",
    icon: "kokiri-emerald",
    areas: ["Kokiri Forest", "Inside the Deku Tree", "Lost Woods", "Sacred Forest Meadow", "Forest Temple"],
    shapes: [
      [[306, 251], [340, 237], [400, 229], [460, 237], [520, 251], [546, 277], [552, 341], [510, 353], [450, 347], [390, 353], [340, 337], [306, 301]],
    ],
    labelAt: [428, 299],
  },
  {
    id: "lake",
    name: "Lake Hylia",
    label: "Lake",
    tone: "water",
    icon: "water-medallion",
    areas: ["Lake Hylia", "Water Temple"],
    shapes: [
      [[144, 327], [190, 317], [260, 321], [296, 345], [296, 391], [250, 407], [174, 397], [144, 367]],
    ],
    labelAt: [222, 361],
  },
];

/** Region id for each catalog area. */
export const REGION_OF_AREA: ReadonlyMap<string, string> = new Map(
  MAP_REGIONS.flatMap((r) => r.areas.map((a) => [a, r.id] as const)),
);

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
