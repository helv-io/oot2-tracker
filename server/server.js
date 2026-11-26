// oot2-tracker server: static client + Google OAuth + per-user checklist
// progress in SQLite. Plain Node (>=22) with the built-in node:sqlite —
// no runtime dependencies.
//
// Environment:
//   PORT               listen port (default 8080)
//   DB_PATH            SQLite file (default /data/oot.sqlite)
//   PUBLIC_URL         public origin (default https://oot.helv.io) — the
//                      OAuth redirect URI is PUBLIC_URL + /auth/google/callback
//   GOOGLE_CLIENT_ID   OAuth client id (login disabled when unset)
//   GOOGLE_CLIENT_SECRET OAuth client secret (login disabled when unset)

import { createServer } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.PORT || 8080);
const DB_PATH = process.env.DB_PATH || "/data/oot.sqlite";
const PUBLIC_URL = (process.env.PUBLIC_URL || "https://oot.helv.io").replace(/\/$/, "");
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const GOOGLE_CONFIGURED = Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
const REDIRECT_URI = `${PUBLIC_URL}/auth/google/callback`;
const SESSION_COOKIE = "oot_session";
const STATE_COOKIE = "oot_oauth_state";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const DIST_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");

// ---------------------------------------------------------------- db ----
mkdirSync(dirname(DB_PATH), { recursive: true });
const db = new DatabaseSync(DB_PATH);
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,            -- Google subject id
    email TEXT NOT NULL,
    name TEXT,
    picture TEXT,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS checks (
    user_id TEXT NOT NULL REFERENCES users(id),
    item_key TEXT NOT NULL,
    checked_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, item_key)
  );
`);

// ------------------------------------------------------------ helpers ----
function parseCookies(req) {
  const out = {};
  const header = req.headers.cookie;
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

function cookieHeader(name, value, maxAgeSec) {
  const attrs = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
  ];
  if (maxAgeSec !== undefined) attrs.push(`Max-Age=${maxAgeSec}`);
  return attrs.join("; ");
}

function currentUser(req) {
  const sid = parseCookies(req)[SESSION_COOKIE];
  if (!sid) return null;
  const row = db
    .prepare(
      `SELECT u.id, u.email, u.name, u.picture, s.expires_at
         FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.id = ?`,
    )
    .get(sid);
  if (!row) return null;
  if (row.expires_at < Date.now()) {
    db.prepare("DELETE FROM sessions WHERE id = ?").run(sid);
    return null;
  }
  return row;
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(body);
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 256 * 1024) throw new Error("body too large");
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function validItemKey(v) {
  return typeof v === "string" && v.length >= 1 && v.length <= 120;
}

// --------------------------------------------------------------- auth ----
function handleGoogleStart(req, res) {
  if (!GOOGLE_CONFIGURED) {
    res.writeHead(302, { Location: "/?login=unavailable" });
    res.end();
    return;
  }
  const state = randomBytes(24).toString("hex");
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });
  res.writeHead(302, {
    "Set-Cookie": cookieHeader(STATE_COOKIE, state, 600),
    Location: `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
  });
  res.end();
}

async function handleGoogleCallback(req, res, url) {
  const fail = (reason) => {
    res.writeHead(302, { Location: `/?login=failed&reason=${encodeURIComponent(reason)}` });
    res.end();
  };
  if (!GOOGLE_CONFIGURED) return fail("unavailable");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = parseCookies(req)[STATE_COOKIE];
  if (!code || !state || !expectedState || state !== expectedState) return fail("state");

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) return fail("token");
    const tokens = await tokenRes.json();

    const infoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!infoRes.ok) return fail("userinfo");
    const info = await infoRes.json();
    if (!info.sub || !info.email || info.email_verified === false) return fail("profile");

    const now = Date.now();
    db.prepare(
      `INSERT INTO users (id, email, name, picture, created_at) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET email = excluded.email, name = excluded.name, picture = excluded.picture`,
    ).run(info.sub, info.email, info.name ?? null, info.picture ?? null, now);

    const sid = randomBytes(32).toString("hex");
    db.prepare("INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)").run(
      sid,
      info.sub,
      now,
      now + SESSION_TTL_MS,
    );
    res.writeHead(302, {
      "Set-Cookie": [
        cookieHeader(SESSION_COOKIE, sid, Math.floor(SESSION_TTL_MS / 1000)),
        cookieHeader(STATE_COOKIE, "", 0),
      ],
      Location: "/",
    });
    res.end();
  } catch {
    return fail("exception");
  }
}

function handleLogout(req, res) {
  const sid = parseCookies(req)[SESSION_COOKIE];
  if (sid) db.prepare("DELETE FROM sessions WHERE id = ?").run(sid);
  res.writeHead(302, {
    "Set-Cookie": cookieHeader(SESSION_COOKIE, "", 0),
    Location: "/",
  });
  res.end();
}

// ---------------------------------------------------------------- api ----
async function handleApi(req, res, url) {
  if (url.pathname === "/api/auth/me") {
    const user = currentUser(req);
    return sendJson(res, 200, {
      googleConfigured: GOOGLE_CONFIGURED,
      user: user ? { email: user.email, name: user.name, picture: user.picture } : null,
    });
  }

  const user = currentUser(req);
  if (!user) return sendJson(res, 401, { error: "unauthorized" });

  if (req.method === "GET" && url.pathname === "/api/checks") {
    const rows = db.prepare("SELECT item_key FROM checks WHERE user_id = ?").all(user.id);
    return sendJson(res, 200, { checked: rows.map((r) => r.item_key) });
  }

  if (req.method === "POST" && url.pathname === "/api/checks/set") {
    const body = await readJsonBody(req);
    if (!validItemKey(body.itemKey) || typeof body.checked !== "boolean") {
      return sendJson(res, 400, { error: "bad request" });
    }
    if (body.checked) {
      db.prepare(
        "INSERT INTO checks (user_id, item_key, checked_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING",
      ).run(user.id, body.itemKey, Date.now());
    } else {
      db.prepare("DELETE FROM checks WHERE user_id = ? AND item_key = ?").run(user.id, body.itemKey);
    }
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === "POST" && url.pathname === "/api/checks/replace") {
    const body = await readJsonBody(req);
    if (!Array.isArray(body.itemKeys) || body.itemKeys.length > 1000 || !body.itemKeys.every(validItemKey)) {
      return sendJson(res, 400, { error: "bad request" });
    }
    const unique = [...new Set(body.itemKeys)];
    const now = Date.now();
    db.exec("BEGIN");
    try {
      db.prepare("DELETE FROM checks WHERE user_id = ?").run(user.id);
      const insert = db.prepare(
        "INSERT INTO checks (user_id, item_key, checked_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING",
      );
      for (const key of unique) insert.run(user.id, key, now);
      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === "POST" && url.pathname === "/api/checks/reset") {
    db.prepare("DELETE FROM checks WHERE user_id = ?").run(user.id);
    return sendJson(res, 200, { ok: true });
  }

  return sendJson(res, 404, { error: "not found" });
}

// ------------------------------------------------------------ privacy ---
const PRIVACY_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Privacy Policy — OoT 100% Tracker</title>
    <style>
      body { font-family: Georgia, 'Times New Roman', serif; background: #e9dcbc; color: #2a1e10;
             margin: 0; padding: 2rem 1.25rem 3rem; line-height: 1.55; }
      main { max-width: 44rem; margin: 0 auto; background: #f5ecd4; border: 1.5px solid #c3ab72;
             border-radius: 10px; padding: 1.5rem 1.75rem; }
      h1 { font-size: 1.6rem; margin-top: 0; }
      h2 { font-size: 1.15rem; margin-top: 1.6rem; }
      a { color: #8a6d1f; }
    </style>
  </head>
  <body>
    <main>
      <h1>Privacy Policy — OoT 100% Tracker</h1>
      <p><em>Last updated: November 26, 2026</em></p>
      <p>
        OoT 100% Tracker (https://oot.helv.io) is a fan-made checklist for
        <em>The Legend of Zelda: Ocarina of Time</em>. It is not affiliated
        with Nintendo. This page says exactly what the app stores — no more,
        no less.
      </p>
      <h2>What we store</h2>
      <p>
        <strong>If you only browse:</strong> your checklist progress is kept
        in your own browser's local storage, on your device. Nothing about
        your progress leaves your device.
      </p>
      <p>
        <strong>If you sign in with Google:</strong> we store your Google
        account ID, your email address, and the name and profile-picture URL
        Google provides, together with your checklist progress (which of the
        272 deeds you have ticked). This is stored in the app's own database
        so your progress can follow you between devices. A session cookie is
        used to keep you signed in; it contains only a random session
        identifier.
      </p>
      <h2>What we do not collect</h2>
      <p>
        We do not run analytics or advertising, we do not track you across
        other sites, and we never sell or share your information with third
        parties. The app asks Google only for your basic identity (name,
        email, profile picture) — it cannot read your email, files, or any
        other Google data.
      </p>
      <h2>Deleting your data</h2>
      <p>
        Signing out ends your session on that device. Using the checklist's
        "Start over" control while signed in erases your stored progress.
        To have your account record removed entirely, contact the site
        operator at the address on the operator's homepage and it will be
        deleted.
      </p>
      <p><a href="/">← Back to the checklist</a></p>
    </main>
  </body>
</html>
`;

function handlePrivacy(req, res) {
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "public, max-age=3600",
  });
  res.end(PRIVACY_HTML);
}

// ------------------------------------------------------------- static ----
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

async function handleStatic(req, res, url) {
  let path = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
  if (path === "/" || path === "\\") path = "/index.html";
  let file = join(DIST_DIR, path);
  if (!existsSync(file)) file = join(DIST_DIR, "index.html"); // SPA fallback
  try {
    const data = await readFile(file);
    res.writeHead(200, {
      "Content-Type": MIME[extname(file)] || "application/octet-stream",
      // Everything revalidates: the bundle URL is unversioned apart from a
      // query tag in index.html, and a long max-age here stranded clients
      // on a stale (broken) bundle after the 2026-11-26 fix deploy.
      "Cache-Control": "no-cache",
    });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("not found");
  }
}

// -------------------------------------------------------------- main -----
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", PUBLIC_URL);
    if (url.pathname === "/healthz") return sendJson(res, 200, { ok: true });
    if (url.pathname === "/privacy") return handlePrivacy(req, res);
    if (url.pathname === "/auth/google") return handleGoogleStart(req, res);
    if (url.pathname === "/auth/google/callback") return await handleGoogleCallback(req, res, url);
    if (url.pathname === "/auth/logout") return handleLogout(req, res);
    if (url.pathname.startsWith("/api/")) return await handleApi(req, res, url);
    return await handleStatic(req, res, url);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) sendJson(res, 500, { error: "internal" });
    else res.end();
  }
});

server.listen(PORT, () => {
  console.log(
    `oot2-tracker listening on :${PORT} (db ${DB_PATH}, google login ${GOOGLE_CONFIGURED ? "on" : "off"})`,
  );
});
