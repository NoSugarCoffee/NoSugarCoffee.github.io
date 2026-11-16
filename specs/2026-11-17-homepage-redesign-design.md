# Homepage redesign: lead with 代码之序

Date: 2026-11-17 · Builds on PR #22 (the `/feeds` page and `yarn add-wechat`)

## Why

The site's writing is scattered across four places: three 2022 posts on `/`, two translations, five WeChat
articles reachable only through `/feeds`, and 42 auto-generated AI Trending reports. A first-time visitor
lands on four-year-old Go and Maven posts.

The site should show **that I'm working on AI and code knowledge bases right now**, and get the visitor to
**follow the WeChat Official Account 代码之序**. WeChat is where I publish. The site is the front door.

- **Goal:** the first screen names the account, says what it covers, and shows the QR code. My latest
  articles sit directly below.
- **Non-goals:** republishing article text on the site (decided: the text stays on WeChat), SEO for article
  bodies, comments, newsletter email.
- **Anti-goal:** any article list I have to maintain in two places. Everything reads from
  `src/data/wechat-articles.json`.

## Approaches

1. **New homepage component `src/pages/index.js`** (chosen). This is how Docusaurus expects a custom
   homepage. It reads the article JSON, so `yarn add-wechat` updates the homepage too.
2. Swizzle the blog list page and inject a hero. Rejected: the homepage would stay blog-shaped, and swizzled
   theme code breaks on Docusaurus upgrades.
3. A separate static landing page. Rejected: it needs a second copy of the article data, which is the
   scatter this redesign removes.

Layout: option **B** from the mockups (account on the first screen, article cards below), picked over
A (intro + list + follow at the bottom) and C (topic groups + sidebar).

## Design

### Homepage `/` (layout B)

- **Hero:** account name **代码之序**, a one-line description, and the account QR code on the right, labeled
  扫码关注. On narrow screens the QR code stacks below the text.
- **最近的文章:** cards (cover, title, date) for the newest 6 articles, the same cards as `/feeds`, then a
  **全部文章 →** link to `/articles`. Cards open the article on WeChat.

### Routes and navbar

| Route | Content | Navbar |
|---|---|---|
| `/` | new homepage | logo + 诗序 |
| `/articles` | all WeChat articles (the article half of today's `/feeds`) | 文章 |
| `/trending` | AI Trending, unchanged | AI Trending |
| `/archive` | the 3 old blog posts plus the Go DI translation | 归档 |
| `/feeds` | RSS subscriptions only (the RSS half of today's `/feeds`) | right side: 订阅 |
| — | Leetcode Solutions, GitHub | right side, unchanged |

- The main blog plugin moves from `routeBasePath: '/'` to `'archive'`. `translation/go依赖注入.md` moves into
  `blog/`, and the `translation` blog plugin is removed.
- `translation/超大规模代码库的RAG实践指南.md` is deleted, because it duplicates the WeChat article.
- **Old links keep working.** `@docusaurus/plugin-client-redirects` (pinned to 3.0.0, the same version as
  core) redirects:
  - `/Go error handing`, `/Maven Summary` and `/Mvnd vs Maven` → their `/archive/...` URLs
  - `/translation/Go 的依赖注入` → its `/archive/...` URL
  - `/translation/超大规模代码库的RAG实践指南` → `/articles`
  - `/translation` → `/archive`

### Template cleanup

- Remove the `docs` preset (`docs: false`) and delete `docs/` (Docusaurus tutorial pages), plus
  `src/pages/markdown-page.md` and the unused `src/components/HomepageFeatures.*`.
- Replace the tagline "Dinosaurs are cool" with the hero's one-liner.
- Point the blog `editUrl` at this repo instead of `facebook/docusaurus`.

### QR code

The public `mp.weixin.qq.com/mp/qrcode` URL doesn't serve this account's QR code, so it will be downloaded
once from the account's 后台 (公众号设置 → 二维码) through ego-browser and committed as
`static/img/wechat-qrcode.jpg`. The page never loads it from WeChat at runtime.

## Constraints

- Lockfiles resolve from `registry.npmjs.org` only. The local npm config points at a private registry, so
  add the dependency with `--registry https://registry.npmjs.org`, and keep `yarn.lock` and
  `package-lock.json` diffs to the new entries.
- CI uses Node 18. `yarn sync-reports` must run before `yarn build`.

## My calls (please check)

- **Hero wording:** "关于 AI 编程和代码知识库的实践笔记：RAG、代码图、Agent 与开发环境。" Change it to your
  own voice if you like.
- **Navbar title:** stays 诗序, the site's name. 代码之序 appears in the hero as the account.
- **Number of cards:** the homepage shows 6, so all 5 articles appear today.
- **Delivery:** this goes on the existing PR #22 branch, so everything is reviewed and merged together.
- The Go DI translation moves into 归档 instead of keeping a 外刊翻译 section with one 2022 post.
