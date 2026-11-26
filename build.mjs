// Production build: bundle the React client with esbuild and compile the
// Tailwind v4 stylesheet with the Tailwind CLI. Output goes to dist/,
// which server/server.js serves.

import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { mkdirSync, copyFileSync } from "node:fs";

mkdirSync("dist/assets", { recursive: true });

await build({
  entryPoints: ["client/src/main.tsx"],
  bundle: true,
  format: "esm",
  target: "es2022",
  minify: true,
  sourcemap: false,
  outfile: "dist/assets/main.js",
  logLevel: "info",
  // theme.css is compiled by the Tailwind CLI below, not by esbuild.
  loader: { ".css": "empty" },
});

execFileSync(
  "npx",
  [
    "tailwindcss",
    "-i",
    "client/src/theme.css",
    "-o",
    "dist/assets/main.css",
    "--minify",
  ],
  { stdio: "inherit" },
);

copyFileSync("client/index.html", "dist/index.html");
console.log("client built -> dist/");
