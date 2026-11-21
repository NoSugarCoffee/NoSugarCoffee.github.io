// Pure helpers for RSS weekly digests produced by ai-repo-insights.

const SCHEMA = 'rss-weekly/1';
const REQUIRED_FIELDS = ['id', 'week_start', 'week_end', 'generated_at', 'opml', 'groups', 'failed_feeds'];
const ITEM_FIELDS = ['title', 'url', 'source', 'published_at', 'summary_zh'];
const FAILED_FEED_FIELDS = ['source', 'xmlUrl', 'error'];

class RssWeeklyDataError extends Error {
  constructor(fileName, reason) {
    super(`Invalid RSS weekly digest ${fileName}: ${reason}. Fix or regenerate it in ai-repo-insights/data/rss-weekly.`);
    this.name = 'RssWeeklyDataError';
  }
}

function requireString(record, field, path, fileName) {
  if (typeof record[field] !== 'string') {
    throw new RssWeeklyDataError(fileName, `${path} must have string field "${field}"`);
  }
}

function isValidCalendarDate(year, month, day) {
  const numericYear = Number(year);
  const numericMonth = Number(month);
  const numericDay = Number(day);
  const leapYear = numericYear % 4 === 0 && (numericYear % 100 !== 0 || numericYear % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return numericMonth >= 1 && numericMonth <= 12 && numericDay >= 1 && numericDay <= daysInMonth[numericMonth - 1];
}

function requireIsoDate(record, field, path, fileName) {
  requireString(record, field, path, fileName);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(record[field]);
  if (!match || !isValidCalendarDate(match[1], match[2], match[3])) {
    throw new RssWeeklyDataError(fileName, `${path}.${field} "${record[field]}" is not a valid ISO date`);
  }
}

function requireIsoTimestamp(record, field, path, fileName) {
  requireString(record, field, path, fileName);
  // Hour and minute are required. Seconds and a fraction are optional so both
  // 2026-11-22T21:30Z and 2026-11-22T21:30:00+08:00 are accepted. A zone is
  // required: Z or a numeric offset. Date-only values are not timestamps.
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(?:Z|[+-](?:(?:0\d|1[0-3]):[0-5]\d|14:00))$/.exec(
      record[field],
    );
  if (!match || !isValidCalendarDate(match[1], match[2], match[3]) || Number.isNaN(Date.parse(record[field]))) {
    throw new RssWeeklyDataError(fileName, `${path}.${field} "${record[field]}" is not a valid ISO timestamp`);
  }
}

function formatUtcDate(utcMs) {
  const date = new Date(utcMs);
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${date.getUTCFullYear()}-${month}-${day}`;
}

// Monday and Sunday of an ISO week, or null when that week-year does not exist.
// Thursday of the week must fall in the ISO year; that rejects 2025-W53.
function isoWeekRange(year, week) {
  const jan4Utc = Date.UTC(year, 0, 4);
  const jan4Weekday = new Date(jan4Utc).getUTCDay() || 7;
  const monday = jan4Utc - (jan4Weekday - 1) * 86400000 + (week - 1) * 7 * 86400000;
  if (new Date(monday + 3 * 86400000).getUTCFullYear() !== year) {
    return null;
  }
  return {start: formatUtcDate(monday), end: formatUtcDate(monday + 6 * 86400000)};
}

function parseRssWeek(fileName, text) {
  let week;
  try {
    week = JSON.parse(text);
  } catch (error) {
    throw new RssWeeklyDataError(fileName, `not valid JSON (${error.message})`);
  }
  if (week === null || typeof week !== 'object' || Array.isArray(week)) {
    throw new RssWeeklyDataError(fileName, 'content must be a JSON object');
  }
  if (week.schema !== SCHEMA) {
    throw new RssWeeklyDataError(fileName, `schema "${week.schema}" is not supported (expected "${SCHEMA}")`);
  }
  for (const field of REQUIRED_FIELDS) {
    if (week[field] === undefined || week[field] === null) {
      throw new RssWeeklyDataError(fileName, `missing required field "${field}"`);
    }
  }
  const idMatch = typeof week.id === 'string' ? /^(\d{4})-W(0[1-9]|[1-4]\d|5[0-3])$/.exec(week.id) : null;
  if (!idMatch) {
    throw new RssWeeklyDataError(fileName, `id "${week.id}" must use YYYY-Www`);
  }
  const weekRange = isoWeekRange(Number(idMatch[1]), Number(idMatch[2]));
  if (!weekRange) {
    throw new RssWeeklyDataError(fileName, `id "${week.id}" is not an ISO week`);
  }
  if (`${week.id}.json` !== fileName) {
    throw new RssWeeklyDataError(fileName, `id "${week.id}" does not match the file name`);
  }
  requireIsoDate(week, 'week_start', 'digest', fileName);
  requireIsoDate(week, 'week_end', 'digest', fileName);
  if (week.week_start !== weekRange.start || week.week_end !== weekRange.end) {
    throw new RssWeeklyDataError(
      fileName,
      `week_start "${week.week_start}" and week_end "${week.week_end}" do not match ISO week "${week.id}" (${weekRange.start} through ${weekRange.end})`,
    );
  }
  requireIsoTimestamp(week, 'generated_at', 'digest', fileName);
  requireString(week, 'opml', 'digest', fileName);
  if (!Array.isArray(week.groups)) {
    throw new RssWeeklyDataError(fileName, 'groups must be an array');
  }
  if (!Array.isArray(week.failed_feeds)) {
    throw new RssWeeklyDataError(fileName, 'failed_feeds must be an array');
  }

  week.groups.forEach((group, groupIndex) => {
    const groupPath = `groups[${groupIndex}]`;
    if (group === null || typeof group !== 'object' || Array.isArray(group)) {
      throw new RssWeeklyDataError(fileName, `${groupPath} must be an object`);
    }
    requireString(group, 'category', groupPath, fileName);
    if (!Array.isArray(group.items)) {
      throw new RssWeeklyDataError(fileName, `${groupPath}.items must be an array`);
    }
    group.items.forEach((item, itemIndex) => {
      const itemPath = `${groupPath}.items[${itemIndex}]`;
      if (item === null || typeof item !== 'object' || Array.isArray(item)) {
        throw new RssWeeklyDataError(fileName, `${itemPath} must be an object`);
      }
      ITEM_FIELDS.forEach((field) => requireString(item, field, itemPath, fileName));
      requireIsoTimestamp(item, 'published_at', itemPath, fileName);
    });
  });

  week.failed_feeds.forEach((feed, index) => {
    const feedPath = `failed_feeds[${index}]`;
    if (feed === null || typeof feed !== 'object' || Array.isArray(feed)) {
      throw new RssWeeklyDataError(fileName, `${feedPath} must be an object`);
    }
    FAILED_FEED_FIELDS.forEach((field) => requireString(feed, field, feedPath, fileName));
  });
  return week;
}

function sortRssWeeks(weeks) {
  return [...weeks].sort((a, b) => b.id.localeCompare(a.id));
}

function rssWeekTitle(week) {
  const [year, weekNumber] = week.id.split('-W');
  return `RSS 周报 · ${year} 年第 ${Number(weekNumber)} 周`;
}

// Upstream `ai-repo-insights` may commit offline samples with
// summary_mode=stub and 【stub】…摘要待生成。 placeholders when LLM_API_KEY
// is unavailable. Those are not reader-facing digests; skip them (and any
// leftover stub items) so /radar/rss never publishes placeholder copy.
const STUB_SUMMARY_RE = /^【stub】.*摘要待生成。$/;

function isStubSummary(summaryZh) {
  return typeof summaryZh === 'string' && STUB_SUMMARY_RE.test(summaryZh.trim());
}

function rssWeekItems(week) {
  if (!Array.isArray(week?.groups)) {
    return [];
  }
  return week.groups.flatMap((group) => (Array.isArray(group.items) ? group.items : []));
}

function isStubDigest(week) {
  if (week?.summary_mode === 'stub') {
    return true;
  }
  const items = rssWeekItems(week);
  return items.length > 0 && items.every((item) => isStubSummary(item.summary_zh));
}

function stripStubItems(week) {
  const groups = week.groups.map((group) => ({
    ...group,
    items: group.items.filter((item) => !isStubSummary(item.summary_zh)),
  }));
  return {...week, groups};
}

// Drop whole stub digests. Keep real digests, but remove any stub items so a
// mixed file cannot leak placeholder text. Empty weeks after stripping stay
// valid (same as an upstream empty week).
function filterPublishableRssWeeks(weeks, {warn = console.warn} = {}) {
  const publishable = [];
  for (const week of weeks) {
    if (isStubDigest(week)) {
      warn(
        `Skipping RSS weekly digest ${week.id}: stub summaries are not published ` +
          `(summary_mode=${JSON.stringify(week.summary_mode ?? null)}). ` +
          'Regenerate in ai-repo-insights without -stub-summaries.',
      );
      continue;
    }
    const cleaned = stripStubItems(week);
    const removed = rssWeekItems(week).length - rssWeekItems(cleaned).length;
    if (removed > 0) {
      warn(
        `Removed ${removed} stub summary item(s) from RSS weekly digest ${week.id} before publish.`,
      );
    }
    publishable.push(cleaned);
  }
  return publishable;
}

module.exports = {
  RssWeeklyDataError,
  parseRssWeek,
  sortRssWeeks,
  rssWeekTitle,
  isStubSummary,
  isStubDigest,
  filterPublishableRssWeeks,
};
