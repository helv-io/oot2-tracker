# AGENT.md

Notes for agents working on oot2-tracker.

## Ground rules

- Commit as `Helvio Pedreschi <helvio88@gmail.com>`.
- `npm run check` must pass before you push: typecheck, tests, build.
- Release by tagging `vX.Y.Z` on main. The Release workflow runs CI and
  publishes `ghcr.io/helv-io/oot2-tracker`; Komodo auto-updates
  `latest` on yolo. Verify https://oot.helv.io/healthz reports the new
  `version`. Komodo's poll can lag; if it's still old after ~10 minutes,
  deploy the `oot` stack in Komodo (the Screenshots job waits 20).
- The Komodo stack is `oot`. Change it only through Komodo, never by
  editing compose files on the server. It follows the other helv.io
  stacks: `network_mode: web`, Traefik labels on `websecure`, data in
  `/docker/oot`, and **no Authelia middleware**.
- Google OAuth credentials live in the Komodo stack environment. Never
  print or commit them.

- No em dashes (U+2014) anywhere: not in the UI, the catalog, comments,
  docs, or commit messages you write. Rewrite them with a colon, a comma,
  a period, parentheses, or a middle dot (·) for title separators. Don't
  swap in an en dash or a hyphen. The same goes for en dashes (U+2013)
  used as dashes. `test/no-dashes.test.js` fails the build if either
  character shows up in source, data or docs.


## UI conventions

- Friendly at first glance; advanced things go behind a collapsed caret
  (Filters, More).
- No Save buttons. Every change autosaves and shows a short "Saved" toast.
- Short UI text, no parentheticals, nothing that wraps badly on a phone.
- Tap targets at least 40px; inputs at 16px so iOS doesn't zoom.
- Art is official **Switch 2 remake** art only (Zelda Wiki files named
  `OoTNS2 …`). Never use N64 or 3DS art, not even as a fallback. If the
  remake has no usable asset, draw a custom one in its style (see the
  gold Triforce in `scripts/official-art.py`) and list it under
  "Custom pieces" in `client/assets/official/SOURCES.md`.
- Add icons by name in `scripts/official-art.py`, run it, and commit the
  outputs; map them in `client/src/data/look.ts`. Never hotlink. Every
  sprite goes through the same crop, padding and `.art` drop shadow, so
  don't style icons one by one.
- There is one Triforce: `triforce.webp` in the app, the same shape and
  gold gradient in `scripts/readme-art.py` for the README.
- Colours: region tones in `look.ts`, muted, used as accents and section
  headers only. Headings in Marcellus SC, text in Inter.
- The printable PDF uses the same fonts (embedded Marcellus SC and Inter,
  not Helvetica), the same region colours on section titles and rules,
  and the official section icons. Meta lines join area and age with a
  middle dot, never a dash. The page background stays white for print.
- Group cards expand and collapse by animating `grid-template-rows`
  (0fr to 1fr), never height, transform or will-change on the card.
  Cards use `isolation: isolate`; the header is opaque with a z-index.
  Do not put `backdrop-filter` or blur on sticky or scrolling chrome.
- The site atmosphere is a fixed texture layer plus a firefly canvas
  behind the page (`pointer-events: none`, no backdrop-filter, no
  transforms on content). Keep both decorative and cheap. Pause the
  canvas on hidden tabs; under `prefers-reduced-motion` draw a still
  frame or nothing.

- Views: Journey, Places, Eras, Map. The Map is Nintendo's official remake
  map (`art/hyrule-map-1200.webp`, fetched by `scripts/official-art.py`,
  never an N64, 3DS or ROM map) under SVG hotspots (`data/map.ts`,
  `components/HyruleMap.tsx`). Hotspots are polygons in the cropped map's
  units; a test keeps them inside it. Every catalog area belongs to
  exactly one region (a test checks it). Tint follows completion and turns
  gold at 100%; hover and focus change stroke only. Keep labels legible at
  375px (about 10px rendered).
- Smart filters live in the Filters disclosure and persist in prefs
  (`age`, `hideDone`, `showLocks`). Era hides items the other form can't
  do (Both-era items always show). Hide finished keeps rows you tick in
  this session until the filter changes. Key-item gating is data in
  `data/gating.ts`: GRANTS (items that give a key item), IMPLIES
  (Longshot gives Hookshot), AREA_RULES and ITEM_RULES (what an item
  needs). Owned key items come only from checked progress. Locked rows
  are greyed with a "Needs X" hint, never hidden, and still tick. Keep
  rules plain and conservative; a test checks every need can be earned.
  Only a search or the status chips force groups open, not these filters.
- Search (`/`) lists results across every item and jumps to one by
  opening its group and scrolling to the row. Map taps do the same for a
  region's group. Both go through `jump` state and `openSignal`.
- Completing a section shows the item-get overlay (a fixed layer, never
  a transform on page content) and plays the fanfare. The hero Triforce
  is `triforce.webp` clipped by overall progress; keep it the one shape.
- Sound lives in `lib/sound.ts`: a two-deck HTMLAudio playlist of the
  twelve ocarina songs plus the fanfare, volume via a Web Audio GainNode
  (iOS ignores element volume). `play()` must run inside the gesture,
  never after an await; unlock both decks in that same gesture so the
  next track can start. The first gesture listener stays until
  `isPlaying()` is true, so a rejected play() is retried on the next
  tap. Music at `MUSIC_VOLUME` (about 0.033, never loud) fades in slowly
  once the context is running; tracks crossfade over `CROSSFADE_S` and
  the playlist is shuffled once per visit, then loops. Hidden tabs pause
  and resume. Prefer AAC unless `canPlayType` says "probably" for Opus,
  and fall back on error. The speaker button mutes both and is stored in
  `oot-100-checklist:sound:v1`. Audio is not cached by the service
  worker (Range requests break Safari). Files come from
  `scripts/make-audio.py`. Document any new sound in
  `client/assets/official/SOURCES.md`.

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
- `build.mjs` content-hashes bundles and images; the server caches those
  forever and serves `index.html` and `sw.js` no-cache. `sw.js`
  precaches `/assets` so the app works offline.
- Remake facts need two sources; record them in `DATA-SOURCES.md`.

## Docs

- `README.md` is for players only: what it is, features, how to use it.
  Run/build/deploy details go in `DEVELOPMENT.md`; agent rules stay here.
- README colour comes from SVGs (`python3 scripts/readme-art.py` writes
  `docs/art/`), shields.io badges in the region palette, and screenshots.
  GitHub strips CSS, so don't add any.

## Screenshots

- `docs/screenshots/` must always show the current live site.
- `.github/workflows/screenshots.yml` does it after every successful
  Release: it waits for `/healthz` to report the new version, runs
  `scripts/screenshots.mjs` against https://oot.helv.io, and commits any
  changes to main. You can also run it from the Actions tab.
- If it fails, or after a UI change that isn't released yet, run it by
  hand (see `DEVELOPMENT.md`) and commit the images. Check them by eye
  before committing.
- Progress is seeded in the script so runs are comparable. If you
  rename ids in the seed, keep it showing a partly done list.

## GitHub social preview

- The image is `docs/social-preview.png`: 1280x640 PNG, under 1 MB, with
  Link, the official logo, the gold Triforces and the tagline
  `oot.helv.io` all inside a 40 px safe border.
- Regenerate it with `python3 scripts/social-preview.py` (same official
  art cache as `official-art.py`, default `--raw /tmp/oot-assets/raw`).
- GitHub has no API for the repo social preview. After changing the
  file, a human has to upload it in the web UI: Settings, General,
  Social preview. Use the file in the repo; do not crop or resize it.
