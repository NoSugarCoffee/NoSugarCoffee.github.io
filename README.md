# NoSugarCoffee

A personal technical blog built with [Docusaurus 3](https://docusaurus.io/).

## Features

- Technical articles on software development
- Weekly GitHub trending insights
- Multi-language support
- Clean, responsive design

## Development

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
```

## Content Management

### Syncing External Reports

Sync weekly reports from external repositories:

```bash
npm run sync-reports
```

Options:
- `--dry-run` - Preview without copying
- `--source <path>` - Use local directory
- `--target <path>` - Custom target directory

## Project Structure

```
blog/           # Blog posts
docs/           # Documentation
reports/        # Weekly insights
src/            # Custom components
static/         # Static assets
```

## License

MIT
