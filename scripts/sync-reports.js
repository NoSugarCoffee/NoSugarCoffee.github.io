#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration constants
const DEFAULT_REPO_URL = 'https://github.com/NoSugarCoffee/ai-repo-insights.git';
const DEFAULT_TARGET_DIR = path.join(__dirname, '..', 'reports');
const TEMP_CLONE_DIR = path.join(__dirname, '..', '.tmp-ai-repo-insights');
const REPORT_FILENAME_PATTERN = /^\d{4}-\d{2}-week\d+\.md$/;

// Custom error classes
class SourceDirectoryNotFoundError extends Error {
  constructor(dirPath) {
    super(`Source directory does not exist: ${dirPath}`);
    this.name = 'SourceDirectoryNotFoundError';
  }
}

class GitCloneError extends Error {
  constructor(repoUrl, reason) {
    super(`Failed to clone repository ${repoUrl}: ${reason}`);
    this.name = 'GitCloneError';
  }
}

class FilePermissionError extends Error {
  constructor(filePath, operation) {
    super(`Permission denied ${operation}: ${filePath}`);
    this.name = 'FilePermissionError';
  }
}

class FileCopyError extends Error {
  constructor(source, target, reason) {
    super(`Failed to copy ${source} to ${target}: ${reason}`);
    this.name = 'FileCopyError';
  }
}

class InvalidMarkdownError extends Error {
  constructor(filename, details) {
    super(`Invalid markdown in file: ${filename}, reason: ${details}`);
    this.name = 'InvalidMarkdownError';
  }
}

module.exports = {
  DEFAULT_REPO_URL,
  DEFAULT_TARGET_DIR,
  TEMP_CLONE_DIR,
  REPORT_FILENAME_PATTERN,
  SourceDirectoryNotFoundError,
  GitCloneError,
  FilePermissionError,
  FileCopyError,
  InvalidMarkdownError,
};

/**
 * Validates that the source directory exists and is accessible
 * @param {string} sourceDir - Path to source directory
 * @throws {SourceDirectoryNotFoundError} If directory does not exist
 * @throws {FilePermissionError} If directory is not accessible
 */
function validateSourceDirectory(sourceDir) {
  try {
    if (!fs.existsSync(sourceDir)) {
      throw new SourceDirectoryNotFoundError(sourceDir);
    }
    
    // Check if directory is readable
    fs.accessSync(sourceDir, fs.constants.R_OK);
  } catch (error) {
    if (error instanceof SourceDirectoryNotFoundError) {
      throw error;
    }
    if (error.code === 'EACCES') {
      throw new FilePermissionError(sourceDir, 'accessing');
    }
    throw error;
  }
}

module.exports = {
  ...module.exports,
  validateSourceDirectory,
};

/**
 * Reads all markdown files from source directory and filters by pattern
 * @param {string} sourceDir - Path to source directory
 * @returns {string[]} Array of filenames matching the report pattern
 * @throws {FilePermissionError} If directory cannot be read
 */
function readAndFilterReportFiles(sourceDir) {
  try {
    const allFiles = fs.readdirSync(sourceDir);
    
    // Filter for .md files matching the pattern
    const reportFiles = allFiles.filter(filename => {
      return filename.endsWith('.md') && REPORT_FILENAME_PATTERN.test(filename);
    });
    
    return reportFiles;
  } catch (error) {
    if (error.code === 'EACCES') {
      throw new FilePermissionError(sourceDir, 'reading');
    }
    throw error;
  }
}

module.exports = {
  ...module.exports,
  readAndFilterReportFiles,
};

/**
 * Copies a file from source to target directory
 * @param {string} filename - Name of the file to copy
 * @param {string} sourceDir - Source directory path
 * @param {string} targetDir - Target directory path
 * @throws {FileCopyError} If copy operation fails
 * @throws {FilePermissionError} If file cannot be read or written
 */
function copyReportFile(filename, sourceDir, targetDir) {
  const sourcePath = path.join(sourceDir, filename);
  const targetPath = path.join(targetDir, filename);
  
  try {
    // Ensure target directory exists
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    // Read source file
    const content = fs.readFileSync(sourcePath, 'utf8');
    
    // Write to target
    fs.writeFileSync(targetPath, content, 'utf8');
  } catch (error) {
    if (error.code === 'EACCES') {
      throw new FilePermissionError(error.path, 'accessing');
    }
    throw new FileCopyError(sourcePath, targetPath, error.message);
  }
}

module.exports = {
  ...module.exports,
  copyReportFile,
};

/**
 * Clones the ai-repo-insights repository to a temporary directory
 * @param {string} repoUrl - Git repository URL
 * @param {string} targetDir - Directory to clone into
 * @returns {string} Path to the reports directory in cloned repo
 * @throws {GitCloneError} If clone operation fails
 */
function cloneRepository(repoUrl, targetDir) {
  try {
    // Remove existing temp directory if it exists
    if (fs.existsSync(targetDir)) {
      fs.rmSync(targetDir, { recursive: true, force: true });
    }
    
    console.log(`Cloning repository from ${repoUrl}...`);
    execSync(`git clone --depth 1 ${repoUrl} ${targetDir}`, { 
      stdio: 'inherit',
      encoding: 'utf8'
    });
    
    const reportsDir = path.join(targetDir, 'reports');
    if (!fs.existsSync(reportsDir)) {
      throw new SourceDirectoryNotFoundError(reportsDir);
    }
    
    return reportsDir;
  } catch (error) {
    throw new GitCloneError(repoUrl, error.message);
  }
}

/**
 * Cleans up temporary clone directory
 * @param {string} cloneDir - Directory to remove
 */
function cleanupClone(cloneDir) {
  if (fs.existsSync(cloneDir)) {
    fs.rmSync(cloneDir, { recursive: true, force: true });
  }
}

module.exports = {
  ...module.exports,
  cloneRepository,
  cleanupClone,
};

const matter = require('gray-matter');

/**
 * Parses frontmatter from markdown content
 * @param {string} content - Markdown file content
 * @returns {{data: object, content: string, hasFrontmatter: boolean}} Parsed frontmatter and content
 */
function parseFrontmatter(content) {
  const parsed = matter(content);
  const hasFrontmatter = Object.keys(parsed.data).length > 0;
  
  return {
    data: parsed.data,
    content: parsed.content,
    hasFrontmatter: hasFrontmatter,
  };
}

/**
 * Generates default frontmatter from filename
 * @param {string} filename - Report filename (YYYY-MM-weekN.md)
 * @returns {{slug: string, title: string, date: string, tags: string[]}} Default frontmatter
 */
function generateDefaultFrontmatter(filename) {
  const match = filename.match(/^(\d{4})-(\d{2})-week(\d+)\.md$/);
  
  if (!match) {
    throw new Error(`Invalid filename format: ${filename}`);
  }
  
  const [, year, month, week] = match;
  const slug = `${year}-${month}-week${week}`;
  const title = `AI GitHub Trending Report - ${year}-${month}-week${week}`;
  
  // Use first day of the month as the date
  const date = `${year}-${month}-01`;
  
  return {
    slug: slug,
    title: title,
    date: date,
    tags: ['ai', 'github', 'trending'],
  };
}

/**
 * Adds frontmatter to markdown content if missing
 * @param {string} content - Original markdown content
 * @param {string} filename - Filename to generate defaults from
 * @returns {string} Content with frontmatter
 */
function addFrontmatterIfMissing(content, filename) {
  const parsed = parseFrontmatter(content);
  
  if (parsed.hasFrontmatter) {
    return content;
  }
  
  const defaults = generateDefaultFrontmatter(filename);
  const frontmatterStr = matter.stringify(parsed.content, defaults);
  
  return frontmatterStr;
}

module.exports = {
  ...module.exports,
  parseFrontmatter,
  generateDefaultFrontmatter,
  addFrontmatterIfMissing,
};

/**
 * Main sync function that orchestrates the entire sync process
 * @param {object} config - Sync configuration
 * @param {string} config.repoUrl - Git repository URL (optional, will clone if provided)
 * @param {string} config.sourceDir - Source directory path (optional, for local sync)
 * @param {string} config.targetDir - Target directory path
 * @param {boolean} config.dryRun - If true, preview changes without copying
 * @returns {{copied: number, skipped: number, errors: Array}} Sync results
 */
function syncReports(config) {
  const { repoUrl, sourceDir, targetDir, dryRun } = config;
  const results = {
    copied: 0,
    skipped: 0,
    errors: [],
  };
  
  let actualSourceDir = sourceDir;
  let shouldCleanup = false;
  
  try {
    // Clone repository if repoUrl is provided
    if (repoUrl) {
      actualSourceDir = cloneRepository(repoUrl, TEMP_CLONE_DIR);
      shouldCleanup = true;
    }
    
    // Validate source directory
    if (!actualSourceDir) {
      throw new Error('Either repoUrl or sourceDir must be provided');
    }
    validateSourceDirectory(actualSourceDir);
    
    // Read and filter report files
    const reportFiles = readAndFilterReportFiles(actualSourceDir);
    console.log(`Found ${reportFiles.length} report files`);
    
    // Process each file
    for (const filename of reportFiles) {
      try {
        const sourcePath = path.join(actualSourceDir, filename);
        const content = fs.readFileSync(sourcePath, 'utf8');
        
        // Escape MDX characters
        const escapedContent = escapeMdxCharacters(content);
        
        // Add frontmatter if missing
        const processedContent = addFrontmatterIfMissing(escapedContent, filename);
        
        if (dryRun) {
          console.log(`[DRY RUN] Would copy: ${filename}`);
          results.skipped++;
        } else {
          // Write processed content to target
          const targetPath = path.join(targetDir, filename);
          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
          }
          fs.writeFileSync(targetPath, processedContent, 'utf8');
          console.log(`Copied: ${filename}`);
          results.copied++;
        }
      } catch (error) {
        console.error(`Error processing ${filename}: ${error.message}`);
        results.errors.push({
          file: filename,
          message: error.message,
        });
      }
    }
    
    return results;
  } finally {
    // Cleanup cloned repository
    if (shouldCleanup) {
      cleanupClone(TEMP_CLONE_DIR);
    }
  }
}

module.exports = {
  ...module.exports,
  syncReports,
};

/**
 * Parses CLI arguments
 * @param {string[]} args - Command line arguments
 * @returns {{dryRun: boolean, repoUrl: string|null, sourceDir: string|null, targetDir: string}} Parsed config
 */
function parseCliArgs(args) {
  const config = {
    dryRun: false,
    repoUrl: null,
    sourceDir: null,
    targetDir: DEFAULT_TARGET_DIR,
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--dry-run') {
      config.dryRun = true;
    } else if (arg === '--source' && i + 1 < args.length) {
      config.sourceDir = args[i + 1];
      i++;
    } else if (arg === '--target' && i + 1 < args.length) {
      config.targetDir = args[i + 1];
      i++;
    } else if (arg === '--repo' && i + 1 < args.length) {
      config.repoUrl = args[i + 1];
      i++;
    }
  }
  
  // Default to cloning from GitHub if no source specified
  if (!config.sourceDir && !config.repoUrl) {
    config.repoUrl = DEFAULT_REPO_URL;
  }
  
  return config;
}

module.exports = {
  ...module.exports,
  parseCliArgs,
};

/**
 * Prints sync results summary
 * @param {{copied: number, skipped: number, errors: Array}} results - Sync results
 */
function printResults(results) {
  console.log('\n=== Sync Results ===');
  console.log(`Copied: ${results.copied}`);
  console.log(`Skipped: ${results.skipped}`);
  console.log(`Errors: ${results.errors.length}`);
  
  if (results.errors.length > 0) {
    console.log('\nErrors:');
    results.errors.forEach(error => {
      console.log(`  - ${error.file}: ${error.message}`);
    });
  }
}

// CLI entry point
if (require.main === module) {
  const config = parseCliArgs(process.argv.slice(2));
  
  console.log('Starting sync...');
  console.log(`Dry run: ${config.dryRun}`);
  console.log(`Target: ${config.targetDir}`);
  
  if (config.repoUrl) {
    console.log(`Repository: ${config.repoUrl}`);
  } else {
    console.log(`Source: ${config.sourceDir}`);
  }
  
  try {
    const results = syncReports(config);
    printResults(results);
    
    if (results.errors.length > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error(`\nFatal error: ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  ...module.exports,
  printResults,
};

/**
 * Escapes characters that conflict with MDX/JSX syntax
 * @param {string} content - Markdown content
 * @returns {string} Content with escaped characters
 */
function escapeMdxCharacters(content) {
  // Escape < and > that are not part of HTML tags or markdown links
  // Replace standalone < and > with HTML entities
  return content
    .replace(/&/g, '&amp;')
    .replace(/<(?![a-zA-Z/!])/g, '&lt;')
    .replace(/(?<![a-zA-Z0-9])>/g, '&gt;');
}

module.exports = {
  ...module.exports,
  escapeMdxCharacters,
};
