const {test} = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const aiRadarPlugin = require('./index');

test('loads with no RSS weekly directory', async (t) => {
  const siteDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-radar-plugin-'));
  t.after(() => fs.rmSync(siteDir, {recursive: true, force: true}));
  const dataDir = path.join(siteDir, 'radar-data');
  fs.mkdirSync(dataDir);
  fs.copyFileSync(
    path.join(__dirname, '../../scripts/fixtures/radar/data/weekly/2026-W47.json'),
    path.join(dataDir, '2026-W47.json'),
  );

  const plugin = aiRadarPlugin(
    {siteDir},
    {dataDir: 'radar-data', rssDataDir: 'radar-rss-data'},
  );
  const content = await plugin.loadContent();

  assert.strictEqual(content.issues.length, 1);
  assert.deepStrictEqual(content.rssWeeks, []);
});
