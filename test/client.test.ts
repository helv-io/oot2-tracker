import { test } from "node:test";
import assert from "node:assert/strict";
import { WriteQueue, toPatch, type Patch } from "../client/src/lib/sync.ts";
import { reconcile } from "../client/src/lib/reconcile.ts";
import { SECTIONS, ALL_ITEMS, TOTAL_ITEMS } from "../client/src/data/catalog.ts";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { buildChecklistPdf, type PdfAssets } from "../client/src/pdf.ts";
import { TONE_COLOR } from "../client/src/data/look.ts";

function pdfAssets(): PdfAssets {
  const fonts = fileURLToPath(new URL("../client/assets/fonts/pdf/", import.meta.url));
  const iconsDir = fileURLToPath(new URL("../client/assets/pdf/icons/", import.meta.url));
  const icons: Record<string, Uint8Array> = {};
  for (const file of readdirSync(iconsDir)) {
    if (file.endsWith(".jpg")) icons[file.replace(/\.jpg$/, "")] = new Uint8Array(readFileSync(join(iconsDir, file)));
  }
  return {
    marcellus: new Uint8Array(readFileSync(join(fonts, "MarcellusSC-Regular.ttf"))),
    inter: new Uint8Array(readFileSync(join(fonts, "Inter-Regular.ttf"))),
    icons,
  };
}


const tick = (ms = 5) => new Promise((r) => setTimeout(r, ms));

test("coalesces rapid ticks into one batch, last state wins", async () => {
  const sent: Patch[] = [];
  const q = new WriteQueue(async (p) => void sent.push(p), { debounceMs: 1 });
  q.enqueue("a", true);
  q.enqueue("b", true);
  q.enqueue("a", false);
  await tick(20);
  assert.deepEqual(sent, [{ add: ["b"], remove: ["a"] }]);
  assert.equal(q.idle, true);
});

test("keeps batches in order and never overlaps them", async () => {
  let inFlight = 0;
  let maxInFlight = 0;
  const sent: Patch[] = [];
  const q = new WriteQueue(
    async (p) => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await tick(10);
      sent.push(p);
      inFlight--;
    },
    { debounceMs: 1 },
  );
  q.enqueue("a", true);
  await tick(3);
  q.enqueue("a", false); // queued while the first batch is in flight
  await tick(60);
  assert.equal(maxInFlight, 1);
  assert.deepEqual(sent, [
    { add: ["a"], remove: [] },
    { add: [], remove: ["a"] },
  ]);
});

test("retries failed batches, and newer ticks override them", async () => {
  let fail = true;
  const sent: Patch[] = [];
  const statuses: string[] = [];
  const q = new WriteQueue(
    async (p) => {
      if (fail) throw new Error("offline");
      sent.push(p);
    },
    { debounceMs: 1, minRetryMs: 5, onStatus: (s) => statuses.push(s) },
  );
  q.enqueue("a", true);
  q.enqueue("b", true);
  await tick(3);
  q.enqueue("a", false);
  fail = false;
  await tick(40);
  assert.deepEqual(sent, [{ add: ["b"], remove: ["a"] }]);
  assert.ok(statuses.includes("error"));
  assert.equal(statuses.at(-1), "idle");
});

test("onError can drop writes instead of retrying", async () => {
  let calls = 0;
  const q = new WriteQueue(
    async () => {
      calls++;
      throw new Error("401");
    },
    { debounceMs: 1, minRetryMs: 1, onError: () => false },
  );
  q.enqueue("a", true);
  await tick(20);
  assert.equal(calls, 1);
  assert.equal(q.idle, true);
});

test("toPatch splits adds and removes", () => {
  assert.deepEqual(toPatch(new Map([["x", true], ["y", false]])), { add: ["x"], remove: ["y"] });
});

test("reconcile decides who wins", () => {
  const s = (...a: string[]) => new Set(a);
  assert.equal(reconcile(s("a"), s("a")), "same");
  assert.equal(reconcile(s(), s("a")), "pull");
  assert.equal(reconcile(s("a"), s()), "push");
  assert.equal(reconcile(s("a"), s("b")), "conflict");
});

test("catalog is complete and well formed", () => {
  assert.equal(TOTAL_ITEMS, 274);
  const ids = ALL_ITEMS.map((i) => i.id);
  assert.equal(new Set(ids).size, ids.length, "ids are unique");
  for (const id of ids) assert.match(id, /^[a-z0-9][a-z0-9-]{0,63}$/, `server accepts ${id}`);
  const count = (id: string) => SECTIONS.find((s) => s.id === id)?.items.length;
  assert.equal(count("skulltulas"), 100);
  assert.equal(count("hearts"), 36);
  // The Switch 2 remake adds a fifth bottle (the Potion Shop bug).
  assert.equal(count("bottles"), 5);
  assert.equal(count("fairies"), 6);
  for (const item of ALL_ITEMS) assert.ok(item.name && item.detail, item.id);
});

test("share codes round-trip and survive catalog growth", async () => {
  const { encodeProgress, decodeProgress } = await import("../client/src/lib/share.ts");
  const all = ALL_ITEMS.map((i) => i.id);
  const known = new Set(all);
  const done = new Set(all.filter((_, i) => i % 3 === 0));
  const code = encodeProgress(done, all);
  assert.match(code, /^[A-Za-z0-9_-]+$/);
  assert.ok(code.length < 120, `short enough for a link (${code.length})`);
  assert.deepEqual(decodeProgress(code, known), done);
  // An older catalog (fewer items) still decodes against the current one.
  const older = all.filter((id) => id !== "bot-5" && id !== "egg-15");
  const oldCode = encodeProgress(["bot-4", "gs-100"], older);
  assert.deepEqual(decodeProgress(oldCode, known), new Set(["bot-4", "gs-100"]));
  assert.equal(decodeProgress("not base64!", known), null);
  assert.equal(decodeProgress("", known), null);
});

test("every item has an official icon and every area a colour", async () => {
  const { readdirSync } = await import("node:fs");
  const { ITEM_ICONS, SECTION_LOOK, PLACES, ERA_LOOK } = await import("../client/src/data/look.ts");
  const files = new Set(readdirSync(new URL("../client/assets/official/icons/", import.meta.url)).map((f) => f.replace(/\.webp$/, "")));
  for (const sec of SECTIONS) assert.ok(files.has(SECTION_LOOK[sec.id]?.icon), `section ${sec.id}`);
  for (const [id, icon] of Object.entries(ITEM_ICONS)) {
    assert.ok(ALL_ITEMS.some((i) => i.id === id), `icon for a real item: ${id}`);
    assert.ok(files.has(icon), `${id} -> ${icon}`);
  }
  for (const place of [...Object.values(PLACES), ...Object.values(ERA_LOOK)]) assert.ok(files.has(place.icon), place.icon);
  for (const item of ALL_ITEMS) assert.ok(!item.area || PLACES[item.area], `area has a colour: ${item.area}`);
});

test("the printable PDF is a valid document with a bezel on every page", async () => {
  const blob = await buildChecklistPdf(new Set(["story-1"]), pdfAssets());
  const bytes = Buffer.from(await blob.arrayBuffer());
  const text = bytes.toString("latin1");
  assert.equal(text.slice(0, 8), "%PDF-1.4");
  assert.ok(text.includes("%%EOF"));
  assert.ok(text.includes("0.68 0.54 0.22"), "gold bezel stroke");
  assert.ok(text.includes("/FontFile2"), "fonts are embedded");
  assert.ok(text.includes("/Identity-H"), "Unicode typography");
  assert.ok(!text.includes("/Helvetica"), "site fonts, not Helvetica");
  assert.ok(text.includes("00E9"), "eacute in ToUnicode (Dampé)");
  assert.ok(text.includes("00B7"), "middle dot in ToUnicode");
  assert.ok(text.includes("/Subtype /Image"), "section icons");
  const n = parseInt(TONE_COLOR.light.slice(1), 16);
  const story = [
    ((n >> 16) & 255) / 255,
    ((n >> 8) & 255) / 255,
    (n & 255) / 255,
  ].map((c) => c.toFixed(3)).join(" ");
  assert.ok(text.includes(story), "region colour on section headers");
  const pages = text.match(/\/Type \/Page /g)?.length ?? 0;
  const bezels = text.match(/q\n1 J 1 j/g)?.length ?? 0;
  assert.ok(pages >= 2);
  assert.equal(bezels, pages);
});

test("the map covers every place, once, and its regions jump to real groups", async () => {
  const { MAP_REGIONS, MAP_W, MAP_H, REGION_OF_AREA, smoothPath } = await import("../client/src/data/map.ts");
  const { mapGroups } = await import("../client/src/data/views.ts");
  const { PLACES, TONE_COLOR } = await import("../client/src/data/look.ts");
  const seen = new Map<string, string>();
  for (const r of MAP_REGIONS) {
    assert.ok(TONE_COLOR[r.tone], `${r.id} tone`);
    assert.ok(r.shapes.length >= 1 && r.shapes.every((sh) => sh.length >= 5), `${r.id} shapes`);
    assert.ok(r.shapes.flat().every(([x, y]) => x >= 0 && y >= 0 && x <= MAP_W && y <= MAP_H), `${r.id} inside map`);
    for (const sh of r.shapes) assert.match(smoothPath(sh), /^M[\d.,]+( C[\d.,\s]+)+Z$/);
    for (const a of r.areas) {
      assert.ok(PLACES[a], `${a} is a known place`);
      assert.ok(!seen.has(a), `${a} in ${seen.get(a)} and ${r.id}`);
      seen.set(a, r.id);
    }
  }
  // Every place except the catch-all "Hyrule" sits in a region.
  for (const a of Object.keys(PLACES)) if (a !== "Hyrule") assert.ok(REGION_OF_AREA.has(a), `${a} is on the map`);
  const groups = mapGroups();
  assert.equal(groups.reduce((n, g) => n + g.items.length, 0), TOTAL_ITEMS, "every item once");
  for (const r of MAP_REGIONS) assert.ok(groups.some((g) => g.key === `map-${r.id}` && g.items.length > 0), r.id);
});

test("sound mute is remembered per device", async () => {
  const { readMuted, SOUND_KEY, MUSIC_VOLUME } = await import("../client/src/lib/sound.ts");
  const store = (v: string | null) => ({ getItem: (k: string) => (k === SOUND_KEY ? v : null) });
  assert.equal(readMuted(store("muted")), true);
  assert.equal(readMuted(store("on")), false);
  assert.equal(readMuted(store(null)), false);
  assert.ok(MUSIC_VOLUME >= 0.08 && MUSIC_VOLUME <= 0.12, "faint background music");
});
