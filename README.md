# NoSugarCoffee.github.io

Personal blog build with [Docusaurus 3](https://docusaurus.io/), a modern static website generator.

## GitHub AI Trending Reports

This site includes weekly GitHub AI trending reports from the [ai-repo-insights](https://github.com/NoSugarCoffee/ai-repo-insights) project.

### Syncing Reports

To sync the latest reports from the ai-repo-insights repository:

```bash
npm run sync-reports
```

This command will:
1. Clone the ai-repo-insights repository
2. Copy report files from the `reports/` directory
3. Add frontmatter metadata if missing
4. Escape MDX characters for proper rendering

### Command Options

- `--dry-run`: Preview changes without copying files
- `--source <path>`: Use a local directory instead of cloning
- `--target <path>`: Specify a different target directory
- `--repo <url>`: Clone from a different repository URL

### Examples

```bash
# Preview sync without making changes
npm run sync-reports -- --dry-run

# Sync from local directory
npm run sync-reports -- --source /path/to/ai-repo-insights/reports

# Sync to different target
npm run sync-reports -- --target ./custom-reports
```

### Directory Structure

```
reports/                    # GitHub AI trending reports
├── 2026-02-week6.md       # Weekly report files
└── .gitkeep               # Keeps directory in git
```

### Report Format

Reports follow the naming pattern `YYYY-MM-weekN.md` and include:
- Frontmatter with slug, title, date, and tags
- Overview of AI trends
- Top 50 repositories table
- Category breakdowns (rag, llm, vision, agent, etc.)
