// Hall of Fallen Foes for the Switch 2 remake: every statue in the
// amphitheater, the rematches on rectangular stands, and the three
// owl trials. Official in-game name: Hall of Fallen Foes (no 'the').
//
// The 84 statues follow Zelda Wiki's amphitheater order: six wedges
// (Phantom Ganon, Volvagia, Morpha, Twinrova, Bongo Bongo, Ganon),
// regular statues left to right, then the rematch stands on that
// wedge's outer ring. Names and descriptions match the Hall's own
// cards (Zelda Wiki and Zelda Dungeon). Where two statues share a
// name, the qualifier in parentheses is ours, taken from the card's
// locations or description.
//
// The 25 rematches are those same rectangular-stand statues, tracked
// separately because filling the statue (defeat in the world) is not
// the same as winning the rematch. Questfern lists 12 miniboss types;
// in-game Stalfos and Iron Knuckle variants have their own pedestals,
// which brings the rematch count to 25.
//
// Seat coordinates on the Hall view are a schematic. Wedge membership
// and order are from the wiki; exact floor positions are not.

import type { Age, CatalogItem, DayTime } from "./catalog.ts";
import type { Tone } from "./look.ts";

export type WedgeId =
  | "phantom-ganon"
  | "volvagia"
  | "morpha"
  | "twinrova"
  | "bongo-bongo"
  | "ganon";

export interface HallWedge {
  id: WedgeId;
  title: string;
  tone: Tone;
  /** Clockwise start angle in degrees, 0 at the right, so -90 is the top. */
  startDeg: number;
}

export interface FoeRecord {
  item: CatalogItem;
  officialName: string;
  wedge: WedgeId;
  /** True if this statue stands on a rectangular rematch pedestal. */
  rematch: boolean;
  /** 0-based index within the regular group or the rematch group. */
  order: number;
  useful: string;
}

export interface RematchRecord {
  item: CatalogItem;
  foeId: string;
  wedge: WedgeId;
}

export const HALL_WEDGES: readonly HallWedge[] = [
  { id: "phantom-ganon", title: "Phantom Ganon", tone: "forest", startDeg: -90 },
  { id: "volvagia", title: "Volvagia", tone: "fire", startDeg: -30 },
  { id: "morpha", title: "Morpha", tone: "water", startDeg: 30 },
  { id: "twinrova", title: "Twinrova", tone: "spirit", startDeg: 90 },
  { id: "bongo-bongo", title: "Bongo Bongo", tone: "shadow", startDeg: 150 },
  { id: "ganon", title: "Ganon", tone: "ganon", startDeg: 210 },
];

export const FOE_RECORDS: readonly FoeRecord[] = [
  {
    item: { id: "foe-1", name: "Skull Kid", detail: "The Hall says this is the fate of children who lose their way in the Lost Woods. The child mask or song game does not count: as an adult, defeat a Skull Kid in the clearing left of the Lost Woods entrance. A commonly missed statue.", area: "Lost Woods", age: "Adult" },
    officialName: "Skull Kid",
    wedge: "phantom-ganon",
    rematch: false,
    order: 0,
    useful: "",
  },
  {
    item: { id: "foe-2", name: "Deku Scrub", detail: "Inside the Great Deku Tree. When forced to surrender they spill secrets. Reflect a Deku Seed with the Deku Shield, then talk.", area: "Inside the Deku Tree", age: "Child" },
    officialName: "Deku Scrub",
    wedge: "phantom-ganon",
    rematch: false,
    order: 1,
    useful: "Deku Shield",
  },
  {
    item: { id: "foe-3", name: "Gohma Larva", detail: "A newly born form of Gohma in the Great Deku Tree. The eggs are fragile and break easily.", area: "Inside the Deku Tree", age: "Child" },
    officialName: "Gohma Larva",
    wedge: "phantom-ganon",
    rematch: false,
    order: 2,
    useful: "Deku Shield, Deku Nut",
  },
  {
    item: { id: "foe-4", name: "Mad Scrub", detail: "A Deku Scrub with a stronger will that fires three shots in a row. The Hall lists the Sacred Grove (Sacred Forest Meadow).", area: "Sacred Forest Meadow", age: "Child" },
    officialName: "Mad Scrub",
    wedge: "phantom-ganon",
    rematch: false,
    order: 3,
    useful: "Deku Shield, Hylian Shield, Megaton Hammer",
  },
  {
    item: { id: "foe-5", name: "Deku Baba", detail: "They pounce on anyone who comes too close and turn red when they wither. Common in the Great Deku Tree and Kokiri Forest.", area: "Inside the Deku Tree", age: "Both" },
    officialName: "Deku Baba",
    wedge: "phantom-ganon",
    rematch: false,
    order: 4,
    useful: "Megaton Hammer",
  },
  {
    item: { id: "foe-6", name: "Floormaster", detail: "A large red hand that splits when attacked. Forest Temple and the Bottom of the Well.", area: "Forest Temple", age: "Both" },
    officialName: "Floormaster",
    wedge: "phantom-ganon",
    rematch: false,
    order: 5,
    useful: "Light Arrow",
  },
  {
    item: { id: "foe-7", name: "Jo, Second Born", detail: "The second oldest of the four sisters who haunted the Forest Temple. She had an intense-yet-enchanting gaze. Shoot her with the Fairy Bow.", area: "Forest Temple", age: "Adult" },
    officialName: "Jo, Second Born",
    wedge: "phantom-ganon",
    rematch: false,
    order: 6,
    useful: "Fairy Bow",
  },
  {
    item: { id: "foe-8", name: "Beth, Third Born", detail: "The second youngest of the four sisters who haunted the Forest Temple. Her eyes had a cute, drowsy look. Shoot her with the Fairy Bow.", area: "Forest Temple", age: "Adult" },
    officialName: "Beth, Third Born",
    wedge: "phantom-ganon",
    rematch: false,
    order: 7,
    useful: "Fairy Bow",
  },
  {
    item: { id: "foe-9", name: "Amy, Fourth Born", detail: "The youngest of the four sisters who haunted the Forest Temple. She had adorable round eyes. Shoot her with the Fairy Bow.", area: "Forest Temple", age: "Adult" },
    officialName: "Amy, Fourth Born",
    wedge: "phantom-ganon",
    rematch: false,
    order: 8,
    useful: "Fairy Bow",
  },
  {
    item: { id: "foe-10", name: "Wallmaster", detail: "A large green hand that drops from the ceiling and casts you out of the room. Forest Temple, Shadow Temple, and the Bottom of the Well.", area: "Forest Temple", age: "Both" },
    officialName: "Wallmaster",
    wedge: "phantom-ganon",
    rematch: false,
    order: 9,
    useful: "Light Arrow",
  },
  {
    item: { id: "foe-11", name: "Wolfos", detail: "They fight with sharp claws and can block your strikes. Sacred Forest Meadow (the Hall says Sacred Grove) and the Forest Temple. This pedestal also starts a rematch.", area: "Sacred Forest Meadow", age: "Both" },
    officialName: "Wolfos",
    wedge: "phantom-ganon",
    rematch: true,
    order: 0,
    useful: "Din's Fire, Fire Arrow",
  },
  {
    item: { id: "foe-12", name: "Meg, Firstborn", detail: "The eldest of the four sisters who haunted the Forest Temple. This pedestal also starts a rematch.", area: "Forest Temple", age: "Adult" },
    officialName: "Meg, Firstborn",
    wedge: "phantom-ganon",
    rematch: true,
    order: 1,
    useful: "Fairy Bow",
  },
  {
    item: { id: "foe-13", name: "Stalfos (Forest Temple)", detail: "Stalfos that lurk in the forest, the fate of adults who disappear in the Lost Woods. Fought in the Forest Temple, often in pairs. This pedestal also starts a rematch.", area: "Forest Temple", age: "Adult" },
    officialName: "Stalfos",
    wedge: "phantom-ganon",
    rematch: true,
    order: 2,
    useful: "",
  },
  {
    item: { id: "foe-14", name: "Gohma", detail: "Queen Gohma, the parasite inside the Great Deku Tree. This pedestal also starts a rematch.", area: "Inside the Deku Tree", age: "Child" },
    officialName: "Gohma",
    wedge: "phantom-ganon",
    rematch: true,
    order: 3,
    useful: "Deku Nut, Fairy Slingshot",
  },
  {
    item: { id: "foe-15", name: "Phantom Ganon", detail: "The Forest Temple boss, a false Ganon that rides through the paintings. This pedestal also starts a rematch.", area: "Forest Temple", age: "Adult" },
    officialName: "Phantom Ganon",
    wedge: "phantom-ganon",
    rematch: true,
    order: 4,
    useful: "Fairy Bow, Light Arrow",
  },
  {
    item: { id: "foe-16", name: "Fire Keese", detail: "Keese enveloped in flame, in Dodongo's Cavern and the Fire Temple. Shoot them down before they touch you.", area: "Dodongo's Cavern", age: "Both" },
    officialName: "Fire Keese",
    wedge: "volvagia",
    rematch: false,
    order: 0,
    useful: "Fairy Slingshot, Fairy Bow",
  },
  {
    item: { id: "foe-17", name: "Baby Dodongo", detail: "They live in underground caverns and have a habit of swallowing bombs. Dodongo's Cavern.", area: "Dodongo's Cavern", age: "Child" },
    officialName: "Baby Dodongo",
    wedge: "volvagia",
    rematch: false,
    order: 1,
    useful: "Bomb",
  },
  {
    item: { id: "foe-18", name: "Torch Slug", detail: "A slug with fire burning on its back. If the flame is put out, it flees. Fire Temple and Spirit Temple.", area: "Fire Temple", age: "Adult" },
    officialName: "Torch Slug",
    wedge: "volvagia",
    rematch: false,
    order: 2,
    useful: "Megaton Hammer",
  },
  {
    item: { id: "foe-19", name: "Armos", detail: "They look like stone statues until they sense danger. Dodongo's Cavern and the Spirit Temple.", area: "Dodongo's Cavern", age: "Both" },
    officialName: "Armos",
    wedge: "volvagia",
    rematch: false,
    order: 3,
    useful: "Bomb, Megaton Hammer",
  },
  {
    item: { id: "foe-20", name: "Beamos", detail: "A single-eyed statue that fires a beam when threatened. Dodongo's Cavern and the Shadow Temple.", area: "Dodongo's Cavern", age: "Both" },
    officialName: "Beamos",
    wedge: "volvagia",
    rematch: false,
    order: 4,
    useful: "Bomb, Megaton Hammer, Mirror Shield",
  },
  {
    item: { id: "foe-21", name: "Red Bubble", detail: "A skull surrounded by a flaming aura. Death Mountain Crater and the Fire Temple. Raise the Hylian Shield.", area: "Death Mountain Crater", age: "Both" },
    officialName: "Red Bubble",
    wedge: "volvagia",
    rematch: false,
    order: 5,
    useful: "Hylian Shield",
  },
  {
    item: { id: "foe-22", name: "Red Tektite", detail: "Red Tektites hop along Death Mountain Trail. The Megaton Hammer flattens them.", area: "Death Mountain Trail", age: "Both" },
    officialName: "Red Tektite",
    wedge: "volvagia",
    rematch: false,
    order: 6,
    useful: "Megaton Hammer",
  },
  {
    item: { id: "foe-23", name: "Dodongo", detail: "They have scales as solid as steel and wander underground caverns. Toss a bomb into the mouth.", area: "Dodongo's Cavern", age: "Child" },
    officialName: "Dodongo",
    wedge: "volvagia",
    rematch: false,
    order: 7,
    useful: "Bomb",
  },
  {
    item: { id: "foe-24", name: "Flying Tile", detail: "Floor tiles that take off and fly at you in the Fire Temple. One hit destroys them.", area: "Fire Temple", age: "Adult" },
    officialName: "Flying Tile",
    wedge: "volvagia",
    rematch: false,
    order: 8,
    useful: "",
  },
  {
    item: { id: "foe-25", name: "False Door (Fire Temple)", detail: "A monster disguised as a door. It gives itself away when it gets impatient and shifts around. Bomb or hammer it in the Fire Temple. The Spirit Temple has a second, different door; both statues are easy to miss.", area: "Fire Temple", age: "Adult" },
    officialName: "False Door",
    wedge: "volvagia",
    rematch: false,
    order: 9,
    useful: "Bomb, Megaton Hammer",
  },
  {
    item: { id: "foe-26", name: "Lizalfos", detail: "Sword-wielding lizards that often come at you with reckless abandon. Dodongo's Cavern and the Spirit Temple. This pedestal also starts a rematch.", area: "Dodongo's Cavern", age: "Both" },
    officialName: "Lizalfos",
    wedge: "volvagia",
    rematch: true,
    order: 0,
    useful: "Deku Shield, Hylian Shield",
  },
  {
    item: { id: "foe-27", name: "Flare Dancer", detail: "A Fire Temple mini-boss clad in blazing garments; its true form is small and nimble. This pedestal also starts a rematch.", area: "Fire Temple", age: "Adult" },
    officialName: "Flare Dancer",
    wedge: "volvagia",
    rematch: true,
    order: 1,
    useful: "Bomb, Hookshot, Megaton Hammer",
  },
  {
    item: { id: "foe-28", name: "Dinolfos", detail: "They excel at swordplay and favor keen, nimble movement. Spirit Temple and the Gerudo Proving Grounds. This pedestal also starts a rematch.", area: "Spirit Temple", age: "Adult" },
    officialName: "Dinolfos",
    wedge: "volvagia",
    rematch: true,
    order: 2,
    useful: "",
  },
  {
    item: { id: "foe-29", name: "King Dodongo", detail: "The boss of Dodongo's Cavern. This pedestal also starts a rematch.", area: "Dodongo's Cavern", age: "Child" },
    officialName: "King Dodongo",
    wedge: "volvagia",
    rematch: true,
    order: 3,
    useful: "Bomb",
  },
  {
    item: { id: "foe-30", name: "Volvagia", detail: "The Fire Temple boss. The Hall notes that its fire breath can be suppressed if its mouth is frozen. This pedestal also starts a rematch.", area: "Fire Temple", age: "Adult" },
    officialName: "Volvagia",
    wedge: "volvagia",
    rematch: true,
    order: 4,
    useful: "Megaton Hammer, Ice Arrow",
  },
  {
    item: { id: "foe-31", name: "Tailpasaran", detail: "They emit electricity and move freely through the creatures they infest. Inside Lord Jabu-Jabu's Belly. Cut them with the Boomerang.", area: "Inside Jabu-Jabu's Belly", age: "Child" },
    officialName: "Tailpasaran",
    wedge: "morpha",
    rematch: false,
    order: 0,
    useful: "Boomerang",
  },
  {
    item: { id: "foe-32", name: "Shabom", detail: "Bubble-like enemies inside Lord Jabu-Jabu's Belly. A Boomerang pop will do.", area: "Inside Jabu-Jabu's Belly", age: "Child" },
    officialName: "Shabom",
    wedge: "morpha",
    rematch: false,
    order: 1,
    useful: "Boomerang",
  },
  {
    item: { id: "foe-33", name: "Bari", detail: "They pulse with an electrical current and split into Biri when attacked. Inside Lord Jabu-Jabu's Belly.", area: "Inside Jabu-Jabu's Belly", age: "Child" },
    officialName: "Bari",
    wedge: "morpha",
    rematch: false,
    order: 2,
    useful: "Boomerang, Deku Nut",
  },
  {
    item: { id: "foe-34", name: "Biri", detail: "Small electric jellies inside Lord Jabu-Jabu's Belly. Use a wooden weapon or the Boomerang so you are not shocked.", area: "Inside Jabu-Jabu's Belly", age: "Child" },
    officialName: "Biri",
    wedge: "morpha",
    rematch: false,
    order: 3,
    useful: "Boomerang, Deku Nut",
  },
  {
    item: { id: "foe-35", name: "Stinger", detail: "They lurk underwater or in host creatures and spring out when prey draws near. Lord Jabu-Jabu's Belly and the Water Temple.", area: "Inside Jabu-Jabu's Belly", age: "Both" },
    officialName: "Stinger",
    wedge: "morpha",
    rematch: false,
    order: 4,
    useful: "",
  },
  {
    item: { id: "foe-36", name: "Ice Keese", detail: "Keese enveloped in frost. Their touch can freeze you. Ice Cavern.", area: "Ice Cavern", age: "Adult" },
    officialName: "Ice Keese",
    wedge: "morpha",
    rematch: false,
    order: 5,
    useful: "Fairy Bow",
  },
  {
    item: { id: "foe-37", name: "Shell Blade", detail: "A thick, sharp seashell that deflects most attacks. Din's Fire works well. Water Temple.", area: "Water Temple", age: "Adult" },
    officialName: "Shell Blade",
    wedge: "morpha",
    rematch: false,
    order: 6,
    useful: "Din's Fire",
  },
  {
    item: { id: "foe-38", name: "Blue Tektite", detail: "They hide in a thin shell and skip quickly over water. Zora's River and Hyrule Field.", area: "Zora's River", age: "Both" },
    officialName: "Blue Tektite",
    wedge: "morpha",
    rematch: false,
    order: 7,
    useful: "Megaton Hammer",
  },
  {
    item: { id: "foe-39", name: "Freezard", detail: "A monster made entirely of ice. Heat melts it until nothing is left. Ice Cavern.", area: "Ice Cavern", age: "Adult" },
    officialName: "Freezard",
    wedge: "morpha",
    rematch: false,
    order: 8,
    useful: "Bomb, Megaton Hammer, Din's Fire, Fire Arrow",
  },
  {
    item: { id: "foe-40", name: "Spike", detail: "A spiny creature that rolls and has trouble turning once it has speed. Raise the Hylian Shield and step aside. Water Temple.", area: "Water Temple", age: "Adult" },
    officialName: "Spike",
    wedge: "morpha",
    rematch: false,
    order: 9,
    useful: "Hylian Shield",
  },
  {
    item: { id: "foe-41", name: "Octorok", detail: "They spit rocks from the water. Zora's River and Lord Jabu-Jabu's Belly. Reflect the shot with a shield.", area: "Zora's River", age: "Both" },
    officialName: "Octorok",
    wedge: "morpha",
    rematch: false,
    order: 10,
    useful: "Deku Shield, Hylian Shield",
  },
  {
    item: { id: "foe-42", name: "Big Octo", detail: "A huge octopus that made its home inside Lord Jabu-Jabu, with a large seashell on its back. This pedestal also starts a rematch.", area: "Inside Jabu-Jabu's Belly", age: "Child" },
    officialName: "Big Octo",
    wedge: "morpha",
    rematch: true,
    order: 0,
    useful: "Boomerang",
  },
  {
    item: { id: "foe-43", name: "Dark Link", detail: "A shadowy copy that mimicked Link's blade and techniques in the Water Temple. This pedestal also starts a rematch.", area: "Water Temple", age: "Adult" },
    officialName: "Dark Link",
    wedge: "morpha",
    rematch: true,
    order: 1,
    useful: "",
  },
  {
    item: { id: "foe-44", name: "White Wolfos", detail: "They attack with frost-covered claws that can freeze you in place. Ice Cavern. This pedestal also starts a rematch.", area: "Ice Cavern", age: "Adult" },
    officialName: "White Wolfos",
    wedge: "morpha",
    rematch: true,
    order: 2,
    useful: "Din's Fire, Fire Arrow",
  },
  {
    item: { id: "foe-45", name: "Barinade", detail: "The boss set loose inside Lord Jabu-Jabu. This pedestal also starts a rematch.", area: "Inside Jabu-Jabu's Belly", age: "Child" },
    officialName: "Barinade",
    wedge: "morpha",
    rematch: true,
    order: 3,
    useful: "Boomerang",
  },
  {
    item: { id: "foe-46", name: "Morpha", detail: "The Water Temple boss, a nucleus in the water. This pedestal also starts a rematch.", area: "Water Temple", age: "Adult" },
    officialName: "Morpha",
    wedge: "morpha",
    rematch: true,
    order: 4,
    useful: "Longshot",
  },
  {
    item: { id: "foe-47", name: "Flying Pot", detail: "A monster disguised as an ordinary pot. One strike destroys it. Shadow Temple and Spirit Temple.", area: "Shadow Temple", age: "Adult" },
    officialName: "Flying Pot",
    wedge: "twinrova",
    rematch: false,
    order: 0,
    useful: "",
  },
  {
    item: { id: "foe-48", name: "Guay", detail: "They fly in circles and form packs to attack. Hyrule Field and the Desert Colossus (the Hall also says Evil Desert Colossus).", area: "Hyrule Field", age: "Both" },
    officialName: "Guay",
    wedge: "twinrova",
    rematch: false,
    order: 1,
    useful: "Fairy Slingshot, Fairy Bow",
  },
  {
    item: { id: "foe-49", name: "Green Bubble", detail: "A flying skull with a green aura that protects it until the aura fades. Raise the Hylian Shield and wait. Forest Temple and Spirit Temple. A much larger one in the Bottom of the Well is a separate statue.", area: "Forest Temple", age: "Adult" },
    officialName: "Green Bubble",
    wedge: "twinrova",
    rematch: false,
    order: 2,
    useful: "Hylian Shield",
  },
  {
    item: { id: "foe-50", name: "Leever", detail: "They glide across sand and can only move freely on it. The Hall lists Mirage Desert and Evil Desert Colossus (the Haunted Wasteland and Desert Colossus). A larger purple leader is a separate statue.", area: "Haunted Wasteland", age: "Adult" },
    officialName: "Leever",
    wedge: "twinrova",
    rematch: false,
    order: 3,
    useful: "Din's Fire",
  },
  {
    item: { id: "foe-51", name: "White Bubble", detail: "A flying skull with a white aura that spins in place or around objects. Spirit Temple. Raise the Hylian Shield.", area: "Spirit Temple", age: "Adult" },
    officialName: "White Bubble",
    wedge: "twinrova",
    rematch: false,
    order: 4,
    useful: "Hylian Shield",
  },
  {
    item: { id: "foe-52", name: "Like Like", detail: "They eat almost anything that comes close, including your shield. Fire Temple, Water Temple, and the Bottom of the Well.", area: "Fire Temple", age: "Both" },
    officialName: "Like Like",
    wedge: "twinrova",
    rematch: false,
    order: 5,
    useful: "",
  },
  {
    item: { id: "foe-53", name: "Anubis", detail: "A Spirit Temple guardian that mimics your movements. Fire hurts it.", area: "Spirit Temple", age: "Adult" },
    officialName: "Anubis",
    wedge: "twinrova",
    rematch: false,
    order: 6,
    useful: "Din's Fire, Fire Arrow",
  },
  {
    item: { id: "foe-54", name: "False Door (Spirit Temple)", detail: "A door monster whose design sets it apart from the Fire Temple ones. Bomb or hammer it in the Spirit Temple. Both door statues are easy to miss if you only smash one kind.", area: "Spirit Temple", age: "Adult" },
    officialName: "False Door",
    wedge: "twinrova",
    rematch: false,
    order: 7,
    useful: "Bomb, Megaton Hammer",
  },
  {
    item: { id: "foe-55", name: "Leever (leader)", detail: "A larger purple Leever that leads a seemingly limitless group and summons others in battle. Defeat ordinary Leevers at the Desert Colossus until this one appears. Commonly missed at the end of a playthrough.", area: "Desert Colossus", age: "Adult" },
    officialName: "Leever",
    wedge: "twinrova",
    rematch: false,
    order: 8,
    useful: "Din's Fire",
  },
  {
    item: { id: "foe-56", name: "Gerudo Thief", detail: "A Gerudo guard in the fortress who carries two blades and is extremely dangerous in battle. This pedestal also starts a rematch.", area: "Gerudo's Fortress", age: "Adult" },
    officialName: "Gerudo Thief",
    wedge: "twinrova",
    rematch: true,
    order: 0,
    useful: "",
  },
  {
    item: { id: "foe-57", name: "Iron Knuckle (Spirit Temple)", detail: "An Iron Knuckle fully enclosed in heavy armor that keeps it from moving quickly. Spirit Temple. This pedestal also starts a rematch. Two other Iron Knuckles have their own statues.", area: "Spirit Temple", age: "Adult" },
    officialName: "Iron Knuckle",
    wedge: "twinrova",
    rematch: true,
    order: 1,
    useful: "Bombchu",
  },
  {
    item: { id: "foe-58", name: "Iron Knuckle (Nabooru)", detail: "Beneath this Iron Knuckle's armor was the magically controlled Nabooru. Even a single strike could be devastating. Spirit Temple. This pedestal also starts a rematch.", area: "Spirit Temple", age: "Adult" },
    officialName: "Iron Knuckle",
    wedge: "twinrova",
    rematch: true,
    order: 2,
    useful: "Bombchu",
  },
  {
    item: { id: "foe-59", name: "Twinrova", detail: "Koume and Kotake merged, Ganondorf's foster parents, in the Spirit Temple. This pedestal also starts a rematch.", area: "Spirit Temple", age: "Adult" },
    officialName: "Twinrova",
    wedge: "twinrova",
    rematch: true,
    order: 3,
    useful: "Mirror Shield",
  },
  {
    item: { id: "foe-60", name: "ReDead", detail: "Walking corpses with masks on their faces. They mourn fallen comrades, and the Sun's Song freezes them. Hyrule Castle Town and the Kakariko Graveyard.", area: "Hyrule Castle Town", age: "Both" },
    officialName: "ReDead",
    wedge: "bongo-bongo",
    rematch: false,
    order: 0,
    useful: "Light Arrow",
  },
  {
    item: { id: "foe-61", name: "Keese", detail: "They prefer dark places, turn into Fire Keese in flame, and show a fondness for skeletal creatures. Kakariko Graveyard and Dodongo's Cavern.", area: "Kakariko Graveyard", age: "Both" },
    officialName: "Keese",
    wedge: "bongo-bongo",
    rematch: false,
    order: 1,
    useful: "Fairy Slingshot, Fairy Bow",
  },
  {
    item: { id: "foe-62", name: "Green Bubble (Bottom of the Well)", detail: "This large Green Bubble lives at the bottom of a well, absorbed in improving its flying and ignoring its surroundings. Make it crash into walls, stun it, then jump-attack. A commonly missed statue; the smaller Forest and Spirit Temple Green Bubbles do not count for this one.", area: "Bottom of the Well", age: "Child" },
    officialName: "Green Bubble",
    wedge: "bongo-bongo",
    rematch: false,
    order: 2,
    useful: "",
  },
  {
    item: { id: "foe-63", name: "Blue Bubble", detail: "A skull with a blue aura. It cannot help approaching a bomb if it sees one. Forest Temple.", area: "Forest Temple", age: "Adult" },
    officialName: "Blue Bubble",
    wedge: "bongo-bongo",
    rematch: false,
    order: 3,
    useful: "Hylian Shield",
  },
  {
    item: { id: "foe-64", name: "Gibdo", detail: "Bandaged corpses that mistake slow-moving things for allies. The Sun's Song freezes them. Bottom of the Well and the Shadow Temple.", area: "Bottom of the Well", age: "Both" },
    officialName: "Gibdo",
    wedge: "bongo-bongo",
    rematch: false,
    order: 4,
    useful: "Light Arrow",
  },
  {
    item: { id: "foe-65", name: "Sharp the Elder", detail: "The older composer brother who served the royal family of Hyrule. Even in death he remains loyal. Play the Sun's Song at the royal family tomb in the Kakariko Graveyard.", area: "Kakariko Graveyard", age: "Child" },
    officialName: "Sharp the Elder",
    wedge: "bongo-bongo",
    rematch: false,
    order: 5,
    useful: "",
  },
  {
    item: { id: "foe-66", name: "Poe (Graveyard)", detail: "A ghost with lingering worldly attachments, roaming the Kakariko Graveyard. The Hyrule Field Poe is a separate statue, and so is the Big Poe.", area: "Kakariko Graveyard", age: "Child" },
    officialName: "Poe",
    wedge: "bongo-bongo",
    rematch: false,
    order: 6,
    useful: "",
  },
  {
    item: { id: "foe-67", name: "Big Poe", detail: "A large poe in Hyrule Field. A suspicious-looking lantern gives them away. Ride Epona and shoot them with the Fairy Bow.", area: "Hyrule Field", age: "Adult" },
    officialName: "Big Poe",
    wedge: "bongo-bongo",
    rematch: false,
    order: 7,
    useful: "Fairy Bow",
  },
  {
    item: { id: "foe-68", name: "Poe (Hyrule Field)", detail: "A field poe whose soul you can drink. Shoot it with the Fairy Bow as an adult. The graveyard Poe and the Big Poe are separate statues.", area: "Hyrule Field", age: "Adult" },
    officialName: "Poe",
    wedge: "bongo-bongo",
    rematch: false,
    order: 8,
    useful: "Fairy Bow",
  },
  {
    item: { id: "foe-69", name: "Flat the Younger", detail: "The younger composer brother. Despite becoming a ghost, he is still bullied by his older brother. Play the Sun's Song at the royal family tomb.", area: "Kakariko Graveyard", age: "Child" },
    officialName: "Flat the Younger",
    wedge: "bongo-bongo",
    rematch: false,
    order: 9,
    useful: "",
  },
  {
    item: { id: "foe-70", name: "Stalfos (Shadow Temple)", detail: "Armored Stalfos that fight with masterful swordplay and solid defensive skill. Shadow Temple and Spirit Temple. A different statue from the Forest Temple Stalfos. This pedestal also starts a rematch.", area: "Shadow Temple", age: "Adult" },
    officialName: "Stalfos",
    wedge: "bongo-bongo",
    rematch: true,
    order: 0,
    useful: "Light Arrow",
  },
  {
    item: { id: "foe-71", name: "Dead Hand", detail: "They conceal themselves in the shadows. The Lenses of Truth can reveal them. Bottom of the Well and the Shadow Temple. This pedestal also starts a rematch.", area: "Bottom of the Well", age: "Both" },
    officialName: "Dead Hand",
    wedge: "bongo-bongo",
    rematch: true,
    order: 1,
    useful: "Din's Fire, Bomb",
  },
  {
    item: { id: "foe-72", name: "Bongo Bongo", detail: "The Shadow Temple boss, a monster once sealed in the well. Freezing its hands hinders its drumming. This pedestal also starts a rematch.", area: "Shadow Temple", age: "Adult" },
    officialName: "Bongo Bongo",
    wedge: "bongo-bongo",
    rematch: true,
    order: 2,
    useful: "Lenses of Truth, Hover Boots, Ice Arrow",
  },
  {
    item: { id: "foe-73", name: "Peahat Larva", detail: "An immature Peahat that still chases prey with single-minded determination. They burst from a damaged Peahat in Hyrule Field.", area: "Hyrule Field", age: "Child" },
    officialName: "Peahat Larva",
    wedge: "ganon",
    rematch: false,
    order: 0,
    useful: "",
  },
  {
    item: { id: "foe-74", name: "Skullwalltula", detail: "Small wall-crawling spiders. They fall if the ground around them shakes. Great Deku Tree and Death Mountain Trail.", area: "Inside the Deku Tree", age: "Both" },
    officialName: "Skullwalltula",
    wedge: "ganon",
    rematch: false,
    order: 1,
    useful: "Fairy Slingshot, Megaton Hammer",
  },
  {
    item: { id: "foe-75", name: "Skulltula", detail: "Large armored spiders, vulnerable to fire. Great Deku Tree and the Forest Temple.", area: "Inside the Deku Tree", age: "Both" },
    officialName: "Skulltula",
    wedge: "ganon",
    rematch: false,
    order: 2,
    useful: "Bomb, Din's Fire, Megaton Hammer",
  },
  {
    item: { id: "foe-76", name: "Gold Skulltula", detail: "Like other Skulltulas, but they drop a token when defeated. If you hear a rustling, one may be nearby. One token is enough for this statue.", area: "Kakariko Village", age: "Both" },
    officialName: "Gold Skulltula",
    wedge: "ganon",
    rematch: false,
    order: 3,
    useful: "",
  },
  {
    item: { id: "foe-77", name: "Stalchild", detail: "Skeletal monsters that emerge from the ground in Hyrule Field at night. Rumor has it they stay hidden if someone appears cute enough.", area: "Hyrule Field", age: "Child", time: "Night" },
    officialName: "Stalchild",
    wedge: "ganon",
    rematch: false,
    order: 4,
    useful: "",
  },
  {
    item: { id: "foe-78", name: "Peahat", detail: "They live throughout Hyrule Field and become active during the day. Attacking one can spawn Peahat Larvae.", area: "Hyrule Field", age: "Child", time: "Day" },
    officialName: "Peahat",
    wedge: "ganon",
    rematch: false,
    order: 5,
    useful: "Din's Fire",
  },
  {
    item: { id: "foe-79", name: "Moblin", detail: "They stand guard over the Sacred Forest Meadow (the Hall says Sacred Grove). Both the head and the back are vulnerable.", area: "Sacred Forest Meadow", age: "Adult" },
    officialName: "Moblin",
    wedge: "ganon",
    rematch: false,
    order: 6,
    useful: "",
  },
  {
    item: { id: "foe-80", name: "Great Moblin", detail: "It blocks the way in the Sacred Forest Meadow, carries a massive club, and takes great pride in its strength.", area: "Sacred Forest Meadow", age: "Adult" },
    officialName: "Great Moblin",
    wedge: "ganon",
    rematch: false,
    order: 7,
    useful: "",
  },
  {
    item: { id: "foe-81", name: "Business Scrub", detail: "A commerce-loving Deku Scrub that often has valuable items for sale. Lost Woods and other grottos. Reflect its nut, then talk.", area: "Lost Woods", age: "Both" },
    officialName: "Business Scrub",
    wedge: "ganon",
    rematch: false,
    order: 8,
    useful: "Deku Shield, Hylian Shield, Megaton Hammer",
  },
  {
    item: { id: "foe-82", name: "Iron Knuckle (Ganon's Castle)", detail: "Iron Knuckles whose blows can demolish entire pillars. Inside Ganondorf's Castle they appear as a pair. A third Iron Knuckle statue, distinct from the Spirit Temple and Nabooru ones. This pedestal also starts a rematch.", area: "Ganon's Castle", age: "Adult" },
    officialName: "Iron Knuckle",
    wedge: "ganon",
    rematch: true,
    order: 0,
    useful: "Bombchu",
  },
  {
    item: { id: "foe-83", name: "Ganondorf", detail: "The Gerudo king who aspired to claim all of Hyrule. Fought in his castle. This pedestal also starts a rematch.", area: "Ganon's Castle", age: "Adult" },
    officialName: "Ganondorf",
    wedge: "ganon",
    rematch: true,
    order: 1,
    useful: "Master Sword, Light Arrow",
  },
  {
    item: { id: "foe-84", name: "Ganon", detail: "The form Ganondorf took when the Triforce of Power raged out of control. This pedestal also starts a rematch.", area: "Ganon's Castle", age: "Adult" },
    officialName: "Ganon",
    wedge: "ganon",
    rematch: true,
    order: 2,
    useful: "Master Sword, Light Arrow",
  },
];

export const FOE_ITEMS: CatalogItem[] = FOE_RECORDS.map((r) => r.item);

const FOE_BY_NAME: ReadonlyMap<string, FoeRecord> = new Map(
  FOE_RECORDS.map((r) => [r.item.name, r]),
);

export const REMATCH_RECORDS: readonly RematchRecord[] = [
  {
    item: { id: "rm-1", name: "Rematch: Wolfos", detail: "A timed rematch from the Wolfos pedestal on the outer ring of the Phantom Ganon wedge. Fought as adult Link.", age: "Adult" },
    foeId: FOE_BY_NAME.get("Wolfos")!.item.id,
    wedge: FOE_BY_NAME.get("Wolfos")!.wedge,
  },
  {
    item: { id: "rm-2", name: "Rematch: Meg, Firstborn", detail: "A timed rematch from the Meg, Firstborn pedestal on the outer ring of the Phantom Ganon wedge. Fought as adult Link.", age: "Adult" },
    foeId: FOE_BY_NAME.get("Meg, Firstborn")!.item.id,
    wedge: FOE_BY_NAME.get("Meg, Firstborn")!.wedge,
  },
  {
    item: { id: "rm-3", name: "Rematch: Stalfos (Forest Temple)", detail: "A timed rematch from the Forest Temple Stalfos pedestal on the outer ring of the Phantom Ganon wedge. Fought as adult Link. The armored Shadow and Spirit Temple Stalfos have their own rematch.", age: "Adult" },
    foeId: FOE_BY_NAME.get("Stalfos (Forest Temple)")!.item.id,
    wedge: FOE_BY_NAME.get("Stalfos (Forest Temple)")!.wedge,
  },
  {
    item: { id: "rm-4", name: "Rematch: Gohma", detail: "A timed rematch from the Gohma pedestal on the outer ring of the Phantom Ganon wedge. Fought as child Link, the same era as the story fight.", age: "Child" },
    foeId: FOE_BY_NAME.get("Gohma")!.item.id,
    wedge: FOE_BY_NAME.get("Gohma")!.wedge,
  },
  {
    item: { id: "rm-5", name: "Rematch: Phantom Ganon", detail: "A timed rematch from the Phantom Ganon pedestal on the outer ring of his wedge. Fought as adult Link. Winning at any time counts; Zelda Notes medals are not required.", age: "Adult" },
    foeId: FOE_BY_NAME.get("Phantom Ganon")!.item.id,
    wedge: FOE_BY_NAME.get("Phantom Ganon")!.wedge,
  },
  {
    item: { id: "rm-6", name: "Rematch: Lizalfos", detail: "A timed rematch from the Lizalfos pedestal on the outer ring of the Volvagia wedge. Fought as child Link, the era of the first encounter in Dodongo's Cavern.", age: "Child" },
    foeId: FOE_BY_NAME.get("Lizalfos")!.item.id,
    wedge: FOE_BY_NAME.get("Lizalfos")!.wedge,
  },
  {
    item: { id: "rm-7", name: "Rematch: Flare Dancer", detail: "A timed rematch from the Flare Dancer pedestal on the outer ring of the Volvagia wedge. Fought as adult Link.", age: "Adult" },
    foeId: FOE_BY_NAME.get("Flare Dancer")!.item.id,
    wedge: FOE_BY_NAME.get("Flare Dancer")!.wedge,
  },
  {
    item: { id: "rm-8", name: "Rematch: Dinolfos", detail: "A timed rematch from the Dinolfos pedestal on the outer ring of the Volvagia wedge. Fought as adult Link.", age: "Adult" },
    foeId: FOE_BY_NAME.get("Dinolfos")!.item.id,
    wedge: FOE_BY_NAME.get("Dinolfos")!.wedge,
  },
  {
    item: { id: "rm-9", name: "Rematch: King Dodongo", detail: "A timed rematch from the King Dodongo pedestal on the outer ring of the Volvagia wedge. Fought as child Link.", age: "Child" },
    foeId: FOE_BY_NAME.get("King Dodongo")!.item.id,
    wedge: FOE_BY_NAME.get("King Dodongo")!.wedge,
  },
  {
    item: { id: "rm-10", name: "Rematch: Volvagia", detail: "A timed rematch from the Volvagia pedestal on the outer ring of her wedge. Fought as adult Link. The Hall notes that Ice Arrows can freeze her fire breath.", age: "Adult" },
    foeId: FOE_BY_NAME.get("Volvagia")!.item.id,
    wedge: FOE_BY_NAME.get("Volvagia")!.wedge,
  },
  {
    item: { id: "rm-11", name: "Rematch: Big Octo", detail: "A timed rematch from the Big Octo pedestal on the outer ring of the Morpha wedge. Fought as child Link, the era of the first encounter inside Lord Jabu-Jabu.", age: "Child" },
    foeId: FOE_BY_NAME.get("Big Octo")!.item.id,
    wedge: FOE_BY_NAME.get("Big Octo")!.wedge,
  },
  {
    item: { id: "rm-12", name: "Rematch: Dark Link", detail: "A timed rematch from the Dark Link pedestal on the outer ring of the Morpha wedge. Fought as adult Link.", age: "Adult" },
    foeId: FOE_BY_NAME.get("Dark Link")!.item.id,
    wedge: FOE_BY_NAME.get("Dark Link")!.wedge,
  },
  {
    item: { id: "rm-13", name: "Rematch: White Wolfos", detail: "A timed rematch from the White Wolfos pedestal on the outer ring of the Morpha wedge. Fought as adult Link.", age: "Adult" },
    foeId: FOE_BY_NAME.get("White Wolfos")!.item.id,
    wedge: FOE_BY_NAME.get("White Wolfos")!.wedge,
  },
  {
    item: { id: "rm-14", name: "Rematch: Barinade", detail: "A timed rematch from the Barinade pedestal on the outer ring of the Morpha wedge. Fought as child Link.", age: "Child" },
    foeId: FOE_BY_NAME.get("Barinade")!.item.id,
    wedge: FOE_BY_NAME.get("Barinade")!.wedge,
  },
  {
    item: { id: "rm-15", name: "Rematch: Morpha", detail: "A timed rematch from the Morpha pedestal on the outer ring of his wedge. Fought as adult Link.", age: "Adult" },
    foeId: FOE_BY_NAME.get("Morpha")!.item.id,
    wedge: FOE_BY_NAME.get("Morpha")!.wedge,
  },
  {
    item: { id: "rm-16", name: "Rematch: Gerudo Thief", detail: "A timed rematch from the Gerudo Thief pedestal on the outer ring of the Twinrova wedge. Fought as adult Link.", age: "Adult" },
    foeId: FOE_BY_NAME.get("Gerudo Thief")!.item.id,
    wedge: FOE_BY_NAME.get("Gerudo Thief")!.wedge,
  },
  {
    item: { id: "rm-17", name: "Rematch: Iron Knuckle (Spirit Temple)", detail: "A timed rematch from the Spirit Temple Iron Knuckle pedestal on the outer ring of the Twinrova wedge. Fought as adult Link. Nabooru and the castle pair have their own rematches.", age: "Adult" },
    foeId: FOE_BY_NAME.get("Iron Knuckle (Spirit Temple)")!.item.id,
    wedge: FOE_BY_NAME.get("Iron Knuckle (Spirit Temple)")!.wedge,
  },
  {
    item: { id: "rm-18", name: "Rematch: Iron Knuckle (Nabooru)", detail: "A timed rematch from the Nabooru Iron Knuckle pedestal on the outer ring of the Twinrova wedge. Fought as adult Link.", age: "Adult" },
    foeId: FOE_BY_NAME.get("Iron Knuckle (Nabooru)")!.item.id,
    wedge: FOE_BY_NAME.get("Iron Knuckle (Nabooru)")!.wedge,
  },
  {
    item: { id: "rm-19", name: "Rematch: Twinrova", detail: "A timed rematch from the Twinrova pedestal on the outer ring of their wedge. Fought as adult Link.", age: "Adult" },
    foeId: FOE_BY_NAME.get("Twinrova")!.item.id,
    wedge: FOE_BY_NAME.get("Twinrova")!.wedge,
  },
  {
    item: { id: "rm-20", name: "Rematch: Stalfos (Shadow Temple)", detail: "A timed rematch from the armored Stalfos pedestal on the outer ring of the Bongo Bongo wedge. Fought as adult Link. The Forest Temple Stalfos have their own rematch.", age: "Adult" },
    foeId: FOE_BY_NAME.get("Stalfos (Shadow Temple)")!.item.id,
    wedge: FOE_BY_NAME.get("Stalfos (Shadow Temple)")!.wedge,
  },
  {
    item: { id: "rm-21", name: "Rematch: Dead Hand", detail: "A timed rematch from the Dead Hand pedestal on the outer ring of the Bongo Bongo wedge. Fought as child Link, the era of the first encounter in the Bottom of the Well.", age: "Child" },
    foeId: FOE_BY_NAME.get("Dead Hand")!.item.id,
    wedge: FOE_BY_NAME.get("Dead Hand")!.wedge,
  },
  {
    item: { id: "rm-22", name: "Rematch: Bongo Bongo", detail: "A timed rematch from the Bongo Bongo pedestal on the outer ring of his wedge. Fought as adult Link. The Hall notes that Ice Arrows can freeze its hands.", age: "Adult" },
    foeId: FOE_BY_NAME.get("Bongo Bongo")!.item.id,
    wedge: FOE_BY_NAME.get("Bongo Bongo")!.wedge,
  },
  {
    item: { id: "rm-23", name: "Rematch: Iron Knuckle (Ganon's Castle)", detail: "A timed rematch from the Ganon's Castle Iron Knuckle pedestal on the outer ring of the Ganon wedge. Fought as adult Link. This is the paired fight; the Spirit Temple and Nabooru Iron Knuckles have their own rematches.", age: "Adult" },
    foeId: FOE_BY_NAME.get("Iron Knuckle (Ganon's Castle)")!.item.id,
    wedge: FOE_BY_NAME.get("Iron Knuckle (Ganon's Castle)")!.wedge,
  },
  {
    item: { id: "rm-24", name: "Rematch: Ganondorf", detail: "A timed rematch from the Ganondorf pedestal on the outer ring of the Ganon wedge. Fought as adult Link. Winning at any time counts; Zelda Notes medals are not required.", age: "Adult" },
    foeId: FOE_BY_NAME.get("Ganondorf")!.item.id,
    wedge: FOE_BY_NAME.get("Ganondorf")!.wedge,
  },
  {
    item: { id: "rm-25", name: "Rematch: Ganon", detail: "A timed rematch from the Ganon pedestal on the outer ring of his wedge. Fought as adult Link. Winning at any time counts; Zelda Notes medals are not required.", age: "Adult" },
    foeId: FOE_BY_NAME.get("Ganon")!.item.id,
    wedge: FOE_BY_NAME.get("Ganon")!.wedge,
  },
];

export const REMATCH_ITEMS: CatalogItem[] = REMATCH_RECORDS.map((r) => r.item);

/** The three owl-statue trials. Zelda Notes medals are not included. */
export const TRIAL_ITEMS: CatalogItem[] = [
  {
    id: "trial-1",
    name: "Trial of the Spiritual Stones",
    detail: "The stone owl in the center of the hall. Defeat Gohma, King Dodongo and Barinade in that order, as child Link. Open as soon as you can visit the hall. The first clear sends the stone owl trophy to the shelf in Link's house.",
    area: "Kokiri Forest",
    age: "Child",
  },
  {
    id: "trial-2",
    name: "Trial of the Five Sages",
    detail: "The silver owl in the center of the hall. Defeat Phantom Ganon, Volvagia, Morpha, Bongo Bongo and Twinrova in that order, as adult Link. Opens after those five temple bosses are beaten in the story. The first clear sends the silver owl trophy to Link's house.",
    area: "Kokiri Forest",
    age: "Adult",
  },
  {
    id: "trial-3",
    name: "Trial of the Hero of Time",
    detail: "The gold owl in the center of the hall. Defeat the eight bosses from the other two trials, then Ganondorf and Ganon, ten in all. The first three fights are as a child, the rest as an adult. Opens after you finish the story. The first clear sends the gold owl trophy to Link's house. Zelda Notes medals are not required.",
    area: "Kokiri Forest",
    age: "Both",
  },
];

export const HALL_BATTLE_ITEMS: CatalogItem[] = [...REMATCH_ITEMS, ...TRIAL_ITEMS];

export const REMATCH_BY_FOE: ReadonlyMap<string, string> = new Map(
  REMATCH_RECORDS.map((r) => [r.foeId, r.item.id]),
);

export const HALL_W = 400;
export const HALL_H = 400;
export const HALL_CX = 200;
export const HALL_CY = 200;

export interface HallSeat {
  id: string;
  x: number;
  y: number;
  rematch: boolean;
  wedge: WedgeId;
  order: number;
  /** Wedge and sequence are from Zelda Wiki; x and y are a schematic. */
  placement: "schematic";
}

function polar(deg: number, radius: number): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180;
  return { x: HALL_CX + Math.cos(rad) * radius, y: HALL_CY + Math.sin(rad) * radius };
}

/** Evenly place n seats across a wedge, inset from both edges. */
function spread(startDeg: number, n: number, radius: number): { x: number; y: number }[] {
  const span = 60;
  const inset = n === 1 ? span / 2 : 8;
  const usable = span - inset * 2;
  return Array.from({ length: n }, (_, i) => {
    const t = n === 1 ? 0.5 : i / (n - 1);
    return polar(startDeg + inset + t * usable, radius);
  });
}

function buildSeats(): HallSeat[] {
  const out: HallSeat[] = [];
  for (const wedge of HALL_WEDGES) {
    const regular = FOE_RECORDS.filter((r) => r.wedge === wedge.id && !r.rematch);
    const rematch = FOE_RECORDS.filter((r) => r.wedge === wedge.id && r.rematch);
    const mid = Math.ceil(regular.length / 2);
    const inner = regular.slice(0, mid);
    const outer = regular.slice(mid);
    const innerPts = spread(wedge.startDeg, inner.length, 78);
    const outerPts = spread(wedge.startDeg, outer.length, 118);
    const rmPts = spread(wedge.startDeg, rematch.length, 158);
    inner.forEach((r, i) => out.push({ id: r.item.id, ...innerPts[i]!, rematch: false, wedge: wedge.id, order: r.order, placement: "schematic" }));
    outer.forEach((r, i) => out.push({ id: r.item.id, ...outerPts[i]!, rematch: false, wedge: wedge.id, order: r.order, placement: "schematic" }));
    rematch.forEach((r, i) => out.push({ id: r.item.id, ...rmPts[i]!, rematch: true, wedge: wedge.id, order: r.order, placement: "schematic" }));
  }
  return out;
}

export const HALL_SEATS: readonly HallSeat[] = buildSeats();

