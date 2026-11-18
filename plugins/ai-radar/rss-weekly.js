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

function requireDate(record, field, path, fileName) {
  requireString(record, field, path, fileName);
  if (Number.isNaN(Date.parse(record[field]))) {
    throw new RssWeeklyDataError(fileName, `${path}.${field} "${record[field]}" is not a valid date`);
  }
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
  if (typeof week.id !== 'string' || !/^\d{4}-W(?:0[1-9]|[1-4]\d|5[0-3])$/.test(week.id)) {
    throw new RssWeeklyDataError(fileName, `id "${week.id}" must use YYYY-Www`);
  }
  if (`${week.id}.json` !== fileName) {
    throw new RssWeeklyDataError(fileName, `id "${week.id}" does not match the file name`);
  }
  for (const field of ['week_start', 'week_end', 'generated_at']) {
    requireDate(week, field, 'digest', fileName);
  }
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
      requireDate(item, 'published_at', itemPath, fileName);
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

module.exports = {RssWeeklyDataError, parseRssWeek, sortRssWeeks, rssWeekTitle};
