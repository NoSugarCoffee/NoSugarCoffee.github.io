// Pure helpers for the weekly AI 开源雷达 issues produced by ai-repo-insights.

const SCHEMA_VERSION = 1;
const REQUIRED_FIELDS = ['id', 'year', 'week', 'generatedAt', 'headline', 'summary', 'newProjects', 'newEntries'];

class RadarDataError extends Error {
  constructor(fileName, reason) {
    super(`Invalid radar issue ${fileName}: ${reason}. Fix or regenerate it in ai-repo-insights/data/weekly.`);
    this.name = 'RadarDataError';
  }
}

function parseIssue(fileName, text) {
  let issue;
  try {
    issue = JSON.parse(text);
  } catch (error) {
    throw new RadarDataError(fileName, `not valid JSON (${error.message})`);
  }
  if (issue.schemaVersion !== SCHEMA_VERSION) {
    throw new RadarDataError(fileName, `schemaVersion ${issue.schemaVersion} is not supported (expected ${SCHEMA_VERSION})`);
  }
  for (const field of REQUIRED_FIELDS) {
    if (issue[field] === undefined || issue[field] === null) {
      throw new RadarDataError(fileName, `missing required field "${field}"`);
    }
  }
  if (`${issue.id}.json` !== fileName) {
    throw new RadarDataError(fileName, `id "${issue.id}" does not match the file name`);
  }
  if (!Array.isArray(issue.newProjects) || !Array.isArray(issue.newEntries)) {
    throw new RadarDataError(fileName, 'newProjects and newEntries must be arrays');
  }
  return issue;
}

// ISO years differ from calendar years around New Year, so sort by the
// (year, week) pair rather than by any date.
function sortIssues(issues) {
  return [...issues].sort((a, b) => b.year - a.year || b.week - a.week);
}

function issueTitle(issue) {
  return `AI 开源雷达 · 第 ${issue.week} 周：${issue.headline}`;
}

function escapeXml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildRss(issues, siteUrl) {
  const base = siteUrl.replace(/\/$/, '');
  const items = sortIssues(issues)
    .map((issue) => {
      const link = `${base}/radar/${issue.id}`;
      return [
        '    <item>',
        `      <title>${escapeXml(issueTitle(issue))}</title>`,
        `      <link>${link}</link>`,
        `      <guid>${link}</guid>`,
        `      <pubDate>${new Date(issue.generatedAt).toUTCString()}</pubDate>`,
        `      <description>${escapeXml(issue.summary)}</description>`,
        '    </item>',
      ].join('\n');
    })
    .join('\n');
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    '  <channel>',
    '    <title>AI 开源雷达</title>',
    `    <link>${base}/radar</link>`,
    '    <description>每周新冒头的 AI 开源项目</description>',
    '    <language>zh-CN</language>',
    items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');
}

module.exports = {RadarDataError, parseIssue, sortIssues, issueTitle, buildRss};
