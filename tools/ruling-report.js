#!/usr/bin/env node
/**
 * Generates a markdown report of ruling changes for PR comments.
 *
 * Usage: node tools/ruling-report.js [--removed-only]
 *
 * Parses git diff of ruling JSON files and fetches code snippets
 * from the source files for added/removed issues.
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const SOURCES_DIR = join(ROOT_DIR, 'its/sources/jsts/projects');

const removedOnly = process.argv.includes('--removed-only');

function getRulingDiff() {
  try {
    const diff = execSync('git diff --unified=0 its/ruling/src/test/expected/jsts/', {
      cwd: ROOT_DIR,
      encoding: 'utf-8',
    });
    return diff;
  } catch {
    return '';
  }
}

function parseDiff(diff) {
  const changes = [];
  let currentFile = null;
  let currentRule = null;

  for (const line of diff.split('\n')) {
    // Match file header: diff --git a/its/ruling/.../typescript-S6754.json b/its/ruling/.../typescript-S6754.json
    const fileMatch = line.match(
      /^diff --git a\/its\/ruling\/src\/test\/expected\/jsts\/([^/]+)\/(\w+)-(\w+)\.json/,
    );
    if (fileMatch) {
      currentFile = fileMatch[1]; // project name
      currentRule = fileMatch[3]; // rule ID (e.g., S6754)
      continue;
    }

    // Match removed line number
    const removedLineMatch = line.match(/^-(\d+),?$/);
    if (removedLineMatch && currentFile && currentRule) {
      changes.push({
        type: 'removed',
        project: currentFile,
        rule: currentRule,
        line: parseInt(removedLineMatch[1], 10),
      });
      continue;
    }

    // Match added line number (new issues being flagged)
    const addedLineMatch = line.match(/^\+(\d+),?$/);
    if (addedLineMatch && currentFile && currentRule && !removedOnly) {
      changes.push({
        type: 'added',
        project: currentFile,
        rule: currentRule,
        line: parseInt(addedLineMatch[1], 10),
      });
      continue;
    }
  }

  return changes;
}

function getSnippet(project, filePath, lineNumber, contextLines = 2) {
  const fullPath = join(SOURCES_DIR, project, filePath);

  if (!existsSync(fullPath)) {
    return null;
  }

  try {
    const content = readFileSync(fullPath, 'utf-8');
    const lines = content.split('\n');
    const startLine = Math.max(0, lineNumber - contextLines - 1);
    const endLine = Math.min(lines.length, lineNumber + contextLines);

    const snippet = lines
      .slice(startLine, endLine)
      .map((line, i) => {
        const num = startLine + i + 1;
        const marker = num === lineNumber ? '>' : ' ';
        return `${marker} ${num.toString().padStart(4)} | ${line}`;
      })
      .join('\n');

    return snippet;
  } catch {
    return null;
  }
}

function enrichChangesWithFilePaths(changes, diff) {
  // Re-parse to associate line numbers with file paths
  let currentProject = null;
  let currentRule = null;
  let currentFilePath = null;
  const lineToFile = new Map();

  for (const line of diff.split('\n')) {
    const fileMatch = line.match(
      /^diff --git a\/its\/ruling\/src\/test\/expected\/jsts\/([^/]+)\/(\w+)-(\w+)\.json/,
    );
    if (fileMatch) {
      currentProject = fileMatch[1];
      currentRule = fileMatch[3];
      currentFilePath = null;
      continue;
    }

    // Match file path in JSON (both added and removed contexts)
    const pathMatch = line.match(/^[@ +-]*"([^"]+):([^"]+)":\s*\[?/);
    if (pathMatch && currentProject) {
      currentFilePath = pathMatch[2];
      continue;
    }

    // Match line numbers
    const lineMatch = line.match(/^([+-])(\d+),?$/);
    if (lineMatch && currentProject && currentRule && currentFilePath) {
      const key = `${lineMatch[1]}:${currentProject}:${currentRule}:${lineMatch[2]}`;
      lineToFile.set(key, currentFilePath);
    }
  }

  // Enrich changes with file paths
  for (const change of changes) {
    const key = `${change.type === 'removed' ? '-' : '+'}:${change.project}:${change.rule}:${change.line}`;
    change.filePath = lineToFile.get(key);
  }

  return changes;
}

function generateMarkdown(changes) {
  if (changes.length === 0) {
    return '';
  }

  const removed = changes.filter(c => c.type === 'removed');
  const added = changes.filter(c => c.type === 'added');

  let md = '## Ruling Report\n\n';

  if (removed.length > 0) {
    md += `### Code no longer flagged (${removed.length} issue${removed.length > 1 ? 's' : ''})\n\n`;

    // Group by rule
    const byRule = new Map();
    for (const change of removed) {
      const key = change.rule;
      if (!byRule.has(key)) {
        byRule.set(key, []);
      }
      byRule.get(key).push(change);
    }

    for (const [rule, ruleChanges] of byRule) {
      md += `#### ${rule}\n\n`;

      for (const change of ruleChanges) {
        if (!change.filePath) continue;

        const snippet = getSnippet(change.project, change.filePath, change.line);
        md += `**${change.project}/${change.filePath}:${change.line}**\n`;
        if (snippet) {
          // Detect language from file extension
          const ext = change.filePath.split('.').pop();
          const lang =
            { ts: 'typescript', tsx: 'tsx', js: 'javascript', jsx: 'jsx' }[ext] || 'typescript';
          md += `\`\`\`${lang}\n${snippet}\n\`\`\`\n\n`;
        } else {
          md += `_(snippet not available)_\n\n`;
        }
      }
    }
  }

  if (added.length > 0) {
    md += `### New issues flagged (${added.length} issue${added.length > 1 ? 's' : ''})\n\n`;

    const byRule = new Map();
    for (const change of added) {
      const key = change.rule;
      if (!byRule.has(key)) {
        byRule.set(key, []);
      }
      byRule.get(key).push(change);
    }

    for (const [rule, ruleChanges] of byRule) {
      md += `#### ${rule}\n\n`;

      for (const change of ruleChanges) {
        if (!change.filePath) continue;

        const snippet = getSnippet(change.project, change.filePath, change.line);
        md += `**${change.project}/${change.filePath}:${change.line}**\n`;
        if (snippet) {
          const ext = change.filePath.split('.').pop();
          const lang =
            { ts: 'typescript', tsx: 'tsx', js: 'javascript', jsx: 'jsx' }[ext] || 'typescript';
          md += `\`\`\`${lang}\n${snippet}\n\`\`\`\n\n`;
        } else {
          md += `_(snippet not available)_\n\n`;
        }
      }
    }
  }

  return md;
}

// Main
const diff = getRulingDiff();
if (!diff) {
  process.exit(0);
}

let changes = parseDiff(diff);
changes = enrichChangesWithFilePaths(changes, diff);

const markdown = generateMarkdown(changes);
if (markdown) {
  console.log(markdown);
}
