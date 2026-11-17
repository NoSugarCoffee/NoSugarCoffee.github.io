// Assertions on the built site (run after `yarn build` with the fixture issues
// synced: node scripts/sync-reports.js --source scripts/fixtures/radar/data/weekly).
const {test} = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const BUILD = path.join(__dirname, '..', 'build');
const LEGACY = require('../src/data/legacy-trending-routes.json');

function page(route) {
  // Docusaurus 3.0.0 leaves stray NUL bytes in SSR output; strip them so text matching works.
  return fs.readFileSync(path.join(BUILD, route, 'index.html'), 'utf8').replace(/\0/g, '');
}

test('an issue page shows its title, both columns and cards', () => {
  const html = page('radar/2026-W47');
  assert.match(html, /AI 开源雷达 · 第 47 周：/);
  assert.match(html, /🆕 新项目/);
  assert.match(html, /↗ 新上榜/);
  assert.strictEqual((html.match(/data-radar-card/g) || []).length, 2);
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
});

test('every old /trending URL redirects to /radar', () => {
  assert.ok(LEGACY.length >= 48);
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
