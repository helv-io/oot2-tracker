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
  // The sources use JSX without importing React, so the automatic runtime
  // is required — esbuild's default classic transform emits bare
  // React.createElement calls that throw "React is not defined" in the
  // browser and leave the page blank.
  jsx: "automatic",
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
