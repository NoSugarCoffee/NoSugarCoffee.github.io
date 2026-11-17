# AI 开源雷达 — 设计

日期：2026-11-17
涉及仓库：`NoSugarCoffee/ai-repo-insights`（生成器，Go）、`NoSugarCoffee/NoSugarCoffee.github.io`（网站，Docusaurus 3.0.0）

## 意图

现在的「AI Trending」是 GitHub Trending 里筛出的 AI 项目周报：每期一张 50 行分数表，加上按类别罗列的项目清单。读者（包括站长自己）想从这里得到的只有一件事：**本周有哪些新冒头的 AI 项目**。现在的周报回答不了这个问题：

- 表里大量 `Heat_7 = 0`。原因是数据来自 trending 日榜、周榜、月榜三个页面拼接，0 的意思是「不在周榜上」，不是「没涨星」。
- 50 个项目里有 38 个归在 `agent`，分类分不开东西。
- 同样的项目每周重复出现，看不出哪些是新的。
- 每期都标成当月 1 号，同一个月的几周排序是乱的。
- 最近两期（第 46、47 周）的 Gemini 预付额度用完（HTTP 402），生成器悄悄退回了英文模板文字。

## 目标

1. 每周一期，首屏回答「本周新冒头了什么」，分两栏：
   - **🆕 新项目**：仓库创建时间在本期生成时刻之前 30 天内，且本周在榜。
   - **↗ 新上榜**：历史上第一次进入榜单、但创建已超过 30 天的项目。
2. 每个项目配一句高质量中文点评，回答「它是什么」和「为什么这周值得看」。
3. 每期有一个能吸引人点开的标题：`AI 开源雷达 · 第 47 周：<本周主线>`。
4. 数据结构为第二个来源（Hacker News）预留位置，但本期不接入。

## 非目标

- 本期不接入 Hacker News、Product Hunt、Hugging Face 或 X。数据里留 `source` 字段，就是为了以后接 HN 时不用改数据格式。
- 不和 RSS 订阅页（`/feeds`）混在一起。
- 不重新生成、不迁移旧的 42 期周报。
- 首页不加雷达入口。导航栏有入口就够了。

## 反目标（技术上能跑，但算失败）

- 点评空洞，或者带营销腔（「强大」「革命性」「一站式」「赋能」）。
- 编造数据里没有的数字或事实。
- 模型调用失败时静默发布一期低质量周报。

## 约束

- 网站在 GitHub Pages 上，用 Docusaurus 3.0.0，CI 用 Node 18 和 `yarn install --frozen-lockfile`。
- yarn.lock 里只能出现 registry.npmjs.org 的地址，不能出现公司内网地址（本机 npm 配置指向内网镜像，装包要显式加 `--registry https://registry.npmjs.org`）。
- 生成器在 GitHub Actions 上每周一 00:00 UTC 运行（`weekly-report.yml`），产出提交回自己的仓库，再通过 `trigger-site-deploy.yml` 发 `repository_dispatch` 触发网站部署。
- 合并 PR 用 squash 并删除分支。合并即上线，合并前要先确认。

## 方案（讨论中考虑过的三种）

1. **生成器只产出结构化 JSON，网站负责展示。（已选）** 版式完全由网站控制，可以复用公众号文章的卡片样式。接 HN 只需要多一个 `source: "hn"` 的数据。sync 脚本里为 Markdown 做的转义处理（`escapeMdxCharacters`）可以删掉。代价是两个仓库都要改。
2. 只改生成器的 Markdown 模板，网站继续当博客显示。网站几乎不用动，但版式受 Markdown 限制，接 HN 还得拼字符串，日期排序、转义这些老问题还在。
3. 网站构建时自己抓 GitHub。和生成器重复，否决。

## 已定的部分

### 命名和地址

- 栏目名：**AI 开源雷达**；导航栏标签：**AI 雷达**。
- 新地址：`/radar` 显示最新一期；每期一个页面 `/radar/2026-W47`；`/radar/archive` 列出所有期。
- 每期标题：`AI 开源雷达 · 第 {ISO 周数} 周：{headline}`，比如「AI 开源雷达 · 第 47 周：Agent 技能包扎堆」。headline 由模型生成，不超过 12 个汉字。

### 旧周报（选了直接删除）

- 网站删除 `/trending` 博客插件，以及 sync 脚本对 `reports/*.md` 的同步。
- 所有旧地址跳转到 `/radar`：`/trending`、每期 `/trending/<slug>`（42 个，slug 格式 `YYYY-MM-weekN`）、分页 `/trending/page/N`、`/trending/tags/*`、`/trending/archive`。跳转列表在构建时生成，不手写。
- `/trending/rss.xml` 无法跳转，接受失效，由新的 `/radar/rss.xml` 代替。
- 生成器仓库里现有的 `reports/*.md` 留作历史不删，但以后不再生成新的 Markdown。

### 生成器（ai-repo-insights）

- **「在榜」的定义（我的决定）**：本周抓到的 trending 日榜、周榜、月榜三个页面里，经过 AI 过滤后的全部仓库（取并集，不再先截成前 50）。理由：新项目往往先上日榜，等进周榜、月榜时已经不新了。代价是每周的 API 调用从约 50 次涨到最多约 375 次，仍在 `GITHUB_TOKEN` 每小时 1000 次的额度之内。`starsThisWeek` 只有上了周榜才有值。
- **历史回填（我的决定）**：第一次运行前，用生成器仓库里 42 份旧 `reports/*.md` 的表格（每行都有仓库链接）回填 `history.json`，每个仓库的首次出现周取它最早出现的那一期。不回填的话，前几期会把第 6–46 周已经上过榜的项目误标成新上榜，这正是这次改版要解决的问题。回填是一次性脚本，不进入每周流程。
- **期号**：改成 ISO 周，格式 `YYYY-Www`，比如 `2026-W47`。顺手解决 `generateReportID` 里留下的 TODO。
- **项目详情**：对本周在榜的每个仓库调 GitHub REST API（工作流自带的 `GITHUB_TOKEN`）：
  - `GET /repos/{owner}/{repo}`：取 `created_at`、`stargazers_count`、`topics`。
  - `GET /repos/{owner}/{repo}/readme`：只对新项目和新上榜的项目调，取前约 4000 字符给模型读。
- **历史**：`data/history.json` 改为保留所有见过的项目（不再只保留当前 50 个），这样「第一次上榜」才准确。
- **分栏判定**：
  - 历史里已经出现过 → 本期不展示。每个项目只在第一次出现的那期展示一次（站长的决定：只回答「本周新冒头了什么」）。
  - 否则，`created_at` 在生成时刻之前 30 天内（使用已有的配置项 `new_repo_threshold_days`，值改为 30）→ 新项目。
  - 否则 → 新上榜。
- **模型输出**（JSON）：`headline`、`summary`（一段主线，不超过 120 字），以及每个新项目、新上榜项目一条 `comment`。
- **写作规范**放在 `config/writing-guide.md`，生成器读它拼进提示词。规范要点：
  - 每条点评回答「它是什么」和「为什么这周值得看」，不超过 60 字。
  - 写具体能力，不写空话，禁用「强大、革命性、一站式、赋能、颠覆」。
  - 数字只能用数据里给的。
  - summary 只讲一条主线，不逐个类别点评。
  - 全部用中文；项目名、技术名词保留原文。
- **模型失败时直接失败**：调用失败（包括额度耗尽）时，整个运行失败，不产出这一期，GitHub Actions 发失败邮件。删除现有的英文模板回退（`internal/llm/fallback.go`）。
- **输出文件**：`data/weekly/2026-W47.json`，提交回仓库；`trigger-site-deploy.yml` 的路径过滤从 `reports/**` 改成 `data/weekly/**`。

数据格式：

```json
{
  "schemaVersion": 1,
  "id": "2026-W47",
  "year": 2026,
  "week": 47,
  "generatedAt": "2026-11-16T04:46:00Z",
  "headline": "Agent 技能包扎堆",
  "summary": "……",
  "newProjects": [ /* Item */ ],
  "newEntries":  [ /* Item */ ]
}
```

Item：

```json
{
  "source": "github",
  "id": "Leonxlnx/taste-skill",
  "url": "https://github.com/Leonxlnx/taste-skill",
  "name": "taste-skill",
  "description": "仓库自己的一行简介（原文）",
  "comment": "模型写的中文点评",
  "language": "javascript",
  "createdAt": "2026-10-30T00:00:00Z",
  "stars": 19546,
  "starsThisWeek": 4234
}
```

`starsThisWeek` 只在项目上了周榜时才有，没有时为 `null`，页面不显示，不显示成 0。每栏按 `starsThisWeek`（为 null 时按月增星）从高到低排。

### 网站

- `scripts/sync-reports.js` 改成同步 `data/weekly/*.json` 到 `radar-data/`。这个目录不提交，构建时生成，和现在的 `reports/` 一样。同时删掉 Markdown 转义和 frontmatter 逻辑。
- 新的本地插件 `plugins/ai-radar`：
  - `loadContent`：读取并校验所有 JSON，`schemaVersion` 不认识就让构建失败。
  - `contentLoaded`：用 `addRoute` 生成 `/radar`、`/radar/<id>`、`/radar/archive`。
  - `postBuild`：写 `/radar/rss.xml`，每期一条。
- 页面布局（每期）：

```
AI 开源雷达 · 第 47 周：Agent 技能包扎堆
2026-11-16 · 9 个新项目 · 14 个新上榜

<summary 一段>

🆕 新项目
┌────────────────┐ ┌────────────────┐
│ taste-skill  JS│ │ plannotator  TS│
│ 点评一句…        │ │ 点评一句…        │
│ ★19.5k · +4.2k/周│ │ 创建于 10-28     │
└────────────────┘ └────────────────┘

↗ 新上榜
- open-code-review（alibaba）— 点评一句…  ★… · +2.2k/周
- …

← 上一期                              往期 →
```

  - 新项目用卡片，样式参照 `src/components/WechatArticleCard`。
  - 新上榜用紧凑列表。
- 导航栏：`{to: '/radar', label: 'AI 雷达'}` 替换现在的 AI Trending。
- `/feeds` 页面不改。以后可以把 `/radar/rss.xml` 加进 `rss-feeds` 仓库的 `feeds.opml`，作为单独的后续改动。

### 发布顺序

1. 先改生成器并手动跑一次（`workflow_dispatch`），在 `data/weekly/` 产出第一份 JSON。
2. 再合并网站的 PR。网站的 sync 依赖那份 JSON 存在。
3. 在此之前要先恢复模型调用的额度或密钥。按「失败就直接失败」的规定，没有额度就不会产出这一期。

## 留给实现者决定的

- Go 代码怎么拆分、页面组件和 CSS 的具体样式。
- 模型调用的重试次数和超时时间。
- 「新上榜」列表最多显示几条（建议 15 条）。
- 存档页的样式。

## 需要站长自己处理的

- **Gemini 额度已经用完。** 需要在 AI Studio 充值，或者换一个提供商（生成器的 `config/llm.json` 支持配置 `base_url`、`model` 和 `provider`）。不处理的话，新版第一次运行就会按设计直接失败。
- **审阅写作规范 `config/writing-guide.md`。** 实现时先写草稿，审过再启用。
