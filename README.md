# oot2-tracker — Ocarina of Time 100% Checklist

The ultimate 100% checklist for *The Legend of Zelda: Ocarina of Time*
(Nintendo Switch 2 remake), running at **https://oot.helv.io**.

272 individually described deeds in 17 sections — all 100 Gold Skulltulas
and all 36 Pieces of Heart as separate entries, the main quest, capacity
upgrades, all 10 soft-soil patches, 4 bottles, 13 songs, 6 Great Fairies,
both trading sequences, the Gerudo Training Ground and Ice Arrows,
one-time merchant deals, merchant & minigame master challenges, and
Easter eggs. Every deed can be browsed three ways over one shared check
state: **Journey** (by category), **By place** (35 location groups), and
**By era** (Child Link 124 / Adult Link 114 / Either 34). Search, to-do /
done and era filters, per-group progress, and a printable PDF export of
the checklist are built in.

## Progress & sign-in

- **Logged out:** progress is saved in the browser's local storage on
  that device. Everything works.
- **Signed in with Google:** progress is also stored server-side per
  Google account (SQLite), so it follows the user across devices.
- **Reconciling:** when a signed-in account's progress first loads, if
  one side (device or account) is empty the other wins automatically.
  If both hold *different* progress, an on-theme modal offers **Push**
  (device wins), **Pull** (account wins), or **Merge** (union of both).

## Running it

The server is plain Node.js (>= 22) with zero runtime dependencies
(static file serving + `node:sqlite`). The client is a React app built
with esbuild + Tailwind CSS v4.

```sh
npm install
npm run build     # -> dist/
npm start         # serves on $PORT (default 8080)
```

### Environment variables

| Variable               | Default                  | Purpose                                             |
| ---------------------- | ------------------------ | --------------------------------------------------- |
| `PORT`                 | `8080`                   | Listen port                                         |
| `DB_PATH`              | `/data/oot.sqlite`       | SQLite file for users, sessions, checks             |
| `PUBLIC_URL`           | `https://oot.helv.io`    | Public origin; OAuth redirect is derived from it    |
| `GOOGLE_CLIENT_ID`     | —                        | Google OAuth client id (login disabled when unset)  |
| `GOOGLE_CLIENT_SECRET` | —                        | Google OAuth client secret (login disabled when unset) |

### Google OAuth setup

In the Google Cloud Console (APIs & Services → Credentials), create an
**OAuth 2.0 Client ID** of type **Web application** with:

- **Authorized JavaScript origin:** `https://oot.helv.io`
- **Authorized redirect URI:** `https://oot.helv.io/auth/google/callback`

Put the resulting client id and secret in `GOOGLE_CLIENT_ID` /
`GOOGLE_CLIENT_SECRET` (stack environment in Komodo) and restart the
app. No code change is needed — the sign-in button activates as soon as
both variables are set.

## Deployment

- Image: `ghcr.io/helv-io/oot2-tracker`, built and pushed by
  `.github/workflows/release.yml` on version tags (`v*`) — the same
  release pattern as the other helv-io projects (tags: `vX.Y.Z`, `X.Y.Z`,
  `latest`, short SHA; multi-arch amd64 + arm64). Until the package
  exists, the Komodo stack builds the image from source on the server
  (see the `build:` block in `docker-compose.yml`).
- On yolo it runs as the Komodo stack **`oot`** using
  `docker-compose.yml` from this repo, with the SQLite database in
  `/docker/oot` (bind-mounted to `/data`).
- The `oot.helv.io` route is public and intentionally has **no Authelia
  middleware** — the app is a public fan checklist; the only accounts
  are the users' own Google sign-ins for progress sync.

## Layout

```
client/          React client (catalog data in client/src/data/catalog.ts)
server/          server.js — HTTP server, Google OAuth, SQLite progress API
build.mjs        esbuild + Tailwind production build -> dist/
Dockerfile       multi-stage image build
docker-compose.yml  Komodo stack definition
```

A fan-made labor of love. Not affiliated with Nintendo.
