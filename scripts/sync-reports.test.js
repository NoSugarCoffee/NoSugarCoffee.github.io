const {test} = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {syncIssues, parseArgs} = require('./sync-reports');

const FIXTURES = path.join(__dirname, 'fixtures/radar/data/weekly');

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

test('rejects inherited command-line option names', () => {
  assert.throws(() => parseArgs(['--constructor', 'x']), /Unknown or incomplete argument/);
});
