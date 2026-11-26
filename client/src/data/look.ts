// Which official remake icon and which in-game colour each part of the
// checklist wears. Pure data (no image imports), so tests can check it.
//
// Tones are muted, region-true accents: forest green for Kokiri and the
// Forest Temple, ember red for Death Mountain, Zora blue, shadow violet,
// desert sand for the Gerudo and the Spirit Temple, royal gold for the
// castle and the Temple of Time, pale ice for the Ice Cavern.

export type Tone =
  | "forest"
  | "field"
  | "fire"
  | "water"
  | "ice"
  | "shadow"
  | "spirit"
  | "light"
  | "village"
  | "ranch"
  | "ganon"
  | "heart"
  | "fairy";

/** Region colour per tone (one value works on both themes). */
export const TONE_COLOR: Record<Tone, string> = {
  forest: "#5f8a5a",
  field: "#7f9a5c",
  fire: "#b0614b",
  water: "#4f80a6",
  ice: "#7fb0bb",
  shadow: "#7c679a",
  spirit: "#bf8650",
  light: "#b89a4e",
  village: "#9a7a58",
  ranch: "#a08a5a",
  ganon: "#8b4f5c",
  heart: "#b2564f",
  fairy: "#a86f93",
};

export interface Place {
  tone: Tone;
  icon: string;
}

/** Every area named in the catalog, with its colour and emblem. */
export const PLACES: Record<string, Place> = {
  "Kokiri Forest": { tone: "forest", icon: "kokiri-emerald" },
  "Inside the Deku Tree": { tone: "forest", icon: "deku-stick" },
  "Lost Woods": { tone: "forest", icon: "sarias-song" },
  "Sacred Forest Meadow": { tone: "forest", icon: "minuet-of-forest" },
  "Forest Temple": { tone: "forest", icon: "forest-medallion" },
  "Hyrule Field": { tone: "field", icon: "running-man" },
  "Lon Lon Ranch": { tone: "ranch", icon: "lon-lon-milk" },
  "Hyrule Castle": { tone: "light", icon: "zeldas-letter" },
  "Hyrule Castle Grounds": { tone: "light", icon: "great-fairy-fountain" },
  "Hyrule Castle Town": { tone: "light", icon: "bazaar" },
  "Hyrule Castle Town (ruins)": { tone: "ganon", icon: "ghost-shop" },
  "Temple of Time": { tone: "light", icon: "light-medallion" },
  "Kakariko Village": { tone: "village", icon: "token" },
  "Kakariko Graveyard": { tone: "shadow", icon: "grave-digging" },
  "Bottom of the Well": { tone: "shadow", icon: "lenses-of-truth" },
  "Shadow Temple": { tone: "shadow", icon: "shadow-medallion" },
  "Death Mountain Trail": { tone: "fire", icon: "goron-ruby" },
  "Dodongo's Cavern": { tone: "fire", icon: "bomb" },
  "Goron City": { tone: "fire", icon: "goron-shop" },
  "Death Mountain Crater": { tone: "fire", icon: "bolero-of-fire" },
  "Fire Temple": { tone: "fire", icon: "fire-medallion" },
  "Zora's River": { tone: "water", icon: "frog-tenors" },
  "Zora's Domain": { tone: "water", icon: "zora-sapphire" },
  "Zora's Fountain": { tone: "water", icon: "farores-wind" },
  "Inside Jabu-Jabu's Belly": { tone: "water", icon: "boomerang" },
  "Ice Cavern": { tone: "ice", icon: "blue-fire" },
  "Lake Hylia": { tone: "water", icon: "fishing" },
  "Water Temple": { tone: "water", icon: "water-medallion" },
  "Gerudo Valley": { tone: "spirit", icon: "gerudo-pass" },
  "Gerudo's Fortress": { tone: "spirit", icon: "horseback-archery" },
  "Haunted Wasteland": { tone: "spirit", icon: "bombchu" },
  "Desert Colossus": { tone: "spirit", icon: "requiem-of-spirit" },
  "Spirit Temple": { tone: "spirit", icon: "spirit-medallion" },
  "Ganon's Castle": { tone: "ganon", icon: "boss-key" },
  Hyrule: { tone: "light", icon: "triforce" },
};

export const DEFAULT_PLACE: Place = { tone: "light", icon: "dungeon-map" };

export function placeOf(area: string | undefined): Place {
  return (area && PLACES[area]) || DEFAULT_PLACE;
}

/** Journey sections: emblem and colour. */
export const SECTION_LOOK: Record<string, Place> = {
  story: { tone: "light", icon: "triforce" },
  skulltulas: { tone: "light", icon: "token" },
  hearts: { tone: "heart", icon: "piece-of-heart" },
  skullrewards: { tone: "village", icon: "token-map" },
  soils: { tone: "field", icon: "magic-beans" },
  bottles: { tone: "ice", icon: "empty-bottle" },
  songs: { tone: "water", icon: "ocarina-of-time" },
  upgrades: { tone: "forest", icon: "bomb-bag-3" },
  fairies: { tone: "fairy", icon: "great-fairy-fountain" },
  masks: { tone: "village", icon: "happy-mask-shop" },
  trade: { tone: "fire", icon: "biggoron-sword" },
  training: { tone: "spirit", icon: "proving-grounds" },
  merchants: { tone: "light", icon: "bazaar" },
  gear: { tone: "water", icon: "hylian-shield" },
  sidequests: { tone: "shadow", icon: "big-poe" },
  challenges: { tone: "spirit", icon: "target" },
  eastereggs: { tone: "fairy", icon: "fairy" },
};

export const ERA_LOOK: Record<string, Place> = {
  "era-child": { tone: "forest", icon: "kokiri-sword" },
  "era-adult": { tone: "light", icon: "master-sword" },
  "era-either": { tone: "water", icon: "song-of-time" },
};

const range = (prefix: string, icons: string[]) =>
  Object.fromEntries(icons.map((icon, i) => [`${prefix}-${i + 1}`, icon]));

/** Item-specific icons; anything not listed uses its section's emblem. */
export const ITEM_ICONS: Record<string, string> = {
  ...range("story", [
    "kokiri-emerald", "fairy-ocarina", "zeldas-letter", "goron-bracelet", "goron-ruby", "bottled-letter",
    "zora-sapphire", "master-sword", "hookshot", "forest-medallion", "fire-medallion", "iron-boots",
    "water-medallion", "lenses-of-truth", "shadow-medallion", "gerudo-pass", "silver-gauntlets",
    "spirit-medallion", "light-arrow", "boss-key", "boss",
  ]),
  ...range("skr", ["adults-wallet", "echo-gem", "giants-wallet", "bombchu", "gold-rupee"]),
  ...range("bot", ["cucco-game", "empty-bottle", "bottled-letter", "big-poe", "bug"]),
  ...range("song", [
    "zeldas-lullaby", "eponas-song", "sarias-song", "suns-song", "song-of-time", "song-of-storms",
    "minuet-of-forest", "bolero-of-fire", "serenade-of-water", "requiem-of-spirit", "nocturne-of-shadow",
    "prelude-of-light", "scarecrow-song",
  ]),
  ...range("up", [
    "deku-stick-bag-2", "deku-stick-bag-3", "deku-nut-bag-2", "deku-nut-bag-3", "deku-seed-bag-2",
    "deku-seed-bag-3", "bomb-bag", "bomb-bag-2", "bomb-bag-3", "quiver", "quiver-2", "quiver-3",
    "silver-scale", "golden-scale", "golden-gauntlets", "fire-arrow",
  ]),
  ...range("gf", ["dins-fire", "gift-improved-spin", "farores-wind", "gift-doubled-magic", "nayrus-love", "gift-halved-damage"]),
  ...range("mask", ["keaton-mask", "skull-mask", "spooky-mask", "bunny-hood", "mask-of-truth"]),
  ...range("trade", [
    "pocket-egg", "cojiro", "odd-mushroom", "odd-poultice", "poachers-saw", "broken-goron-sword",
    "prescription", "eyeball-frog", "eye-drops", "biggoron-receipt", "biggoron-sword",
  ]),
  ...range("gtg", ["gerudo-pass", "small-key", "treasure-chest", "ice-arrow"]),
  ...range("merch", ["bean-seller", "giants-knife", "bombchu"]),
  ...range("gear", ["kokiri-sword", "deku-shield", "hylian-shield", "mirror-shield", "goron-tunic", "zora-tunic"]),
  ...range("side", ["eponas-song", "big-poe", "lon-lon-milk", "sinking-lure", "fishing-rod"]),
  ...range("chal", [
    "shooting-gallery", "shooting-gallery", "bombchu-bowling", "horseback-archery", "fishing", "cucco-game",
    "eponas-song", "dampe-race", "obstacle-course", "treasure-chest-shop", "frog-tenors", "running-man",
    "proving-grounds",
  ]),
  ...range("egg", [
    "shooting-gallery", "gossip-stone", "gossip-stone", "gossip-stone", "gossip-stone", "gossip-stone",
    "mask-of-truth", "fairy", "zeldas-lullaby", "fairy-slingshot", "cucco-game", "fairy", "scarecrow-song", "gossip-stone",
    "boss",
  ]),
  "hp-3": "grave-digging",
  "hp-9": "bombchu-bowling",
  "hp-14": "fishing",
  "hp-19": "dampe-race",
  "hp-23": "token",
  "hp-28": "frog-tenors",
  "hp-29": "frog-tenors",
  "hp-30": "treasure-chest-shop",
  "hp-32": "horseback-archery",
  "hp-35": "business-scrub-seed",
};
