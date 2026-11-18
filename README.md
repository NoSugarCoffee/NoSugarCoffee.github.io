<div align="center">
  <img src="logo.png" alt="NoSugarCoffee" width="512"/>

  [![Built with Docusaurus](https://img.shields.io/badge/Built%20with-Docusaurus%203-brightgreen?logo=docusaurus)](https://docusaurus.io/)
  [![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
  [![Deploy](https://img.shields.io/badge/Deploy-GitHub%20Pages-222?logo=github)](https://NoSugarCoffee.github.io)
  [![Node](https://img.shields.io/badge/Node-%3E%3D18-339933?logo=node.js)](https://nodejs.org)

  **☕ 诗序: the home of the 公众号「代码之序」, with notes on AI coding and code knowledge bases, plus a weekly radar of new AI open-source projects 📡**

  [🏠 Home](https://NoSugarCoffee.github.io) · [✍️ 文章](https://NoSugarCoffee.github.io/articles) · [📡 AI 雷达](https://NoSugarCoffee.github.io/radar) · [🗄️ 归档](https://NoSugarCoffee.github.io/archive) · [🔖 订阅](https://NoSugarCoffee.github.io/feeds) · [🧩 Leetcode](https://nosugarcoffee.github.io/leetcode/)
</div>

---

## ✨ What's inside

| Page | What it shows | Where the content comes from |
|------|---------------|------------------------------|
| **Home** `/` | The 公众号 「代码之序」 with its QR code, and the 6 newest articles | `src/data/wechat-articles.json` |
| **文章** `/articles` | Every 公众号 article as a card. Each card opens the article in WeChat | `src/data/wechat-articles.json` |
| **AI 雷达** `/radar` | One issue per ISO week. 🆕 new projects (created in the last 30 days) and ↗ repositories on GitHub trending for the first time, each with a one-line comment. Its subscription feed is at `/radar/rss.xml` | `data/weekly/*.json` from [ai-repo-insights](https://github.com/NoSugarCoffee/ai-repo-insights) |
| **RSS 周报** `/radar/rss` | A separate weekly digest of subscribed articles, grouped by category with Chinese one-line summaries. Specific weeks use `/radar/rss/<YYYY-Www>`; both kinds of past issue are at `/radar/archive` | `data/rss-weekly/*.json` from [ai-repo-insights](https://github.com/NoSugarCoffee/ai-repo-insights) |
| **归档** `/archive` | Older blog posts on Go and Maven | `blog/` |
| **订阅** `/feeds` | The RSS feeds I read, grouped | `feeds.opml` in [rss-feeds](https://github.com/NoSugarCoffee/rss-feeds), read at build time |

Old URLs keep working. The 64 `/trending` URLs (issues, pages and tags) redirect to `/radar`, but `/trending/rss.xml` does not; subscribers should use `/radar/rss.xml`. The old post and translation URLs redirect to their new pages. The redirect list is in `docusaurus.config.js`.

---

## 🚀 Run it locally

The site uses yarn 1, as CI does. Install the dependencies:

```bash
yarn install
```

The build needs at least one open-source radar issue in `radar-data/`. RSS weekly data is optional. Copy both published collections from ai-repo-insights:

```bash
yarn sync-reports
```

If ai-repo-insights has no issue yet, copy the sample open-source and RSS issues instead:

```bash
node scripts/sync-reports.js --source scripts/fixtures/radar/data/weekly
```

Start the dev server on http://localhost:3000:

```bash
yarn start
```

---

## ✍️ Add a 公众号 article

Pass one or more article links:

```bash
yarn add-wechat https://mp.weixin.qq.com/s/ARTICLE_ID
```

The script reads each article's title, description, cover and publish time, and adds it to `src/data/wechat-articles.json`, newest first. If any link fails, it writes nothing. Commit the JSON file.

---

## 🧪 Test

The unit tests cover both radar collections and the sync script:

```bash
node --test scripts/sync-reports.test.js plugins/ai-radar/issues.test.js plugins/ai-radar/rss-weekly.test.js
```

`scripts/check-radar.test.js` checks the built pages and every `/trending` redirect. Build with the sample issues first:

```bash
node scripts/sync-reports.js --source scripts/fixtures/radar/data/weekly
yarn build
node --test scripts/check-radar.test.js
```

---

## 🏗️ Deploy

`.github/workflows/deploy.yml` builds the site and publishes it to GitHub Pages. It runs in three cases:

- A push to `master`.
- A `radar-updated` repository dispatch. The workflow in ai-repo-insights sends this same event after it publishes open-source radar data, RSS weekly data, or both.
- A manual run from the Actions tab.

Pull requests run `.github/workflows/test-deploy.yml`, which builds without publishing.

---

## 🗂️ Project structure

```
.
├── blog/                   # 归档 posts
├── plugins/
│   ├── ai-radar/           # Validates both weekly collections and adds /radar pages
│   └── rss-feeds/          # Reads feeds.opml from the rss-feeds repo at build time
├── scripts/
│   ├── sync-reports.js     # Copies open-source and RSS weekly JSON from ai-repo-insights
│   ├── add-wechat-article.js
│   └── fixtures/           # Sample radar issues for local builds and tests
├── specs/                  # Design docs and implementation plans
├── src/
│   ├── components/         # Radar pages and the article card
│   ├── data/               # 公众号 article list and the frozen /trending route list
│   └── pages/              # Home, 文章 and 订阅
├── static/                 # Images, including the 公众号 QR code
└── docusaurus.config.js    # Navbar, plugins and redirects
```

`radar-data/` and `radar-rss-data/` are created by `yarn sync-reports` and are not committed. A missing or empty `data/rss-weekly/` is valid, but any JSON file present there must match schema `rss-weekly/1`. The filename and `id` must use the same ISO week (`YYYY-Www`), field names stay snake_case, and `generated_at` / `published_at` must be ISO 8601 dates. Empty weeks should still be valid files with no items. After publishing, the generator should continue sending repository dispatch type `radar-updated`; no separate event is required.

---

## 🛠️ Tech stack

- **[Docusaurus 3](https://docusaurus.io/)**, with two local plugins for the radar and the feed list.
- **React 18** for the custom pages.
- **GitHub Pages** for hosting, deployed by GitHub Actions.

---

## 📄 License

MIT © [NoSugarCoffee](https://github.com/NoSugarCoffee)
