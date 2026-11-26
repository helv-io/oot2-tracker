# AGENT.md

Notes for agents working on oot2-tracker.

## Ground rules

- Commit as `Helvio Pedreschi <helvio88@gmail.com>`.
- `npm run check` must pass before you push: typecheck, tests, build.
- Release by tagging `vX.Y.Z` on main. The Release workflow runs CI and
  publishes `ghcr.io/helv-io/oot2-tracker`; Komodo auto-updates
  `latest` on yolo. Verify https://oot.helv.io/healthz afterwards.
- The Komodo stack is `oot`. Change it only through Komodo, never by
  editing compose files on the server. It follows the other helv.io
  stacks: `network_mode: web`, Traefik labels on `websecure`, data in
  `/docker/oot`, and **no Authelia middleware**.
- Google OAuth credentials live in the Komodo stack environment. Never
  print or commit them.

## UI conventions

- Friendly at first glance; advanced things go behind a collapsed caret
  (Filters, More).
- No Save buttons. Every change autosaves and shows a short "Saved" toast.
- Short UI text, no parentheticals, nothing that wraps badly on a phone.
- Tap targets at least 40px; inputs at 16px so iOS doesn't zoom.

## How it fits together

- Device progress is in localStorage (`oot-100-checklist:device-checks:v1`).
- When signed in, ticks also go through `WriteQueue`
  (`client/src/lib/sync.ts`): coalesced, one batch in flight, retried
  with backoff, sent to `POST /api/checks/patch`.
- First load reconciles device and account (`lib/reconcile.ts`). On
  conflict the user picks merge, keep device or keep account, and no
  account writes happen until they do.
- Item ids are the contract between client and server. Never rename an
  id in `catalog.ts`, or everyone's tick for it is lost. Ids must match
  `^[a-z0-9][a-z0-9-]{0,63}$`, which `test/client.test.ts` checks.
- `build.mjs` content-hashes bundles; the server caches those forever and
  serves `index.html` no-cache.
