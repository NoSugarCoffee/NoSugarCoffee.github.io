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
| **AI 雷达** `/radar` | One issue per ISO week. 🆕 new projects (created in the last 30 days) and ↗ repositories on GitHub trending for the first time, each with a one-line comment. Past issues are at `/radar/archive`, and the RSS feed is at `/radar/rss.xml` | Weekly JSON from [ai-repo-insights](https://github.com/NoSugarCoffee/ai-repo-insights) |
| **归档** `/archive` | Older blog posts on Go and Maven | `blog/` |
| **订阅** `/feeds` | The RSS feeds I read, grouped | `feeds.opml` in [rss-feeds](https://github.com/NoSugarCoffee/rss-feeds), read at build time |

Old URLs keep working. `/trending/...` redirects to `/radar`, and the old post and translation URLs redirect to their new pages. The redirect list is in `docusaurus.config.js`.

---

## 🚀 Run it locally

The site uses yarn 1, as CI does. Install the dependencies:

```bash
yarn install
```

The build needs at least one radar issue in `radar-data/`. Copy the published issues from ai-repo-insights:

```bash
yarn sync-reports
```

If ai-repo-insights has no issue yet, copy the two sample issues instead:

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
yarn add-wechat https://mp.weixin.qq.com/s/<id>
```

The script reads each article's title, description, cover and publish time, and adds it to `src/data/wechat-articles.json`, newest first. If any link fails, it writes nothing. Commit the JSON file.

---

## 🧪 Test

The unit tests cover the radar plugin and the sync script:

```bash
node --test scripts/sync-reports.test.js plugins/ai-radar/issues.test.js
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
- A `radar-updated` repository dispatch. The weekly workflow in ai-repo-insights sends it after it publishes a new issue.
- A manual run from the Actions tab.

Pull requests run `.github/workflows/test-deploy.yml`, which builds without publishing.

---

## 🗂️ Project structure

```
.
├── blog/                   # 归档 posts
├── plugins/
│   ├── ai-radar/           # Validates radar issues, adds /radar pages and the RSS feed
│   └── rss-feeds/          # Reads feeds.opml from the rss-feeds repo at build time
├── scripts/
│   ├── sync-reports.js     # Copies radar issues from ai-repo-insights into radar-data/
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

`radar-data/` is created by `yarn sync-reports` and is not committed.

---

## 🛠️ Tech stack

- **[Docusaurus 3](https://docusaurus.io/)**, with two local plugins for the radar and the feed list.
- **React 18** for the custom pages.
- **GitHub Pages** for hosting, deployed by GitHub Actions.

---

## 📄 License

MIT © [NoSugarCoffee](https://github.com/NoSugarCoffee)
