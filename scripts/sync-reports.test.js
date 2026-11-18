const {test} = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {syncIssues, syncRssWeeks, parseArgs} = require('./sync-reports');

const FIXTURES = path.join(__dirname, 'fixtures/radar/data/weekly');
const RSS_FIXTURES = path.join(__dirname, 'fixtures/radar/data/rss-weekly');

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'radar-sync-'));
}

test('copies only weekly issue JSON files', (t) => {
  const source = tempDir();
  t.after(() => fs.rmSync(source, {recursive: true, force: true}));
  for (const name of fs.readdirSync(FIXTURES)) {
    fs.copyFileSync(path.join(FIXTURES, name), path.join(source, name));
  }
  fs.writeFileSync(path.join(source, 'notes.md'), 'x');
  fs.writeFileSync(path.join(source, '2026-11-week47.md'), 'x');
  const target = tempDir();
  t.after(() => fs.rmSync(target, {recursive: true, force: true}));
  fs.writeFileSync(path.join(target, 'keep.txt'), 'do not delete');
  fs.writeFileSync(path.join(target, '2025-W01.json'), 'stale');
  fs.writeFileSync(path.join(target, 'stale.json'), 'stale');

  const result = syncIssues({sourceDir: source, targetDir: target});

  assert.strictEqual(result.copied, 2);
  assert.deepStrictEqual(fs.readdirSync(target).sort(), ['2026-W46.json', '2026-W47.json', 'keep.txt']);
});

test('fails when the source has no weekly issues', (t) => {
  const source = tempDir();
  const target = tempDir();
  t.after(() => fs.rmSync(source, {recursive: true, force: true}));
  t.after(() => fs.rmSync(target, {recursive: true, force: true}));
  assert.throws(() => syncIssues({sourceDir: source, targetDir: target}), /no weekly issues/);
});

test('copies RSS weekly JSON files and removes stale JSON', (t) => {
  const target = tempDir();
  t.after(() => fs.rmSync(target, {recursive: true, force: true}));
  fs.writeFileSync(path.join(target, 'keep.txt'), 'keep');
  fs.writeFileSync(path.join(target, '2025-W01.json'), 'stale');

  const result = syncRssWeeks({sourceDir: RSS_FIXTURES, targetDir: target});

  assert.strictEqual(result.copied, 2);
  assert.deepStrictEqual(fs.readdirSync(target).sort(), ['2026-W46.json', '2026-W47.json', 'keep.txt']);
});

test('a missing RSS source is valid and clears stale RSS JSON', (t) => {
  const parent = tempDir();
  const target = tempDir();
  t.after(() => fs.rmSync(parent, {recursive: true, force: true}));
  t.after(() => fs.rmSync(target, {recursive: true, force: true}));
  fs.writeFileSync(path.join(target, '2025-W01.json'), 'stale');

  assert.deepStrictEqual(
    syncRssWeeks({sourceDir: path.join(parent, 'missing'), targetDir: target}),
    {copied: 0},
  );
  assert.deepStrictEqual(fs.readdirSync(target), []);
});

test('rejects inherited command-line option names', () => {
  assert.throws(() => parseArgs(['--constructor', 'x']), /Unknown or incomplete argument/);
});

test('accepts explicit RSS source and target options', () => {
  const args = parseArgs(['--rss-source', '/rss-in', '--rss-target', '/rss-out']);
  assert.strictEqual(args['rss-source'], '/rss-in');
  assert.strictEqual(args['rss-target'], '/rss-out');
});
