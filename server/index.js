const express = require('express');
const { DATA_DIR, read, update } = require('./store');

const app = express();
const PORT = process.env.PORT || 3200;

// The app itself is served from GitHub Pages, so the browser calls this
// server cross-origin. Only these sites may use it from a browser.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://azproperformance.github.io,http://localhost:8765')
  .split(',').map(s => s.trim()).filter(Boolean);

const STORE = 'races';
const EMPTY = { races: {} };
const MAX_RACES = 20000;
const MAX_CHANGES = 500;
const MAX_FIELDS = 60;
const MAX_TEXT = 10000;
const ID_RE = /^[A-Za-z0-9_-]{1,100}$/;
const KEY_RE = /^[A-Za-z][A-Za-z0-9]{0,40}$/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Vary', 'Origin');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Max-Age', '86400');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.get('/health', (req, res) => res.json({ ok: true }));

/**
 * Keeps one race entry's own fields: short text values under simple names,
 * plus the id, the last-edited time and a deleted flag. Anything else is
 * dropped, so a bad request can't bloat or break the store.
 */
function clean(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  if (typeof raw.id !== 'string' || !ID_RE.test(raw.id)) return null;
  if (typeof raw.updatedAt !== 'string' || !ISO_RE.test(raw.updatedAt)) return null;
  if (raw.deleted === true) return { id: raw.id, updatedAt: raw.updatedAt, deleted: true };
  const rec = {};
  let n = 0;
  for (const [k, v] of Object.entries(raw)) {
    if (!KEY_RE.test(k) || typeof v !== 'string' || ++n > MAX_FIELDS) continue;
    rec[k] = v.slice(0, MAX_TEXT);
  }
  rec.id = raw.id;
  rec.updatedAt = raw.updatedAt;
  return rec;
}

app.get('/api/races', async (req, res, next) => {
  try {
    const data = await read(STORE, EMPTY);
    res.json({ races: Object.values(data.races) });
  } catch (err) { next(err); }
});

// Takes this device's unsent changes and returns every race (deleted ones
// included, so other devices remove them too). The most recent edit wins.
app.post('/api/races/sync', async (req, res, next) => {
  const changes = Array.isArray(req.body && req.body.changes) ? req.body.changes : null;
  if (!changes) return res.status(400).json({ error: 'Send { changes: [...] }' });
  if (changes.length > MAX_CHANGES) return res.status(413).json({ error: `Send at most ${MAX_CHANGES} changes at a time` });
  try {
    const races = await update(STORE, EMPTY, data => {
      for (const raw of changes) {
        const rec = clean(raw);
        if (!rec) continue;
        const have = data.races[rec.id];
        if (!have && Object.keys(data.races).length >= MAX_RACES) continue;
        if (!have || rec.updatedAt >= have.updatedAt) data.races[rec.id] = rec;
      }
      return Object.values(data.races);
    });
    res.json({ races });
  } catch (err) { next(err); }
});

app.use((err, req, res, next) => {
  if (!err.status) console.error(err);
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`MW Race Book sync server listening on port ${PORT} (data in ${DATA_DIR})`);
});
