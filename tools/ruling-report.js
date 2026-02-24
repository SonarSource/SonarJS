#!/usr/bin/env node
/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
/**
 * Generates a markdown report of ruling changes for PR comments.
 *
 * Usage: node tools/ruling-report.js
 *
 * Compares ruling JSON files against origin/master and generates a report
 * showing all changes introduced by the current branch.
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const SOURCES_DIR = join(ROOT_DIR, 'its/sources');
const BASE_REF = 'origin/master';
const SOURCES_REPO_URL = 'https://github.com/SonarSource/jsts-test-sources/blob/master';
const RSPEC_URL = 'https://musical-adventure-r9qk65j.pages.github.io/rspec/#';

function getChangedRulingFiles() {
  try {
    // Compare against master to show all changes introduced by this branch
    const output = execSync(`git diff ${BASE_REF} --name-only its/ruling/src/test/expected/`, {
      cwd: ROOT_DIR,
      encoding: 'utf-8',
    });
    return output.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function parseRulingJson(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

function getRulingChanges(filePath) {
  const changes = [];

  // Extract project and rule from file path
  // e.g., its/ruling/src/test/expected/jsts/ace/javascript-S1134.json
  const match = filePath.match(/expected\/([^/]+)\/([\w.-]+)-(S\w+|CommentRegexTest\w*)\.json$/);
  if (!match) return changes;

  const [, project, , rule] = match;
  const fullPath = join(ROOT_DIR, filePath);

  // Get current (staged/working) version
  const currentData = parseRulingJson(fullPath);

  // Get master version (suppress stderr for new files)
  let masterData = {};
  try {
    const masterContent = execSync(`git show ${BASE_REF}:${filePath} 2>/dev/null`, {
      cwd: ROOT_DIR,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    masterData = JSON.parse(masterContent);
  } catch {
    // File might be new
  }

  // Find added lines (in current but not in master)
  for (const [fileKey, lines] of Object.entries(currentData)) {
    const masterLines = new Set(masterData[fileKey] || []);
    // Extract relative path from "project:path" format
    const relativePath = fileKey.includes(':') ? fileKey.split(':')[1] : fileKey;

    for (const line of lines) {
      if (!masterLines.has(line)) {
        changes.push({
          type: 'added',
          project,
          rule,
          filePath: relativePath,
          line,
        });
      }
    }
  }

  // Find removed lines (in master but not in current)
  for (const [fileKey, lines] of Object.entries(masterData)) {
    const currentLines = new Set(currentData[fileKey] || []);
    const relativePath = fileKey.includes(':') ? fileKey.split(':')[1] : fileKey;

    for (const line of lines) {
      if (!currentLines.has(line)) {
        changes.push({
          type: 'removed',
          project,
          rule,
          filePath: relativePath,
          line,
        });
      }
    }
  }

  return changes;
}

function getSnippet(project, filePath, lineNumber, contextLines = 2) {
  let fullPath = join(SOURCES_DIR, 'projects', project, filePath);
  if (!existsSync(fullPath) && project.startsWith('custom-')) {
    // Custom test fixtures live under custom/<language>/
    fullPath = join(SOURCES_DIR, 'custom', project.slice('custom-'.length), filePath);
  }

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

function generateMarkdown(changes) {
  if (changes.length === 0) {
    return '';
  }

  const removed = changes.filter(c => c.type === 'removed');
  const added = changes.filter(c => c.type === 'added');

  let md = '## Ruling Report\n\n';

  if (removed.length > 0) {
    md += `### Code no longer flagged (${removed.length} issue${removed.length > 1 ? 's' : ''})\n\n`;
    md += generateChangesSection(removed);
  }

  if (added.length > 0) {
    md += `### New issues flagged (${added.length} issue${added.length > 1 ? 's' : ''})\n\n`;
    md += generateChangesSection(added);
  }

  return md;
}

const MAX_SNIPPETS = 10;

function generateChangesSection(changes, maxSnippets = MAX_SNIPPETS) {
  let md = '';
  let snippetCount = 0;
  const unlimited = maxSnippets === null;

  // Group by rule
  const byRule = new Map();
  for (const change of changes) {
    if (!byRule.has(change.rule)) {
      byRule.set(change.rule, []);
    }
    byRule.get(change.rule).push(change);
  }

  for (const [rule, ruleChanges] of byRule) {
    if (!unlimited && snippetCount >= maxSnippets) break;

    const rspecLink = `${RSPEC_URL}/${rule}/javascript`;
    md += `#### <a href="${rspecLink}" target="_blank">${rule}</a>\n\n`;

    for (const change of ruleChanges) {
      if (!unlimited && snippetCount >= maxSnippets) {
        const remaining = changes.length - snippetCount;
        md += `\n_...and ${remaining} more_\n\n`;
        break;
      }

      const snippet = getSnippet(change.project, change.filePath, change.line);
      const fileLink = `${SOURCES_REPO_URL}/${change.project}/${change.filePath}#L${change.line}`;
      md += `**<a href="${fileLink}" target="_blank">${change.project}/${change.filePath}:${change.line}</a>**\n`;
      if (snippet) {
        const ext = change.filePath.split('.').pop();
        const lang =
          { ts: 'typescript', tsx: 'tsx', js: 'javascript', jsx: 'jsx', css: 'css' }[ext] ||
          'javascript';
        md += `\`\`\`${lang}\n${snippet}\n\`\`\`\n\n`;
      } else {
        md += `_(snippet not available)_\n\n`;
      }
      snippetCount++;
    }
  }

  return md;
}

function generateFullChangesSection(changes) {
  let md = '';

  // Group by rule
  const byRule = new Map();
  for (const change of changes) {
    if (!byRule.has(change.rule)) {
      byRule.set(change.rule, []);
    }
    byRule.get(change.rule).push(change);
  }

  for (const [rule, ruleChanges] of byRule) {
    const rspecLink = `${RSPEC_URL}/${rule}/javascript`;
    md += `**<a href="${rspecLink}" target="_blank">${rule}</a>**\n\n`;

    for (const change of ruleChanges) {
      const fileLink = `${SOURCES_REPO_URL}/${change.project}/${change.filePath}#L${change.line}`;
      md += `- <a href="${fileLink}" target="_blank">${change.project}/${change.filePath}:${change.line}</a>\n`;
    }
    md += '\n';
  }

  return md;
}

function generateCollapsibleFullReport(changes) {
  const removed = changes.filter(c => c.type === 'removed');
  const added = changes.filter(c => c.type === 'added');

  let md = '\n<details>\n<summary>📋 View full report</summary>\n\n';

  if (removed.length > 0) {
    md += `#### Code no longer flagged (${removed.length})\n\n`;
    md += generateFullChangesSection(removed);
  }

  if (added.length > 0) {
    md += `#### New issues flagged (${added.length})\n\n`;
    md += generateFullChangesSection(added);
  }

  md += '</details>\n';

  return md;
}

// Main
const changedFiles = getChangedRulingFiles();
if (changedFiles.length === 0) {
  process.exit(0);
}

const allChanges = [];
for (const file of changedFiles) {
  const changes = getRulingChanges(file);
  allChanges.push(...changes);
}

let markdown = generateMarkdown(allChanges);

// Add collapsible full report if truncated
if (allChanges.length > MAX_SNIPPETS) {
  markdown += generateCollapsibleFullReport(allChanges);
}

if (markdown) {
  console.log(markdown);
}
