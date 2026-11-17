const {test} = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const {parseIssue, sortIssues, issueTitle, buildRss, formatChinaDate, RadarDataError} = require('./issues');

const FIXTURE = fs.readFileSync(
  path.join(__dirname, '../../scripts/fixtures/radar/data/weekly/2026-W47.json'),
  'utf8',
);

function withFields(fields) {
  return JSON.stringify({...JSON.parse(FIXTURE), ...fields});
}

test('parses a valid issue', () => {
  const issue = parseIssue('2026-W47.json', FIXTURE);
  assert.strictEqual(issue.id, '2026-W47');
  assert.strictEqual(issue.newProjects.length, 2);
});

test('rejects an unknown schema version and names the file', () => {
  assert.throws(
    () => parseIssue('2026-W47.json', withFields({schemaVersion: 2})),
    (err) => err instanceof RadarDataError && /2026-W47\.json/.test(err.message) && /schemaVersion/.test(err.message),
  );
});

test('rejects an id that does not match the file name', () => {
  assert.throws(() => parseIssue('2026-W47.json', withFields({id: '2026-W46'})), RadarDataError);
});

test('rejects invalid JSON and a missing required field', () => {
  assert.throws(() => parseIssue('2026-W47.json', '{'), /2026-W47\.json/);
  const missing = JSON.parse(FIXTURE);
  delete missing.headline;
  assert.throws(() => parseIssue('2026-W47.json', JSON.stringify(missing)), /headline/);
});

test('rejects non-object issues and invalid issue metadata', () => {
  assert.throws(() => parseIssue('2026-W47.json', 'null'), /2026-W47\.json.*JSON object/);
  assert.throws(() => parseIssue('2026-W47.json', withFields({year: '2026'})), /year and week must be integers/);
  assert.throws(() => parseIssue('2026-W47.json', withFields({generatedAt: 'not-a-date'})), /generatedAt/);
});

test('rejects malformed items and names the file', () => {
  const issue = JSON.parse(FIXTURE);
  delete issue.newEntries[0].comment;
  assert.throws(
    () => parseIssue('2026-W47.json', JSON.stringify(issue)),
    /2026-W47\.json.*newEntries\[0\].*comment/,
  );
});

test('sorts issues newest first across the ISO year boundary', () => {
  const ids = sortIssues([
    {id: '2026-W47', year: 2026, week: 47},
    {id: '2027-W01', year: 2027, week: 1},
    {id: '2026-W53', year: 2026, week: 53},
  ]).map((issue) => issue.id);
  assert.deepStrictEqual(ids, ['2027-W01', '2026-W53', '2026-W47']);
});

test('titles the issue without zero padding', () => {
  assert.strictEqual(issueTitle({week: 7, headline: 'X'}), 'AI 开源雷达 · 第 7 周：X');
});

test('formats Asia/Shanghai dates with explicit hyphen separators', () => {
  assert.strictEqual(
    formatChinaDate('2026-11-16T16:30:00Z', {year: 'numeric', month: '2-digit', day: '2-digit'}),
    '2026-11-17',
  );
  assert.strictEqual(formatChinaDate('2026-11-16T16:30:00Z', {month: '2-digit', day: '2-digit'}), '11-17');
});

test('builds RSS with one item per issue and escapes XML', () => {
  const issue = {...JSON.parse(FIXTURE), headline: 'A & <B> "C"'};
  const rss = buildRss([issue], 'https://NoSugarCoffee.github.io');
  assert.match(rss, /<guid>https:\/\/NoSugarCoffee\.github\.io\/radar\/2026-W47<\/guid>/);
  assert.match(rss, /A &amp; &lt;B&gt; &quot;C&quot;/);
  assert.strictEqual(rss.match(/<item>/g).length, 1);
});
