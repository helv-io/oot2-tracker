// Shareable progress: a compact, read-only snapshot of which items are
// done, small enough for a link (#p=...). Ids look like "<prefix>-<n>";
// each prefix gets a length byte and a bitset, so items appended to the
// catalog later never shift older links.

const PREFIXES = [
  "story", "gs", "hp", "skr", "soil", "bot", "song", "up", "gf",
  "mask", "trade", "gtg", "merch", "gear", "side", "chal", "egg",
] as const;

const ID_RE = /^([a-z]+)-(\d+)$/;

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) return null;
  try {
    const bin = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

/** Encode done ids. `all` is every id in the catalog (sets each bitset's length). */
export function encodeProgress(done: Iterable<string>, all: Iterable<string>): string {
  const max = new Map<string, number>();
  for (const id of all) {
    const m = ID_RE.exec(id);
    if (m) max.set(m[1], Math.max(max.get(m[1]) ?? 0, Number(m[2])));
  }
  const doneSet = new Set(done);
  const out: number[] = [1]; // format version
  for (const prefix of PREFIXES) {
    const n = Math.min(255, max.get(prefix) ?? 0);
    out.push(n);
    const bytes = new Array<number>(Math.ceil(n / 8)).fill(0);
    for (let i = 1; i <= n; i++) if (doneSet.has(`${prefix}-${i}`)) bytes[(i - 1) >> 3] |= 1 << ((i - 1) & 7);
    out.push(...bytes);
  }
  return toBase64Url(Uint8Array.from(out));
}

/** Decode a share code into ids, keeping only ids that still exist. Null if malformed. */
export function decodeProgress(code: string, known: ReadonlySet<string>): Set<string> | null {
  const bytes = fromBase64Url(code);
  if (!bytes || bytes.length < 1 || bytes[0] !== 1) return null;
  const done = new Set<string>();
  let at = 1;
  for (const prefix of PREFIXES) {
    if (at >= bytes.length) break;
    const n = bytes[at++];
    const len = Math.ceil(n / 8);
    if (at + len > bytes.length) return null;
    for (let i = 1; i <= n; i++) {
      if (bytes[at + ((i - 1) >> 3)] & (1 << ((i - 1) & 7))) {
        const id = `${prefix}-${i}`;
        if (known.has(id)) done.add(id);
      }
    }
    at += len;
  }
  return done;
}
