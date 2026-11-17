const {test} = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {syncIssues} = require('./sync-reports');

const FIXTURES = path.join(__dirname, 'fixtures/radar/data/weekly');

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'radar-sync-'));
}

test('copies only weekly issue JSON files', () => {
  const source = tempDir();
  for (const name of fs.readdirSync(FIXTURES)) {
    fs.copyFileSync(path.join(FIXTURES, name), path.join(source, name));
  }
  fs.writeFileSync(path.join(source, 'notes.md'), 'x');
  fs.writeFileSync(path.join(source, '2026-11-week47.md'), 'x');
  const target = tempDir();

  const result = syncIssues({sourceDir: source, targetDir: target});

  assert.strictEqual(result.copied, 2);
  assert.deepStrictEqual(fs.readdirSync(target).sort(), ['2026-W46.json', '2026-W47.json']);
});

test('fails when the source has no weekly issues', () => {
  assert.throws(() => syncIssues({sourceDir: tempDir(), targetDir: tempDir()}), /no weekly issues/);
});
