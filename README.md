# MW Racing Race Book

A race-by-race setup log for the RZR 170 / 570 program: tires, gearing, clutch
weights, best lap and notes for every session. It's a web app that installs to
an iPhone home screen. You don't need an App Store app or a login, and it
works with no signal at the track.

## Where the data lives

Races are saved **on the phone itself** (browser storage). Nothing is sent to a
server, and this repo holds only the app's code, never your race data.

That also means:
- Each device has its own copy of the data.
- On iPhone, the home screen app and Safari keep separate storage. Add the app
  to the home screen first, and always open it from the icon.
- **Back up regularly:** Backup → Export to Excel. That Excel file is how you move your
  races to a new phone (Backup → Restore from Excel on the new phone).

## Install on an iPhone

1. Open the app's GitHub Pages address in **Safari**.
2. Tap **Share**, then **Add to Home Screen**.
3. Open the Race Book from the new home screen icon.

## Files

- `index.html`: the whole app (layout, styles and code)
- `sw.js`: offline support. **Bump `VERSION` whenever you change app files**
  so phones pick up the update.
- `manifest.webmanifest`, `icons/`: home screen name and icon

The Excel export uses SheetJS (xlsx 0.18.5) from cdnjs. It's cached for offline
use the first time the app loads with a connection.

## Hosting

Served as a static site from GitHub Pages (Settings → Pages → Deploy from a
branch → `main`, `/ (root)`). Any static host works; there's no build step.
