// Assertions on the built site (run after `yarn build` with the fixture issues
// synced: node scripts/sync-reports.js --source scripts/fixtures/radar/data/weekly).
const {describe, test} = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const BUILD = path.join(__dirname, '..', 'build');
const LEGACY = require('../src/data/legacy-trending-routes.json');

function page(route) {
  // Normalize Docusaurus SSR separators so assertions can match reader-visible text.
  return fs
    .readFileSync(path.join(BUILD, route, 'index.html'), 'utf8')
    .replace(/\0/g, '')
    .replace(/<!-- -->/g, '');
}

describe('built radar site', {skip: !fs.existsSync(BUILD)}, () => {
  test('an issue page shows its title, both columns and cards', () => {
    const html = page('radar/2026-W47');
    assert.match(html, /AI 开源雷达 · 第 47 周：/);
    assert.match(html, /🆕 新项目/);
    assert.match(html, /↗ 新上榜/);
    assert.strictEqual((html.match(/data-radar-card/g) || []).length, 2);
    assert.match(html, /2026-11-16/);
    assert.match(html, /创建于 (?:<!-- -->)?10-28/);
    assert.doesNotMatch(html, /\+null/);
    assert.doesNotMatch(html, /\+0\/周/);
  });

  test('an empty week says so instead of showing empty columns', () => {
    const html = page('radar/2026-W46');
    assert.match(html, /本周没有新冒头的项目/);
    assert.doesNotMatch(html, /🆕 新项目/);
  });

  test('/radar shows the newest issue and the archive lists every issue', () => {
    assert.match(page('radar'), /第 47 周/);
    const archive = page('radar/archive');
    assert.match(archive, /第 47 周/);
    assert.match(archive, /第 46 周/);
    assert.match(archive, /RSS 周报往期/);
    assert.match(archive, /\/radar\/rss\/2026-W47/);
  });

  test('an RSS week groups linked articles with Shanghai dates and summaries', () => {
    const html = page('radar/rss/2026-W47');
    assert.match(html, /RSS 周报 · 2026 年第 47 周/);
    assert.match(html, /Blogs/);
    assert.match(html, /Research/);
    assert.match(html, /The Architecture of Open Source Applications/);
    assert.match(html, /href="https:\/\/martinfowler\.com\/articles\/example-architecture\.html"/);
    assert.match(html, /Martin Fowler/);
    assert.match(html, /2026-11-17/);
    assert.match(html, /从真实项目拆解架构决策/);
    assert.match(html, /1 个订阅源抓取失败：Unavailable Notes/);
    assert.strictEqual((html.match(/data-rss-item/g) || []).length, 3);
  });

  test('the latest RSS route uses the newest week and an empty week is friendly', () => {
    assert.match(page('radar/rss'), /2026 年第 47 周/);
    const empty = page('radar/rss/2026-W46');
    assert.match(empty, /本周没有收录到新文章/);
    assert.doesNotMatch(empty, /data-rss-item/);
  });

  test('radar pages link to the separate RSS weekly section', () => {
    const html = page('radar');
    assert.match(html, /href="\/radar\/rss"/);
    assert.match(html, /RSS 周报/);
  });

  test('every old /trending URL redirects to /radar', () => {
    assert.strictEqual(LEGACY.length, 64);
    for (const route of LEGACY) {
      const html = page(route);
      assert.match(html, /http-equiv="refresh" content="0; url=\/radar"/, route);
    }
  });

  test('the old trending feed is gone and the navbar says AI 雷达', () => {
    assert.ok(!fs.existsSync(path.join(BUILD, 'trending/rss.xml')));
    const html = page('radar');
    assert.match(html, /AI 雷达/);
    assert.doesNotMatch(html, /AI Trending/);
  });
});
