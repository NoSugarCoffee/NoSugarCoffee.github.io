#!/usr/bin/env node
// Usage: yarn add-wechat <https://mp.weixin.qq.com/s/...>
//
// WeChat offers no feed or usable API for an Official Account's own articles
// (see the PR that added this script), so each article is added by link. The
// metadata is fetched once here and committed, rather than at build time, so a
// WeChat change or block can never break a deploy.

const fs = require('fs');
const path = require('path');

const ARTICLES_FILE = path.join(__dirname, '..', 'src', 'data', 'wechat-articles.json');
const ARTICLE_URL_PATTERN = /^https:\/\/mp\.weixin\.qq\.com\/s\/[\w-]+$/;
const FETCH_TIMEOUT_MS = 30_000;

class ArticleMetadataError extends Error {
  constructor(url, field) {
    super(
      `Could not find "${field}" in ${url}. WeChat may have changed its page ` +
        'markup or served a verification page; open the link in a browser to check.',
    );
    this.name = 'ArticleMetadataError';
  }
}

// Covers what WeChat emits in og: values: numeric references and the XML
// entities. Anything else is left as-is and shows up in the review of the diff.
const NAMED_ENTITIES = {quot: '"', apos: "'", lt: '<', gt: '>', amp: '&', nbsp: ' '};

function decodeHtmlEntities(text) {
  return text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, body) => {
    if (body[0] !== '#') return NAMED_ENTITIES[body.toLowerCase()] ?? entity;
    const codePoint = body[1].toLowerCase() === 'x' ? parseInt(body.slice(2), 16) : Number(body.slice(1));
    return String.fromCodePoint(codePoint);
  });
}

function readAttribute(tag, name) {
  const match = tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i'));
  return match ? match[1] ?? match[2] : null;
}

function readMetaProperty(html, property) {
  const tag = (html.match(/<meta\b[^>]*>/gi) ?? []).find((meta) => readAttribute(meta, 'property') === property);
  const content = tag ? readAttribute(tag, 'content') : null;
  return content === null ? null : decodeHtmlEntities(content);
}

function parseArticle(url, html) {
  const title = readMetaProperty(html, 'og:title');
  if (!title) throw new ArticleMetadataError(url, 'og:title');

  const cover = readMetaProperty(html, 'og:image');
  if (!cover) throw new ArticleMetadataError(url, 'og:image');

  const sendTime = html.match(/ori_send_time: '(\d+)'/);
  if (!sendTime) throw new ArticleMetadataError(url, 'ori_send_time');

  return {
    url,
    title,
    description: readMetaProperty(html, 'og:description') ?? '',
    cover,
    publishedAt: new Date(Number(sendTime[1]) * 1000).toISOString(),
  };
}

function withArticle(articles, article) {
  return [...articles.filter((existing) => existing.url !== article.url), article].sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt),
  );
}

async function main(url) {
  if (!url || !ARTICLE_URL_PATTERN.test(url)) {
    throw new Error(
      `Expected a short WeChat article link like https://mp.weixin.qq.com/s/<id>, got: ${url ?? '(nothing)'}`,
    );
  }

  const response = await fetch(url, {
    headers: {'User-Agent': 'Mozilla/5.0 (Macintosh)'},
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`Fetching ${url} returned HTTP ${response.status}.`);
  }
  const article = parseArticle(url, await response.text());

  const articles = JSON.parse(fs.readFileSync(ARTICLES_FILE, 'utf8'));
  fs.writeFileSync(ARTICLES_FILE, `${JSON.stringify(withArticle(articles, article), null, 2)}\n`);
  const publishedDate = new Date(article.publishedAt).toLocaleDateString('sv-SE', {timeZone: 'Asia/Shanghai'});
  console.log(`Added "${article.title}" (${publishedDate}) to ${path.relative(process.cwd(), ARTICLES_FILE)}`);
}

main(process.argv[2]).catch((error) => {
  console.error(error.cause ? `${error.message}: ${error.cause.message ?? error.cause}` : error.message);
  process.exit(1);
});
