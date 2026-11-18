// Docusaurus plugin for AI 开源雷达: reads open-source issues and optional RSS
// weekly digests synced by `yarn sync-reports`, adds their routes and archive,
// and writes the open-source radar feed at /radar/rss.xml.

const fs = require('fs');
const path = require('path');
const {parseIssue, sortIssues, issueTitle, buildRss} = require('./issues');
const {parseRssWeek, sortRssWeeks, rssWeekTitle} = require('./rss-weekly');

module.exports = function aiRadarPlugin(context, options) {
  const dataDir = path.resolve(context.siteDir, options.dataDir);
  const rssDataDir = path.resolve(context.siteDir, options.rssDataDir || 'radar-rss-data');

  return {
    name: 'ai-radar',

    getPathsToWatch() {
      return [path.join(dataDir, '*.json'), path.join(rssDataDir, '*.json')];
    },

    async loadContent() {
      if (!fs.existsSync(dataDir)) {
        throw new Error(`Radar data directory ${dataDir} does not exist; run \`yarn sync-reports\` before building.`);
      }
      const files = fs.readdirSync(dataDir).filter((name) => name.endsWith('.json'));
      if (files.length === 0) {
        throw new Error(`No radar issues in ${dataDir}; run \`yarn sync-reports\` before building.`);
      }
      const issues = files.map((name) => parseIssue(name, fs.readFileSync(path.join(dataDir, name), 'utf8')));
      const rssFiles = fs.existsSync(rssDataDir)
        ? fs.readdirSync(rssDataDir).filter((name) => name.endsWith('.json'))
        : [];
      const rssWeeks = rssFiles.map((name) =>
        parseRssWeek(name, fs.readFileSync(path.join(rssDataDir, name), 'utf8')),
      );
      return {issues: sortIssues(issues), rssWeeks: sortRssWeeks(rssWeeks)};
    },

    async contentLoaded({content, actions}) {
      const {addRoute, createData} = actions;
      const {issues, rssWeeks} = content;

      // issues are newest first: the previous (older) issue is at index + 1.
      for (const [index, issue] of issues.entries()) {
        const data = await createData(
          `issue-${issue.id}.json`,
          JSON.stringify({
            issue,
            prevId: issues[index + 1]?.id ?? null,
            nextId: issues[index - 1]?.id ?? null,
          }),
        );
        addRoute({path: `/radar/${issue.id}`, component: '@site/src/components/Radar/IssuePage', exact: true, modules: {data}});
        if (index === 0) {
          addRoute({path: '/radar', component: '@site/src/components/Radar/IssuePage', exact: true, modules: {data}});
        }
      }

      for (const [index, week] of rssWeeks.entries()) {
        const data = await createData(
          `rss-week-${week.id}.json`,
          JSON.stringify({
            week,
            prevId: rssWeeks[index + 1]?.id ?? null,
            nextId: rssWeeks[index - 1]?.id ?? null,
          }),
        );
        addRoute({
          path: `/radar/rss/${week.id}`,
          component: '@site/src/components/Radar/RssWeeklyPage',
          exact: true,
          modules: {data},
        });
        if (index === 0) {
          addRoute({
            path: '/radar/rss',
            component: '@site/src/components/Radar/RssWeeklyPage',
            exact: true,
            modules: {data},
          });
        }
      }
      if (rssWeeks.length === 0) {
        const data = await createData('rss-week-empty.json', JSON.stringify({week: null, prevId: null, nextId: null}));
        addRoute({
          path: '/radar/rss',
          component: '@site/src/components/Radar/RssWeeklyPage',
          exact: true,
          modules: {data},
        });
      }

      const archive = await createData(
        'archive.json',
        JSON.stringify({
          issues: issues.map((issue) => ({id: issue.id, title: issueTitle(issue), generatedAt: issue.generatedAt})),
          rssWeeks: rssWeeks.map((week) => ({
            id: week.id,
            title: rssWeekTitle(week),
            generatedAt: week.generated_at,
          })),
        }),
      );
      addRoute({path: '/radar/archive', component: '@site/src/components/Radar/ArchivePage', exact: true, modules: {data: archive}});
    },

    async postBuild({content, outDir, siteConfig}) {
      const rssPath = path.join(outDir, 'radar', 'rss.xml');
      fs.mkdirSync(path.dirname(rssPath), {recursive: true});
      fs.writeFileSync(rssPath, buildRss(content.issues, siteConfig.url));
    },
  };
};
