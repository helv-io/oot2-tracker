// oot2-tracker HTTP app: static client + Google OAuth + per-user checklist
// progress in SQLite. Plain Node (>=22.5) with the built-in node:sqlite —
// no runtime dependencies. server.js wires it to env vars and a port;
// tests build it directly with createApp().

import { DatabaseSync } from "node:sqlite";
import { randomBytes } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { mkdirSync } from "node:fs";
import { dirname, extname, join, normalize, sep } from "node:path";
import { PRIVACY_HTML } from "./privacy.js";

const SESSION_COOKIE = "oot_session";
const STATE_COOKIE = "oot_oauth_state";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_BODY_BYTES = 64 * 1024;
// The catalog has 272 deeds; leave headroom for future additions while
// keeping one account from filling the database with junk keys.
const MAX_CHECKS_PER_USER = 1000;
const ITEM_KEY_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};
const COMPRESSIBLE = new Set([".html", ".js", ".css", ".json", ".webmanifest", ".svg", ".txt"]);
// build.mjs names bundles main-<hash>.js / main-<hash>.css.
const HASHED_ASSET_RE = /-[A-Za-z0-9_]{8,}\.(js|css)$/;

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function isValidItemKey(v) {
  return typeof v === "string" && ITEM_KEY_RE.test(v);
}

export function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    const name = part.slice(0, idx).trim();
    const raw = part.slice(idx + 1).trim();
    try {
      out[name] = decodeURIComponent(raw);
    } catch {
      out[name] = raw;
    }
  }
  return out;
}

function openDb(dbPath) {
  if (dbPath !== ":memory:") mkdirSync(dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    PRAGMA foreign_keys = ON;
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
    CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
    CREATE TABLE IF NOT EXISTS checks (
      user_id TEXT NOT NULL REFERENCES users(id),
      item_key TEXT NOT NULL,
      checked_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, item_key)
    );
  `);
  return db;
}

/**
 * @param {{
 *   dbPath: string,
 *   publicUrl: string,
 *   distDir: string,
 *   googleClientId?: string,
 *   googleClientSecret?: string,
 *   fetchImpl?: typeof fetch,
 *   now?: () => number,
 *   logApi?: boolean,
 * }} opts
 */
export function createApp(opts) {
  const publicUrl = opts.publicUrl.replace(/\/$/, "");
  const publicOrigin = new URL(publicUrl).origin;
  const secureCookies = publicOrigin.startsWith("https:");
  const googleClientId = opts.googleClientId || "";
  const googleClientSecret = opts.googleClientSecret || "";
  const googleConfigured = Boolean(googleClientId && googleClientSecret);
  const redirectUri = `${publicUrl}/auth/google/callback`;
  const distDir = normalize(opts.distDir);
  const fetchImpl = opts.fetchImpl || fetch;
  const now = opts.now || Date.now;
  const db = openDb(opts.dbPath);

  const stmt = {
    session: db.prepare(
      `SELECT u.id, u.email, u.name, u.picture, s.expires_at
         FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.id = ?`,
    ),
    deleteSession: db.prepare("DELETE FROM sessions WHERE id = ?"),
    purgeSessions: db.prepare("DELETE FROM sessions WHERE expires_at < ?"),
    upsertUser: db.prepare(
      `INSERT INTO users (id, email, name, picture, created_at) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET email = excluded.email, name = excluded.name, picture = excluded.picture`,
    ),
    insertSession: db.prepare("INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)"),
    listChecks: db.prepare("SELECT item_key FROM checks WHERE user_id = ? ORDER BY item_key"),
    countChecks: db.prepare("SELECT COUNT(*) AS n FROM checks WHERE user_id = ?"),
    addCheck: db.prepare(
      "INSERT INTO checks (user_id, item_key, checked_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING",
    ),
    removeCheck: db.prepare("DELETE FROM checks WHERE user_id = ? AND item_key = ?"),
    clearChecks: db.prepare("DELETE FROM checks WHERE user_id = ?"),
    clearSessions: db.prepare("DELETE FROM sessions WHERE user_id = ?"),
    deleteUser: db.prepare("DELETE FROM users WHERE id = ?"),
    ping: db.prepare("SELECT 1 AS ok"),
  };

  function tx(fn) {
    db.exec("BEGIN IMMEDIATE");
    try {
      const out = fn();
      db.exec("COMMIT");
      return out;
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
  }

  // ---------------------------------------------------------- helpers ----
  function cookieHeader(name, value, maxAgeSec) {
    const attrs = [`${name}=${encodeURIComponent(value)}`, "Path=/", "HttpOnly", "SameSite=Lax"];
    if (secureCookies) attrs.push("Secure");
    if (maxAgeSec !== undefined) attrs.push(`Max-Age=${maxAgeSec}`);
    return attrs.join("; ");
  }

  const CSP = [
    "default-src 'self'",
    "script-src 'self'",
    // React renders style={{...}} attributes, which CSP treats as inline.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://*.googleusercontent.com",
    "font-src 'self'",
    "connect-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://accounts.google.com",
    "frame-ancestors 'none'",
  ].join("; ");

  function baseHeaders(extra) {
    const h = {
      "Content-Security-Policy": CSP,
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Cross-Origin-Opener-Policy": "same-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
      ...extra,
    };
    if (secureCookies) h["Strict-Transport-Security"] = "max-age=31536000";
    return h;
  }

  function send(res, status, headers, body) {
    res.writeHead(status, baseHeaders(headers));
    res.end(body);
  }

  function sendJson(res, status, obj, extraHeaders) {
    send(
      res,
      status,
      { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...extraHeaders },
      JSON.stringify(obj),
    );
  }

  function redirect(res, location, cookies) {
    const headers = { Location: location, "Cache-Control": "no-store" };
    if (cookies) headers["Set-Cookie"] = cookies;
    send(res, 302, headers, "");
  }

  async function readJsonBody(req) {
    const type = String(req.headers["content-type"] || "");
    if (!type.toLowerCase().startsWith("application/json")) {
      throw new HttpError(415, "expected application/json");
    }
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) throw new HttpError(413, "body too large");
      chunks.push(chunk);
    }
    if (chunks.length === 0) return {};
    try {
      const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
      return parsed;
    } catch {
      throw new HttpError(400, "invalid json");
    }
  }

  function currentUser(req) {
    const sid = parseCookies(req.headers.cookie)[SESSION_COOKIE];
    if (!sid) return null;
    const row = stmt.session.get(sid);
    if (!row) return null;
    if (row.expires_at < now()) {
      stmt.deleteSession.run(sid);
      return null;
    }
    return { ...row, sid };
  }

  // Cookies are SameSite=Lax, which already keeps cross-site POSTs from
  // carrying the session; this origin check is defence in depth.
  function assertSameOrigin(req) {
    const origin = req.headers.origin;
    if (origin && origin !== publicOrigin) throw new HttpError(403, "cross-origin request");
  }

  // ------------------------------------------------------------- auth ----
  function handleGoogleStart(req, res) {
    if (!googleConfigured) return redirect(res, "/?login=unavailable");
    const state = randomBytes(24).toString("hex");
    const params = new URLSearchParams({
      client_id: googleClientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
      access_type: "online",
      prompt: "select_account",
    });
    redirect(res, `https://accounts.google.com/o/oauth2/v2/auth?${params}`, cookieHeader(STATE_COOKIE, state, 600));
  }

  async function handleGoogleCallback(req, res, url) {
    const clearState = cookieHeader(STATE_COOKIE, "", 0);
    const fail = (reason) => redirect(res, `/?login=failed&reason=${encodeURIComponent(reason)}`, clearState);
    if (!googleConfigured) return fail("unavailable");
    if (url.searchParams.get("error")) return fail("cancelled");
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const expectedState = parseCookies(req.headers.cookie)[STATE_COOKIE];
    if (!code || !state || !expectedState || state !== expectedState) return fail("state");

    let info;
    try {
      const tokenRes = await fetchImpl("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: googleClientId,
          client_secret: googleClientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!tokenRes.ok) return fail("token");
      const tokens = await tokenRes.json();
      const infoRes = await fetchImpl("https://openidconnect.googleapis.com/v1/userinfo", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
        signal: AbortSignal.timeout(10_000),
      });
      if (!infoRes.ok) return fail("userinfo");
      info = await infoRes.json();
    } catch {
      return fail("network");
    }
    if (typeof info?.sub !== "string" || typeof info.email !== "string" || info.email_verified !== true) {
      return fail("profile");
    }

    const t = now();
    const sid = randomBytes(32).toString("hex");
    tx(() => {
      stmt.upsertUser.run(info.sub, info.email, info.name ?? null, info.picture ?? null, t);
      stmt.insertSession.run(sid, info.sub, t, t + SESSION_TTL_MS);
    });
    redirect(res, "/", [cookieHeader(SESSION_COOKIE, sid, Math.floor(SESSION_TTL_MS / 1000)), clearState]);
  }

  function handleLogout(req, res) {
    const sid = parseCookies(req.headers.cookie)[SESSION_COOKIE];
    if (sid) stmt.deleteSession.run(sid);
    redirect(res, "/", cookieHeader(SESSION_COOKIE, "", 0));
  }

  // -------------------------------------------------------------- api ----
  async function handleApi(req, res, url) {
    const route = `${req.method} ${url.pathname}`;
    // One line per API call (never the cookie value), to trace clients
    // whose requests fail.
    if (opts.logApi !== false) {
      const hasSession = Boolean(parseCookies(req.headers.cookie)[SESSION_COOKIE]);
      console.log(`api ${route} session=${hasSession ? "yes" : "no"} ua=${JSON.stringify(String(req.headers["user-agent"] ?? "").slice(0, 160))}`);
    }
    if (route === "GET /api/auth/me") {
      const user = currentUser(req);
      return sendJson(res, 200, {
        googleConfigured,
        user: user ? { email: user.email, name: user.name, picture: user.picture } : null,
      });
    }

    const known = new Set([
      "GET /api/checks",
      "POST /api/checks/set",
      "POST /api/checks/patch",
      "POST /api/checks/replace",
      "POST /api/checks/reset",
      "POST /api/account/delete",
    ]);
    if (!known.has(route)) {
      const pathKnown = [...known].some((r) => r.endsWith(` ${url.pathname}`)) || url.pathname === "/api/auth/me";
      return sendJson(res, pathKnown ? 405 : 404, { error: pathKnown ? "method not allowed" : "not found" });
    }

    if (req.method !== "GET") assertSameOrigin(req);
    const user = currentUser(req);
    if (!user) return sendJson(res, 401, { error: "unauthorized" });

    if (route === "GET /api/checks") {
      return sendJson(res, 200, { checked: stmt.listChecks.all(user.id).map((r) => r.item_key) });
    }

    if (route === "POST /api/checks/set") {
      const body = await readJsonBody(req);
      if (!isValidItemKey(body.itemKey) || typeof body.checked !== "boolean") {
        throw new HttpError(400, "bad request");
      }
      applyPatch(user.id, body.checked ? [body.itemKey] : [], body.checked ? [] : [body.itemKey]);
      return sendJson(res, 200, { ok: true });
    }

    if (route === "POST /api/checks/patch") {
      // A coalesced batch of ticks/unticks from the client's write queue.
      const body = await readJsonBody(req);
      const add = body.add ?? [];
      const remove = body.remove ?? [];
      if (
        !Array.isArray(add) ||
        !Array.isArray(remove) ||
        add.length + remove.length > MAX_CHECKS_PER_USER ||
        !add.every(isValidItemKey) ||
        !remove.every(isValidItemKey)
      ) {
        throw new HttpError(400, "bad request");
      }
      applyPatch(user.id, add, remove);
      return sendJson(res, 200, { ok: true });
    }

    if (route === "POST /api/checks/replace") {
      const body = await readJsonBody(req);
      if (
        !Array.isArray(body.itemKeys) ||
        body.itemKeys.length > MAX_CHECKS_PER_USER ||
        !body.itemKeys.every(isValidItemKey)
      ) {
        throw new HttpError(400, "bad request");
      }
      const unique = [...new Set(body.itemKeys)];
      const t = now();
      tx(() => {
        stmt.clearChecks.run(user.id);
        for (const key of unique) stmt.addCheck.run(user.id, key, t);
      });
      return sendJson(res, 200, { ok: true });
    }

    if (route === "POST /api/checks/reset") {
      stmt.clearChecks.run(user.id);
      return sendJson(res, 200, { ok: true });
    }

    if (route === "POST /api/account/delete") {
      tx(() => {
        stmt.clearChecks.run(user.id);
        stmt.clearSessions.run(user.id);
        stmt.deleteUser.run(user.id);
      });
      return sendJson(res, 200, { ok: true }, { "Set-Cookie": cookieHeader(SESSION_COOKIE, "", 0) });
    }
  }

  function applyPatch(userId, add, remove) {
    const t = now();
    tx(() => {
      for (const key of remove) stmt.removeCheck.run(userId, key);
      if (add.length) {
        const count = stmt.countChecks.get(userId).n;
        if (count + add.length > MAX_CHECKS_PER_USER) throw new HttpError(400, "too many checks");
        for (const key of add) stmt.addCheck.run(userId, key, t);
      }
    });
  }

  // ----------------------------------------------------------- static ----
  async function tryFile(path) {
    try {
      const s = await stat(path);
      return s.isFile() ? s : null;
    } catch {
      return null;
    }
  }

  async function handleStatic(req, res, url) {
    if (req.method !== "GET" && req.method !== "HEAD") {
      return send(res, 405, { "Content-Type": "text/plain; charset=utf-8", Allow: "GET, HEAD" }, "method not allowed");
    }
    let rel;
    try {
      rel = normalize(decodeURIComponent(url.pathname));
    } catch {
      return send(res, 400, { "Content-Type": "text/plain; charset=utf-8" }, "bad request");
    }
    if (rel === "/" || rel === sep) rel = "/index.html";
    let file = join(distDir, rel);
    if (file !== distDir && !file.startsWith(distDir + sep)) {
      return send(res, 404, { "Content-Type": "text/plain; charset=utf-8" }, "not found");
    }
    let info = await tryFile(file);
    if (!info) {
      // Missing build assets are real 404s; anything else is a client
      // route and gets the app shell.
      if (rel.startsWith("/assets/") || extname(rel)) {
        return send(res, 404, { "Content-Type": "text/plain; charset=utf-8" }, "not found");
      }
      file = join(distDir, "index.html");
      info = await tryFile(file);
      if (!info) return send(res, 404, { "Content-Type": "text/plain; charset=utf-8" }, "not found");
    }

    const ext = extname(file);
    let cacheControl = "no-cache";
    if (HASHED_ASSET_RE.test(file)) cacheControl = "public, max-age=31536000, immutable";
    else if (file.includes(`${sep}fonts${sep}`)) cacheControl = "public, max-age=2592000";
    else if (ext !== ".html") cacheControl = "public, max-age=86400";

    const headers = {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": cacheControl,
      "Last-Modified": info.mtime.toUTCString(),
    };

    let servePath = file;
    if (COMPRESSIBLE.has(ext)) {
      headers.Vary = "Accept-Encoding";
      const accept = String(req.headers["accept-encoding"] || "");
      for (const [token, suffix] of [["br", ".br"], ["gzip", ".gz"]]) {
        if (new RegExp(`\\b${token}\\b`).test(accept) && (await tryFile(file + suffix))) {
          servePath = file + suffix;
          headers["Content-Encoding"] = token;
          break;
        }
      }
    }

    const ims = req.headers["if-modified-since"];
    if (ims && !Number.isNaN(Date.parse(ims)) && Math.floor(info.mtimeMs / 1000) <= Math.floor(Date.parse(ims) / 1000)) {
      delete headers["Content-Encoding"];
      return send(res, 304, headers, "");
    }

    const data = await readFile(servePath);
    headers["Content-Length"] = String(data.length);
    send(res, 200, headers, req.method === "HEAD" ? undefined : data);
  }

  function handlePrivacy(req, res) {
    send(res, 200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=3600" }, PRIVACY_HTML);
  }

  // ------------------------------------------------------------ router ---
  async function handler(req, res) {
    try {
      const url = new URL(req.url || "/", publicOrigin);
      const p = url.pathname;
      if (p === "/healthz") {
        stmt.ping.get();
        return sendJson(res, 200, { ok: true });
      }
      if (p === "/privacy") return handlePrivacy(req, res);
      if (p === "/auth/google") return handleGoogleStart(req, res);
      if (p === "/auth/google/callback") return await handleGoogleCallback(req, res, url);
      if (p === "/auth/logout") return handleLogout(req, res);
      if (p.startsWith("/api/")) return await handleApi(req, res, url);
      return await handleStatic(req, res, url);
    } catch (err) {
      if (err instanceof HttpError) {
        if (!res.headersSent) return sendJson(res, err.status, { error: err.message });
        return res.end();
      }
      console.error(err);
      if (!res.headersSent) sendJson(res, 500, { error: "internal" });
      else res.end();
    }
  }

  function purgeExpired() {
    return Number(stmt.purgeSessions.run(now()).changes);
  }

  return { handler, purgeExpired, db, googleConfigured, close: () => db.close() };
}
