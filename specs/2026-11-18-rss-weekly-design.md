# RSS 周报 — 设计

日期：2026-11-18

## 目标

在 AI 开源雷达下新增独立的 RSS 周报，不把订阅文章混进开源项目周报。页面提供最新一期、按 ISO 周访问和往期入口；数据由 `ai-repo-insights/data/rss-weekly/<YYYY-Www>.json` 生成并在构建前同步。

## 路由与导航

- `/radar/rss`：最新一期；尚无任何文件时显示友好的“尚未发布”状态。
- `/radar/rss/<YYYY-Www>`：指定一期。
- `/radar/archive`：保留开源雷达往期，并增加 RSS 周报往期区块。
- 开源雷达、RSS 周报和往期页面顶部共享一个简洁的栏目导航。
- 不新增 RSS XML feed；本次的“RSS 周报”是阅读订阅源后的周摘要，避免与 `/radar/rss.xml`（开源雷达的订阅 feed）产生命名混淆。

## 数据与校验

`plugins/ai-radar` 增加可选的 `rssDataDir`。开源雷达数据仍然至少需要一期；RSS 数据目录可以不存在或为空，构建仍成功。目录中一旦出现 JSON，就逐文件校验：

- `schema` 必须精确为 `rss-weekly/1`。
- 文件名必须与 `id` 一致。
- 顶层必填：`id`、`week_start`、`week_end`、`generated_at`、`opml`、`groups`、`failed_feeds`。
- 每个 group 必须有字符串 `category` 和数组 `items`。
- `id` 必须是真实存在的 ISO 周（不是每一年都有 `W53`）。`week_start` 和 `week_end` 必须分别是该周的周一和周日（`YYYY-MM-DD`）。
- `generated_at` 必须是带时间的 ISO 8601 时间戳（`Z` 或数字时区偏移；时和分必填，秒可选），不能只写日期。
- 每个 item 必须有字符串 `title`、`url`、`source`、`published_at`、`summary_zh`。`published_at` 必须是带时间的 ISO 8601 时间戳（`Z` 或数字时区偏移；时和分必填，秒可选），不能只写日期。
- 每个 failed feed 必须有字符串 `source`、`xmlUrl`、`error`。`xmlUrl` 是 schema 1 里唯一的 camelCase 字段，用来对齐 OPML 的 `xmlUrl`，不能改成 `xml_url`。
- 未知字段被保留并忽略，允许 schema 1 增加可选字段。

错误沿用雷达风格：抛出包含文件名和具体字段路径的异常，构建立即失败。

## 同步

`yarn sync-reports` 一次同步 `data/weekly` 到 `radar-data/`，以及 `data/rss-weekly` 到 `radar-rss-data/`。本地 `--source` 继续接收 `data/weekly` 目录，并从同级的 `data/rss-weekly` 自动发现 RSS 数据；也提供显式 `--rss-source` 和 `--rss-target`。RSS 源不存在或没有匹配文件时清空旧的 RSS JSON 并成功退出。

两个生成物目录都 gitignore。部署仍只监听 `radar-updated`；生成器在任一或两类周报发布后发送同一事件即可，避免同一批数据触发两次部署。

## 页面

每期显示周范围和生成日期。内容按 `groups[].category` 分节，每篇文章显示：

- 外链标题；
- 来源和按 Asia/Shanghai 格式化的日期；
- 一句中文摘要。

所有分组都没有文章时显示“本周没有收录到新文章”。失败源在末尾合并成一行弱化文字，不展示冗长错误堆栈，但保留 source 名称。页面使用现有 Radar CSS module，新增专用列表样式并兼容窄屏和暗色主题。

## 测试与验收

- 纯函数测试覆盖有效 fixture、未知 schema、缺失字段、文件名不一致、嵌套 item/failed feed、日历日期、不带秒的时间戳、不存在的 ISO 周、与 `id` 不一致的周范围、排序及上海日期。
- sync 测试覆盖复制、忽略非 JSON 和非 `YYYY-Www.json`、清理旧文件、RSS 源缺失，以及已经存在的空 RSS 源。
- 构建输出测试覆盖最新/指定路由、分类、文章字段、失败源、空周、无 RSS 文件时构建成功及栏目导航。
- 用 fixture 同步后完整构建，并在浏览器中截图 `/radar/rss/2026-W47`。

## 生成器契约

生成器必须写入 schema `rss-weekly/1`。除 `failed_feeds[].xmlUrl` 外，字段名是 snake_case；`xmlUrl` 保持 camelCase，因为它对应 OPML 的 `xmlUrl`，校验器和生成器都按这个名字读取。文件名与 `id` 完全一致，且 `id` 必须是真实 ISO 周。`week_start` 和 `week_end` 是该周的周一与周日。`published_at` 和 `generated_at` 必须是带时间的 ISO 8601 时间戳，使用 `Z` 或数字时区偏移（时和分必填，秒可选）；只写日期会被拒绝。空周仍应写合法文件，通常为 `groups: []` 或仅含空 `items` 的 groups。发布后继续发送 `repository_dispatch` 类型 `radar-updated`。
