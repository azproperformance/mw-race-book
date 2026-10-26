# MW Racing Race Book

A race-by-race setup log for the RZR 170 / 570 program: tires, gearing, clutch
weights, best lap and notes for every session. It's a web app that installs to
an iPhone home screen (no App Store app, no login) and syncs between every
phone and computer that opens it.

## How it fits together

- **The app** (`index.html`, `sw.js`, `manifest.webmanifest`, `icons/`) is a
  static site on GitHub Pages: https://azproperformance.github.io/mw-race-book/
- **The sync server** (`server/`) runs on Render and keeps the races in one
  JSON file on a Render disk. There's no login: anyone with the app's link can
  see and change the races.
- Each device also keeps its own copy, so the app works with no signal at the
  track. Changes made offline wait on the device and sync when the
  connection comes back (the status line under the filters shows this).
  When two devices edit the same race, the most recent edit wins.

## Install on an iPhone

1. Open the app's address in **Safari**.
2. Tap **Share**, then **Add to Home Screen**.
3. Open the Race Book from the new home screen icon.

## Excel

Backup → **Export to Excel** saves every race to one `.xlsx` file;
**Import from Excel** adds races from such a file (keep the Entry ID column if
you edit it). The Excel tool is SheetJS (xlsx 0.18.5) from cdnjs, cached for
offline use after the first load.

## Changing the app

- Edit `index.html`, then **bump `VERSION` in `sw.js`** so phones pick up the
  update. Push to `main`; GitHub Pages republishes in about a minute.
- The server's address is the `API` constant in `index.html`. If the Render
  service gets a different URL, update it there.

## Sync server on Render

Created from `render.yaml` (Render → New → Blueprint → this repo): a Starter
web service with a 1 GB disk at `/var/data`, deployed from `server/`.

Environment:
- `DATA_DIR`: where `races.json` is kept (`/var/data`)
- `ALLOWED_ORIGINS`: sites allowed to call it from a browser
  (`https://azproperformance.github.io`)

Endpoints: `GET /health`, `GET /api/races`, and `POST /api/races/sync` with
`{ "changes": [...] }`. Sync returns every race, including deleted markers.

Run it locally:

```bash
cd server
npm install
npm run dev
```

It listens on port 3200. The app talks to it automatically when the app is
opened from `localhost`.
