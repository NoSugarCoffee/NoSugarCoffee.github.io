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

class ArticleMetadataError extends Error {
  constructor(url, field) {
    super(
      `Could not find "${field}" in ${url}. WeChat may have changed its page ` +
        'markup or served a verification page; open the link in a browser to check.',
    );
    this.name = 'ArticleMetadataError';
  }
}

function decodeHtmlEntities(text) {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function readMetaProperty(html, property) {
  const match = html.match(new RegExp(`<meta property="${property}" content="([^"]*)"`));
  return match ? decodeHtmlEntities(match[1]) : null;
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

  const response = await fetch(url, {headers: {'User-Agent': 'Mozilla/5.0 (Macintosh)'}});
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
  console.error(error.message);
  process.exit(1);
});
