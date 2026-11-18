# RSS 周报 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add validated, synced RSS weekly digest pages under AI 开源雷达.

**Architecture:** Extend the existing `ai-radar` plugin with a second optional content collection. Keep parsing and formatting in pure CommonJS helpers, route data through Docusaurus `createData`, and render it with a focused React component that shares the radar navigation and styles.

**Tech Stack:** Docusaurus 3.0.0, React 18, CSS modules, Node 18 `node:test`, yarn 1.

**Spec:** `specs/2026-11-18-rss-weekly-design.md`

## Global Constraints

- No new npm dependencies.
- The generator contract is schema `rss-weekly/1` with snake_case fields.
- Dates shown to readers use `Asia/Shanghai`.
- Missing RSS data is valid; malformed present RSS data fails and names the file.
- Keep the existing `radar-updated` repository dispatch event.

---

### Task 1: Validate RSS weekly files

**Files:**
- Create: `plugins/ai-radar/rss-weekly.js`
- Create: `plugins/ai-radar/rss-weekly.test.js`
- Create: `scripts/fixtures/radar/data/rss-weekly/2026-W47.json`
- Create: `scripts/fixtures/radar/data/rss-weekly/2026-W46.json`

**Interfaces:**
- Produces `parseRssWeek(fileName, text)`, `sortRssWeeks(weeks)`, `rssWeekTitle(week)`, and `RssWeeklyDataError`.

- [ ] Write tests that parse the fixture and reject unknown schema, missing top-level fields, filename mismatch, malformed nested records, and invalid dates.
- [ ] Run `node --test plugins/ai-radar/rss-weekly.test.js`; confirm failure because the module is absent.
- [ ] Implement strict required-field validation while allowing unknown optional fields.
- [ ] Run the focused test and confirm it passes.

### Task 2: Sync the optional RSS collection

**Files:**
- Modify: `scripts/sync-reports.js`
- Modify: `scripts/sync-reports.test.js`
- Modify: `.gitignore`

**Interfaces:**
- Preserve `syncIssues({sourceDir, targetDir})`.
- Add `syncRssWeeks({sourceDir, targetDir}) -> {copied}`; a missing source means zero copied after stale JSON cleanup.
- Add CLI options `--rss-source` and `--rss-target`; absent `--rss-source` is inferred as the sibling `rss-weekly` directory.

- [ ] Add tests for RSS copying, unrelated-file filtering, stale cleanup, and missing source success.
- [ ] Run `node --test scripts/sync-reports.test.js`; confirm the new assertions fail.
- [ ] Implement the sync behavior and clone both generator data directories.
- [ ] Run the focused test and confirm it passes.

### Task 3: Add routes and archive data

**Files:**
- Modify: `plugins/ai-radar/index.js`
- Modify: `docusaurus.config.js`
- Modify: `scripts/check-radar.test.js`

**Interfaces:**
- Plugin option `rssDataDir: 'radar-rss-data'`.
- Routes `/radar/rss`, `/radar/rss/<id>`.
- Archive route data gains `rssWeeks`.
- `/radar/rss` always exists, with `week: null` when no files exist.

- [ ] Add build-output assertions for latest/specific RSS routes and archive links.
- [ ] Run the build check against the old plugin and confirm the route assertions fail.
- [ ] Load optional RSS JSON, create per-week route data with previous/next ids, and create an empty latest route when necessary.
- [ ] Build with fixtures and confirm route files are generated.

### Task 4: Render the RSS digest and shared section navigation

**Files:**
- Create: `src/components/Radar/RssWeeklyPage.js`
- Create: `src/components/Radar/RadarNav.js`
- Modify: `src/components/Radar/IssuePage.js`
- Modify: `src/components/Radar/ArchivePage.js`
- Modify: `src/components/Radar/styles.module.css`
- Modify: `scripts/check-radar.test.js`

**Interfaces:**
- `RadarNav` links to `/radar`, `/radar/rss`, and `/radar/archive`.
- `RssWeeklyPage` accepts `{week, prevId, nextId}`.

- [ ] Add built-HTML assertions for category headings, linked title, source, Shanghai date, Chinese summary, one muted failed-feed line, empty-week copy, and shared navigation.
- [ ] Run the build check and confirm the content assertions fail.
- [ ] Implement accessible article lists, empty states, pager, and responsive styles.
- [ ] Build and run the output tests.

### Task 5: Deploy docs and full verification

**Files:**
- Modify: `.github/workflows/deploy.yml`
- Modify: `.github/workflows/test-deploy.yml`
- Modify: `README.md`

- [ ] Update workflow step names/comments without changing `radar-updated`.
- [ ] Document routes, both synced directories, local fixture command, generator contract, and shared dispatch.
- [ ] Verify a build without `radar-rss-data` succeeds.
- [ ] Sync fixtures and run `node --test scripts/sync-reports.test.js plugins/ai-radar/issues.test.js plugins/ai-radar/rss-weekly.test.js`, `yarn build`, and `node --test scripts/check-radar.test.js`.
- [ ] Serve the built site and capture `/radar/rss/2026-W47`.
- [ ] Commit with a conventional commit, push, and open the PR.
