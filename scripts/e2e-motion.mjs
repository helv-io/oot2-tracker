// Expand, collapse and scroll the checklist, including mid-animation,
// and fail if headers overlap body text or icons paint outside a card.
//
//   npm run build
//   npm run test:e2e
//   SITE=http://localhost:8080 npm run test:e2e
//
// Browsers: Chromium and WebKit (Safari). Viewports: desktop and phone.
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { chromium, webkit } from "playwright";

const OUT = "/tmp/e2e-motion";
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = {
  desktop: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};

async function freePort() {
  const s = createServer();
  await new Promise((r) => s.listen(0, r));
  const port = s.address().port;
  await new Promise((r) => s.close(r));
  return port;
}

async function startServer() {
  if (process.env.SITE) return { url: process.env.SITE.replace(/\/$/, ""), stop: async () => {} };
  const port = await freePort();
  const child = spawn("node", ["server/server.js"], {
    env: { ...process.env, PORT: String(port), DB_PATH: "/tmp/e2e-motion.sqlite", PUBLIC_URL: `http://127.0.0.1:${port}` },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const url = `http://127.0.0.1:${port}`;
  const started = Date.now();
  while (Date.now() - started < 15_000) {
    try {
      const r = await fetch(`${url}/healthz`);
      if (r.ok) return { url, stop: () => child.kill("SIGTERM") };
    } catch {}
    await new Promise((r) => setTimeout(r, 150));
  }
  child.kill();
  throw new Error("server failed to start");
}

// Layout metrics taken from the page. Ghost compositor layers may not
// appear in the DOM, so mid-animation screenshots are also saved.
function measure(selector) {
  const card = document.querySelector(selector);
  if (!card) return { error: `missing ${selector}` };
  const head = card.querySelector(".group-head");
  const blurb = card.querySelector(".group-blurb");
  const inner = card.querySelector(".group-card-inner");
  const box = (el) => {
    const r = el.getBoundingClientRect();
    return { t: r.top, b: r.bottom, l: r.left, r: r.right, w: r.width, h: r.height };
  };
  const cardBox = box(inner);
  const leaks = [];
  // Icons and carets must stay inside the card (allow a few px for shadows).
  for (const el of card.querySelectorAll("img, svg, [aria-expanded]")) {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const pad = 6;
    // Bottom overflow during collapse is the clipped layout box, not a leak.
    // The bugs were icons or carets painted above or beside the card.
    if (r.left < cardBox.l - pad || r.right > cardBox.r + pad || r.top < cardBox.t - pad) {
      leaks.push({
        tag: el.tagName,
        name: el.getAttribute("src") || el.getAttribute("aria-label") || el.className,
        top: Math.round(r.top),
        bottom: Math.round(r.bottom),
        left: Math.round(r.left),
        right: Math.round(r.right),
      });
    }
  }
  const headBox = head ? box(head) : null;
  const blurbBox = blurb && blurb.getClientRects().length ? box(blurb) : null;
  const overlap = headBox && blurbBox ? Math.max(0, headBox.b - blurbBox.t) : 0;
  const carets = card.querySelectorAll("h2 button svg, h2 button [aria-hidden]").length;
  return {
    card: cardBox,
    head: headBox,
    blurb: blurbBox,
    overlap,
    leaks,
    open: card.querySelector(".group-body")?.classList.contains("is-open") ?? false,
    carets,
  };
}

function report(label, m) {
  const problems = [];
  if (m.error) problems.push(m.error);
  if (m.overlap > 1) problems.push(`header overlaps blurb by ${m.overlap.toFixed(1)}px`);
  if (m.leaks?.length) problems.push(`${m.leaks.length} icon(s) painted outside the card: ${JSON.stringify(m.leaks)}`);
  return problems.map((p) => `${label}: ${p}`);
}

const failures = [];
const { url, stop } = await startServer();
const engines = [
  ["chromium", chromium],
  ["webkit", webkit],
];

try {
  for (const [engineName, engine] of engines) {
    const browser = await engine.launch();
    for (const [vpName, opts] of Object.entries(VIEWPORTS)) {
      const ctx = await browser.newContext({ ...opts, reducedMotion: "no-preference", colorScheme: "dark" });
      const page = await ctx.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(String(e)));
      await page.goto(url, { waitUntil: "networkidle" });
      await page.waitForSelector("#grp-story");
      const group = page.locator("#grp-skullrewards");
      await group.scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);

      const closed = await page.evaluate(measure, "#grp-skullrewards");
      failures.push(...report(`${engineName}/${vpName} closed`, closed));

      // Expand, then capture mid-animation (~100ms into a 350ms transition).
      const expand = group.locator("button[aria-expanded]").first();
      await expand.click();
      await page.waitForTimeout(100);
      const midOpen = await page.evaluate(measure, "#grp-skullrewards");
      await page.screenshot({ path: `${OUT}/${engineName}-${vpName}-mid-open.png` });
      failures.push(...report(`${engineName}/${vpName} mid-open`, midOpen));

      await page.waitForTimeout(300);
      const open = await page.evaluate(measure, "#grp-skullrewards");
      await page.screenshot({ path: `${OUT}/${engineName}-${vpName}-open.png` });
      failures.push(...report(`${engineName}/${vpName} open`, open));
      if (!open.open) failures.push(`${engineName}/${vpName}: expected the group to be open`);
      if (open.blurb && open.head && open.blurb.t < open.head.b - 1) {
        failures.push(`${engineName}/${vpName} open: blurb starts inside the header`);
      }

      // Collapse mid-animation.
      await expand.click();
      await page.waitForTimeout(100);
      const midClose = await page.evaluate(measure, "#grp-skullrewards");
      await page.screenshot({ path: `${OUT}/${engineName}-${vpName}-mid-close.png` });
      failures.push(...report(`${engineName}/${vpName} mid-close`, midClose));

      await page.waitForTimeout(300);

      // Scroll under the sticky controls with several groups in view.
      await page.locator("#grp-story").scrollIntoViewIfNeeded();
      await page.evaluate(() => window.scrollBy(0, 600));
      await page.waitForTimeout(150);
      await page.evaluate(() => window.scrollBy(0, 600));
      await page.waitForTimeout(150);
      await page.screenshot({ path: `${OUT}/${engineName}-${vpName}-scroll.png` });
      const afterScroll = await page.evaluate(measure, "#grp-story");
      failures.push(...report(`${engineName}/${vpName} after-scroll`, afterScroll));

      if (errors.length) failures.push(`${engineName}/${vpName} pageerror: ${errors.join("; ")}`);
      await ctx.close();
    }
    await browser.close();
  }
} finally {
  await stop();
}

writeFileSync(`${OUT}/report.json`, JSON.stringify({ failures }, null, 2));
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`ok  motion e2e, shots in ${OUT}`);
