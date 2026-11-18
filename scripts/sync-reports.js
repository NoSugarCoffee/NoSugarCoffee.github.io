#!/usr/bin/env node
// Copies AI 开源雷达 issues and optional RSS weekly digests from
// ai-repo-insights into the gitignored directories read by plugins/ai-radar.
// Usage: node scripts/sync-reports.js [--source <dir>] [--rss-source <dir>]
//        [--repo <git url>] [--target <dir>] [--rss-target <dir>]

const fs = require('fs');
const os = require('os');
const path = require('path');
const {execFileSync} = require('child_process');

const DEFAULT_REPO_URL = 'https://github.com/NoSugarCoffee/ai-repo-insights.git';
const DEFAULT_TARGET_DIR = path.join(__dirname, '..', 'radar-data');
const DEFAULT_RSS_TARGET_DIR = path.join(__dirname, '..', 'radar-rss-data');
const ISSUE_FILE = /^\d{4}-W\d{2}\.json$/;

function clearJsonFiles(targetDir) {
  fs.mkdirSync(targetDir, {recursive: true});
  for (const name of fs.readdirSync(targetDir)) {
    if (name.endsWith('.json')) {
      fs.rmSync(path.join(targetDir, name));
    }
  }
}

function syncIssues({sourceDir, targetDir}) {
  const issues = fs.readdirSync(sourceDir).filter((name) => ISSUE_FILE.test(name));
  if (issues.length === 0) {
    throw new Error(
      `Found no weekly issues (YYYY-Www.json) in ${sourceDir}. ` +
        'The generator must have published at least one issue before the site can build.',
    );
  }
  clearJsonFiles(targetDir);
  for (const name of issues) {
    fs.copyFileSync(path.join(sourceDir, name), path.join(targetDir, name));
  }
  return {copied: issues.length};
}

function syncRssWeeks({sourceDir, targetDir}) {
  clearJsonFiles(targetDir);
  if (!fs.existsSync(sourceDir)) {
    return {copied: 0};
  }
  const weeks = fs.readdirSync(sourceDir).filter((name) => ISSUE_FILE.test(name));
  for (const name of weeks) {
    fs.copyFileSync(path.join(sourceDir, name), path.join(targetDir, name));
  }
  return {copied: weeks.length};
}

function cloneDataDirs(repoUrl) {
  const cloneDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-repo-insights-'));
  execFileSync('git', ['clone', '--depth', '1', repoUrl, cloneDir], {stdio: 'inherit'});
  return {
    cloneDir,
    weeklyDir: path.join(cloneDir, 'data', 'weekly'),
    rssWeeklyDir: path.join(cloneDir, 'data', 'rss-weekly'),
  };
}

function parseArgs(argv) {
  const args = {
    source: null,
    'rss-source': null,
    repo: DEFAULT_REPO_URL,
    target: DEFAULT_TARGET_DIR,
    'rss-target': DEFAULT_RSS_TARGET_DIR,
  };
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, '');
    if (!Object.hasOwn(args, key) || argv[i + 1] === undefined) {
      throw new Error(`Unknown or incomplete argument: ${argv[i]}`);
    }
    args[key] = argv[i + 1];
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  let cloneDir = null;
  let sourceDir = args.source;
  let rssSourceDir = args['rss-source'];
  if (!sourceDir) {
    const cloned = cloneDataDirs(args.repo);
    cloneDir = cloned.cloneDir;
    sourceDir = cloned.weeklyDir;
    rssSourceDir = rssSourceDir || cloned.rssWeeklyDir;
  } else if (!rssSourceDir) {
    rssSourceDir = path.join(path.dirname(sourceDir), 'rss-weekly');
  }
  try {
    if (!fs.existsSync(sourceDir)) {
      throw new Error(`Source directory does not exist: ${sourceDir}`);
    }
    const {copied} = syncIssues({sourceDir, targetDir: args.target});
    console.log(`Synced ${copied} weekly issues into ${args.target}`);
    const rss = syncRssWeeks({sourceDir: rssSourceDir, targetDir: args['rss-target']});
    console.log(`Synced ${rss.copied} RSS weekly digests into ${args['rss-target']}`);
  } finally {
    if (cloneDir) {
      fs.rmSync(cloneDir, {recursive: true, force: true});
    }
  }
}

module.exports = {syncIssues, syncRssWeeks, parseArgs};

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
