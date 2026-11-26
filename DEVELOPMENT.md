# Developing oot2-tracker

Everything technical lives here; the [README](README.md) is for players.
Maintainer and agent rules are in [AGENT.md](AGENT.md).

## Run it

Node 24, no runtime dependencies (`node:http` + `node:sqlite`). The
client is React, bundled with esbuild and Tailwind CSS v4.

```sh
npm ci
npm run build    # -> dist/
npm run dev      # http://localhost:8080, database in ./data
npm run check    # typecheck + tests + build
```

### Environment

| Variable               | Default               | Purpose                                          |
| ---------------------- | --------------------- | ------------------------------------------------ |
| `PORT`                 | `8080`                | Listen port                                      |
| `DB_PATH`              | `/data/oot.sqlite`    | SQLite file for users, sessions and ticks        |
| `PUBLIC_URL`           | `https://oot.helv.io` | Public origin; the OAuth redirect derives from it |
| `GOOGLE_CLIENT_ID`     | unset                 | Google OAuth client id; sign-in is off without it |
| `GOOGLE_CLIENT_SECRET` | unset                 | Google OAuth client secret                       |

### Google sign-in

Create an **OAuth 2.0 Client ID** of type **Web application** in Google
Cloud Console with:

- Authorized JavaScript origin: `https://oot.helv.io`
- Authorized redirect URI: `https://oot.helv.io/auth/google/callback`

Set the id and secret as the Komodo stack's environment and redeploy.

## API

All JSON. Writes need the session cookie and a same-origin request.

| Route                        | What it does                                   |
| ---------------------------- | ---------------------------------------------- |
| `GET /api/auth/me`           | Whether sign-in is on, and who is signed in    |
| `GET /api/checks`            | The signed-in user's ticked item ids           |
| `POST /api/checks/patch`     | `{ add: [...], remove: [...] }` batch update   |
| `POST /api/checks/set`       | `{ itemKey, checked }` single update           |
| `POST /api/checks/replace`   | `{ itemKeys: [...] }` replace everything       |
| `POST /api/checks/reset`     | Clear all ticks                                |
| `POST /api/account/delete`   | Delete the account, its ticks and sessions     |
| `GET /healthz`               | Liveness and version, with a database ping     |

## Deployment

- `.github/workflows/ci.yml` type-checks, tests, builds and smoke-tests
  the Docker image on every push and pull request.
- `.github/workflows/release.yml` runs CI, then publishes
  `ghcr.io/helv-io/oot2-tracker` for amd64 and arm64 on every `v*` tag
  (`vX.Y.Z`, `X.Y.Z`, `latest`, `sha-…`).
- On yolo it runs as the Komodo stack **`oot`** using
  `docker-compose.yml`, with SQLite in `/docker/oot`. Komodo auto-pulls
  and auto-updates `latest`.
- `oot.helv.io` is public, with no Authelia: the only accounts are the
  players' own Google sign-ins.

## Layout

```
client/src/App.tsx        the whole UI
client/src/data/          catalog.ts holds every deed; views.ts regroups them;
                          look.ts maps items, sections and places to icons and colours
client/src/lib/           sync queue, reconcile, share codes, celebration, PWA
client/assets/official/   official remake art, optimized (see SOURCES.md there)
client/sw.js              service worker template (filled by build.mjs)
scripts/official-art.py   fetches and converts the official art
scripts/readme-art.py     draws the README banners and dividers
scripts/screenshots.mjs   captures docs/screenshots/ from the live site
client/src/pdf.ts         dependency-free PDF export
server/app.js             HTTP app: static files, OAuth, API, security headers
server/server.js          entry point: env, listen, session purge, shutdown
test/                     node:test suites for the server and client logic
build.mjs                 production build -> dist/
```

## Art

```sh
python3 scripts/official-art.py   # official remake art -> client/assets/official/ + app icons
python3 scripts/readme-art.py     # README banners and dividers -> docs/art/
```

`official-art.py` downloads from Zelda Wiki, crops, pads and converts to
WebP/AVIF, draws the custom gold Triforce, and regenerates
`client/src/data/art.generated.ts` and `client/assets/official/SOURCES.md`.

## Screenshots

`docs/screenshots/` is regenerated from the live site after every
release by `.github/workflows/screenshots.yml`. To run it by hand:

```sh
npm i --no-save playwright && npx playwright install chromium
node scripts/screenshots.mjs                         # https://oot.helv.io
SITE=http://localhost:8080 node scripts/screenshots.mjs
```
