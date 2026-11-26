# oot2-tracker

The ultimate 100% checklist for *The Legend of Zelda: Ocarina of Time*
on Nintendo Switch 2. Live at **https://oot.helv.io**.

272 deeds in 17 sections: the main quest, all 100 Gold Skulltulas and
36 Pieces of Heart, upgrades, soft soil, bottles, songs, Great Fairies,
both trading sequences, the Gerudo Training Ground, merchant deals,
minigame challenges and Easter eggs.

- **Three views over one set of ticks:** Journey, Places and Eras.
- **Search and filters** by status and by Child or Adult Link.
- **Printable PDF** of the whole list with your ticks.
- **Works signed out:** progress autosaves in the browser.
- **Sign in with Google** to sync across devices. If a device and the
  account disagree on first sign-in, you choose: merge, keep the
  device, or keep the account.

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
| `GET /healthz`               | Liveness, including a database ping            |

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
client/src/data/          catalog.ts holds every deed; views.ts regroups them
client/src/lib/           sync write queue and first-load reconcile logic
client/src/pdf.ts         dependency-free PDF export
server/app.js             HTTP app: static files, OAuth, API, security headers
server/server.js          entry point: env, listen, session purge, shutdown
test/                     node:test suites for the server and client logic
build.mjs                 production build -> dist/
```

A fan-made labor of love. Not affiliated with Nintendo.
