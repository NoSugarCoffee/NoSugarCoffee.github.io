const {test} = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const {
  parseRssWeek,
  sortRssWeeks,
  rssWeekTitle,
  isStubSummary,
  isStubDigest,
  filterPublishableRssWeeks,
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
    () => parseRssWeek('2026-W47.json', withFields({generated_at: '2026-11-22'})),
    /generated_at/,
  );
  assert.throws(
    () => parseRssWeek('2026-W47.json', withFields({generated_at: '2026-11-22T21:30:00'})),
    /generated_at/,
  );
  assert.throws(
    () => parseRssWeek('2026-W47.json', withFields({week_start: '2026-11-31'})),
    /week_start/,
  );
  assert.throws(
    () => parseRssWeek('2026-W47.json', withFields({week_end: '2026-11-31'})),
    /week_end/,
  );
  const badPublished = JSON.parse(FIXTURE);
  badPublished.groups[0].items[0].published_at = '1';
  assert.throws(() => parseRssWeek('2026-W47.json', JSON.stringify(badPublished)), /published_at/);
});

test('accepts hour-minute ISO timestamps with Z or a numeric offset', () => {
  const week = parseRssWeek('2026-W47.json', withFields({generated_at: '2026-11-22T21:30Z'}));
  assert.strictEqual(week.generated_at, '2026-11-22T21:30Z');

  const withOffset = JSON.parse(FIXTURE);
  withOffset.generated_at = '2026-11-22T21:30:00.123+08:00';
  withOffset.groups[0].items[0].published_at = '2026-11-16T18:30+08:00';
  const parsed = parseRssWeek('2026-W47.json', JSON.stringify(withOffset));
  assert.strictEqual(parsed.generated_at, '2026-11-22T21:30:00.123+08:00');
  assert.strictEqual(parsed.groups[0].items[0].published_at, '2026-11-16T18:30+08:00');
});

test('rejects a week number the ISO year does not have', () => {
  assert.throws(
    () =>
      parseRssWeek(
        '2025-W53.json',
        withFields({
          id: '2025-W53',
          week_start: '2025-12-29',
          week_end: '2026-01-04',
        }),
      ),
    /2025-W53.*not an ISO week/,
  );
});

test('requires week_start and week_end to be the ISO Monday and Sunday', () => {
  const emptyWeek = fs.readFileSync(
    path.join(__dirname, '../../scripts/fixtures/radar/data/rss-weekly/2026-W46.json'),
    'utf8',
  );
  assert.strictEqual(parseRssWeek('2026-W46.json', emptyWeek).week_end, '2026-11-15');

  const crossYear = parseRssWeek(
    '2026-W01.json',
    withFields({id: '2026-W01', week_start: '2025-12-29', week_end: '2026-01-04'}),
  );
  assert.strictEqual(crossYear.week_start, '2025-12-29');

  const week53 = parseRssWeek(
    '2026-W53.json',
    withFields({id: '2026-W53', week_start: '2026-12-28', week_end: '2027-01-03'}),
  );
  assert.strictEqual(week53.id, '2026-W53');
  const leapWeek53 = parseRssWeek(
    '2020-W53.json',
    withFields({id: '2020-W53', week_start: '2020-12-28', week_end: '2021-01-03'}),
  );
  assert.strictEqual(leapWeek53.week_start, '2020-12-28');
  assert.throws(
    () =>
      parseRssWeek(
        '2021-W53.json',
        withFields({id: '2021-W53', week_start: '2021-12-27', week_end: '2022-01-02'}),
      ),
    /2021-W53.*not an ISO week/,
  );

  assert.throws(
    () => parseRssWeek('2026-W47.json', withFields({week_end: '2026-11-21'})),
    /week_end/,
  );
  assert.throws(
    () => parseRssWeek('2026-W47.json', withFields({week_start: '2026-11-17', week_end: '2026-11-22'})),
    /week_start/,
  );
});

test('sorts RSS weeks newest first and creates a title', () => {
  const ids = sortRssWeeks([{id: '2026-W47'}, {id: '2027-W01'}, {id: '2026-W53'}]).map(({id}) => id);
  assert.deepStrictEqual(ids, ['2027-W01', '2026-W53', '2026-W47']);
  assert.strictEqual(rssWeekTitle({id: '2026-W07'}), 'RSS 周报 · 2026 年第 7 周');
});

test('detects upstream stub summaries and stub digests', () => {
  assert.strictEqual(
    isStubSummary('【stub】文章《A deep dive into ChatGPT Sites》来自Flavio Copes，摘要待生成。'),
    true,
  );
  assert.strictEqual(isStubSummary('从真实项目拆解架构决策，重点是边界如何随需求演进。'), false);

  const stubDigest = JSON.parse(
    withFields({
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
    }),
  );
  assert.strictEqual(isStubDigest(stubDigest), true);

  const unmarkedAllStubs = JSON.parse(FIXTURE);
  for (const group of unmarkedAllStubs.groups) {
    for (const item of group.items) {
      item.summary_zh = `【stub】文章《${item.title}》来自${item.source}，摘要待生成。`;
    }
  }
  assert.strictEqual(isStubDigest(unmarkedAllStubs), true);
  assert.strictEqual(isStubDigest(JSON.parse(FIXTURE)), false);
});

test('filterPublishableRssWeeks skips stub digests and strips leftover stub items', () => {
  const warnings = [];
  const real = parseRssWeek('2026-W47.json', FIXTURE);
  const stub = parseRssWeek(
    '2026-W47.json',
    withFields({
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
    }),
  );
  const mixed = JSON.parse(FIXTURE);
  mixed.groups[0].items[0].summary_zh =
    '【stub】文章《The Architecture of Open Source Applications》来自Martin Fowler，摘要待生成。';

  const filtered = filterPublishableRssWeeks([stub, mixed, real], {
    warn: (message) => warnings.push(message),
  });

  assert.strictEqual(filtered.length, 2);
  assert.strictEqual(filtered[0].id, '2026-W47');
  assert.strictEqual(filtered[0].groups[0].items.length, 1);
  assert.strictEqual(filtered[0].groups[0].items[0].title, 'Designing agent loops that stop');
  assert.strictEqual(filtered[1].groups[0].items.length, 2);
  assert.ok(warnings.some((message) => /Skipping RSS weekly digest 2026-W47/.test(message)));
  assert.ok(warnings.some((message) => /Removed 1 stub summary item/.test(message)));
});
