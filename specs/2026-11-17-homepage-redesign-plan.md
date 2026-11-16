# Homepage Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the blog-at-root homepage with a 代码之序-first homepage (layout B), and consolidate the site's sections into 文章 · AI Trending · 归档.

**Architecture:** A custom `src/pages/index.js` reads `src/data/wechat-articles.json`, the same data `/articles` uses, through a shared card component. The main blog moves to `/archive`, and `@docusaurus/plugin-client-redirects` keeps old URLs working. The template leftovers are deleted.

**Tech Stack:** Docusaurus 3.0.0, React 18, CSS modules, yarn 1 (CI), Node 18 (CI) / 22 (local, `ASDF_NODEJS_VERSION=22.23.1`).

**Spec:** `specs/2026-11-17-homepage-redesign-design.md`

(The plan lives in `specs/` rather than `docs/superpowers/plans/`, because `docs/` is Docusaurus content and Task 3 deletes it.)

## Global Constraints

- Lockfiles resolve from `registry.npmjs.org` only. Install with `--registry https://registry.npmjs.org`, and keep the `yarn.lock` and `package-lock.json` diffs to the new entries. After any `npm` command, run `git diff --stat yarn.lock`, because npm rewrites `yarn.lock` too.
- `@docusaurus/plugin-client-redirects` is pinned to `3.0.0`, the same version as core.
- Before every build, run `yarn sync-reports`, as CI does. Build: `npx -y yarn@1.22.22 -s build`. `onBrokenLinks: 'throw'` stays on, so a broken internal link fails the build.
- Copy: the hero title is `代码之序`; the one-liner is `关于 AI 编程和代码知识库的实践笔记：RAG、代码图、Agent 与开发环境。`; the QR label is `扫码关注`; the section heading is `最近的文章`; the link is `全部文章 →`. The navbar title stays `诗序`.
- The homepage shows the newest **6** articles.

## Review Focus

1. **Old URLs with spaces or Chinese characters** (`/Go error handing`, `/translation/Go 的依赖注入`) must still land on the right page. Task 3 checks the generated redirect files.
2. **Narrow screens (≤ 996px):** the QR code stacks below the hero text, and nothing scrolls horizontally. Task 2 checks this with a 500px screenshot (headless Chrome won't go narrower).
3. **Dark mode:** the QR code must stay scannable on a dark background, so it gets a white padded frame. Task 2 checks a dark-mode screenshot.
4. **An article without a description** (the Nix and RAG articles) renders without an empty gap. This is already covered by the shared card. Task 1 keeps the conditional.
5. **More than 6 articles:** the homepage shows exactly 6, and `/articles` shows all of them. Task 2 asserts on the build output.

---

### Task 1: Shared article card, `/articles`, RSS-only `/feeds`

**Files:**
- Create: `src/components/WechatArticleCard/index.js`, `src/components/WechatArticleCard/styles.module.css`. Move the card markup and the `articleGrid` / `article*` CSS here from `src/pages/feeds.*`.
- Create: `src/pages/articles.js`. The title is `文章`. It renders every article in an `ArticleGrid`, followed by a one-line pointer to the 公众号.
- Modify: `src/pages/feeds.js` and `src/pages/feeds.module.css`. Keep only the RSS section. The page title becomes `我的订阅`.

**Interfaces:**
- Produces: `export default function WechatArticleCard({article}: {article: WechatArticle})` and `export function ArticleGrid({articles}: {articles: WechatArticle[]})`, both in `@site/src/components/WechatArticleCard`. `WechatArticle` is the JSON shape `{url, title, description, cover, publishedAt}`.

- [ ] **Step 1:** Extract the component and the grid. Make `/articles` and `/feeds` use them.
- [ ] **Step 2:** Run `yarn sync-reports && yarn build`.
  Expected: `[SUCCESS]`. `grep -c 'articleCard' build/articles/index.html` is ≥ 5. `build/feeds/index.html` contains `Anthropic Research` and doesn't contain `交给了 Nix`.
- [ ] **Step 3:** Commit `feat(articles): split WeChat articles and RSS into /articles and /feeds`.

### Task 2: Homepage (layout B) with the QR code

**Files:**
- Create: `static/img/wechat-qrcode.jpg`. Download it from the 公众号后台 (设置与开发 → 公众号设置 → 二维码 → 下载) with ego-browser, reusing the logged-in session. If the session has expired, hand control to the user so they can scan.
- Create: `src/pages/index.js` and `src/pages/index.module.css`. Delete `src/components/HomepageFeatures.*`, which nothing imports after this change.

**Interfaces:**
- Consumes: `ArticleGrid` from Task 1.
- Produces: the route `/`, which Task 3 frees by moving the blog away from it.

- [ ] **Step 1:** Implement the hero: title, one-liner, and a QR image (`alt="公众号 代码之序 二维码"`, white padded frame) with the label `扫码关注`, laid out as a flex row that wraps below 996px. Below the hero, show `最近的文章` with `ArticleGrid` over `articles.slice(0, 6)`, then a `全部文章 →` link to `/articles`.
- [ ] **Step 2:** This task can't build alone, because the blog still owns `/` until Task 3. Do Task 3, then come back to Step 3 here.
- [ ] **Step 3:** Verify after Task 3's build. `build/index.html` contains `代码之序`, `扫码关注` and `/img/wechat-qrcode.jpg`. `grep -o 'articleCard' build/index.html | wc -l` equals `min(6, article count)`. Take screenshots at 1280px light, 1280px dark (`localStorage theme=dark`, or `?docusaurus-theme=dark`) and 500px, and check that the QR code is visible and readable in each and that nothing overflows.
- [ ] **Step 4:** Commit `feat(home): lead with 代码之序 and recent articles`.

### Task 3: Routes, redirects, navbar, template cleanup

**Files:**
- Modify: `docusaurus.config.js`. Main blog: `routeBasePath: 'archive'`, `blogTitle: '归档'`, `editUrl` set to `https://github.com/NoSugarCoffee/NoSugarCoffee.github.io/edit/master/`. Set `docs: false`. Remove the `translation` plugin. Change `tagline` to the one-liner. Add the redirects plugin. Navbar left: `文章` → `/articles`, `AI Trending` → `/trending`, `归档` → `/archive`. Navbar right: `订阅` → `/feeds`, then Leetcode Solutions and GitHub unchanged.
- Move: `translation/go依赖注入.md` → `blog/go依赖注入.md`, plus any images it references.
- Delete: `translation/` (including `超大规模代码库的RAG实践指南.md`), `docs/`, `src/pages/markdown-page.md`.
- Modify: `package.json`, `yarn.lock` and `package-lock.json` to add `@docusaurus/plugin-client-redirects@3.0.0`.

**Redirects** (`redirects: [{from, to}]`). Each `to` uses the slug the post already has:

| from | to |
|---|---|
| `/Go error handing` | `/archive/Go error handing` |
| `/Maven Summary` | `/archive/Maven Summary` |
| `/Mvnd vs Maven` | `/archive/Mvnd vs Maven` |
| `/translation/Go 的依赖注入` | `/archive/Go 的依赖注入` |
| `/translation/超大规模代码库的RAG实践指南` | `/articles` |
| `/translation` | `/archive` |

- [ ] **Step 1:** Add the dependency from public npm. Check that `yarn.lock` gains only the new entries and that `grep -c ctripcorp yarn.lock package-lock.json` prints `0`.
- [ ] **Step 2:** Apply the config, the file moves and the deletions.
- [ ] **Step 3:** Run `yarn sync-reports && yarn build`.
  Expected: `[SUCCESS]` with no broken-link error. Each `from` above has a generated `build/<from>/index.html` (shell-quote the spaces) that contains a refresh pointing to its `to`. `build/archive/index.html` lists all 4 archived posts. `build/docs` and `build/translation/超大规模代码库的RAG实践指南` contain only redirects.
- [ ] **Step 4:** Commit `refactor(site): move blog to /archive, redirect old URLs, drop template pages`. Then finish Task 2, Steps 3 and 4.

### Task 4: Final check and PR

- [ ] **Step 1:** Restart the local preview (`yarn serve --port 3999`) and spot-check `/`, `/articles`, `/archive`, `/feeds`, `/trending` and one redirect in the browser.
- [ ] **Step 2:** Update the PR #22 title and description to cover the redesign. Push, and wait for `Test deployment` to pass.
- [ ] **Step 3:** Hand the local preview link back to the user. Don't merge without their go-ahead.
