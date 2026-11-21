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

test('loadContent skips upstream stub RSS digests', async (t) => {
  const siteDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-radar-plugin-'));
  t.after(() => fs.rmSync(siteDir, {recursive: true, force: true}));
  const dataDir = path.join(siteDir, 'radar-data');
  const rssDataDir = path.join(siteDir, 'radar-rss-data');
  fs.mkdirSync(dataDir);
  fs.mkdirSync(rssDataDir);
  fs.copyFileSync(
    path.join(__dirname, '../../scripts/fixtures/radar/data/weekly/2026-W47.json'),
    path.join(dataDir, '2026-W47.json'),
  );

  const stubWeek = {
    schema: 'rss-weekly/1',
    id: '2026-W47',
    week_start: '2026-11-16',
    week_end: '2026-11-22',
    generated_at: '2026-11-18T13:03:12+08:00',
    opml: 'https://raw.githubusercontent.com/NoSugarCoffee/rss-feeds/main/feeds.opml',
    summary_mode: 'stub',
    groups: [
      {
        category: 'Blogs',
        items: [
          {
            title: 'A deep dive into ChatGPT Sites',
            url: 'https://flaviocopes.com/chatgpt-sites/',
            source: 'Flavio Copes',
            published_at: '2026-11-17T17:00:00+08:00',
            summary_zh: '【stub】文章《A deep dive into ChatGPT Sites》来自Flavio Copes，摘要待生成。',
          },
        ],
      },
    ],
    failed_feeds: [],
  };
  fs.writeFileSync(path.join(rssDataDir, '2026-W47.json'), JSON.stringify(stubWeek));

  const plugin = aiRadarPlugin({siteDir}, {dataDir: 'radar-data', rssDataDir: 'radar-rss-data'});
  const content = await plugin.loadContent();

  assert.strictEqual(content.issues.length, 1);
  assert.deepStrictEqual(content.rssWeeks, []);
});
