// Smart filters, part two: which key items an item needs. Progress is
// the only input: checking an item in the catalog grants the key items it
// gives you, and an item whose needs aren't all owned is greyed (never
// hidden) with a "Needs X" hint. This is a guide, not a logic solver, so
// each rule is deliberately plain. Edit the tables below to refine them.
//
// A need may offer alternatives: "Longshot or Hover Boots".

import { SECTIONS, type CatalogItem } from "./catalog.ts";

const SONGS = [
  "Zelda's Lullaby", "Epona's Song", "Saria's Song", "Sun's Song", "Song of Time", "Song of Storms",
  "Minuet of Forest", "Bolero of Fire", "Serenade of Water", "Requiem of Spirit", "Nocturne of Shadow",
  "Prelude of Light", "Scarecrow's Song",
];
const TRADES = [
  "Pocket Egg", "Cojiro", "Odd Mushroom", "Odd Poultice", "Poacher's Saw", "Broken Goron's Sword",
  "Prescription", "Eyeball Frog", "Eye Drops", "Biggoron Receipt", "Biggoron Sword",
];

/** Key items that checking an item hands you. */
export const GRANTS: Readonly<Record<string, readonly string[]>> = {
  "story-2": ["Ocarina"],
  "story-3": ["Zelda's Letter"],
  "story-4": ["Goron Bracelet"],
  "story-6": ["Bottle"],
  "story-7": ["Boomerang"],
  "story-9": ["Hookshot"],
  "story-10": ["Bow"],
  "story-11": ["Megaton Hammer"],
  "story-12": ["Iron Boots"],
  "story-13": ["Longshot"],
  "story-14": ["Lens of Truth"],
  "story-15": ["Hover Boots"],
  "story-16": ["Gerudo Card"],
  "story-17": ["Silver Gauntlets"],
  "story-19": ["Light Arrows"],
  "up-5": ["Slingshot"],
  "up-7": ["Bombs"],
  "up-10": ["Bow"],
  "up-13": ["Silver Scale"],
  "up-14": ["Golden Scale"],
  "up-15": ["Golden Gauntlets"],
  "up-16": ["Fire Arrows"],
  "gf-1": ["Din's Fire"],
  "gf-3": ["Farore's Wind"],
  "gf-5": ["Nayru's Love"],
  "gtg-4": ["Ice Arrows"],
  "gear-4": ["Mirror Shield"],
  "gear-5": ["Goron Tunic"],
  "gear-6": ["Zora Tunic"],
  "merch-1": ["Magic Beans"],
  "merch-3": ["Bombchus"],
  "skr-4": ["Bombchus"],
  "mask-5": ["Mask of Truth"],
  ...Object.fromEntries(SONGS.map((n, i) => [`song-${i + 1}`, [n]])),
  ...Object.fromEntries(TRADES.map((n, i) => [`trade-${i + 1}`, [n]])),
  ...Object.fromEntries(["bot-1", "bot-2", "bot-3", "bot-4", "bot-5"].map((id) => [id, ["Bottle"]])),
};

/** Owning the first key item also counts as owning these. */
export const IMPLIES: Readonly<Record<string, readonly string[]>> = {
  Longshot: ["Hookshot"],
  "Golden Scale": ["Silver Scale"],
  "Golden Gauntlets": ["Silver Gauntlets"],
  "Fire Arrows": ["Bow"],
  "Light Arrows": ["Bow"],
  "Ice Arrows": ["Bow"],
};

type Rule = { needs: readonly string[]; age?: "Child" | "Adult" };

/** Needs shared by every item in an area (optionally only one era's). */
const AREA_RULES: Readonly<Record<string, readonly Rule[]>> = {
  "Dodongo's Cavern": [{ needs: ["Goron Bracelet"] }],
  "Inside Jabu-Jabu's Belly": [{ needs: ["Bottle"] }],
  "Bottom of the Well": [{ needs: ["Song of Storms"] }],
  "Forest Temple": [{ needs: ["Hookshot"] }],
  "Fire Temple": [{ needs: ["Goron Tunic"] }],
  "Ice Cavern": [{ needs: ["Bottle"] }],
  "Water Temple": [{ needs: ["Iron Boots", "Zora Tunic", "Hookshot"] }],
  "Shadow Temple": [{ needs: ["Din's Fire", "Lens of Truth"] }],
  "Spirit Temple": [{ needs: ["Silver Gauntlets"], age: "Adult" }],
  "Haunted Wasteland": [{ needs: ["Longshot or Hover Boots"] }],
  "Ganon's Castle": [{ needs: ["Light Arrows"] }],
};

const ids = (prefix: string, ...n: number[]) => n.map((x) => `${prefix}-${x}`);
const SOFT_SOIL = ids("gs", 12, 14, 15, 23, 25, 39, 40, 42, 60, 90);
const BEAN_SPOTS = ["gs-45", "gs-61", "gs-94", "hp-17", "hp-20", "hp-24", "hp-33"];
const SCARECROW = ids("gs", 50, 52, 55, 82, 96);
const FROGS = ["Zelda's Lullaby", "Epona's Song", "Saria's Song", "Sun's Song", "Song of Time", "Song of Storms"];
const ARCHERY = ["Gerudo Card", "Bow", "Epona's Song"];

/** Needs of single items, on top of any area rule. */
const ITEM_RULES: Readonly<Record<string, readonly string[]>> = {
  // Main quest
  "story-4": ["Saria's Song"],
  "story-6": ["Zelda's Letter"],
  "story-7": ["Slingshot"],
  "story-18": ["Silver Gauntlets"],
  // Hearts
  "hp-16": ["Song of Storms"],
  "hp-22": ["Magic Beans or Hover Boots"],
  "hp-26": ["Iron Boots"],
  "hp-27": ["Golden Scale or Iron Boots"],
  "hp-28": ["Song of Storms"],
  "hp-29": FROGS,
  "hp-30": ["Lens of Truth"],
  "hp-31": ["Hover Boots or Longshot"],
  "hp-32": ARCHERY,
  // Skulltulas
  "gs-20": ["Bombs"],
  "gs-21": ["Bombs"],
  "gs-27": ["Boomerang"],
  "gs-58": ["Megaton Hammer"],
  "gs-59": ["Megaton Hammer"],
  "gs-63": ["Bottle"],
  "gs-73": ["Golden Scale or Iron Boots"],
  "gs-76": ["Lens of Truth"],
  "gs-71": ["Bombs"],
  "gs-87": ["Bow"],
  // Bottles, upgrades, fairies
  "bot-3": ["Silver Scale"],
  "bot-4": ["Bow"],
  "up-8": ["Bombs"],
  "up-9": ["Bombs"],
  "up-6": ["Slingshot"],
  "up-11": ["Bow"],
  "up-12": ARCHERY,
  "up-16": ["Bow"],
  "gf-1": ["Bombs"],
  "gf-2": ["Zelda's Lullaby"],
  "gf-4": ["Megaton Hammer"],
  "gf-6": ["Golden Gauntlets"],
  // Training, quests and challenges
  "gtg-1": ["Gerudo Card"],
  "gtg-2": ["Gerudo Card"],
  "gtg-3": ["Gerudo Card"],
  "gtg-4": ["Gerudo Card"],
  "chal-1": ["Slingshot"],
  "chal-2": ["Bow"],
  "chal-4": ARCHERY,
  "chal-7": ["Epona's Song"],
  "chal-9": ["Epona's Song"],
  "chal-11": FROGS,
  "chal-13": ["Gerudo Card"],
  "side-1": ["Epona's Song"],
  "side-2": ["Bottle", "Bow"],
  "side-3": ["Epona's Song"],
  // Secrets
  "egg-1": ["Slingshot or Bow"],
  "egg-2": ["Bombs"],
  "egg-3": ["Megaton Hammer"],
  "egg-5": ["Zelda's Lullaby"],
  "egg-6": ["Song of Storms"],
  "egg-7": ["Mask of Truth"],
  "egg-9": ["Zelda's Lullaby"],
  "egg-10": ["Slingshot"],
  "egg-13": ["Scarecrow's Song"],
  // The trading sequences need the item before them
  ...Object.fromEntries(TRADES.slice(1).map((_, i) => [`trade-${i + 2}`, [TRADES[i]]])),
  ...Object.fromEntries(SOFT_SOIL.map((id) => [id, ["Bottle"]])),
  ...Object.fromEntries(BEAN_SPOTS.map((id) => [id, ["Magic Beans"]])),
  ...Object.fromEntries(SCARECROW.map((id) => [id, ["Hookshot", "Scarecrow's Song"]])),
};

function clean(list: readonly string[] | undefined): string[] {
  return list ? [...list] : [];
}

/** Everything an item needs, in a stable order. */
export function needsOf(item: CatalogItem): string[] {
  const out: string[] = [];
  const add = (xs: readonly string[]) => {
    for (const x of xs) if (!out.includes(x)) out.push(x);
  };
  for (const rule of AREA_RULES[item.area ?? ""] ?? []) {
    if (rule.age && item.age !== rule.age) continue;
    add(rule.needs);
  }
  add(clean(ITEM_RULES[item.id]));
  // An item can't need what it gives.
  const gives = GRANTS[item.id] ?? [];
  return out.filter((n) => !n.split(" or ").some((k) => gives.includes(k)));
}

/** Key items owned given the checked items, including implied ones. */
export function ownedKeys(checked: ReadonlySet<string>): Set<string> {
  const owned = new Set<string>();
  for (const id of checked) for (const k of GRANTS[id] ?? []) owned.add(k);
  for (let grew = true; grew; ) {
    grew = false;
    for (const k of [...owned]) {
      for (const j of IMPLIES[k] ?? []) {
        if (!owned.has(j)) {
          owned.add(j);
          grew = true;
        }
      }
    }
  }
  return owned;
}

/** The needs of an item that the player doesn't own yet. */
export function missingNeeds(item: CatalogItem, owned: ReadonlySet<string>): string[] {
  return NEEDS.get(item.id)!.filter((n) => !n.split(" or ").some((k) => owned.has(k)));
}

/** "Hookshot", "Hookshot and Iron Boots", "Hookshot, Iron Boots and 2 more". */
export function needsHint(missing: readonly string[]): string {
  if (missing.length === 0) return "";
  const shown = missing.slice(0, 2);
  const rest = missing.length - shown.length;
  const head = shown.length === 2 && rest === 0 ? `${shown[0]} and ${shown[1]}` : shown.join(", ");
  return `Needs ${rest > 0 ? `${head} and ${rest} more` : head}`;
}

/** Precomputed needs per item id (most have none). */
export const NEEDS: ReadonlyMap<string, string[]> = new Map(
  SECTIONS.flatMap((s) => s.items).map((i) => [i.id, needsOf(i)] as const),
);
