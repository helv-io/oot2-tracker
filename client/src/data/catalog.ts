// The complete 100% catalog for The Legend of Zelda: Ocarina of Time
// (2026 Nintendo Switch 2 remake). Gold Skulltula and Piece of Heart
// locations follow RPG Site's remake-specific guides (several placements
// changed vs. N64/3DS); evergreen systems (songs, bottles, upgrades,
// trading sequences) match the classic game where the remake kept them.
//
// Every collectible is its own row: 100 Skulltulas, 36 Pieces of Heart,
// 10 soft-soil patches, all capacity upgrades, both trading sequences,
// Great Fairy gifts, one-time merchant rewards, and the Gerudo Proving
// Grounds. Remake changes and their sources: DATA-SOURCES.md.

export type Age = "Child" | "Adult" | "Both";
export type DayTime = "Night" | "Day" | "Any";
export type IconKind =
  | "quest"
  | "skulltula"
  | "heart"
  | "soil"
  | "bottle"
  | "song"
  | "upgrade"
  | "fairy"
  | "mask"
  | "sword"
  | "training"
  | "merchant"
  | "gear"
  | "sidequest";

export interface CatalogItem {
  id: string;
  name: string;
  area?: string;
  age?: Age;
  time?: DayTime;
  detail: string;
}

export interface CatalogSection {
  id: string;
  title: string;
  icon: IconKind;
  blurb: string;
  items: CatalogItem[];
}

function s(
  prefix: string,
  n: number,
  name: string,
  detail: string,
  area?: string,
  age?: Age,
  time?: DayTime,
): CatalogItem {
  return { id: `${prefix}-${n}`, name, detail, area, age, time };
}

export const SECTIONS: CatalogSection[] = [
  {
    id: "story",
    title: "The Main Quest",
    icon: "quest",
    blurb:
      "Every dungeon, boss, Spiritual Stone and Medallion on the road to Ganon. Beat these and the credits roll. The rest of this list is what makes it 100%.",
    items: [
      s("story", 1, "Inside the Deku Tree: Queen Gohma", "Clear the Deku Tree, defeat Queen Gohma, and claim the Kokiri's Emerald and a full Heart Container.", "Kokiri Forest", "Child"),
      s("story", 2, "Saria's farewell: Fairy Ocarina", "Cross the bridge out of Kokiri Forest and Saria gives you the Fairy Ocarina.", "Kokiri Forest", "Child"),
      s("story", 3, "Meet Princess Zelda", "Sneak past the castle guards to meet Zelda: receive Zelda's Letter and learn Zelda's Lullaby from Impa.", "Hyrule Castle", "Child"),
      s("story", 4, "Darunia's dance: Goron Bracelet", "Play Saria's Song for Darunia in Goron City and he gifts you the Goron Bracelet, so you can pick Bomb Flowers.", "Goron City", "Child"),
      s("story", 5, "Dodongo's Cavern: King Dodongo", "Clear the cavern (the Bomb Bag waits inside), defeat King Dodongo, and claim the Goron's Ruby and a Heart Container.", "Death Mountain Trail", "Child"),
      s("story", 6, "Ruto's Letter in a bottle", "King Zora shows you the bottle from Lake Hylia holding Princess Ruto's letter, your way inside Lord Jabu-Jabu.", "Zora's Domain", "Child"),
      s("story", 7, "Inside Jabu-Jabu's Belly: Barinade", "Carry Ruto through the belly (the Boomerang waits inside), defeat Barinade, and claim the Zora's Sapphire and a Heart Container.", "Zora's Fountain", "Child"),
      s("story", 8, "Pull the Master Sword", "Place the three Spiritual Stones in the Temple of Time, open the Door of Time with the Song of Time, and draw the Master Sword. Rauru grants the Light Medallion, and seven years pass.", "Temple of Time", "Both"),
      s("story", 9, "Dampé's ghost race: Hookshot", "Enter Dampé's grave in the Kakariko Graveyard and keep up with his ghost to the end of the race to win the Hookshot.", "Kakariko Graveyard", "Adult"),
      s("story", 10, "Forest Temple: Phantom Ganon", "Claim the Fairy Bow inside, defeat Phantom Ganon, and receive the Forest Medallion and a Heart Container from Saria.", "Sacred Forest Meadow", "Adult"),
      s("story", 11, "Fire Temple: Volvagia", "Free the caged Gorons, claim the Megaton Hammer, defeat Volvagia, and receive the Fire Medallion and a Heart Container from Darunia.", "Death Mountain Crater", "Adult"),
      s("story", 12, "Ice Cavern: Iron Boots", "Push through the frozen cavern for the Iron Boots; Sheik teaches you the Serenade of Water on your way out.", "Zora's Fountain", "Adult"),
      s("story", 13, "Water Temple: Morpha", "Raise and lower the water, claim the Longshot, defeat Morpha, and receive the Water Medallion and a Heart Container from Ruto.", "Lake Hylia", "Adult"),
      s("story", 14, "Bottom of the Well: Lenses of Truth", "As a child, drain the Kakariko well (play the Song of Storms in the windmill first) and find the Lenses of Truth, the remake's Lens of Truth, in the dark below.", "Kakariko Village", "Child"),
      s("story", 15, "Shadow Temple: Bongo Bongo", "Claim the Hover Boots inside, defeat Bongo Bongo, and receive the Shadow Medallion and a Heart Container from Impa.", "Kakariko Graveyard", "Adult"),
      s("story", 16, "Free the four carpenters", "Sneak through Gerudo's Fortress, defeat the Gerudo guards, and free all four captured carpenters to earn the Gerudo Pass.", "Gerudo's Fortress", "Adult"),
      s("story", 17, "Spirit Temple, child half: Silver Gauntlets", "Warp to the Desert Colossus as a child (Requiem of Spirit), crawl through the temple, and claim the Silver Gauntlets at the top.", "Desert Colossus", "Child"),
      s("story", 18, "Spirit Temple: Twinrova", "Return as an adult for the Mirror Shield, defeat Koume and Kotake as Twinrova, and receive the Spirit Medallion and a Heart Container from Nabooru.", "Desert Colossus", "Adult"),
      s("story", 19, "The Light Arrows", "With all six Medallions, return to the Temple of Time: Zelda reveals herself and gives you the Light Arrows.", "Temple of Time", "Adult"),
      s("story", 20, "Ganon's Castle: six barriers dispelled", "Cross the rainbow bridge and dispel all six barriers (Forest, Fire, Water, Shadow, Spirit, Light) to reach the tower.", "Ganon's Castle", "Adult"),
      s("story", 21, "Ganondorf and Ganon", "Climb the tower, defeat Ganondorf, escape the collapsing castle, and finish Ganon with the Master Sword and Light Arrows. The game is beaten.", "Ganon's Castle", "Adult"),
    ],
  },
  {
    id: "skulltulas",
    title: "Gold Skulltulas: All 100",
    icon: "skulltula",
    blurb:
      "All 100 tokens, in the remake's progression order. Night-only spiders leave a faint gold web visible in the day, and the Echo Gem (20 tokens) chimes when one is near. Soil patches: drop bottled bugs in as a child.",
    items: [
      s("gs", 1, "Deku Tree: compass room alcove", "In the room where rising platforms lead to the Compass, hop to the optional side alcove on the left.", "Inside the Deku Tree", "Child"),
      s("gs", 2, "Deku Tree: basement vines", "After dropping to the lower level, turn around: it's on the climbable vines leading back up toward the entrance.", "Inside the Deku Tree", "Child"),
      s("gs", 3, "Deku Tree: basement grate", "In the big central basement room, against the grate on the north side, near the water.", "Inside the Deku Tree", "Child"),
      s("gs", 4, "Deku Tree: behind the web", "In the torch room, burn through the spiderweb to reveal a hidden nook behind it.", "Inside the Deku Tree", "Child"),
      s("gs", 5, "Castle Town: guardhouse crate", "In the pot-filled guardhouse just inside the Market entrance, roll into the twitching, bouncing crate.", "Hyrule Castle Town", "Child"),
      s("gs", 6, "Lon Lon Ranch: tree behind Talon's house", "Roll into the tree behind the building with the Super Cucco game to shake it loose.", "Lon Lon Ranch", "Child"),
      s("gs", 7, "Kakariko: watchtower ladder", "On the ladder that climbs to the village watchtower in the middle of town.", "Kakariko Village", "Child", "Night"),
      s("gs", 8, "Kakariko: House of Skulltula door", "Right beside the front door of the cursed family's house, in the middle of town.", "Kakariko Village", "Child", "Night"),
      s("gs", 9, "Kakariko: construction site", "On the half-built construction site in the center of the village.", "Kakariko Village", "Child", "Night"),
      s("gs", 10, "Kakariko: the village tree", "Roll into the tree standing in the middle of Kakariko and it drops out.", "Kakariko Village", "Child", "Night"),
      s("gs", 11, "Kakariko: behind the northwest house", "Hiding behind the house in the northwest of the village.", "Kakariko Village", "Child", "Night"),
      s("gs", 12, "Graveyard: soft soil patch", "Drop bottled bugs into the soft soil in the northwest corner of the graveyard to flush it out.", "Kakariko Graveyard", "Child"),
      s("gs", 13, "Kokiri Forest: Know-It-All Brothers' house", "At night, check the back wall of the Know-It-All Brothers' house in the southwest of the village.", "Kokiri Forest", "Child", "Night"),
      s("gs", 14, "Kokiri Forest: shop soft soil", "Drop bottled bugs into the soft soil patch beside the Kokiri Shop.", "Kokiri Forest", "Child"),
      s("gs", 15, "Death Mountain Trail: Dodongo's Cavern soil", "Once the boulders blocking the cavern are cleared, drop bottled bugs into the soft soil right in front of the entrance.", "Death Mountain Trail", "Child"),
      s("gs", 16, "Dodongo's Cavern: top of the staircase", "In the room where a Bomb Flower blast builds the staircase, climb up and loop around: it's on the rear side of the stairs at the top.", "Dodongo's Cavern", "Child"),
      s("gs", 17, "Dodongo's Cavern: cracked wall by the shortcut", "After opening the shortcut back to the entrance from the central chamber, turn right and bomb the cracked rock.", "Dodongo's Cavern", "Child"),
      s("gs", 18, "Dodongo's Cavern: Baby Dodongo corridor", "In the corridor on the east side of the first floor where Baby Dodongos burrow, bomb the cracked rock to find it.", "Dodongo's Cavern", "Child"),
      s("gs", 19, "Dodongo's Cavern: block puzzle room", "Past the giant skull's mouth, in the room with the block-pushing puzzle, bomb the optional cracked wall.", "Dodongo's Cavern", "Child"),
      s("gs", 20, "Death Mountain Trail: bombable wall", "On the road back down toward Kakariko, behind a bombable section of wall.", "Death Mountain Trail", "Child"),
      s("gs", 21, "Goron City: hidden back room", "Bomb your way into the sealed room on the west side of Goron City; it's in there with the rupee chests.", "Goron City", "Child"),
      s("gs", 22, "Death Mountain Crater: the crates", "Duck into the crater from the summit entrance at full health and dash left: smash the crates before the heat gets you.", "Death Mountain Crater", "Child"),
      s("gs", 23, "Zora's River: the Bean Seller's soil", "Drop bottled bugs into the soft soil right beside the Bean Seller near the river entrance, the very patch he sits by. Plant a bean here too.", "Zora's River", "Child"),
      s("gs", 24, "Zora's River: back of the rocks", "At the bottom of the river area, on the back side of the rocks.", "Zora's River", "Child", "Night"),
      s("gs", 25, "Lake Hylia: laboratory soil", "Drop bottled bugs into the soft soil outside the Lakeside Laboratory, and plant a Magic Bean while you're here.", "Lake Hylia", "Child"),
      s("gs", 26, "Zora's Fountain: the tree", "Roll into the tree in Zora's Fountain to shake it down.", "Zora's Fountain", "Child"),
      s("gs", 27, "Jabu-Jabu: vines by the map room", "On the vines opposite the Dungeon Map chest; reachable once the water is raised.", "Inside Jabu-Jabu's Belly", "Child"),
      s("gs", 28, "Jabu-Jabu: the drop-down hole", "After defeating the tentacles opens a new hole, drop down and look immediately: Boomerang it off the wall.", "Inside Jabu-Jabu's Belly", "Child"),
      s("gs", 29, "Jabu-Jabu: ceiling on the path out", "On the ceiling of the path leading away from the room above, just after the previous one.", "Inside Jabu-Jabu's Belly", "Child"),
      s("gs", 30, "Jabu-Jabu: final room vines", "On the vines in the last room before the boss door.", "Inside Jabu-Jabu's Belly", "Child"),
      s("gs", 31, "Zora's Fountain: the wall at night", "At night, on a wall in Zora's Fountain; Boomerang the token down.", "Zora's Fountain", "Child", "Night"),
      s("gs", 32, "Lake Hylia: laboratory wall", "At night, on the side of the Lakeside Laboratory, viewed from the bridge side.", "Lake Hylia", "Child", "Night"),
      s("gs", 33, "Lake Hylia: the far outcropping", "Swim to the tiny outcropping of land at the far southwest end of the lake and crawl through the gap.", "Lake Hylia", "Child"),
      s("gs", 34, "Lon Lon Ranch: house window", "At night, Boomerang it off the window of the ranch house.", "Lon Lon Ranch", "Child", "Night"),
      s("gs", 35, "Lon Lon Ranch: ruined silo", "At night, at the ruined building in the southwest of the ranch; Boomerang it down.", "Lon Lon Ranch", "Child", "Night"),
      s("gs", 36, "Lon Lon Ranch: back of the corral", "At night, on the back wall of the horse feeding corral.", "Lon Lon Ranch", "Child", "Night"),
      s("gs", 37, "Graveyard: behind Dampé's hut", "At night, behind Dampé's hut; you finally have the reach with the Boomerang.", "Kakariko Graveyard", "Child", "Night"),
      s("gs", 38, "Hyrule Field: lone tree by the stream", "Approaching Kokiri Forest, roll into the lone tree at the end of the stream that cuts across the road.", "Hyrule Field", "Child", "Night"),
      s("gs", 39, "Lost Woods: bridge clearing soil", "In the clearing overlooking the bridge toward Hyrule Field (left, left from the Kokiri entrance), drop bottled bugs into the soft soil, and plant a bean.", "Lost Woods", "Child"),
      s("gs", 40, "Lost Woods: Forest Stage soil", "In the Forest Stage clearing (right, left, right, left, left), drop bottled bugs into the soft soil, and plant a bean.", "Lost Woods", "Child"),
      s("gs", 41, "Gerudo Valley: by the plank bridge", "At night, next to the small plank bridge over the river.", "Gerudo Valley", "Child", "Night"),
      s("gs", 42, "Gerudo Valley: lower soft soil", "Flutter down with the Cucco from the bridge ledge to the soft soil below; bottled bugs flush it out. Plant a bean here too.", "Gerudo Valley", "Child"),
      s("gs", 43, "Kakariko: behind the southern house", "As an adult, Hookshot up the vines by the southernmost house to get behind it, where it waits at night, the same yard where a Piece of Heart hid in your childhood.", "Kakariko Village", "Adult", "Night"),
      s("gs", 44, "Kokiri Forest: House of Twins", "At night, high on the back of the House of Twins in the southeast; Hookshot it down.", "Kokiri Forest", "Adult", "Night"),
      s("gs", 45, "Lost Woods: bean plant ledge", "Ride the Magic Bean plant you grew at the Forest Stage soil patch up to the elevated ledge.", "Lost Woods", "Adult", "Night"),
      s("gs", 46, "Sacred Forest Meadow: above the maze", "About halfway through the maze, on the wall overlooking it, near the final staircase to the Forest Temple.", "Sacred Forest Meadow", "Adult", "Night"),
      s("gs", 47, "Forest Temple: entrance vines", "In the very first room, up on the vines.", "Forest Temple", "Adult"),
      s("gs", 48, "Forest Temple: north door of the hub", "In the central chamber, head toward the north door but don't go through: turn around and look left.", "Forest Temple", "Adult"),
      s("gs", 49, "Forest Temple: balcony ledge", "After dropping through the hole past the Boss Key, walk out onto the balcony and follow the ledge south.", "Forest Temple", "Adult"),
      s("gs", 50, "Forest Temple: the scarecrow ledge", "After pushing the block to open the shortcut to the main chamber, turn and look up: play the Scarecrow's Song and Hookshot up to the ledge.", "Forest Temple", "Adult"),
      s("gs", 51, "Forest Temple: rotating room", "In the room you rotate to reach different areas, one of the revealed areas hides it.", "Forest Temple", "Adult"),
      s("gs", 52, "Dodongo's Cavern: the scarecrow nook", "Back as an adult: in the Baby Dodongo corridor on the lower-east side of the main chamber, play the Scarecrow's Song to reach it.", "Dodongo's Cavern", "Adult"),
      s("gs", 53, "Fire Temple: rising lava platform", "In the big lava room, ride the platform that rises instead of sinking (top-left), then use the Song of Time blocks to reach it.", "Fire Temple", "Adult"),
      s("gs", 54, "Fire Temple: boulder room wall", "In the rolling-boulder room, bomb the fake wall section to reveal it.", "Fire Temple", "Adult"),
      s("gs", 55, "Fire Temple: boulder maze scarecrow", "At the upper level of the boulder maze, look southwest: play the Scarecrow's Song, Hookshot up, and ride the elevator to a hidden room.", "Fire Temple", "Adult"),
      s("gs", 56, "Fire Temple: east tower climb", "Continuing on from the maze heights, Hookshot quickly across to reach it.", "Fire Temple", "Adult"),
      s("gs", 57, "Fire Temple: first room, hammered rocks", "With the Megaton Hammer, smash the doorway on the right of the temple's first room, then smash the rocks beyond.", "Fire Temple", "Adult"),
      s("gs", 58, "Death Mountain Trail: hammer rock, upper path", "On the path up toward the crater where rocks rained on you as a child, a Megaton-Hammer rock hides it.", "Death Mountain Trail", "Adult"),
      s("gs", 59, "Death Mountain Trail: hammer rock by Goron City", "Another hammer-smashable rock near the entrance to Goron City conceals it.", "Death Mountain Trail", "Adult"),
      s("gs", 60, "Death Mountain Crater: soft soil", "Warp in as a child (Bolero of Fire) and drop bottled bugs into the soft soil by the warp pad, and plant a bean here too.", "Death Mountain Crater", "Child"),
      s("gs", 61, "Zora's River: bean plant ride, upper river", "Ride the bean plant up the river; around the area with the Gossip Stone and grottos you visited as a child, at night.", "Zora's River", "Adult", "Night"),
      s("gs", 62, "Zora's River: high wall at the top", "As you reach the top of the river, look high on the wall.", "Zora's River", "Adult", "Night"),
      s("gs", 63, "Zora's Domain: frozen waterfall ledge", "From the high ledge where the diving game was, Hookshot it off the wall by the frozen waterfall.", "Zora's Domain", "Adult", "Night"),
      s("gs", 64, "Ice Cavern: spinning blade room", "In the first room with a spinning blade, up high.", "Ice Cavern", "Adult"),
      s("gs", 65, "Ice Cavern: compass room", "In the room with the Compass chest, up and to the northwest of the chest.", "Ice Cavern", "Adult"),
      s("gs", 66, "Ice Cavern: block puzzle doorway", "Near the entrance of the ice-block sliding puzzle room.", "Ice Cavern", "Adult"),
      s("gs", 67, "Water Temple: beneath the floating block", "With the water at mid level, sink with the Iron Boots in the central shaft: the floating block uncovers a path down to B1 and a room holding it.", "Water Temple", "Adult"),
      s("gs", 68, "Water Temple: whirlpool corridor", "After the Longshot, in the corridor of whirlpools: partway up, above the water.", "Water Temple", "Adult"),
      s("gs", 69, "Water Temple: top of the central column", "Return to the central column with the Longshot and climb to its very top.", "Water Temple", "Adult"),
      s("gs", 70, "Water Temple: the waterfall room", "After the Boss Key, in the hallway of rolling boulders, where the water cascades down.", "Water Temple", "Adult"),
      s("gs", 71, "Water Temple: bombable wall at mid level", "With the water at level 2, surface in the blue-lit room from your first water change and bomb the wall.", "Water Temple", "Adult"),
      s("gs", 72, "Lake Hylia: the tree after the temple", "Right after the Water Temple's ending, look up at the tree beside you and Longshot up to the vines.", "Lake Hylia", "Adult", "Night"),
      s("gs", 73, "Lake Hylia: bottom of the lab tank", "Sink to the very bottom of the Lakeside Laboratory's water tank.", "Lake Hylia", "Adult"),
      s("gs", 74, "Hyrule Castle: tree by the vines", "As a child again, sneak back into the castle grounds: at night, roll into the tree to the right of the vines leading up to the castle.", "Hyrule Castle Grounds", "Child", "Night"),
      s("gs", 75, "Hyrule Castle: Song of Storms grotto", "By the corner tree where Talon slept on the path to Zelda, play the Song of Storms to open a grotto; it's inside.", "Hyrule Castle Grounds", "Child"),
      s("gs", 76, "Bottom of the Well: past the Beamos", "With the Lenses of Truth, follow the safe path through the Beamos room to the door beyond.", "Bottom of the Well", "Child"),
      s("gs", 77, "Bottom of the Well: west locked room", "In the western locked room off the central chamber.", "Bottom of the Well", "Child"),
      s("gs", 78, "Bottom of the Well: hidden east path", "Down the path on the east side that only the Lenses of Truth reveal.", "Bottom of the Well", "Child"),
      s("gs", 79, "Shadow Temple: scythe room reward", "In the invisible spinning-scythe room, defeat the Like Like in the corner to unlock a door; it's in the room beyond, with the two chests.", "Shadow Temple", "Adult"),
      s("gs", 80, "Shadow Temple: atop the falling spikes", "In the falling-spike room, push the block to the end, climb it, and work your way on top of the spikes; it's up and to the left.", "Shadow Temple", "Adult"),
      s("gs", 81, "Shadow Temple: behind the fan gap", "After Hookshotting across the fan-blown gap, turn around.", "Shadow Temple", "Adult"),
      s("gs", 82, "Shadow Temple: boat area scarecrow", "By the boat dock, pull the block aside to open the shortcut, then play the Scarecrow's Song and Hookshot up.", "Shadow Temple", "Adult"),
      s("gs", 83, "Shadow Temple: the three skull pots", "In the room with three skull-shaped pots, drop bombs into all three to reveal it.", "Shadow Temple", "Adult"),
      s("gs", 84, "Gerudo Valley: rocks by the tents", "At night, on the rocky formations near the carpenters' tent camp.", "Gerudo Valley", "Adult", "Night"),
      s("gs", 85, "Gerudo Valley: behind the tents", "At night, check behind the tents themselves.", "Gerudo Valley", "Adult", "Night"),
      s("gs", 86, "Gerudo's Fortress: east wall", "On a wall on the east side of the fortress. Grab it while rescuing the carpenters or after, with free roam.", "Gerudo's Fortress", "Adult", "Night"),
      s("gs", 87, "Gerudo's Fortress: archery target", "At night, on the back of the northeastern target at the Horseback Archery range.", "Gerudo's Fortress", "Adult", "Night"),
      s("gs", 88, "Haunted Wasteland: the stone structure", "In the basement of the small building you reach crossing the wasteland (the Phantom Guide's house).", "Haunted Wasteland", "Adult"),
      s("gs", 89, "Desert Colossus: by the temple, at night", "To the right of the Spirit Temple entrance, where the Leevers and crows circle, at night.", "Desert Colossus", "Adult", "Night"),
      s("gs", 90, "Desert Colossus: soft soil", "Warp back as a child (Requiem of Spirit) and drop bottled bugs into the soft soil left of the temple entrance, and plant a bean too.", "Desert Colossus", "Child"),
      s("gs", 91, "Spirit Temple: silver gem room", "In the room where you collect the five silver gems to open the gate, as a child. The remake swaps Silver Rupees for silver gems.", "Spirit Temple", "Child"),
      s("gs", 92, "Spirit Temple: right of the statue", "After getting the Dungeon Map, look to the far right of the great statue from the chest.", "Spirit Temple", "Child"),
      s("gs", 93, "Spirit Temple: above the door", "After the sliding-block sunlight puzzle, pause as you enter the next room and look behind you, above the door.", "Spirit Temple", "Adult"),
      s("gs", 94, "Spirit Temple: bean plant summit", "Ride the Magic Bean plant outside the temple up to the rock formation; it's there at night.", "Desert Colossus", "Adult", "Night"),
      s("gs", 95, "Spirit Temple: Song of Time alcove", "In the rolling-boulder crystal room, one alcove is only reachable by moving the blue block with the Song of Time.", "Spirit Temple", "Adult"),
      s("gs", 96, "Spirit Temple: statue hand scarecrow", "From the ledge past the statue's hand, play the Scarecrow's Song and Hookshot up to the scarecrow.", "Spirit Temple", "Adult"),
      s("gs", 97, "Castle Town Ruins: collapsed building", "After receiving the Light Arrows, check the back of a collapsed building on the way to Ganon's Castle. Don't go in yet.", "Hyrule Castle Town (ruins)", "Adult", "Night"),
      s("gs", 98, "Hyrule Field: marshland grotto", "In the marshy ground in the west of Hyrule Field, find the hidden grotto and smash the crate inside.", "Hyrule Field", "Adult"),
      s("gs", 99, "Hyrule Field: southern grotto crack", "In the woods south of the field, along the back of Lon Lon Ranch between Lake Hylia and the Gerudo side, bomb the crack to find a grotto.", "Hyrule Field", "Adult"),
      s("gs", 100, "Zora's Fountain: the boulder cave", "The final one: use the Silver Gauntlets to lift the huge rock beside the Great Fairy's Fountain entrance, and climb the cave of invisible enemies to the top.", "Zora's Fountain", "Adult"),
    ],
  },
  {
    id: "hearts",
    title: "Pieces of Heart: All 36",
    icon: "heart",
    blurb:
      "All 36 pieces, in the remake's progression order. Several moved or changed from the original, including a third piece in Death Mountain Crater and two that hinge on the fairies' scribbled notes. Four pieces make one full Heart Container.",
    items: [
      s("hp", 1, "The silo crawlspace", "In the crumbling building in the southwest of the ranch, solve the block puzzle to reach the crawlspace and the room beyond.", "Lon Lon Ranch", "Child"),
      s("hp", 2, "The man on the roof", "Grab the Cucco up by the windmill, leap from the ledge, and glide to the blue-roofed house; the man stranded on the roof rewards you.", "Kakariko Village", "Child"),
      s("hp", 3, "Dampé's Gravedigging Tour", "At night, pay Dampé to dig as you walk the soft soil of the graveyard; when he says he's found 'something hard,' it's the piece.", "Kakariko Graveyard", "Child", "Night"),
      s("hp", 4, "The grave with the ReDead", "At night, pull back the gravestone that hides a hole; below, deal with the ReDead and open the chest.", "Kakariko Graveyard", "Child", "Night"),
      s("hp", 5, "The Skull Kids' song game", "Take the first right in the Lost Woods and complete the two Skull Kids' ocarina mimic game, round after round.", "Lost Woods", "Child"),
      s("hp", 6, "Saria's Song for the Skull Kid", "Take the first left in the Lost Woods, stand on the stump, and play Saria's Song for the lone Skull Kid.", "Lost Woods", "Child"),
      s("hp", 7, "The spinning Goron pot", "Light every torch in Goron City to set the great central pot spinning, then toss a bomb into it.", "Goron City", "Both"),
      s("hp", 8, "The owl's rooftop drop", "Ride Kaepora Gaebora down from the Death Mountain summit; from where he drops you, hop the southern rooftops to the piece.", "Kakariko Village", "Both"),
      s("hp", 9, "Bombchu Bowling, third win", "Bombchu Bowling prizes come in a fixed order in the remake: 10 Bombchus, then the Bomb Bag upgrade, then this piece. 10 rupees a game.", "Hyrule Castle Town", "Child"),
      s("hp", 10, "Richard the lost dog", "At night, find the little white dog in the Market and bring him home to the woman in the back alley. (Three dogs match the description in the remake, so bring each until it's Richard.)", "Hyrule Castle Town", "Child", "Night"),
      s("hp", 11, "Cucco glide to the vines", "Carry the Cucco from the river's entrance halfway up Zora's River and flutter to the vines; climb up, grab the second Cucco, and fly on to the piece.", "Zora's River", "Child"),
      s("hp", 12, "Cucco glide at the waterfall", "Keep hold of a Cucco all the way to the end of Zora's River and glide to the platform near the waterfall.", "Zora's River", "Child"),
      s("hp", 13, "Light the domain's torches", "From the throne room down to the water, light every torch in Zora's Domain with a Deku Stick; a chest appears behind the waterfall end of the run.", "Zora's Domain", "Child"),
      s("hp", 14, "The Fishing Pond lunker (child)", "Catch a fish over 50 cm at the Fishing Pond as a child. Fishing costs 10 rupees as a child.", "Lake Hylia", "Child"),
      s("hp", 15, "Cucco ledge by the bridge", "Grab the Cucco near the Gerudo Valley entrance and fly to the small ledge to the left of the bridge, where the piece sits in a crate.", "Gerudo Valley", "Child"),
      s("hp", 16, "Behind the waterfall", "From that same ledge, drop down the north side to the patch of land below and follow the path around behind the waterfall.", "Gerudo Valley", "Both"),
      s("hp", 17, "The graveyard bean plant", "Plant a Magic Bean in the graveyard's soft soil as a child; return as an adult and ride the plant up to the piece.", "Kakariko Graveyard", "Both"),
      s("hp", 18, "The windmill ledge", "After Dampé's race dumps you out inside the windmill, step out onto the nearby ledge for the piece.", "Kakariko Village", "Adult"),
      s("hp", 19, "Dampé's race, under a minute", "Race Dampé's ghost again and finish in under 1:00 to earn his second prize.", "Kakariko Graveyard", "Adult"),
      s("hp", 20, "The laboratory roof bean plant", "Plant a bean in the soil by the Lakeside Laboratory as a child; as an adult, ride the plant and climb to the top of the lab's tower.", "Lake Hylia", "Both"),
      s("hp", 21, "Above Dodongo's Cavern", "Plant a bean in the soft soil outside Dodongo's Cavern as a child; ride the grown plant as an adult to the piece above the entrance.", "Death Mountain Trail", "Both"),
      s("hp", 22, "The crater alcove", "Enter Death Mountain Crater from the summit trail and climb down the wall straight ahead into the alcove holding the piece. Mind the heat timer as a child.", "Death Mountain Crater", "Both"),
      s("hp", 23, "The 50-token reward", "Bring 50 Gold Skulltula Tokens to the House of Skulltula in Kakariko and claim the family's fifth reward.", "Kakariko Village", "Both"),
      s("hp", 24, "The crater bean plant", "Plant a bean in the soft soil by the crater's warp pad as a child (warp in with the Bolero of Fire); ride the plant as an adult up to the great pillar.", "Death Mountain Crater", "Both"),
      s("hp", 25, "Across the ice floes", "Hop across the floating ice blocks in Zora's Fountain to reach the piece.", "Zora's Fountain", "Adult"),
      s("hp", 26, "The fountain lakebed", "Sink with the Iron Boots to the bottom of Zora's Fountain, near the Ice Cavern entrance.", "Zora's Fountain", "Adult"),
      s("hp", 27, "Touch the bottom of the lab tank", "With the Golden Scale, dive to the very bottom of the Lakeside Laboratory's tank (no Iron Boots) and touch the bottom, then tell the scientist.", "Lake Hylia", "Both"),
      s("hp", 28, "Song of Storms for the frogs", "Halfway up Zora's River, play the Song of Storms for the circle of frogs.", "Zora's River", "Child"),
      s("hp", 29, "Grow all the frogs", "Play the frogs every other song you've learned until the whole chorus has grown.", "Zora's River", "Child"),
      s("hp", 30, "Treasure Chest Shop, clean sweep", "At night, beat the Treasure Chest Shop's five-room gamble in the Market. The Lenses of Truth make it a sure thing.", "Hyrule Castle Town", "Child", "Night"),
      s("hp", 31, "The fortress rooftop chest", "In a chest on the highest roof of Gerudo's Fortress. Longshot or Scarecrow's Song gets you up there.", "Gerudo's Fortress", "Adult"),
      s("hp", 32, "Horseback Archery, 750 points", "Score 750 points at the Gerudo Horseback Archery range. 30 rupees a run; the remake lowered the bar from 1,000.", "Gerudo's Fortress", "Adult", "Day"),
      s("hp", 33, "The colossus bean plant", "Plant a bean in the soft soil by the Spirit Temple as a child; ride the plant as an adult to the top of the stone arch.", "Desert Colossus", "Both"),
      s("hp", 34, "The fairies' empty chest", "As an adult, find the chest under the rock formation near the Gerudo Valley entrance and read the Fairy Note beside it; then return as a child and open the chest.", "Hyrule Field", "Both"),
      s("hp", 35, "The Business Scrub's password", "As an adult, read the Fairy Note on the tree by the castle drawbridge; then, as a child, bomb open the grotto nearby, give the Business Scrub the password ('Sell somethin', will ya?') and buy the piece for 100 rupees.", "Hyrule Field", "Both"),
      s("hp", 36, "The crater Business Scrub", "The remake's third crater piece: as a child, enter the crater from the trail, drop to the lower ground on the left, reflect the scrub's Deku Nut back at him, and buy the piece for 100 rupees. Hurry, the heat is ticking.", "Death Mountain Crater", "Child"),
    ],
  },
  {
    id: "skullrewards",
    title: "House of Skulltula Rewards",
    icon: "skulltula",
    blurb:
      "Turn tokens in at the cobwebbed house in the middle of Kakariko Village. Each freed family member hands over a reward. The 50-token prize is the Piece of Heart counted in the heart list above.",
    items: [
      s("skr", 1, "10 tokens: Adult's Wallet", "Holds 500 rupees, up from the 200 of the Kokiri Wallet you start with.", "Kakariko Village", "Both"),
      s("skr", 2, "20 tokens: Echo Gem", "The remake's successor to the Stone of Agony: equip it and it glows and chimes when a Gold Skulltula is near, even for night-only spiders during the day.", "Kakariko Village", "Both"),
      s("skr", 3, "30 tokens: Giant's Wallet", "Holds up to 1,000 rupees in the remake.", "Kakariko Village", "Both"),
      s("skr", 4, "40 tokens: Bombchu pack", "A bundle of 20 Bombchus.", "Kakariko Village", "Both"),
      s("skr", 5, "100 tokens: the Huge Rupee spring", "The father is freed last: he gives a Huge Rupee worth 200 rupees, every time you visit. Effectively infinite money.", "Kakariko Village", "Both"),
    ],
  },
  {
    id: "soils",
    title: "Soft Soil & Magic Beans: All 10",
    icon: "soil",
    blurb:
      "Every patch does double duty as a child: drop bottled bugs in to flush out its Gold Skulltula (each one is in the Skulltula list), then plant a Magic Bean so the grown plant is waiting for adult Link. The Bean Seller raises his price 10 rupees per bean, so 550 rupees buys all ten.",
    items: [
      s("soil", 1, "Zora's River: beside the Bean Seller", "The patch right next to the man who sells the beans, near the Hyrule Field entrance.", "Zora's River", "Child"),
      s("soil", 2, "Kokiri Forest: by the Kokiri Shop", "The patch of soft soil beside/behind the Kokiri Shop, on the east side of the village.", "Kokiri Forest", "Child"),
      s("soil", 3, "Lost Woods: the bridge clearing", "Left, then left again from the Kokiri entrance: the clearing with the bridge toward Hyrule Field.", "Lost Woods", "Child"),
      s("soil", 4, "Lost Woods: the Forest Stage clearing", "Right, left, right, left, left from the entrance, behind the Business Scrubs near the Forest Stage grotto.", "Lost Woods", "Child"),
      s("soil", 5, "Kakariko Graveyard: northwest corner", "In the upper-left corner, by the leftmost row of graves along the north wall.", "Kakariko Graveyard", "Child"),
      s("soil", 6, "Death Mountain Trail: Dodongo's Cavern", "Right in front of the cavern entrance; clear the blocking boulders first.", "Death Mountain Trail", "Child"),
      s("soil", 7, "Death Mountain Crater: the warp pad", "Beside the Triforce warp pedestal. Reachable as a child only after learning the Bolero of Fire as an adult and warping in.", "Death Mountain Crater", "Child"),
      s("soil", 8, "Lake Hylia: the laboratory", "Beside the Lakeside Laboratory, on its west side.", "Lake Hylia", "Child"),
      s("soil", 9, "Gerudo Valley: the lowest ledge", "On the far side of the river under the bridge, near the cow and the Gerudo; glide down with a Cucco.", "Gerudo Valley", "Child"),
      s("soil", 10, "Desert Colossus: the temple door", "Just left of the Spirit Temple entrance; warp in as a child with the Requiem of Spirit.", "Desert Colossus", "Child"),
    ],
  },
  {
    id: "bottles",
    title: "Empty Bottles: All 5",
    icon: "bottle",
    blurb: "The remake adds a fifth bottle, from the Potion Shop in Castle Town. Keep one full of bugs for the soft soil patches.",
    items: [
      s("bot", 1, "Talon's Super Cucco game", "At Lon Lon Ranch, pick Talon's three special Cuccos out of the flock within the time limit.", "Lon Lon Ranch", "Child"),
      s("bot", 2, "Anju's lost Cuccos", "Round up all seven stray Cuccos around Kakariko Village and pen them for the Cucco Lady, Anju.", "Kakariko Village", "Child"),
      s("bot", 3, "The bottle on the lakebed", "Dive at the marked spot in Lake Hylia (near the Zora's Domain shortcut) for the bottle holding Ruto's Letter. It stays a bottle once the letter is delivered.", "Lake Hylia", "Child"),
      s("bot", 4, "The Poe Collector's prize", "Sell the Poe Collector in the ruined Market's Ghost Shop 5 Big Poes, 500 points, and he hands over a bottle. The original needed 10.", "Hyrule Castle Town (ruins)", "Adult"),
      s("bot", 5, "The Potion Shop's runaway bug", "New in the remake: walk into the Castle Town Potion Shop as a child and the shopkeeper asks you to catch an escaped bug. Keep the bottle; it comes with a Red Potion.", "Hyrule Castle Town", "Child"),
    ],
  },
  {
    id: "songs",
    title: "Ocarina Songs: All 13",
    icon: "song",
    blurb: "Twelve songs on the quest subscreen, plus the one you compose yourself. The frogs of Zora's River will want to hear most of them.",
    items: [
      s("song", 1, "Zelda's Lullaby", "Taught by Impa after you meet Princess Zelda in the castle courtyard.", "Hyrule Castle", "Child"),
      s("song", 2, "Epona's Song", "Taught by Malon at Lon Lon Ranch. Play it to call Epona once she's yours.", "Lon Lon Ranch", "Child"),
      s("song", 3, "Saria's Song", "Saria teaches it at the end of the Sacred Forest Meadow maze; it also cheers up Darunia.", "Sacred Forest Meadow", "Child"),
      s("song", 4, "Sun's Song", "Written on the back of the Royal Family's Tomb in the Kakariko Graveyard. It freezes ReDeads and flips day to night.", "Kakariko Graveyard", "Child"),
      s("song", 5, "Song of Time", "Taught at the altar of the Temple of Time when you first bring the Ocarina of Time there.", "Temple of Time", "Child"),
      s("song", 6, "Song of Storms", "The windmill man, Guru-Guru, teaches it to adult Link: the song a kid once played that drained the well. Go play it as that kid.", "Kakariko Village", "Adult"),
      s("song", 7, "Minuet of Forest", "Sheik teaches it at the Forest Temple's entrance in the Sacred Forest Meadow.", "Sacred Forest Meadow", "Adult"),
      s("song", 8, "Bolero of Fire", "Sheik teaches it at the warp pad in Death Mountain Crater.", "Death Mountain Crater", "Adult"),
      s("song", 9, "Serenade of Water", "Sheik teaches it as you leave the Ice Cavern.", "Zora's Fountain", "Adult"),
      s("song", 10, "Requiem of Spirit", "Sheik teaches it at the Desert Colossus, the only way a child can reach the Spirit Temple.", "Desert Colossus", "Adult"),
      s("song", 11, "Nocturne of Shadow", "Sheik teaches it in Kakariko Village after the Water Temple, as the village burns.", "Kakariko Village", "Adult"),
      s("song", 12, "Prelude of Light", "Sheik teaches it in the Temple of Time when you return from your first temple.", "Temple of Time", "Adult"),
      s("song", 13, "Scarecrow's Song", "Your own composition: play any eight notes for Bonooru the scarecrow at Lake Hylia as a child, then replay it as an adult to make Pierre appear wherever he's planted.", "Lake Hylia", "Both"),
    ],
  },
  {
    id: "upgrades",
    title: "Capacity Upgrades: Every Bag, Quiver & Scale",
    icon: "upgrade",
    blurb:
      "Every carrying-capacity upgrade in the game: sticks, nuts, seeds, bombs, arrows, and the two diving scales. (The three wallets live in the House of Skulltula rewards above.)",
    items: [
      s("up", 1, "Deku Stick capacity 20", "Buy it from the Business Scrub in the Lost Woods clearing by the Forest Stage. Reflect his nut, then pay 40 rupees.", "Lost Woods", "Child"),
      s("up", 2, "Deku Stick capacity 30", "Perform at the Forest Stage wearing the Skull Mask and the Deku Scrubs reward you with the biggest stick bag.", "Lost Woods", "Child"),
      s("up", 3, "Deku Nut capacity 30", "Buy it from the Business Scrub in the hidden grotto in Hyrule Field along the Gerudo Valley road. Bomb the boulder to drop in, then pay 40 rupees.", "Hyrule Field", "Child"),
      s("up", 4, "Deku Nut capacity 40", "Perform at the Forest Stage wearing the Mask of Truth for the biggest nut bag.", "Lost Woods", "Child"),
      s("up", 5, "Bullet Bag (holds 40 seeds)", "Score a perfect game at the Castle Town Shooting Gallery as a child.", "Hyrule Castle Town", "Child"),
      s("up", 6, "Biggest Bullet Bag (holds 50 seeds)", "In the Lost Woods, hit the center of the hanging target with the Slingshot. The remake asks for 5 center hits.", "Lost Woods", "Child"),
      s("up", 7, "Bomb Bag (holds 20)", "In the big chest in Dodongo's Cavern.", "Dodongo's Cavern", "Child"),
      s("up", 8, "Big Bomb Bag (holds 30)", "Stop the rolling Goron in Goron City with a well-timed bomb, as a child. This and the Bombchu Bowling bag can come in either order.", "Goron City", "Child"),
      s("up", 9, "Biggest Bomb Bag (holds 40)", "Win Bombchu Bowling a second time: the remake's fixed prizes are 10 Bombchus, then this bag upgrade, then a Piece of Heart.", "Hyrule Castle Town", "Child"),
      s("up", 10, "Quiver (holds 30 arrows)", "Comes with the Fairy Bow in the Forest Temple.", "Forest Temple", "Adult"),
      s("up", 11, "Big Quiver (holds 40 arrows)", "Score a perfect game at the Kakariko Shooting Gallery as an adult.", "Kakariko Village", "Adult"),
      s("up", 12, "Biggest Quiver (holds 50 arrows)", "Score 1,400 points at Gerudo Horseback Archery; the remake lowered it from 1,500. Hit 750 on the same run and both prizes come at once.", "Gerudo's Fortress", "Adult", "Day"),
      s("up", 13, "Silver Scale", "Win King Zora's diving game in Zora's Domain: dive to the bottom and collect every rupee before time runs out.", "Zora's Domain", "Child"),
      s("up", 14, "Golden Scale", "Catch a fish over 60 cm at the Fishing Pond as an adult and the pond owner awards it. Fishing costs 30 rupees as an adult.", "Lake Hylia", "Adult"),
      s("up", 15, "Golden Gauntlets", "In the chest in Ganon's Castle's Shadow barrier section, the final strength upgrade, able to lift the great black pillars.", "Ganon's Castle", "Adult"),
      s("up", 16, "Fire Arrows", "After the Water Temple, stand on the island in Lake Hylia and shoot the rising sun (at dawn) with an arrow, aiming between the two pillars.", "Lake Hylia", "Adult", "Day"),
    ],
  },
  {
    id: "fairies",
    title: "Great Fairy Gifts: All 6",
    icon: "fairy",
    blurb: "Every Great Fairy's Fountain and her gift. In the remake each one asks an offering first: 1,175 rupees for all six. Play Zelda's Lullaby on the Triforce mark.",
    items: [
      s("gf", 1, "Magic Meter & Din's Fire", "Bomb the wall at the Death Mountain summit, beside the crater entrance. Offering: 25 rupees.", "Death Mountain Trail", "Child"),
      s("gf", 2, "Gift of Improved Spin", "In the Hyrule Castle grounds, follow the path past the 'Dead End' sign and bomb the wall to the crawl hole. Offering: 50 rupees.", "Hyrule Castle Grounds", "Child"),
      s("gf", 3, "Farore's Wind", "Bomb the wall on the right side of Zora's Fountain, behind Lord Jabu-Jabu. Offering: 100 rupees. In the remake it warps you to the exact spot you marked.", "Zora's Fountain", "Child"),
      s("gf", 4, "Gift of Doubled Magic", "Smash the boulders on the crater's west shore with the Megaton Hammer to reach her fountain; a Goron Tunic helps. Offering: 200 rupees.", "Death Mountain Crater", "Adult"),
      s("gf", 5, "Nayru's Love", "Bomb the cracked wall between the palm trees at the Desert Colossus, near the Spirit Temple. Offering: 300 rupees.", "Desert Colossus", "Both"),
      s("gf", 6, "Gift of Halved Damage", "Outside Ganon's Castle in the ruined Castle Town, move the great pillar with the Golden Gauntlets to reach her fountain. Offering: 500 rupees. Your hearts gain a white outline.", "Hyrule Castle Town (ruins)", "Adult"),
    ],
  },
  {
    id: "masks",
    title: "The Mask Trading Sequence",
    icon: "mask",
    blurb:
      "Borrow masks from the Happy Mask Shop in the Market, sell each one to the right person, and pay the shop back. Finish all four sales and the Mask of Truth is yours to borrow forever. You'll need it (and the Skull Mask) for the Forest Stage upgrades.",
    items: [
      s("mask", 1, "Keaton Mask: sold to the gate guard", "Sell it to the soldier guarding the Death Mountain Trail gate in Kakariko Village.", "Kakariko Village", "Child"),
      s("mask", 2, "Skull Mask: sold to the Skull Kid", "Sell it to the Skull Kid standing on the stump in the Lost Woods (first left from the entrance).", "Lost Woods", "Child"),
      s("mask", 3, "Spooky Mask: sold to the graveyard boy", "Sell it to the little boy who plays in the Kakariko Graveyard during the day.", "Kakariko Graveyard", "Child", "Day"),
      s("mask", 4, "Bunny Hood: sold to the Running Man", "Sell it to the marathon runner who circles Hyrule Field; catch him resting. In the remake he pays a Gold Rupee, 200 rupees, for the 50-rupee hood.", "Hyrule Field", "Child"),
      s("mask", 5, "Mask of Truth: earned", "With all four sales paid off, borrow the Mask of Truth free, forever: read Gossip Stones and hear what people really think.", "Hyrule Castle Town", "Child"),
    ],
  },
  {
    id: "trade",
    title: "The Biggoron Sword Trading Sequence",
    icon: "sword",
    blurb:
      "The longest errand in Hyrule: ten trades, two of them against the clock, ending with the unbreakable Biggoron Sword, twice as strong as the Master Sword. The remake renames a few items and changes the timers. Start it as an adult in Kakariko.",
    items: [
      s("trade", 1, "Pocket Egg", "The Cucco Lady in Kakariko gives you an egg; it hatches into the Pocket Cucco after a day (or one Sun's Song).", "Kakariko Village", "Adult"),
      s("trade", 2, "Cojiro, the blue Cucco", "Use the hatched Pocket Cucco to wake Talon, asleep in a Kakariko house; then show it to the Cucco Lady to receive Cojiro, her brother's rare blue Cucco.", "Kakariko Village", "Adult"),
      s("trade", 3, "Odd Mushroom", "Cojiro's crowing wakes the carpenter's son, Grog, in the Lost Woods; he trades you the Odd Mushroom. It spoils in 4 minutes in the remake, up from 3.", "Lost Woods", "Adult"),
      s("trade", 4, "Odd Poultice", "Rush the Odd Mushroom to Granny's shop in Kakariko, behind the Potion Shop, before it spoils; she brews the Odd Poultice.", "Kakariko Village", "Adult"),
      s("trade", 5, "Poacher's Saw", "Take the Odd Poultice back to the Lost Woods: Fado tells you Grog is gone and trades you the saw he left behind.", "Lost Woods", "Adult"),
      s("trade", 6, "Broken Goron's Sword", "Take the Poacher's Saw to the head carpenter in his tent in Gerudo Valley; he trades you the Broken Goron's Sword.", "Gerudo Valley", "Adult"),
      s("trade", 7, "Prescription", "Show the Broken Goron's Sword to Biggoron on the Death Mountain summit; his eyes hurt too much to fix it, so he writes a Prescription.", "Death Mountain Trail", "Adult"),
      s("trade", 8, "Eyeball Frog", "Give the Prescription to King Zora, thawed with Blue Fire first; he hands over an Eyeball Frog. Get it to the Lakeside Laboratory in 2.5 minutes, down from 3. Don't warp.", "Zora's Domain", "Adult"),
      s("trade", 9, "Specialty Eye Drops", "The lab scientist mixes the drops from the frog. Run them to Biggoron in 3.5 minutes, down from 4. The original called them the World's Finest Eye Drops.", "Lake Hylia", "Adult"),
      s("trade", 10, "Biggoron Receipt", "The drops clear Biggoron's eyes and he hands you a receipt, the remake's Claim Check, while he forges. Wait three days…", "Death Mountain Trail", "Adult"),
      s("trade", 11, "Biggoron Sword", "…then hand over the Biggoron Receipt and receive the Biggoron Sword: the longest, strongest blade in the game, and it never breaks.", "Death Mountain Trail", "Adult"),
    ],
  },
  {
    id: "training",
    title: "Gerudo Proving Grounds & the Ice Arrows",
    icon: "training",
    blurb:
      "The remake's new name for the Gerudo Training Ground, now on the path between the fortress and the archery range. Show the Gerudo Pass, pay 30 rupees, and work the rooms for their Small Keys. The prize at the center is the Ice Arrows.",
    items: [
      s("gtg", 1, "Gain entry", "Show the Gerudo Pass at the Proving Grounds gate, on the path between the fortress and the archery range, and pay 30 rupees.", "Gerudo's Fortress", "Adult"),
      s("gtg", 2, "Clear every room", "Fight, swim, climb and puzzle through every room, collecting each Small Key, including those hidden for the Lenses of Truth and the Song of Time. Silver Rupees are silver gems now.", "Gerudo's Fortress", "Adult"),
      s("gtg", 3, "Open every locked door in the hub", "Spend the keys in the central room in the right order so no door is left unopened.", "Gerudo's Fortress", "Adult"),
      s("gtg", 4, "Ice Arrows", "Open the great chest at the heart of the maze: the Ice Arrows, which freeze enemies solid.", "Gerudo's Fortress", "Adult"),
    ],
  },
  {
    id: "merchants",
    title: "One-Time Merchant Deals",
    icon: "merchant",
    blurb: "Purchases you can only make once. When they're gone, they're gone. (The two Business Scrub Piece-of-Heart sales are counted in the heart list.)",
    items: [
      s("merch", 1, "All 10 Magic Beans", "Buy out the Bean Seller at Zora's River completely: his price climbs 10 rupees with every bean, 550 rupees in total.", "Zora's River", "Child"),
      s("merch", 2, "The Giant's Knife", "Buy Medigoron's Giant's Knife in Goron City for 200 rupees, a huge two-handed blade. Enjoy it while it lasts: it snaps after a few swings.", "Goron City", "Adult"),
      s("merch", 3, "The Carpet Merchant's Bombchus", "Out in the Haunted Wasteland, the merchant hovering on a flying carpet sells a pack of Bombchus for 200 rupees, his one and only wares.", "Haunted Wasteland", "Adult"),
    ],
  },
  {
    id: "gear",
    title: "Swords, Shields & Tunics",
    icon: "gear",
    blurb: "The named equipment that isn't a capacity upgrade: blades, shields, and the two elemental tunics. The Biggoron Sword ends the trading sequence above.",
    items: [
      s("gear", 1, "Kokiri Sword", "In the chest through the crawl hole in the Forest Training Area of Kokiri Forest, your first blade.", "Kokiri Forest", "Child"),
      s("gear", 2, "Deku Shield", "Buy it at the Kokiri Shop for 40 rupees; the Great Deku Tree won't see you without it.", "Kokiri Forest", "Child"),
      s("gear", 3, "Hylian Shield", "Pull back a gravestone in the Kakariko Graveyard as a child and open the chest below, or buy one in the Market if you lose it.", "Kakariko Graveyard", "Child"),
      s("gear", 4, "Mirror Shield", "In the great chest on the Spirit Temple's upper floors, as an adult: it reflects light, and Twinrova's magic.", "Spirit Temple", "Adult"),
      s("gear", 5, "Goron Tunic", "Stop the rolling Link the Goron in Goron City as an adult and he'll give you a heat-proof tunic free. (Also sold in the Goron Shop.)", "Goron City", "Adult"),
      s("gear", 6, "Zora Tunic", "Thaw King Zora with Blue Fire from the Ice Cavern and he gives you a tunic that breathes underwater. (Also sold in the Zora Shop.)", "Zora's Domain", "Adult"),
    ],
  },
  {
    id: "sidequests",
    title: "Side Quests & Hunts",
    icon: "sidequest",
    blurb: "The long hunts and small kindnesses that don't fit anywhere else.",
    items: [
      s("side", 1, "Win Epona", "At Lon Lon Ranch as an adult, pay Ingo to ride, learn Epona's Song to call her, then beat Ingo in two races (50 rupees each) and escape the ranch by jumping the fence. Epona is yours, and Big Poes only appear to a rider.", "Lon Lon Ranch", "Adult"),
      s("side", 2, "All 10 Big Poes", "Ride Epona through Hyrule Field and look for purple lanterns: jump the marked log or fence and a Big Poe appears. Shoot it and bottle it. Each sells for 30 rupees; all 10 earn a Gold Rupee from the Poe Collector.", "Hyrule Field", "Adult"),
      s("side", 3, "A cow for your house", "Beat Malon's obstacle course at Lon Lon Ranch in under 50 seconds as an adult, and she delivers a cow to your house in Kokiri Forest. Free milk, forever, at home.", "Lon Lon Ranch", "Adult"),
      s("side", 4, "Find the Sinking Lure", "Search the Fishing Pond (in the grass by the wall, among the rocks, or by the log) for the hidden Sinking Lure, the only way to reach the pond's deepest fish. (The owner will scold you for using it in a proper record attempt.)", "Lake Hylia", "Both"),
      s("side", 5, "Steal the fisherman's hat", "At the Fishing Pond, cast your line at the fisherman himself and hook his hat clean off. Reel it in, then decide whether to give it back or let it sink.", "Lake Hylia", "Both"),
    ],
  },
  {
    id: "challenges",
    title: "Merchant & Minigame Master Challenges",
    icon: "merchant",
    blurb:
      "Not the rewards: the hardest version of every merchant's game and every contest in Hyrule, beaten properly. If you can tick everything here, no shopkeeper in the kingdom can humble you.",
    items: [
      s("chal", 1, "Shooting Gallery: perfect game as a child", "Hit all 10 targets at the Castle Town Shooting Gallery without a miss.", "Hyrule Castle Town", "Child"),
      s("chal", 2, "Shooting Gallery: perfect game as an adult", "Hit all 10 targets at the Kakariko Shooting Gallery without a miss.", "Kakariko Village", "Adult"),
      s("chal", 3, "Bombchu Bowling: the full prize cycle", "Win all three fixed prizes, Bombchus, the Bomb Bag and the Piece of Heart, then keep winning for Red Rupees.", "Hyrule Castle Town", "Child"),
      s("chal", 4, "Horseback Archery: 1,400 again", "After the Biggest Quiver, hit 1,400 points once more; the range pays 50 rupees each time.", "Gerudo's Fortress", "Adult", "Day"),
      s("chal", 5, "Catch the Hylian Loach", "The legendary fish of the Fishing Pond: find the Sinking Lure, fish at dawn or dusk, and land the Loach, the pond's rarest catch, worth a fortune in bragging rights.", "Lake Hylia", "Both"),
      s("chal", 6, "Talon's Super Cuccos, first try", "Find all three of Talon's special Cuccos within 30 seconds on a single attempt.", "Lon Lon Ranch", "Child"),
      s("chal", 7, "Ingo, beaten twice running", "Win both wager races against Ingo back-to-back at 50 rupees a race to take Epona.", "Lon Lon Ranch", "Adult"),
      s("chal", 8, "Dampé's race in under a minute", "Beat the 1:00 mark chasing Dampé's ghost through his grave. No shortcuts, just clean running and rolling.", "Kakariko Graveyard", "Adult"),
      s("chal", 9, "Malon's obstacle course in under 50 seconds", "A flawless run of the ranch obstacle course on Epona, every fence clean.", "Lon Lon Ranch", "Adult"),
      s("chal", 10, "Treasure Chest Shop without the Lens", "Beat the Treasure Chest Shop's five rooms on pure luck or memory, the way the shopkeeper intended, once. Then do it honestly with the Lenses of Truth for the heart.", "Hyrule Castle Town", "Child", "Night"),
      s("chal", 11, "The frogs' bug-catching finale", "After growing the full frog chorus in Zora's River, win their bug-catching rhythm game, played on the ocarina as they leap.", "Zora's River", "Child"),
      s("chal", 12, "Race the Running Man", "Accept the marathon runner's challenge from Gerudo Valley to the Lost Woods and run your heart out. He will win by exactly one second. He always wins by exactly one second. Race him anyway.", "Hyrule Field", "Adult"),
      s("chal", 13, "Gerudo Proving Grounds, fully cleared", "Every room, every key, every door: the whole Proving Grounds, ending at the Ice Arrows chest.", "Gerudo's Fortress", "Adult"),
    ],
  },
  {
    id: "eastereggs",
    title: "Easter Eggs & Things to Try",
    icon: "fairy",
    blurb:
      "The game itself doesn't require any of these. All of it is the game winking at you: the little jokes and secrets that make Hyrule feel alive. Try every one.",
    items: [
      s("egg", 1, "Shoot at the Shooting Gallery clerk", "Take aim at the Castle Town Shooting Gallery clerk himself and loose a seed or an arrow: he ducks behind the counter and gives you a telling-off you'll want to read.", "Hyrule Castle Town", "Both"),
      s("egg", 2, "Bomb a Gossip Stone", "Set a bomb beside any Gossip Stone and stand back: it blasts off like a rocket, clear into the sky.", "Hyrule", "Both"),
      s("egg", 3, "Hammer a Gossip Stone", "Flatten a Gossip Stone with the Megaton Hammer and watch it squashed flat as a pancake, slowly puffing itself back into shape.", "Hyrule", "Adult"),
      s("egg", 4, "Strike a Gossip Stone with your sword", "Whack one with your blade: it shakes, giggles, and tells you the current time.", "Hyrule", "Both"),
      s("egg", 5, "Play Zelda's Lullaby for a Gossip Stone", "Stand before a Gossip Stone and play Zelda's Lullaby: a fairy drifts out of it, free for the bottling.", "Hyrule", "Both"),
      s("egg", 6, "Play the Song of Storms for a Gossip Stone", "Summon the storm at a Gossip Stone and a great fairy appears, restoring your hearts and magic.", "Hyrule", "Both"),
      s("egg", 7, "Read the Gossip Stones with the Mask of Truth", "Wear the Mask of Truth and speak to Gossip Stones across Hyrule: each one spills a secret, about the Gerudo, the Skull Kid, Malon's crush, and the man who is 'quite good' at something.", "Hyrule", "Child"),
      s("egg", 8, "Read the fairies' scribbles with Navi", "The remake's Fairy Notes: glowing scribbles left by fairies all over Hyrule. Send Navi to one and read what the fairies wrote. They hint at secrets, including an empty chest and a certain Business Scrub's password.", "Hyrule", "Both"),
      s("egg", 9, "Fix a broken sign with Zelda's Lullaby", "Chop a wooden sign into splinters with your sword, then play Zelda's Lullaby and watch the pieces float back together, good as new.", "Hyrule", "Both"),
      s("egg", 10, "Shoot the castle courtyard windows", "In the courtyard where you meet Zelda, shoot the window on the left: a soldier leans out, scolds you, and lobs a bomb at your feet. The other window frames portraits of Mario, Peach, Yoshi, Luigi and Bowser.", "Hyrule Castle", "Child"),
      s("egg", 11, "Provoke the Cucco Revenge Squad", "Strike a Cucco again and again until it screams, then run. The flock always collects its debt.", "Hyrule", "Both"),
      s("egg", 12, "Turn a butterfly into a fairy", "Hold out a Deku Stick and walk slowly into a butterfly; with patience, it may transform into a fairy.", "Hyrule", "Child"),
      s("egg", 13, "Make the scarecrow dance", "At Lake Hylia, play songs for Bonooru and Pierre and watch the scarecrows lose themselves in the music. Every song gets a different dance.", "Lake Hylia", "Both"),
      s("egg", 14, "Check the time on a Gossip Stone at midnight", "You already know they tell the time. Doing it at midnight, in the dark, in the middle of Hyrule Field, is simply the correct way to play this game.", "Hyrule Field", "Both", "Night"),
      s("egg", 15, "Rematch a boss in the Hall of Fallen Foes", "New in the remake: sleep in a glowing green bed, like the one at the Kakariko inn, and dream your way to rematches with bosses you've beaten.", "Kakariko Village", "Both"),
    ],
  },
];

export const ALL_ITEMS: CatalogItem[] = SECTIONS.flatMap((sec) => sec.items);
export const TOTAL_ITEMS = ALL_ITEMS.length;
