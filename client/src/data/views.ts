// Alternative perspectives on the same catalog. The checklist's deeds
// are stored once (in catalog.ts) and checked off by item id; these
// builders simply regroup the very same items — by the place they happen
// and by the era of Link who does them — so a stone or medallion shows
// up on the journey, in its home town, and in its era's list alike.

import {
  ALL_ITEMS,
  SECTIONS,
  type CatalogItem,
  type IconKind,
} from "./catalog";

export interface ViewGroup {
  key: string;
  title: string;
  icon: IconKind | "pin";
  blurb?: string;
  items: CatalogItem[];
}

/** The icon of the journey section each item belongs to. */
export const ITEM_ICON: ReadonlyMap<string, IconKind> = new Map(
  SECTIONS.flatMap((sec) =>
    sec.items.map((item) => [item.id, sec.icon] as const),
  ),
);

/** The original perspective: the catalog's own sections, in order. */
export function journeyGroups(): ViewGroup[] {
  return SECTIONS.map((sec) => ({
    key: sec.id,
    title: sec.title,
    icon: sec.icon,
    blurb: sec.blurb,
    items: sec.items,
  }));
}

/**
 * Every deed grouped under the place it happens, in the order those
 * places first appear along the journey — so clearing out one town or
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
    icon: "pin" as const,
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
      title: "Child Link",
      icon: "quest" as const,
      blurb:
        "Everything young Link can do before the Master Sword sleeps him for seven years — the three Spiritual Stones live here, alongside every bean planted and every soft-soil patch tended.",
      items: buckets.child,
    },
    {
      key: "era-adult",
      title: "Adult Link",
      icon: "quest" as const,
      blurb:
        "Seven years later: the five Medallions, the great temples, Epona, and every deed that needs a grown hero's reach.",
      items: buckets.adult,
    },
    {
      key: "era-either",
      title: "Either Era",
      icon: "quest" as const,
      blurb:
        "Deeds that belong to both eras — or span them, like a bean planted by a child and ridden by the man he becomes.",
      items: buckets.either,
    },
  ];
}
