# AI 开源雷达 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the weekly 50-row trending tables with an "AI 开源雷达" that answers 本周新冒头了什么: the generator emits one JSON file per ISO week, with 🆕 new projects, ↗ new entries and Chinese copy, and the site renders it at `/radar`.

**Architecture:** In `ai-repo-insights` (Go), the pipeline stops producing Markdown. It takes every AI-filtered repo from the daily, weekly and monthly trending pages. It drops repos already in history, enriches the rest from the GitHub REST API (`created_at`, plus a README excerpt), asks the LLM for a headline, a summary and one comment per repo under a writing guide, and writes `data/weekly/<YYYY-Www>.json`. On the site, `sync-reports` copies those JSON files, and a local plugin `plugins/ai-radar` validates them, adds routes and writes `/radar/rss.xml`. The old `/trending` blog is removed, and its routes redirect to `/radar`.

**Tech Stack:**
- Generator: Go 1.24 (`go.mod`), stdlib `net/http`, `httptest` in tests, zerolog.
- Site: Docusaurus 3.0.0, React 18, CSS modules, `node --test` (Node 18 in CI, 22 locally via `ASDF_NODEJS_VERSION=22.23.1`), yarn 1.22.22.

**Spec:** `specs/2026-11-17-ai-radar-design.md`

(The plan lives next to the spec in `specs/`, the convention this repo already uses.)

## Global Constraints

- **Repos and branches:**
  - Generator: `~/codespace/github.com/NoSugarCoffee/ai-repo-insights`. Clone it there with `gh repo clone NoSugarCoffee/ai-repo-insights` and work on branch `feat/radar-json`.
  - Site: `~/codespace/github.com/NoSugarCoffee/NoSugarCoffee.github.io`, branch `feat/ai-radar`.
- **Copy:**
  - Column name: `AI 开源雷达`.
  - Navbar label: `AI 雷达`.
  - Issue title: `AI 开源雷达 · 第 {week} 周：{headline}`. `{week}` is the ISO week number without zero padding.
  - Section labels: `🆕 新项目` and `↗ 新上榜`.
- **Issue id:** the ISO week, `YYYY-Www`, from `time.ISOWeek()` on the run time in UTC. For example, `2026-W47` for 2026-11-16.
- **Selection order:**
  1. A repo already in history is skipped.
  2. Otherwise, a repo with `created_at` ≥ `now − new_repo_threshold_days` (30) is a new project.
  3. Otherwise, the repo is a new entry.
  4. Every candidate, whichever column it lands in, is then added to history.
- **Limits:**
  - Headline: ≤ 12 runes.
  - Summary: ≤ 120 runes.
  - Each comment: ≤ 60 runes.
  - README excerpt: first 4000 runes.
  - At most 15 new entries are shown. Every new project is shown.
- **Banned words in LLM copy:** `强大`, `革命性`, `一站式`, `赋能`, `颠覆`.
- **LLM failure fails the run:**
  - This covers API errors, invalid JSON, a missing comment, or any limit or banned-word violation that survives the retries.
  - `internal/llm/fallback.go` is deleted. No issue file is written.
- **`starsThisWeek`:** `null` unless the repo appeared on the weekly trending page. It is never `0`-as-unknown.
- **Item sort order:** each column sorts by `starsThisWeek` descending, then `starsThisMonth` descending. A `null` value sorts after all numbers.
- **Lockfiles:** the site adds no npm dependencies. If one turns out to be needed, it resolves from `registry.npmjs.org` only.
- **Site build:** `npx -y yarn@1.22.22 -s sync-reports && npx -y yarn@1.22.22 -s build`. `onBrokenLinks: 'throw'` stays on.
- **Merging:** nothing merges without the user's explicit go-ahead. Both PRs use `gh pr merge --squash --delete-branch`.

## Review Focus

1. **A week where nothing qualifies** (every trending repo is already in history). The pipeline still writes a valid issue with empty columns and an LLM summary that says so. The site renders "本周没有新冒头的项目" instead of empty headings. Task G3 and Task S3 each test this.
2. **The ISO week across the year boundary.** For example, 2027-01-01 is `2026-W53`. The id must not use the calendar year, and the site must sort `2026-W53` before `2027-W01`. Task G1 and Task S2 each test this.
3. **A repo with no README** (GitHub API 404). It still gets a comment, written from its description. Every other non-200 response fails the run. Task G2 tests this.
4. **A malformed or future-schema JSON file in `radar-data/`.** The site build must fail and name the file. It must not render a half page. Task S2 tests this.
5. **The old `/trending/...` URLs**: 42 issue pages, `page/2`–`page/5`, `tags/*` and `archive`. Each must land on `/radar`. Task S3 tests this against the frozen route list.

---

## Generator tasks (repo `ai-repo-insights`, branch `feat/radar-json`)

### Task G1: ISO week id and history that never forgets

**Files:**
- Modify:
  - `cmd/ai-repo-insights/main.go`: drop the `-weekly` flag and `generateDailyReportID`. The id always comes from `ReportID`.
  - `internal/pipeline/orchestrator.go`: delete `generateReportID`.
  - `internal/history/history.go`: delete the "streak broken" removal block. Add `Seen`.
- Create:
  - `internal/radar/week.go`
  - `internal/radar/week_test.go`
- Test: `internal/history/history_test.go`. Update any test that asserts removal.

**Interfaces:**
- Produces:
  - `func ReportID(t time.Time) string` in package `radar`.
  - `func (h *models.History) Seen(key string) bool`, in `internal/models/helpers.go`.
  - `UpdateHistory` keeps its signature but never deletes entries.

- [ ] **Step 1: Write the failing tests.**

```go
func TestReportID(t *testing.T) {
	cases := map[string]string{
		"2026-11-16T04:46:00Z": "2026-W47",
		"2027-01-01T00:00:00Z": "2026-W53",
		"2026-01-05T00:00:00Z": "2026-W02",
	}
	for in, want := range cases {
		ts, _ := time.Parse(time.RFC3339, in)
		if got := radar.ReportID(ts); got != want { t.Errorf("%s: got %s want %s", in, got, want) }
	}
}
// history_test.go
func TestUpdateHistoryKeepsReposThatLeftTheList(t *testing.T) // seed {a/x}, update with [b/y] → both keys present, a/x.LastSeenReport unchanged
func TestHistorySeen(t *testing.T)                            // Seen("a/x") true after seeding, Seen("c/z") false
```

- [ ] **Step 2: Run the tests and confirm they fail.**
  Run: `go test ./internal/radar/ ./internal/history/ ./internal/models/`
  Expected: FAIL. The output shows `undefined: radar.ReportID`, and the history test reports that `a/x` was removed.
- [ ] **Step 3: Implement.**
  - `ReportID` uses `t.UTC().ISOWeek()` and formats with `%d-W%02d`.
  - Remove the deletion loop and its log line.
  - Add `Seen`.
- [ ] **Step 4: Run the tests and confirm they pass.**
  Run: `go test ./...`
  Expected: PASS.
- [ ] **Step 5: Commit.** Message: `feat(radar): ISO week ids and keep every repo ever seen in history`.

### Task G2: GitHub repo details client

**Files:**
- Create:
  - `internal/githubapi/client.go`
  - `internal/githubapi/client_test.go`

**Interfaces:**
- Produces:
  - `type RepoDetails struct { CreatedAt time.Time; Stars int; Topics []string; Description string }`
  - `type Client struct` (an external-system client).
  - `func NewClient(baseURL string, token string, httpClient *http.Client) *Client`. The base URL is `https://api.github.com` in production and the `httptest` URL in tests.
  - `func (c *Client) Repo(ctx context.Context, fullName string) (RepoDetails, error)`
  - `func (c *Client) Readme(ctx context.Context, fullName string) (string, error)`. It returns the decoded README truncated to the first 4000 runes, or `""` on 404.
  - `type APIError struct { FullName string; Endpoint string; Status int; Body string }`, which implements `error`. Its message says which repo, which endpoint and what status, and tells the reader to check `GITHUB_TOKEN` and the rate limit.

- [ ] **Step 1: Write the failing tests.** Use an `httptest.Server`.
  - `TestRepoParsesCreatedAtAndStars`: `/repos/a/x` returns `{"created_at":"2026-10-30T00:00:00Z","stargazers_count":19546,"topics":["agent"],"description":"d"}`, and the test asserts the parsed fields.
  - `TestReadmeDecodesAndTruncates`: `/repos/a/x/readme` returns `{"encoding":"base64","content":<base64 of 5000 × "汉">}`, and the result has exactly 4000 runes.
  - `TestReadmeMissingIsEmpty`: a 404 gives `""` and a nil error.
  - `TestRepoNon200IsAPIError`: a 403 gives an `*APIError` with `Status == 403`.
  - `TestSendsBearerToken`: the server asserts `Authorization: Bearer tkn`.
- [ ] **Step 2: Run the tests and confirm they fail.**
  Run: `go test ./internal/githubapi/`
  Expected: FAIL with `undefined: NewClient`.
- [ ] **Step 3: Implement.**
  - Send the headers `Accept: application/vnd.github+json` and `X-GitHub-Api-Version: 2022-11-28`.
  - Decode the README with `base64.StdEncoding`, after stripping the newlines GitHub inserts.
- [ ] **Step 4: Run the tests and confirm they pass.**
  Run: `go test ./internal/githubapi/`
  Expected: PASS.
- [ ] **Step 5: Commit.** Message: `feat(githubapi): fetch repo created_at, stars and README excerpt`.

### Task G3: Selection and the weekly issue model

**Files:**
- Create:
  - `internal/radar/select.go`
  - `internal/radar/issue.go`
  - `internal/radar/select_test.go`
  - `internal/radar/issue_test.go`

**Interfaces:**
- Consumes:
  - `models.ClassifiedRepo` and `models.History.Seen` (G1).
  - `githubapi.RepoDetails` (G2).
- Produces:

```go
type Column string // "newProjects" | "newEntries"
type Candidate struct { Repo models.ClassifiedRepo; Details githubapi.RepoDetails; Readme string; Column Column }
func Unseen(repos []models.ClassifiedRepo, hist *models.History) []models.ClassifiedRepo
func Assign(repo models.ClassifiedRepo, d githubapi.RepoDetails, readme string, now time.Time, newRepoDays int) Candidate
type Item struct {
	Source string `json:"source"`; ID string `json:"id"`; URL string `json:"url"`; Name string `json:"name"`
	Description string `json:"description"`; Comment string `json:"comment"`; Language string `json:"language"`
	CreatedAt time.Time `json:"createdAt"`; Stars int `json:"stars"`; StarsThisWeek *int `json:"starsThisWeek"`; StarsThisMonth *int `json:"starsThisMonth"`
}
type Issue struct {
	SchemaVersion int `json:"schemaVersion"`; ID string `json:"id"`; Year int `json:"year"`; Week int `json:"week"`
	GeneratedAt time.Time `json:"generatedAt"`; Headline string `json:"headline"`; Summary string `json:"summary"`
	NewProjects []Item `json:"newProjects"`; NewEntries []Item `json:"newEntries"`
}
func BuildIssue(now time.Time, cands []Candidate, copy Copy) Issue // Copy defined in G4; sorts, caps newEntries at 15, SchemaVersion 1
func WriteIssue(dir string, issue Issue) (string, error)            // writes <dir>/<ID>.json, 2-space indent, returns path
```

`Item.StarsThisWeek` is set only when `Metadata.StarsThisWeek > 0`. The same rule applies to `StarsThisMonth`. The spec's JSON gains `starsThisMonth` here because sorting needs it. `Item.Source` is always `"github"`. `NewProjects` and `NewEntries` marshal as `[]`, never `null`.

- [ ] **Step 1: Write the failing tests.**
  - `TestUnseenDropsHistory`: an input of `{a/x seen, b/y unseen}` gives `[b/y]`.
  - `TestAssignBoundary`: with `now = 2026-11-16`, `created_at = now−30d` gives `newProjects`, and `now−30d−1s` gives `newEntries`.
  - `TestBuildIssueSortsAndCaps`: build 20 new entries with mixed `StarsThisWeek`, some 0. The output has exactly 15 items in the order the Global Constraints define.
  - `TestBuildIssueEmptyWeek`: with no candidates, marshalled JSON contains `"newProjects": []` and `"newEntries": []`.
  - `TestWriteIssueFilename`: writing to `t.TempDir()` produces `2026-W47.json`, and the file round-trips through `json.Unmarshal`.
- [ ] **Step 2: Run the tests and confirm they fail.**
  Run: `go test ./internal/radar/`
  Expected: FAIL with undefined symbols.
- [ ] **Step 3: Implement.** `Copy` is not defined until G4. Declare a minimal `type Copy struct{ Headline, Summary string; Comments map[string]string }` in `issue.go` now; G4 reuses it rather than redefining it.
- [ ] **Step 4: Run the tests and confirm they pass.**
  Run: `go test ./internal/radar/`
  Expected: PASS.
- [ ] **Step 5: Commit.** Message: `feat(radar): select unseen repos into new-project / new-entry columns`.

### Task G4: LLM copy under the writing guide; no fallback

**Files:**
- Create:
  - `config/writing-guide.md`: a draft in Chinese for the user to review. It covers every point in the spec's 写作规范 list and gives two good and two bad example comments.
  - `internal/llm/radar.go`
  - `internal/llm/radar_test.go`
- Modify:
  - `internal/config/config.go`: load `writing-guide.md` into `Config.WritingGuide string`, and fail if the file is missing or empty.
  - `internal/llm/client.go`: remove `buildPrompt` and `GenerateAnalysis`. Keep `callAPI*` and `cleanJSONResponse`.
- Delete: `internal/llm/fallback.go`.

**Interfaces:**
- Consumes: `radar.Candidate` and `radar.Copy` (G3).
- Produces:
  - `func (c *Client) WriteRadarCopy(cands []radar.Candidate, guide string) (radar.Copy, error)`
  - `func ValidateCopy(copy radar.Copy, cands []radar.Candidate) error`, which returns `*CopyRuleError{Rule string; Detail string}`.
- Retry behavior: `WriteRadarCopy` makes up to `MaxRetries+1` attempts. In each attempt it calls the API, parses the response, then validates it. It returns the last error when every attempt fails.

**The prompt** sends:
- the guide verbatim;
- for each candidate: `id`, `column`, `description`, `language`, `stars`, `starsThisWeek` and `readme`;
- the required output, `{"headline":"…","summary":"…","comments":{"owner/repo":"…"}}`.

On an empty week it asks for the headline and a summary that says no new projects surfaced, and `comments` is `{}`.

- [ ] **Step 1: Write the failing tests.**
  - `TestValidateCopy`: a table that checks `CopyRuleError.Rule` for each of these cases:
    - headline with 13 runes gives `headline-length`;
    - summary with 121 runes gives `summary-length`;
    - comment with 61 runes gives `comment-length`;
    - a candidate with no comment gives `missing-comment`;
    - `强大` in a comment gives `banned-word`;
    - a valid copy gives nil.
  - `TestWriteRadarCopyRetriesInvalidThenSucceeds`: use an `httptest` server that serves the OpenAI-compatible shape. The first response contains a banned word and the second is valid. The call succeeds, and the server saw two requests.
  - `TestWriteRadarCopyFailsAfterRetries`: the server always returns 402, so the call returns an error whose message contains `402`.
  - `TestConfigRequiresWritingGuide`: loading from a temp config dir without `writing-guide.md` fails.
- [ ] **Step 2: Run the tests and confirm they fail.**
  Run: `go test ./internal/llm/ ./internal/config/`
  Expected: FAIL.
- [ ] **Step 3: Implement.** Write the guide draft too.
- [ ] **Step 4: Run the tests and confirm they pass.**
  Run: `go test ./...`
  Expected: PASS. `go vet ./...` is clean, and no test still references `GenerateTemplateFallback`.
- [ ] **Step 5: Commit.** Message: `feat(llm): radar copy under a writing guide; fail instead of falling back`.

### Task G5: Rewire the pipeline, delete the Markdown path, update workflows

**Files:**
- Modify:
  - `internal/pipeline/orchestrator.go`: rewrite `RunPipeline` around injected dependencies.
  - `cmd/ai-repo-insights/main.go`: build the real dependencies and exit non-zero on error. `GITHUB_TOKEN` and `LLM_API_KEY` both become required, and the program exits 1 with a clear message if either is missing.
  - `config/settings.json`: set `new_repo_threshold_days` to `30`.
  - `.github/workflows/weekly-report.yml`:
    - set up Go with `go-version-file: go.mod`;
    - stop creating `reports/` and `data/summaries`;
    - `git add data/weekly data/history.json`;
    - upload `data/weekly/*.json` as the artifact.
  - `.github/workflows/trigger-site-deploy.yml`: change the path filter to `data/weekly/**`.
  - `README.md`: replace the report-format section with the JSON format and the "fails when the LLM fails" behavior.
- Delete:
  - `internal/report/`
  - `internal/summary/`
  - `internal/calculator/`
  - their tests
  - the `models` types only they used (`ScoredRepo`, `SummaryJSON`, `LLMOutput`, `MetaInfo`, `CategoryStats`, `LanguageStats`, `NewReposInfo`, `DarkHorseInfo`, `RepeaterInfo`, `TopRepoInfo`, `HighlightComment`).
  - Keep `data/history.json`, the old `reports/*.md` and `data/summaries/`, if it exists, as history.
- Test: `internal/pipeline/orchestrator_test.go`.

**Interfaces:**
- Consumes: G1–G4.
- Produces:

```go
type Deps struct {
	Trending interface{ FetchTrending() ([]models.RepoMetadata, error) }
	Classify func([]models.RepoMetadata) []models.ClassifiedRepo
	GitHub   interface{ Repo(context.Context, string) (githubapi.RepoDetails, error); Readme(context.Context, string) (string, error) }
	Copy     interface{ WriteRadarCopy([]radar.Candidate, string) (radar.Copy, error) }
	History  *history.Manager
	OutDir   string // "data/weekly"
	Now      time.Time
}
func Run(ctx context.Context, cfg config.Config, deps Deps) (issuePath string, err error)
```

**Run order:**
1. fetch;
2. classify;
3. `Unseen`;
4. for each unseen repo: `Repo`, then `Readme`, then `Assign`;
5. `WriteRadarCopy`;
6. `BuildIssue`, then `WriteIssue`;
7. only after the file is written: update history with every candidate and save it.

Any error returns immediately, before history is touched.

- [ ] **Step 1: Write the failing tests.** Use fakes for every dependency.
  - `TestRunWritesIssueAndUpdatesHistory`:
    - setup: 3 trending repos; 1 already in history; of the other 2, one was created 5 days ago and one 400 days ago;
    - expected issue file: `2026-W47.json`, with 1 new project and 1 new entry;
    - expected history: both new keys added, and the seen repo's `LastSeenReport` updated.
  - `TestRunLLMFailureWritesNothing`: the copy fake returns an error, so no file exists in `OutDir` and history is byte-identical to before.
  - `TestRunEmptyWeek`: every repo is already seen. An issue is still written with empty arrays, and the copy fake is called with zero candidates.
- [ ] **Step 2: Run the tests and confirm they fail.**
  Run: `go test ./internal/pipeline/`
  Expected: FAIL.
- [ ] **Step 3: Implement, then delete the dead packages.**
- [ ] **Step 4: Run the checks and confirm they pass.**
  Run: `go build ./... && go vet ./... && go test ./...`
  Expected: PASS. In addition:
  - `grep -rn 'reports/' internal cmd .github` prints nothing.
  - `python3 -c "import yaml,sys;[yaml.safe_load(open(f)) for f in sys.argv[1:]]" .github/workflows/*.yml` exits 0.
- [ ] **Step 5: Commit.** Message: `feat(pipeline): emit data/weekly/<YYYY-Www>.json; drop the Markdown report`.

### Task G6: Backfill history from the 42 old reports

**Files:**
- Create:
  - `cmd/backfill-history/main.go`
  - `internal/history/backfill.go`
  - `internal/history/backfill_test.go`
  - `internal/history/testdata/2026-02-week6.md`
  - `internal/history/testdata/2026-03-week10.md`: two trimmed real tables of 3 rows each, with one repo in both files.
- Modify: `data/history.json`, from the backfill output.

**Interfaces:**
- Produces: `func Backfill(hist *models.History, reportsDir string) (added int, err error)`.
  - Parse each `reports/YYYY-MM-weekN.md` table row, taking `owner/repo` from `https://github.com/{owner}/{repo}`.
  - Order reports by their `Report Date` line, not by filename.
  - For each repo, set `FirstSeenReport` and `FirstSeenDate` to the earliest report, and keep the later of the existing and parsed `LastSeen*`.
  - A report with no parsable `Report Date` is an error that names the file.

- [ ] **Step 1: Write the failing test.**
  - `TestBackfillEarliestWins`: seed the history with the shared repo first seen in `2026-11-week47`. After the backfill, its `FirstSeenReport` is `2026-02-week6`. All 5 distinct repos are present, and `added == 4`.
- [ ] **Step 2: Run the test and confirm it fails.**
  Run: `go test ./internal/history/ -run Backfill`
  Expected: FAIL.
- [ ] **Step 3: Implement it, then run it for real.**
  Run: `go run ./cmd/backfill-history -reports reports -history data/history.json`
- [ ] **Step 4: Verify.**
  Run: `python3 -c "import json;h=json.load(open('data/history.json'))['history'];print(len(h), h['anomalyco/opencode']['first_seen_report'])"`
  Expected: a count well above 50, and `2026-02-week6`. opencode is in the week-6 table.
- [ ] **Step 5: Commit.** Message: `chore(history): backfill first-seen weeks from the 42 Markdown reports`.

---

## Site tasks (repo `NoSugarCoffee.github.io`, branch `feat/ai-radar`)

### Task S1: Sync JSON issues instead of Markdown

**Files:**
- Modify:
  - `scripts/sync-reports.js`. The script keeps its name, because CI calls `yarn sync-reports`.
    - Copy `data/weekly/*.json` whose name matches `/^\d{4}-W\d{2}\.json$/` into `radar-data/`.
    - Delete the frontmatter, `gray-matter` and `escapeMdxCharacters` code.
    - Fail with exit 1 if no files match.
  - `.gitignore`: add `/radar-data` and `/reports`.
  - `package.json`: remove `gray-matter` if nothing else imports it (check with `grep -rn gray-matter src plugins scripts`). Remove its `yarn.lock` and `package-lock.json` entries by hand, keeping the diff minimal.
- Create:
  - `scripts/sync-reports.test.js`
  - `scripts/fixtures/radar/data/weekly/2026-W47.json`: a valid issue with 2 new projects, 3 new entries and one `starsThisWeek: null`.
  - `scripts/fixtures/radar/data/weekly/2026-W46.json`: an empty week.

**Interfaces:**
- Produces:
  - `radar-data/<YYYY-Www>.json` on disk.
  - `module.exports.syncIssues({sourceDir, targetDir}) → {copied: number}`.
  - Local runs use `node scripts/sync-reports.js --source scripts/fixtures/radar/data/weekly` until the generator has published real data.

- [ ] **Step 1: Write the failing test** with `node:test`.
  - `syncIssues` copies exactly the two fixtures, and ignores `notes.md` and `2026-11-week47.md` placed in a temp source.
  - It throws on an empty source dir, and the message contains `no weekly issues`.
- [ ] **Step 2: Run the test and confirm it fails.**
  Run: `node --test scripts/`
  Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the test and confirm it passes.**
  Run: `node --test scripts/`
  Expected: PASS. `git diff --stat yarn.lock` shows only removals.
- [ ] **Step 5: Commit.** Message: `feat(sync): copy weekly radar JSON instead of Markdown reports`.

### Task S2: `plugins/ai-radar`: load, validate, route, RSS

**Files:**
- Create:
  - `plugins/ai-radar/index.js`
  - `plugins/ai-radar/issues.js`, for pure functions
  - `plugins/ai-radar/issues.test.js`
- Modify: `docusaurus.config.js`. Register `[require.resolve('./plugins/ai-radar'), {dataDir: 'radar-data'}]`.

**Interfaces:**
- Consumes: the `radar-data/*.json` files (S1) and the Issue shape (G3).
- Produces:
  - `parseIssue(fileName: string, text: string) → Issue`. It throws `RadarDataError` with the file name when:
    - the JSON is invalid;
    - `schemaVersion !== 1`;
    - a required field is missing;
    - the `id` doesn't match the file name.
  - `sortIssues(issues) → Issue[]`, newest first by `(year, week)`.
  - `issueTitle(issue) → 'AI 开源雷达 · 第 47 周：' + headline`.
  - `buildRss(issues, siteUrl) → string`: RSS 2.0 with one `<item>` per issue. `link` and `guid` are `${siteUrl}/radar/${id}`, and the title comes from `issueTitle`.
  - Routes, added through `addRoute`:
    - `/radar`: the newest issue, exact;
    - `/radar/<id>`: each issue;
    - `/radar/archive`: every issue's id and title.
  - Components: `@site/src/components/Radar/IssuePage` and `@site/src/components/Radar/ArchivePage` (S3). Route data is passed through `createData` as modules `{issue, prevId, nextId}` and `{issues: [{id, title, generatedAt}]}`.
  - `postBuild` writes `build/radar/rss.xml`.

- [ ] **Step 1: Write the failing tests.**
  - `parseIssue` throws on `schemaVersion: 2`, and the message includes `2026-W47.json`.
  - `parseIssue` throws when `id: "2026-W46"` is in `2026-W47.json`.
  - `sortIssues` orders `[2027-W01, 2026-W53, 2026-W47]`.
  - `issueTitle` returns `AI 开源雷达 · 第 7 周：X` for week 7, with no zero padding.
  - `buildRss` output contains `<guid>https://NoSugarCoffee.github.io/radar/2026-W47</guid>` and escapes `&` in a headline.
- [ ] **Step 2: Run the tests and confirm they fail.**
  Run: `node --test plugins/`
  Expected: FAIL.
- [ ] **Step 3: Implement.** Until S3 exists, point the route components at a placeholder that renders `issue.headline`.
- [ ] **Step 4: Run the tests and the build, and confirm they pass.**
  Run: `node --test plugins/ && node scripts/sync-reports.js --source scripts/fixtures/radar/data/weekly && npx -y yarn@1.22.22 -s build`
  Expected:
  - the tests PASS and the build reports `[SUCCESS]`;
  - `build/radar/index.html` and `build/radar/2026-W46/index.html` exist;
  - `build/radar/rss.xml` has 2 `<item>`s.
- [ ] **Step 5: Commit.** Message: `feat(radar): plugin that validates weekly issues, adds /radar routes and RSS`.

### Task S3: Issue and archive pages, navbar, retire `/trending`

**Files:**
- Create:
  - `src/components/Radar/IssuePage.js`
  - `src/components/Radar/ArchivePage.js`
  - `src/components/Radar/styles.module.css`
  - `src/data/legacy-trending-routes.json`
- Modify: `docusaurus.config.js`.
  - Remove the `trending` blog plugin.
  - Replace the navbar item with `{to: '/radar', label: 'AI 雷达', position: 'left'}`.
  - Add to `client-redirects` one `{from, to: '/radar'}` entry per path in the JSON file.

`legacy-trending-routes.json` is a frozen list, not generated at build time. No new Markdown reports will ever exist, so a build-time list would only add a dependency on cloning the generator. Generate it once from today's `build/trending` (48 entries), as a sorted JSON array of paths:
- `/trending`
- `/trending/<42 slugs>`
- `/trending/page/2` … `/trending/page/5`
- `/trending/tags`, `/trending/tags/ai`, `/trending/tags/github`, `/trending/tags/trending`
- `/trending/archive`

This deviates from the spec's 「构建时生成，不手写」, and is recorded here as a planning ruling.

**Interfaces:**
- Consumes: the route data shapes (S2) and `issueTitle` (S2).
- Produces: the user-visible pages.

**`IssuePage` layout** (per the spec's sketch):
- `<h1>` with the `issueTitle`.
- A meta line: `YYYY-MM-DD · N 个新项目 · M 个新上榜`, with the date formatted in Asia/Shanghai.
- The summary paragraph.
- `🆕 新项目`: a card grid with `minmax(min(280px,100%),1fr)`. Each card shows the name linking to the repo, the language, the comment, `★<stars>`, `+<starsThisWeek>/周` when it isn't null, and `创建于 MM-DD`.
- `↗ 新上榜`: a compact `<ul>` with the name linking to the repo, `(owner)`, `— comment` and the same star text.
- Prev and next issue links.
- A heading appears only when its column is non-empty. When both columns are empty, show `本周没有新冒头的项目。`.
- Every repo link uses `target="_blank" rel="noopener noreferrer"`.

`ArchivePage` lists every issue title with its link, newest first.

- [ ] **Step 1: Write the failing build-output check** as `scripts/check-radar.test.js` (`node:test`, reading `build/`):
  - `build/radar/2026-W47/index.html` contains:
    - `AI 开源雷达 · 第 47 周：`;
    - `🆕 新项目`;
    - `↗ 新上榜`;
    - exactly 2 elements with the card class;
    - no `+null`;
    - no `+0/周`.
  - `build/radar/2026-W46/index.html` contains `本周没有新冒头的项目` and does not contain `🆕 新项目`.
  - For every path in `legacy-trending-routes.json`, `build<path>/index.html` exists and its `<meta http-equiv="refresh">` target is `/radar`.
  - `build/trending/rss.xml` does not exist, and the navbar HTML in `build/radar/index.html` contains `AI 雷达` and not `AI Trending`.
- [ ] **Step 2: Run the check against the current build and confirm it fails.**
  Run: `npx -y yarn@1.22.22 -s build && node --test scripts/check-radar.test.js`
  Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the check and confirm it passes.**
  Run: `node scripts/sync-reports.js --source scripts/fixtures/radar/data/weekly && npx -y yarn@1.22.22 -s build && node --test scripts/ plugins/`
  Expected: PASS. Then serve the build and take screenshots of `/radar/2026-W47` at 1280px light, 1280px dark and 500px. Check that nothing scrolls horizontally and the cards are readable.
- [ ] **Step 5: Commit.** Message: `feat(radar): issue and archive pages, AI 雷达 navbar, retire /trending`.

---

### Task F: Open both PRs (no merge)

- [ ] **Step 1:** Push `feat/radar-json` and open a PR in `ai-repo-insights`. The body includes:
  - "review `config/writing-guide.md`";
  - "restore LLM credits before the first run".
- [ ] **Step 2:** Push `feat/ai-radar` and open a PR in the site repo. The body states the deploy order:
  1. merge the generator PR;
  2. restore LLM credits;
  3. run `weekly-report.yml` through `workflow_dispatch` and confirm that `data/weekly/<id>.json` lands;
  4. merge the site PR.

  The site PR's "Test deployment" check clones the generator's `main`. It fails until step 3 has happened, and the PR body says so.
- [ ] **Step 3:** Read back both PRs with `gh pr view --json url,state`. Report both URLs.
