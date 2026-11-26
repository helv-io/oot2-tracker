# Data sources and remake changes

The checklist targets *The Legend of Zelda: Ocarina of Time* on
Nintendo Switch 2 (November 2026). Where the remake changed something
from the 1998 original, the catalog follows the remake. Each change
below was checked against at least two independent sources. Anything
that couldn't be confirmed keeps the original game's data and is listed
under **Unverified**.

Item ids never change (they are the sync contract), so new deeds get
new ids: `bot-5` and `egg-15` in v1.2.0.

## Changes from the original, reflected in the catalog

| Area | Original | Remake | Catalog | Sources |
| --- | --- | --- | --- | --- |
| Bottles | 4 bottles | **5 bottles**. New: catch the escaped bug in the Castle Town Potion Shop as a child; you keep the bottle, with a Red Potion | `bot-5`, section title and blurb | [Nintendo Life][nl-bottles], [Polygon][pg-bottles], [VGC][vgc-bottles], [TheGamer][tg-bottles], [Zelda Wiki: Potion Shop][zw-potion] |
| Poe Collector | 10 Big Poes for the bottle | **5 Big Poes** (500 points). Big Poes appear when you jump a log or fence marked with a purple lantern on Epona. 30 rupees each; all 10 earn a Gold Rupee | `bot-4`, `side-2` | [Nintendo Life][nl-bottles], [Polygon][pg-bottles], [TheGamer][tg-bottles] |
| Bombchu Bowling | Random rotating prizes | **Fixed order**: 10 Bombchus, then the bag upgrade, then a Piece of Heart, then Red Rupees. 10 rupees a game | `hp-9`, `up-9`, `chal-3` | [Zelda Dungeon Wiki][zd-bowling], [Game8][g8-bowling], [ZeldaCentral][zc-bowling], [Game8: bomb bags][g8-bombbag] |
| Biggest Bomb Bag | Bowling or adult rolling Goron | Rolling child Goron and the second bowling win; either order. The adult rolling Goron gives the Goron Tunic | `up-8`, `up-9` (was wrongly the adult Goron) | [Game8: bomb bags][g8-bombbag], [ZeldaCentral][zc-bowling] |
| Horseback Archery | 1,000 for the heart, 1,500 for the quiver | **750** for the heart, **1,400** for the Biggest Quiver, 50 rupees for 1,400 again; 30 rupees a run | `hp-32`, `up-12`, `chal-4` | [Game8: archery][g8-archery], [Power Up Gaming][pug-archery], [Polygon: quivers][pg-quiver] |
| Great Fairies | Free; Din's Fire at the castle, Spin Attack with the magic meter | Each asks an offering: 25, 50, 100, 200, 300, 500 (1,175 total). Death Mountain gives the magic meter **and Din's Fire**; Hyrule Castle gives the improved Spin Attack. Gifts renamed: Gift of Improved Spin, of Doubled Magic, of Halved Damage | `gf-1`…`gf-6` (gifts were swapped) | [ZeldaCentral][zc-fairies], [Game8][g8-fairies], [Nintendo Life][nl-fairies], [Zelda Xtreme][zx-fairies] |
| Farore's Wind | Warps to the room entrance | Warps to the exact spot you marked | `gf-3` | [Zelda Xtreme][zx-fairies] |
| Gerudo Training Ground | 10 rupees, gate inside the fortress, Silver Rupees | Renamed **Gerudo Proving Grounds**; 30 rupees; gate on the path between the fortress and the archery range; silver gems replace Silver Rupees | `training` section, `gtg-1`, `gtg-2`, `chal-13`, `gs-91` | [Zelda Wiki][zw-gpg], [Polygon][pg-gpg], [ootremake.wiki][orw-gpg] |
| Gerudo Membership Card | Gerudo Membership Card | **Gerudo Pass** | `story-16`, `gtg-1` | [Zelda Wiki: Gerudo Pass][zw-pass], [Game8: archery][g8-archery] |
| Lens of Truth | Lens of Truth | **Lenses of Truth** | `story-14` and mentions | [Zelda Wiki: Lenses of Truth][zw-lenses], [Nintendo Life][nl-fairies] |
| Trading sequence | Odd Potion, World's Finest Eye Drops, Claim Check, Biggoron's Sword | **Odd Poultice, Specialty Eye Drops, Biggoron Receipt, Biggoron Sword** | `trade-4`, `trade-9`…`trade-11` | Zelda Wiki: [Odd Poultice][zw-poultice], [Eye Drops][zw-drops], [Receipt][zw-receipt] |
| Trading timers | Mushroom 3 min, frog 3 min, drops 4 min | Mushroom **4 min**, frog **2.5 min**, drops **3.5 min** | `trade-3`, `trade-8`, `trade-9` | Zelda Wiki: [Odd Mushroom][zw-mushroom], [Eyeball Frog][zw-frog], [Receipt][zw-receipt] |
| Running Man | Fills your wallet for the Bunny Hood | Pays a Gold Rupee (200) | `mask-4` | [Zelda Wiki: Bunny Hood][zw-bunny] |
| Wallets | Child's 99, Adult's 200, Giant's 500 | Kokiri Wallet 200, Adult's 500, Giant's 1,000 | `skr-1`, `skr-3` | Zelda Wiki: [Kokiri Wallet][zw-kwallet], [Adult's Wallet][zw-awallet], [Giant's Wallet][zw-gwallet] (in-game Collection text) |
| Hall of Fallen Foes | — | New: sleep in a glowing green bed to rematch bosses | `egg-15` | [Zelda Wiki promo screenshots][zw-files] |

## Corrections that aren't remake changes

These were simply wrong in v1.1.0 and are wrong in the original too.

- **Biggoron Sword trading order** (`trade-6`…`trade-10`): the Poacher's Saw goes to the head carpenter in Gerudo Valley for the Broken Goron's Sword; Biggoron writes the Prescription; King Zora gives the Eyeball Frog; the lab scientist makes the drops. The old text had the steps swapped. Source: [Zelda Wiki: Trading Quest][zw-trade].
- **Hylian Shield** (`gear-3`): it's in a grave you open as a child in the Kakariko Graveyard, not the Royal Family's Tomb.
- **Fishing** (`hp-14`, `up-14`): over 50 cm as a child; the Golden Scale needs over 60 cm as an adult.

## Unverified

Kept as the original or as the earlier guide had it, pending a second source:

- Lost Woods target: the remake may ask for 5 center hits for the Biggest Bullet Bag (one guide). The catalog says so but flags it as the remake's rule.
- Proving Grounds re-entry after a full clear: Zelda Wiki and ootremake.wiki say it becomes free; Polygon and VGC say you pay each time. The catalog doesn't claim either.
- The 100-token reward being repeatable every visit.
- Dampé's race second prize under 1:00.
- Gold Skulltula placements follow [RPG Site's remake guide][rpg-gs]; Pieces of Heart follow [RPG Site][rpg-hp] and [GamingRoute][gr-hp].
- Game8's minigame overview still lists 1,000 for the archery heart; its dedicated archery page, Power Up Gaming and the in-game text say 750, which the catalog uses.

[nl-bottles]: https://www.nintendolife.com/guides/zelda-ocarina-of-time-bottle-locations-switch-2
[pg-bottles]: https://www.polygon.com/zelda-ocarina-of-time-remake-oot-bottle-locations/
[vgc-bottles]: https://www.videogameschronicle.com/guide/zelda-oot-remake-all-empty-bottle-locations/
[tg-bottles]: https://www.thegamer.com/the-legend-of-zelda-ocarina-of-time-all-bottle-locations-where-to-find-guide/
[zw-potion]: https://zeldawiki.wiki/wiki/Potion_Shop
[zd-bowling]: https://www.zeldadungeon.net/wiki/Bombchu_Bowling_Alley
[g8-bowling]: https://game8.co/games/Zelda-Ocarina-of-Time/archives/638299
[zc-bowling]: https://zeldacentral.com/games/ocarina-of-time-remake/walkthrough/bombchu-bowling-and-spin-attack/
[g8-bombbag]: https://game8.co/games/Zelda-Ocarina-of-Time/archives/637772
[g8-archery]: https://game8.co/games/Zelda-Ocarina-of-Time/archives/638349
[pug-archery]: https://powerupgaming.co.uk/2026/11/15/ocarina-of-time-remake-how-to-unlock-epona-and-complete-the-horseback-challenges/
[pg-quiver]: https://www.polygon.com/zelda-ocarina-of-time-remake-oot-quiver-upgrade-locations-how-to-unlock/
[zc-fairies]: https://zeldacentral.com/games/ocarina-of-time-remake/great-fairy-fountains/
[g8-fairies]: https://game8.co/games/Zelda-Ocarina-of-Time/archives/637805
[nl-fairies]: https://www.nintendolife.com/guides/zelda-ocarina-of-time-great-fairy-fountain-locations-all-switch-2
[zx-fairies]: https://www.zeldaxtreme.com/ocarina-of-time-remake/great-fairies/
[zw-kwallet]: https://zeldawiki.wiki/wiki/Kokiri_Wallet
[zw-awallet]: https://zeldawiki.wiki/wiki/Adult%27s_Wallet
[zw-gwallet]: https://zeldawiki.wiki/wiki/Giant%27s_Wallet
[zw-gpg]: https://zeldawiki.wiki/wiki/Gerudo_Proving_Grounds
[pg-gpg]: https://www.polygon.com/zelda-ocarina-of-time-remake-oot-gerudo-proving-grounds-walkthrough/
[orw-gpg]: https://ootremake.wiki/walkthrough/gerudo-proving-grounds
[zw-pass]: https://zeldawiki.wiki/wiki/Gerudo_Pass
[zw-lenses]: https://zeldawiki.wiki/wiki/Lenses_of_Truth
[zw-poultice]: https://zeldawiki.wiki/wiki/Odd_Poultice
[zw-drops]: https://zeldawiki.wiki/wiki/Specialty_Eye_Drops
[zw-receipt]: https://zeldawiki.wiki/wiki/Biggoron_Receipt
[zw-mushroom]: https://zeldawiki.wiki/wiki/Odd_Mushroom
[zw-frog]: https://zeldawiki.wiki/wiki/Eyeball_Frog
[zw-bunny]: https://zeldawiki.wiki/wiki/Bunny_Hood
[zw-trade]: https://zeldawiki.wiki/wiki/Trading_Quest
[zw-files]: https://zeldawiki.wiki/wiki/Category:Ocarina_of_Time_(Nintendo_Switch_2)_Files
[rpg-gs]: https://www.rpgsite.net/guide/21634-the-legend-zelda-ocarina-time-remake-gold-skulltula-locations-guide-all-100-token-locations
[rpg-hp]: https://www.rpgsite.net/guide/21635-the-legend-zelda-ocarina-time-remake-heart-piece-locations-guide
[gr-hp]: https://gamingroute.com/ocarina-of-time-heart-pieces/
