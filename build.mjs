// Production build: bundle the React client with esbuild and compile the
// Tailwind v4 stylesheet with the Tailwind CLI. Output goes to dist/,
// which server/app.js serves.
//
// Bundles get content-hashed names (main-<hash>.js / .css) so the server
// can cache them forever; index.html is served no-cache and points at
// the current hashes. Text assets are precompressed (.br + .gz).

import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { brotliCompressSync, constants, gzipSync } from "node:zlib";

const DIST = "dist";
const ASSETS = join(DIST, "assets");
rmSync(DIST, { recursive: true, force: true });
mkdirSync(join(ASSETS, "fonts"), { recursive: true });
mkdirSync(join(ASSETS, "fonts", "pdf"), { recursive: true });
mkdirSync(join(ASSETS, "pdf", "icons"), { recursive: true });
mkdirSync(join(ASSETS, "textures"), { recursive: true });

const js = await build({
  entryPoints: ["client/src/main.tsx"],
  bundle: true,
  format: "esm",
  // The sources use JSX without importing React, so the automatic runtime
  // is required.
  jsx: "automatic",
  target: "es2022",
  minify: true,
  sourcemap: false,
  outdir: ASSETS,
  entryNames: "[name]-[hash]",
  metafile: true,
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "info",
  // theme.css is compiled by the Tailwind CLI below, not by esbuild.
  // Official art is emitted as hashed files and imported as URLs.
  loader: { ".css": "empty", ".webp": "file", ".avif": "file" },
  assetNames: "img/[name]-[hash]",
  publicPath: "/assets",
});
const jsFile = Object.keys(js.metafile.outputs).find((p) => p.endsWith(".js"));
const jsName = jsFile.split("/").pop();

const cssTmp = join(ASSETS, "main.css");
execFileSync("npx", ["tailwindcss", "-i", "client/src/theme.css", "-o", cssTmp, "--minify"], { stdio: "inherit" });
const cssHash = createHash("sha256").update(readFileSync(cssTmp)).digest("hex").slice(0, 10);
const cssName = `main-${cssHash}.css`;
renameSync(cssTmp, join(ASSETS, cssName));

// Self-hosted fonts (no Google Fonts request, so no third-party calls).
const FONTS = [
  ["@fontsource/marcellus-sc", "marcellus-sc-latin-400-normal.woff2"],
  ["@fontsource-variable/inter", "inter-latin-wght-normal.woff2"],
];
for (const [pkg, file] of FONTS) {
  copyFileSync(join("node_modules", pkg, "files", file), join(ASSETS, "fonts", file));
}

for (const file of readdirSync(join("client", "assets", "textures"))) {
  copyFileSync(join("client", "assets", "textures", file), join(ASSETS, "textures", file));
}

// Printable PDF fonts and section icons (fetched when the user downloads a PDF).
for (const file of readdirSync(join("client", "assets", "fonts", "pdf"))) {
  if (!/\.(ttf|txt)$/.test(file)) continue;
  copyFileSync(join("client", "assets", "fonts", "pdf", file), join(ASSETS, "fonts", "pdf", file));
}
for (const file of readdirSync(join("client", "assets", "pdf", "icons"))) {
  copyFileSync(join("client", "assets", "pdf", "icons", file), join(ASSETS, "pdf", "icons", file));
}

// Root files: app icons, link preview, manifest.
for (const file of [
  "favicon.png",
  "apple-touch-icon.png",
  "icon-192.png",
  "icon-512.png",
  "icon-maskable-512.png",
  "og-image.jpg",
  "manifest.webmanifest",
]) {
  copyFileSync(join("client", file), join(DIST, file));
}

// The pre-paint theme script gets a content hash like the bundles.
const themeJs = readFileSync("client/theme-init.js");
const themeName = `theme-${createHash("sha256").update(themeJs).digest("hex").slice(0, 10)}.js`;
writeFileSync(join(ASSETS, themeName), themeJs);

const html = readFileSync("client/index.html", "utf8")
  .replaceAll("%MAIN_JS%", `/assets/${jsName}`)
  .replaceAll("%MAIN_CSS%", `/assets/${cssName}`)
  .replaceAll("%THEME_JS%", `/assets/${themeName}`);
writeFileSync(join(DIST, "index.html"), html);

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );
}

// Service worker: precache everything under /assets so the checklist
// (icons included) works offline after the first visit.
const precache = walk(ASSETS)
  .filter((f) => !/\.(br|gz)$/.test(f) && !/key-art-1600/.test(f))
  .map((f) => "/" + f.slice(DIST.length + 1).split("\\").join("/"))
  .sort();
const version = createHash("sha256").update(precache.join("\n")).digest("hex").slice(0, 12);
writeFileSync(
  join(DIST, "sw.js"),
  readFileSync("client/sw.js", "utf8")
    .replace("%VERSION%", version)
    .replace("%PRECACHE%", JSON.stringify(["/manifest.webmanifest", ...precache])),
);

// Precompress every text asset.
for (const file of walk(DIST)) {
  if (!/\.(html|js|css|svg|webmanifest)$/.test(file)) continue;
  const data = readFileSync(file);
  writeFileSync(`${file}.gz`, gzipSync(data, { level: 9 }));
  writeFileSync(
    `${file}.br`,
    brotliCompressSync(data, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }),
  );
}
console.log(`client built -> ${DIST}/ (${jsName}, ${cssName})`);
