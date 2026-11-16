// Reads the subscription list from the rss-feeds repo at build time, so that
// repo stays the single place feeds are added and this site never drifts.

const {XMLParser} = require('fast-xml-parser');

class OpmlFetchError extends Error {
  constructor(url, reason) {
    super(`Could not load the RSS subscription list from ${url}: ${reason}`);
    this.name = 'OpmlFetchError';
  }
}

function asArray(value) {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function parseOpml(xml) {
  const parser = new XMLParser({ignoreAttributes: false, attributeNamePrefix: ''});
  const groups = asArray(parser.parse(xml).opml?.body?.outline);
  return groups.map((group) => ({
    name: group.text,
    feeds: asArray(group.outline).map((feed) => ({
      name: feed.text,
      siteUrl: feed.htmlUrl,
      feedUrl: feed.xmlUrl,
    })),
  }));
}

module.exports = function rssFeedsPlugin(context, options) {
  return {
    name: 'rss-feeds',
    async loadContent() {
      const response = await fetch(options.opmlUrl).catch((error) => {
        throw new OpmlFetchError(options.opmlUrl, error.message);
      });
      if (!response.ok) {
        throw new OpmlFetchError(options.opmlUrl, `HTTP ${response.status}`);
      }
      const groups = parseOpml(await response.text());
      if (groups.length === 0) {
        throw new OpmlFetchError(options.opmlUrl, 'the file contains no feed groups');
      }
      return {opmlUrl: options.opmlUrl, groups};
    },
    async contentLoaded({content, actions}) {
      actions.setGlobalData(content);
    },
  };
};
