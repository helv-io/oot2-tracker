// Regenerates the README screenshots in docs/screenshots/ from a running site.
//
//   npm i --no-save playwright && npx playwright install chromium
//   node scripts/screenshots.mjs                    # live site
//   SITE=http://localhost:8080 node scripts/screenshots.mjs
//
// Progress is seeded so every run shows the same state.
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const SITE = (process.env.SITE || "https://oot.helv.io").replace(/\/$/, "");
const OUT = new URL("../docs/screenshots/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const range = (prefix, n) => Array.from({ length: n }, (_, i) => `${prefix}-${i + 1}`);
const SEED = [
  ...range("story", 9), ...range("gs", 26), ...range("hp", 13), ...range("bot", 3),
  ...range("up", 6), ...range("mask", 3), ...range("song", 6), ...range("gf", 2),
];

const VIEWPORTS = {
  desktop: { viewport: { width: 1280, height: 860 }, deviceScaleFactor: 1.5 },
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};

const browser = await chromium.launch();
const shot = (page, name) => page.screenshot({ path: `${OUT}${name}.jpg`, type: "jpeg", quality: 86 });

async function open(kind, theme) {
  const ctx = await browser.newContext({ ...VIEWPORTS[kind], colorScheme: theme, reducedMotion: "reduce" });
  await ctx.addInitScript(([seed, theme]) => {
    if (sessionStorage.getItem("seeded")) return;
    sessionStorage.setItem("seeded", "1");
    localStorage.setItem("oot-100-checklist:device-checks:v1", JSON.stringify(seed));
    localStorage.setItem("oot-100-checklist:prefs:v1", JSON.stringify({ theme }));
  }, [SEED, theme]);
  const page = await ctx.newPage();
  await page.goto(`${SITE}/`, { waitUntil: "networkidle" });
  await page.waitForSelector("#grp-story");
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  return { ctx, page };
}

for (const theme of ["dark", "light"]) {
  for (const kind of ["desktop", "mobile"]) {
    const { ctx, page } = await open(kind, theme);
    await shot(page, `${kind}-${theme}`);
    if (kind === "mobile" && theme === "dark") {
      await page.locator("#grp-story").scrollIntoViewIfNeeded();
      await page.evaluate(() => window.scrollBy(0, -140));
      await page.waitForTimeout(300);
      await shot(page, "mobile-checklist");
      await page.getByRole("button", { name: "Places", exact: true }).click();
      await page.waitForTimeout(400);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.locator("main").scrollIntoViewIfNeeded();
      await page.evaluate(() => window.scrollBy(0, -140));
      await page.waitForTimeout(300);
      await shot(page, "mobile-places");
    }
    await ctx.close();
  }
}
await browser.close();
console.log(`screenshots written to ${OUT}`);
