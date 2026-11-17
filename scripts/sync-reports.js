#!/usr/bin/env node
// Copies the weekly AI 开源雷达 issues (data/weekly/<YYYY-Www>.json) from the
// ai-repo-insights repo into radar-data/, where plugins/ai-radar reads them.
// Usage: node scripts/sync-reports.js [--source <dir>] [--repo <git url>] [--target <dir>]

const fs = require('fs');
const os = require('os');
const path = require('path');
const {execFileSync} = require('child_process');

const DEFAULT_REPO_URL = 'https://github.com/NoSugarCoffee/ai-repo-insights.git';
const DEFAULT_TARGET_DIR = path.join(__dirname, '..', 'radar-data');
const ISSUE_FILE = /^\d{4}-W\d{2}\.json$/;

function syncIssues({sourceDir, targetDir}) {
  const issues = fs.readdirSync(sourceDir).filter((name) => ISSUE_FILE.test(name));
  if (issues.length === 0) {
    throw new Error(
      `Found no weekly issues (YYYY-Www.json) in ${sourceDir}. ` +
        'The generator must have published at least one issue before the site can build.',
    );
  }
  fs.rmSync(targetDir, {recursive: true, force: true});
  fs.mkdirSync(targetDir, {recursive: true});
  for (const name of issues) {
    fs.copyFileSync(path.join(sourceDir, name), path.join(targetDir, name));
  }
  return {copied: issues.length};
}

function cloneWeeklyDir(repoUrl) {
  const cloneDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-repo-insights-'));
  execFileSync('git', ['clone', '--depth', '1', repoUrl, cloneDir], {stdio: 'inherit'});
  return {cloneDir, weeklyDir: path.join(cloneDir, 'data', 'weekly')};
}

function parseArgs(argv) {
  const args = {source: null, repo: DEFAULT_REPO_URL, target: DEFAULT_TARGET_DIR};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, '');
    if (!(key in args) || argv[i + 1] === undefined) {
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
  if (!sourceDir) {
    ({cloneDir, weeklyDir: sourceDir} = cloneWeeklyDir(args.repo));
  }
  try {
    if (!fs.existsSync(sourceDir)) {
      throw new Error(`Source directory does not exist: ${sourceDir}`);
    }
    const {copied} = syncIssues({sourceDir, targetDir: args.target});
    console.log(`Synced ${copied} weekly issues into ${args.target}`);
  } finally {
    if (cloneDir) {
      fs.rmSync(cloneDir, {recursive: true, force: true});
    }
  }
}

module.exports = {syncIssues};

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
