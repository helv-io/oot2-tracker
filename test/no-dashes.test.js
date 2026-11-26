// Fails if an em dash (U+2014) or en dash (U+2013) appears in source,
// data or docs. Use a colon, a comma, a period, parentheses, or a
// middle dot in titles instead. See AGENT.md.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const EM = "\u2014";
const EN = "\u2013";
const SKIP_DIRS = new Set(["node_modules", "dist", ".git", ".git.nested"]);
const TEXT_EXT = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".cjs",
  ".css",
  ".html",
  ".md",
  ".yml",
  ".yaml",
  ".json",
  ".py",
  ".svg",
  ".webmanifest",
  ".txt",
  ".gitignore",
]);
const TEXT_NAMES = new Set(["Dockerfile", "LICENSE", "Makefile", ".gitignore"]);

function isText(name) {
  return TEXT_EXT.has(extname(name)) || TEXT_NAMES.has(name);
}

function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) walk(path, out);
    else if (isText(name)) out.push(path);
  }
}

test("no em dashes or en dashes in source, data or docs", () => {
  const files = [];
  walk(ROOT, files);
  assert.ok(files.length > 20, "should scan a real tree");
  const hits = [];
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    const lines = text.split(/\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes(EM) || line.includes(EN)) {
        const which = line.includes(EM) ? "em dash" : "en dash";
        hits.push(`${relative(ROOT, file)}:${i + 1}: ${which}`);
      }
    }
  }
  assert.equal(hits.length, 0, `forbidden dashes found:\n${hits.join("\n")}`);
});
