const {test} = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const {
  parseRssWeek,
  sortRssWeeks,
  rssWeekTitle,
  RssWeeklyDataError,
} = require('./rss-weekly');

const FIXTURE = fs.readFileSync(
  path.join(__dirname, '../../scripts/fixtures/radar/data/rss-weekly/2026-W47.json'),
  'utf8',
);

function withFields(fields) {
  return JSON.stringify({...JSON.parse(FIXTURE), ...fields});
}

test('parses a valid RSS week and preserves optional fields', () => {
  const week = parseRssWeek('2026-W47.json', withFields({optional_note: 'future-compatible'}));
  assert.strictEqual(week.id, '2026-W47');
  assert.strictEqual(week.groups[0].items.length, 2);
  assert.strictEqual(week.optional_note, 'future-compatible');
});

test('rejects an unknown schema and names the file', () => {
  assert.throws(
    () => parseRssWeek('2026-W47.json', withFields({schema: 'rss-weekly/2'})),
    (error) =>
      error instanceof RssWeeklyDataError &&
      /2026-W47\.json/.test(error.message) &&
      /rss-weekly\/2/.test(error.message),
  );
});

test('rejects invalid JSON, missing fields and filename mismatch', () => {
  assert.throws(() => parseRssWeek('2026-W47.json', '{'), /2026-W47\.json/);
  const missing = JSON.parse(FIXTURE);
  delete missing.week_start;
  assert.throws(() => parseRssWeek('2026-W47.json', JSON.stringify(missing)), /week_start/);
  assert.throws(() => parseRssWeek('2026-W46.json', FIXTURE), /does not match the file name/);
});

test('rejects a non-string id and out-of-range ISO week', () => {
  assert.throws(() => parseRssWeek('2026-W47.json', withFields({id: ['2026-W47']})), /id.*YYYY-Www/);
  assert.throws(() => parseRssWeek('2026-W99.json', withFields({id: '2026-W99'})), /id.*YYYY-Www/);
});

test('rejects malformed groups, items and failed feeds', () => {
  assert.throws(() => parseRssWeek('2026-W47.json', withFields({groups: {}})), /groups.*array/);

  const badItem = JSON.parse(FIXTURE);
  delete badItem.groups[0].items[0].summary_zh;
  assert.throws(() => parseRssWeek('2026-W47.json', JSON.stringify(badItem)), /groups\[0\]\.items\[0\].*summary_zh/);

  const badFailure = JSON.parse(FIXTURE);
  delete badFailure.failed_feeds[0].xmlUrl;
  assert.throws(() => parseRssWeek('2026-W47.json', JSON.stringify(badFailure)), /failed_feeds\[0\].*xmlUrl/);
});

test('rejects invalid dates', () => {
  assert.throws(() => parseRssWeek('2026-W47.json', withFields({generated_at: 'today'})), /generated_at/);
  assert.throws(
    () => parseRssWeek('2026-W47.json', withFields({generated_at: '2026-11-31T12:00:00+08:00'})),
    /generated_at/,
  );
  assert.throws(
    () => parseRssWeek('2026-W47.json', withFields({week_start: '2026-11-31'})),
    /week_start/,
  );
  const badPublished = JSON.parse(FIXTURE);
  badPublished.groups[0].items[0].published_at = '1';
  assert.throws(() => parseRssWeek('2026-W47.json', JSON.stringify(badPublished)), /published_at/);
});

test('sorts RSS weeks newest first and creates a title', () => {
  const ids = sortRssWeeks([{id: '2026-W47'}, {id: '2027-W01'}, {id: '2026-W53'}]).map(({id}) => id);
  assert.deepStrictEqual(ids, ['2027-W01', '2026-W53', '2026-W47']);
  assert.strictEqual(rssWeekTitle({id: '2026-W07'}), 'RSS 周报 · 2026 年第 7 周');
});
