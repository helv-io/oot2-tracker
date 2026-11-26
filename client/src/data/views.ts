// Alternative perspectives on the same catalog. The checklist's deeds
// are stored once (in catalog.ts) and checked off by item id; these
// builders simply regroup the very same items by the place they happen
// and by the era of Link who does them, so a stone or medallion shows
// up on the journey, in its home town, and in its era's list alike.

import { ALL_ITEMS, SECTIONS, type CatalogItem } from "./catalog";
import { ERA_LOOK, ITEM_ICONS, SECTION_LOOK, placeOf, type Tone } from "./look";

export interface ViewGroup {
  key: string;
  title: string;
  /** Official icon name (see look.ts). */
  icon: string;
  tone: Tone;
  blurb?: string;
  items: CatalogItem[];
}

/** Each item's own icon, falling back to its journey section's emblem. */
export const ITEM_ICON: ReadonlyMap<string, string> = new Map(
  SECTIONS.flatMap((sec) =>
    sec.items.map((item) => [item.id, ITEM_ICONS[item.id] ?? SECTION_LOOK[sec.id]?.icon ?? "triforce"] as const),
  ),
);

/** The original perspective: the catalog's own sections, in order. */
export function journeyGroups(): ViewGroup[] {
  return SECTIONS.map((sec) => ({
    key: sec.id,
    title: sec.title,
    icon: SECTION_LOOK[sec.id]?.icon ?? "triforce",
    tone: SECTION_LOOK[sec.id]?.tone ?? "light",
    blurb: sec.blurb,
    items: sec.items,
  }));
}

/**
 * Every deed grouped under the place it happens, in the order those
 * places first appear along the journey, so clearing out one town or
 * dungeon in a single visit is easy to plan.
 */
export function locationGroups(): ViewGroup[] {
  const order: string[] = [];
  const byArea = new Map<string, CatalogItem[]>();
  for (const item of ALL_ITEMS) {
    const area = item.area ?? "Across Hyrule";
    let list = byArea.get(area);
    if (!list) {
      list = [];
      byArea.set(area, list);
      order.push(area);
    }
    list.push(item);
  }
  return order.map((area, i) => ({
    key: `loc-${i}`,
    title: area,
    icon: placeOf(area).icon,
    tone: placeOf(area).tone,
    items: byArea.get(area) ?? [],
  }));
}

/** Every deed grouped by which Link can do it: child, adult, or either. */
export function eraGroups(): ViewGroup[] {
  const buckets: Record<"child" | "adult" | "either", CatalogItem[]> = {
    child: [],
    adult: [],
    either: [],
  };
  for (const item of ALL_ITEMS) {
    if (item.age === "Child") buckets.child.push(item);
    else if (item.age === "Adult") buckets.adult.push(item);
    else buckets.either.push(item);
  }
  return [
    {
      key: "era-child",
      ...ERA_LOOK["era-child"],
      title: "Child Link",
      blurb:
        "Everything young Link can do before the Master Sword sleeps him for seven years. The three Spiritual Stones live here, alongside every bean planted and every soft-soil patch tended.",
      items: buckets.child,
    },
    {
      key: "era-adult",
      ...ERA_LOOK["era-adult"],
      title: "Adult Link",
      blurb:
        "Seven years later: the five Medallions, the great temples, Epona, and every deed that needs a grown hero's reach.",
      items: buckets.adult,
    },
    {
      key: "era-either",
      ...ERA_LOOK["era-either"],
      title: "Either Era",
      blurb:
        "Deeds that belong to both eras, or span them, like a bean planted by a child and ridden by the man he becomes.",
      items: buckets.either,
    },
  ];
}
