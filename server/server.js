// oot2-tracker entry point: reads the environment, starts the HTTP
// server, purges expired sessions hourly, and shuts down cleanly on
// SIGTERM/SIGINT so `docker stop` doesn't wait out its timeout.
//
// Environment:
//   PORT                 listen port (default 8080)
//   DB_PATH              SQLite file (default /data/oot.sqlite)
//   PUBLIC_URL           public origin (default https://oot.helv.io); the
//                        OAuth redirect URI is PUBLIC_URL + /auth/google/callback
//   GOOGLE_CLIENT_ID     OAuth client id (login disabled when unset)
//   GOOGLE_CLIENT_SECRET OAuth client secret (login disabled when unset)

import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";

const PORT = Number(process.env.PORT || 8080);
const DB_PATH = process.env.DB_PATH || "/data/oot.sqlite";

const app = createApp({
  dbPath: DB_PATH,
  publicUrl: process.env.PUBLIC_URL || "https://oot.helv.io",
  distDir: join(dirname(fileURLToPath(import.meta.url)), "..", "dist"),
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
});

const server = createServer(app.handler);
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;
server.requestTimeout = 30_000;

app.purgeExpired();
const purgeTimer = setInterval(() => app.purgeExpired(), 60 * 60 * 1000);
purgeTimer.unref();

server.listen(PORT, () => {
  console.log(
    `oot2-tracker listening on :${PORT} (db ${DB_PATH}, google login ${app.googleConfigured ? "on" : "off"})`,
  );
});

let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received, shutting down`);
  server.close(() => {
    app.close();
    process.exit(0);
  });
  server.closeIdleConnections();
  setTimeout(() => process.exit(0), 5_000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
