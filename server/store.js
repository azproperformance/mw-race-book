const fs = require('fs');
const path = require('path');

// Small JSON-file store. One process owns the data directory, so writes are
// serialized through a single queue instead of using file locks.
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, 'data'));

let queue = Promise.resolve();

function filePath(name) {
  return path.join(DATA_DIR, `${name}.json`);
}

async function read(name, fallback) {
  try {
    return JSON.parse(await fs.promises.readFile(filePath(name), 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return structuredClone(fallback);
    throw err;
  }
}

async function write(name, data) {
  await fs.promises.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${filePath(name)}.tmp`;
  await fs.promises.writeFile(tmp, JSON.stringify(data, null, 2));
  await fs.promises.rename(tmp, filePath(name));
}

/** Runs `mutator(data)` against the latest copy of `name` and saves the result. */
function update(name, fallback, mutator) {
  const result = queue.then(async () => {
    const data = await read(name, fallback);
    const value = await mutator(data);
    await write(name, data);
    return value;
  });
  // A failed update shouldn't block every later one.
  queue = result.catch(() => {});
  return result;
}

module.exports = { DATA_DIR, read, update };
