// Docusaurus plugin for the AI 开源雷达: reads the weekly issues synced into
// `dataDir` by `yarn sync-reports`, adds /radar, /radar/<id> and
// /radar/archive, and writes /radar/rss.xml.

const fs = require('fs');
const path = require('path');
const {parseIssue, sortIssues, issueTitle, buildRss} = require('./issues');

module.exports = function aiRadarPlugin(context, options) {
  const dataDir = path.resolve(context.siteDir, options.dataDir);

  return {
    name: 'ai-radar',

    getPathsToWatch() {
      return [path.join(dataDir, '*.json')];
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
      return sortIssues(issues);
    },

    async contentLoaded({content: issues, actions}) {
      const {addRoute, createData} = actions;

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

      const archive = await createData(
        'archive.json',
        JSON.stringify({
          issues: issues.map((issue) => ({id: issue.id, title: issueTitle(issue), generatedAt: issue.generatedAt})),
        }),
      );
      addRoute({path: '/radar/archive', component: '@site/src/components/Radar/ArchivePage', exact: true, modules: {data: archive}});
    },

    async postBuild({content: issues, outDir, siteConfig}) {
      const rssPath = path.join(outDir, 'radar', 'rss.xml');
      fs.mkdirSync(path.dirname(rssPath), {recursive: true});
      fs.writeFileSync(rssPath, buildRss(issues, siteConfig.url));
    },
  };
};
