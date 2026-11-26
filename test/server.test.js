import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { createApp, parseCookies, isValidItemKey } from "../server/app.js";

const ORIGIN = "https://oot.example";
let dir, app, server, base;

function fakeGoogle(profile) {
  return async (url) => {
    if (String(url).includes("/token")) return Response.json({ access_token: "tok" });
    return Response.json(profile);
  };
}

before(async () => {
  dir = mkdtempSync(join(tmpdir(), "oot-test-"));
  const dist = join(dir, "dist");
  mkdirSync(join(dist, "assets"), { recursive: true });
  writeFileSync(join(dist, "index.html"), "<!doctype html><title>t</title>");
  writeFileSync(join(dist, "assets", "main-ABCDEFGH.js"), "console.log(1)");
  writeFileSync(join(dist, "assets", "main-ABCDEFGH.js.gz"), gzipSync("console.log(1)"));
  writeFileSync(join(dir, "secret.txt"), "nope");
  app = createApp({
    dbPath: join(dir, "db.sqlite"),
    publicUrl: ORIGIN,
    distDir: dist,
    googleClientId: "id",
    googleClientSecret: "secret",
    logApi: false,
    fetchImpl: fakeGoogle({ sub: "u1", email: "a@example.com", email_verified: true, name: "A" }),
  });
  server = createServer(app.handler);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.close();
  app.close();
  rmSync(dir, { recursive: true, force: true });
});

async function login() {
  const start = await fetch(`${base}/auth/google`, { redirect: "manual" });
  assert.equal(start.status, 302);
  const state = new URL(start.headers.get("location")).searchParams.get("state");
  const stateCookie = start.headers.getSetCookie()[0].split(";")[0];
  const cb = await fetch(`${base}/auth/google/callback?code=c&state=${state}`, {
    redirect: "manual",
    headers: { cookie: stateCookie },
  });
  assert.equal(cb.status, 302);
  assert.equal(cb.headers.get("location"), "/");
  const session = cb.headers.getSetCookie().find((c) => c.startsWith("oot_session="));
  assert.ok(session, "session cookie set");
  assert.match(session, /HttpOnly/);
  assert.match(session, /Secure/);
  return session.split(";")[0];
}

const json = (cookie, body) => ({
  method: "POST",
  headers: { cookie, "content-type": "application/json", origin: ORIGIN },
  body: JSON.stringify(body),
});

test("healthz answers ok", async () => {
  const r = await fetch(`${base}/healthz`);
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { ok: true });
});

test("security headers are set", async () => {
  const r = await fetch(`${base}/`);
  assert.match(r.headers.get("content-security-policy"), /frame-ancestors 'none'/);
  assert.equal(r.headers.get("x-content-type-options"), "nosniff");
  assert.equal(r.headers.get("cache-control"), "no-cache");
});

test("hashed assets are immutable and served precompressed", async () => {
  const r = await fetch(`${base}/assets/main-ABCDEFGH.js`, { headers: { "accept-encoding": "gzip" } });
  assert.equal(r.status, 200);
  assert.match(r.headers.get("cache-control"), /immutable/);
  assert.equal(r.headers.get("content-encoding"), "gzip");
  assert.equal(await r.text(), "console.log(1)");
});

test("missing assets 404 instead of returning the app shell", async () => {
  const r = await fetch(`${base}/assets/nope.js`);
  assert.equal(r.status, 404);
});

test("path traversal never leaves dist", async () => {
  for (const p of ["/..%2fsecret.txt", "/%2e%2e/secret.txt", "/assets/..%2f..%2fsecret.txt"]) {
    const r = await fetch(`${base}${p}`);
    assert.notEqual(await r.text(), "nope", p);
  }
});

test("malformed URL escapes are a 400, not a crash", async () => {
  const r = await fetch(`${base}/%E0%A4%A`);
  assert.equal(r.status, 400);
});

test("signed-out session probe and 401 on data routes", async () => {
  const me = await (await fetch(`${base}/api/auth/me`)).json();
  assert.deepEqual(me, { googleConfigured: true, user: null });
  const r = await fetch(`${base}/api/checks`);
  assert.equal(r.status, 401);
});

test("oauth callback rejects a mismatched state", async () => {
  const r = await fetch(`${base}/auth/google/callback?code=c&state=x`, {
    redirect: "manual",
    headers: { cookie: "oot_oauth_state=y" },
  });
  assert.equal(r.headers.get("location"), "/?login=failed&reason=state");
});

test("full progress lifecycle for a signed-in user", async () => {
  const cookie = await login();
  const me = await (await fetch(`${base}/api/auth/me`, { headers: { cookie } })).json();
  assert.equal(me.user.email, "a@example.com");

  let r = await fetch(`${base}/api/checks/set`, json(cookie, { itemKey: "story-1", checked: true }));
  assert.equal(r.status, 200);
  r = await fetch(`${base}/api/checks/patch`, json(cookie, { add: ["gs-1", "gs-2"], remove: ["story-1"] }));
  assert.equal(r.status, 200);
  let list = await (await fetch(`${base}/api/checks`, { headers: { cookie } })).json();
  assert.deepEqual(list.checked, ["gs-1", "gs-2"]);

  r = await fetch(`${base}/api/checks/replace`, json(cookie, { itemKeys: ["hp-3", "hp-3"] }));
  assert.equal(r.status, 200);
  list = await (await fetch(`${base}/api/checks`, { headers: { cookie } })).json();
  assert.deepEqual(list.checked, ["hp-3"]);

  r = await fetch(`${base}/api/checks/reset`, json(cookie, {}));
  list = await (await fetch(`${base}/api/checks`, { headers: { cookie } })).json();
  assert.deepEqual(list.checked, []);
});

test("bad input is rejected with 4xx", async () => {
  const cookie = await login();
  const cases = [
    [{ itemKey: "", checked: true }, 400],
    [{ itemKey: "x".repeat(65), checked: true }, 400],
    [{ itemKey: "<script>", checked: true }, 400],
    [{ itemKey: "gs-1", checked: "yes" }, 400],
  ];
  for (const [body, status] of cases) {
    const r = await fetch(`${base}/api/checks/set`, json(cookie, body));
    assert.equal(r.status, status, JSON.stringify(body));
  }
  const bad = await fetch(`${base}/api/checks/set`, {
    method: "POST",
    headers: { cookie, "content-type": "application/json", origin: ORIGIN },
    body: "{not json",
  });
  assert.equal(bad.status, 400);
  const form = await fetch(`${base}/api/checks/set`, {
    method: "POST",
    headers: { cookie, "content-type": "text/plain", origin: ORIGIN },
    body: "{}",
  });
  assert.equal(form.status, 415);
  const tooMany = await fetch(
    `${base}/api/checks/replace`,
    json(cookie, { itemKeys: Array.from({ length: 1001 }, (_, i) => `k-${i}`) }),
  );
  assert.equal(tooMany.status, 400);
});

test("cross-origin writes are refused", async () => {
  const cookie = await login();
  const r = await fetch(`${base}/api/checks/set`, {
    method: "POST",
    headers: { cookie, "content-type": "application/json", origin: "https://evil.example" },
    body: JSON.stringify({ itemKey: "gs-1", checked: true }),
  });
  assert.equal(r.status, 403);
});

test("wrong method on a known route is a 405", async () => {
  const r = await fetch(`${base}/api/checks/set`);
  assert.equal(r.status, 405);
});

test("logout ends the session", async () => {
  const cookie = await login();
  await fetch(`${base}/auth/logout`, { redirect: "manual", headers: { cookie } });
  const me = await (await fetch(`${base}/api/auth/me`, { headers: { cookie } })).json();
  assert.equal(me.user, null);
});

test("account deletion removes the user and their progress", async () => {
  const cookie = await login();
  await fetch(`${base}/api/checks/set`, json(cookie, { itemKey: "gs-9", checked: true }));
  const r = await fetch(`${base}/api/account/delete`, json(cookie, {}));
  assert.equal(r.status, 200);
  const me = await (await fetch(`${base}/api/auth/me`, { headers: { cookie } })).json();
  assert.equal(me.user, null);
  const rows = app.db.prepare("SELECT COUNT(*) AS n FROM checks WHERE user_id = 'u1'").get();
  assert.equal(rows.n, 0);
});

test("unverified Google emails cannot sign in", async () => {
  const strict = createApp({
    dbPath: ":memory:",
    publicUrl: ORIGIN,
    distDir: join(dir, "dist"),
    googleClientId: "id",
    googleClientSecret: "secret",
    fetchImpl: fakeGoogle({ sub: "u2", email: "b@example.com", email_verified: false }),
  });
  const s = createServer(strict.handler);
  await new Promise((r) => s.listen(0, "127.0.0.1", r));
  const b = `http://127.0.0.1:${s.address().port}`;
  const start = await fetch(`${b}/auth/google`, { redirect: "manual" });
  const state = new URL(start.headers.get("location")).searchParams.get("state");
  const cb = await fetch(`${b}/auth/google/callback?code=c&state=${state}`, {
    redirect: "manual",
    headers: { cookie: start.headers.getSetCookie()[0].split(";")[0] },
  });
  assert.equal(cb.headers.get("location"), "/?login=failed&reason=profile");
  s.close();
  strict.close();
});

test("expired sessions are purged", () => {
  let clock = 1_000;
  const a = createApp({ dbPath: ":memory:", publicUrl: ORIGIN, distDir: dir, now: () => clock });
  a.db.prepare("INSERT INTO users VALUES ('u', 'e', null, null, 0)").run();
  a.db.prepare("INSERT INTO sessions VALUES ('s', 'u', 0, 2000)").run();
  clock = 5_000;
  assert.equal(a.purgeExpired(), 1);
  a.close();
});

test("helpers", () => {
  assert.deepEqual(parseCookies("a=1; b=%E0%A4%A; c=x%20y"), { a: "1", b: "%E0%A4%A", c: "x y" });
  assert.equal(isValidItemKey("gs-100"), true);
  assert.equal(isValidItemKey("GS-1"), false);
});
