#!/usr/bin/env node
/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const actionDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(actionDirectory, '../../..');
const oldResultsArgument = process.argv[2];
const baseCommit = process.env.BASE_SHA || `origin/${process.env.BASE_REF ?? 'master'}`;
const sourcesDirectory = resolveRepositoryPath(process.env.SOURCES_PATH ?? 'its/sources');
const sourcesRepositoryUrl = trimTrailingSlash(process.env.SOURCES_REPO_URL ?? '');
const rspecBaseUrl = trimTrailingSlash(
  process.env.RSPEC_BASE_URL ?? 'https://sonarsource.github.io/rspec/#/rspec',
);
const maxInlineSnippets = parsePositiveInteger(process.env.MAX_INLINE_SNIPPETS, 10);

if (!oldResultsArgument) {
  throw new Error('Usage: node generate-report.mjs <old-results-path>');
}

const oldResultsDirectory = path.resolve(repositoryRoot, oldResultsArgument);
ensurePathIsInsideRepository(oldResultsDirectory, 'old results');

const oldResultsGitPath = toGitPath(path.relative(repositoryRoot, oldResultsDirectory));
const changedFiles = getChangedFiles(oldResultsGitPath);
const changes = changedFiles.flatMap(filePath => getRulingChanges(filePath, oldResultsDirectory));

if (changes.length === 0) {
  process.exit(0);
}

let markdown = generateMarkdown(changes);
if (changes.length > maxInlineSnippets) {
  markdown += generateCollapsibleFullReport(changes);
}

if (markdown) {
  process.stdout.write(`${markdown}\n`);
}

function getChangedFiles(oldResultsPath) {
  try {
    const output = git(['diff', baseCommit, '--name-only', '--', oldResultsPath]);
    return output
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .filter(line => line.endsWith('.json'))
      .sort((left, right) => left.localeCompare(right));
  } catch {
    return [];
  }
}

function getRulingChanges(filePath, oldResultsDir) {
  const metadata = parseResultMetadata(filePath, oldResultsDir);
  if (!metadata) {
    return [];
  }

  const currentData = parseJsonFile(path.join(repositoryRoot, filePath));
  const baseData = parseJsonFromGit(filePath);

  return [
    ...diffResultObjects({
      currentData,
      baseData,
      metadata,
      type: 'added',
    }),
    ...diffResultObjects({
      currentData: baseData,
      baseData: currentData,
      metadata,
      type: 'removed',
    }),
  ];
}

function parseResultMetadata(filePath, oldResultsDir) {
  const resultFile = toGitPath(path.relative(oldResultsDir, path.join(repositoryRoot, filePath)));
  const project = path.posix.dirname(resultFile);
  const fileName = path.posix.basename(resultFile, '.json');
  const separatorIndex = fileName.indexOf('-');

  if (project === '.' || separatorIndex <= 0 || separatorIndex === fileName.length - 1) {
    return undefined;
  }

  return {
    resultFile,
    project,
    language: fileName.slice(0, separatorIndex),
    rule: fileName.slice(separatorIndex + 1),
  };
}

function diffResultObjects({ currentData, baseData, metadata, type }) {
  const changes = [];

  for (const [issuePath, values] of Object.entries(currentData)) {
    const currentValues = normalizeValues(values);
    const baseValues = new Set(normalizeValues(baseData[issuePath] ?? []).map(serializeValue));

    for (const value of currentValues) {
      if (!baseValues.has(serializeValue(value))) {
        changes.push({
          type,
          ...metadata,
          issuePath,
          value,
          relativeFilePath: extractRelativeFilePath(issuePath),
          lineNumber: extractLineNumber(value),
        });
      }
    }
  }

  return changes;
}

function normalizeValues(values) {
  if (Array.isArray(values)) {
    return values;
  }
  return [values];
}

function extractRelativeFilePath(issuePath) {
  const separatorIndex = issuePath.indexOf(':');
  return separatorIndex === -1 ? issuePath : issuePath.slice(separatorIndex + 1);
}

function extractLineNumber(value) {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) ? parsed : null;
  }

  if (value && typeof value === 'object') {
    const record = value;
    if ('line' in record && Number.isInteger(record.line)) {
      return record.line;
    }
    if ('startLine' in record && Number.isInteger(record.startLine)) {
      return record.startLine;
    }
    if (
      'textRange' in record &&
      record.textRange &&
      typeof record.textRange === 'object' &&
      'startLine' in record.textRange &&
      Number.isInteger(record.textRange.startLine)
    ) {
      return record.textRange.startLine;
    }
  }

  return null;
}

function serializeValue(value) {
  return JSON.stringify(value);
}

function parseJsonFile(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }

  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch {
    return {};
  }
}

function parseJsonFromGit(filePath) {
  try {
    return JSON.parse(git(['show', `${baseCommit}:${toGitPath(filePath)}`]));
  } catch {
    return {};
  }
}

function generateMarkdown(changes) {
  const removed = changes.filter(change => change.type === 'removed');
  const added = changes.filter(change => change.type === 'added');

  let markdown = '## Ruling Report\n\n';

  if (removed.length > 0) {
    markdown += renderChangesSection('Code no longer flagged', removed);
  }

  if (added.length > 0) {
    markdown += renderChangesSection('New issues flagged', added);
  }

  return markdown;
}

function renderChangesSection(title, changes, inlineSnippetLimit = maxInlineSnippets) {
  let markdown = `### ${title} (${changes.length} issue${changes.length > 1 ? 's' : ''})\n\n`;
  let snippetCount = 0;

  for (const [rule, ruleChanges] of groupChangesByRule(changes)) {
    if (snippetCount >= inlineSnippetLimit) {
      break;
    }

    markdown += `${formatRuleHeading(rule, ruleChanges[0].language)}\n\n`;

    for (const change of sortChanges(ruleChanges)) {
      if (snippetCount >= inlineSnippetLimit) {
        const remaining = changes.length - snippetCount;
        markdown += `\n_...and ${remaining} more_\n\n`;
        break;
      }

      markdown += renderDetailedChange(change);
      snippetCount++;
    }
  }

  return markdown;
}

function generateCollapsibleFullReport(changes) {
  const removed = changes.filter(change => change.type === 'removed');
  const added = changes.filter(change => change.type === 'added');

  let markdown = '\n<details>\n<summary>📋 View full report</summary>\n\n';

  if (removed.length > 0) {
    markdown += `#### Code no longer flagged (${removed.length})\n\n`;
    markdown += generateFullChangesSection(removed);
  }

  if (added.length > 0) {
    markdown += `#### New issues flagged (${added.length})\n\n`;
    markdown += generateFullChangesSection(added);
  }

  markdown += '</details>\n';

  return markdown;
}

function generateFullChangesSection(changes) {
  let markdown = '';

  for (const [rule, ruleChanges] of groupChangesByRule(changes)) {
    markdown += `${formatRuleHeading(rule, ruleChanges[0].language, 'strong')}\n\n`;
    for (const change of sortChanges(ruleChanges)) {
      markdown += `${formatFullReportEntry(change)}\n`;
    }
    markdown += '\n';
  }

  return markdown;
}

function groupChangesByRule(changes) {
  const groupedByRule = new Map();

  for (const change of sortChanges(changes)) {
    if (!groupedByRule.has(change.rule)) {
      groupedByRule.set(change.rule, []);
    }
    groupedByRule.get(change.rule).push(change);
  }

  return groupedByRule;
}

function renderDetailedChange(change) {
  const locationLabel = formatLocation(change);
  const locationLink = buildSourceLink(change);
  const heading = locationLink
    ? `**<a href="${locationLink}" target="_blank">${escapeHtml(locationLabel)}</a>**`
    : `**${escapeMarkdown(locationLabel)}**`;
  const snippet = getSnippet(change);

  if (snippet) {
    return `${heading}\n\`\`\`${detectSnippetLanguage(change.relativeFilePath)}\n${snippet}\n\`\`\`\n\n`;
  }

  if (change.lineNumber !== null) {
    return `${heading}\n_(snippet not available)_\n\n`;
  }

  return `${heading}\n\`${formatIssue(change.issuePath, change.value)}\`\n\n`;
}

function formatFullReportEntry(change) {
  const locationLabel = formatLocation(change);
  const locationLink = buildSourceLink(change);

  if (locationLink) {
    return `- <a href="${locationLink}" target="_blank">${escapeHtml(locationLabel)}</a>`;
  }

  return `- \`${locationLabel}\``;
}

function formatRuleHeading(rule, language, wrapper = 'h4') {
  const rspecLink = buildRspecLink(rule, language);
  const escapedRule = escapeHtml(rule);

  if (wrapper === 'strong') {
    return rspecLink
      ? `**<a href="${rspecLink}" target="_blank">${escapedRule}</a>**`
      : `**${escapedRule}**`;
  }

  return rspecLink
    ? `#### <a href="${rspecLink}" target="_blank">${escapedRule}</a>`
    : `#### ${escapedRule}`;
}

function buildRspecLink(rule, language) {
  if (!rspecBaseUrl) {
    return null;
  }

  return `${rspecBaseUrl}/${encodeURIComponent(rule)}/${encodeURIComponent(language)}`;
}

function buildSourceLink(change) {
  if (!sourcesRepositoryUrl) {
    return null;
  }

  const repoRelativePath = getSourceRepositoryPath(change);
  if (!repoRelativePath) {
    return null;
  }

  const encodedPath = repoRelativePath
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/');
  const lineSuffix = change.lineNumber !== null ? `#L${change.lineNumber}` : '';

  return `${sourcesRepositoryUrl}/${encodedPath}${lineSuffix}`;
}

function getSourceRepositoryPath(change) {
  if (change.project.startsWith('custom-')) {
    return `custom/${change.project.slice('custom-'.length)}/${toGitPath(change.relativeFilePath)}`;
  }

  return `${change.project}/${toGitPath(change.relativeFilePath)}`;
}

function getSnippet(change) {
  if (!sourcesDirectory || change.lineNumber === null || change.lineNumber < 1) {
    return null;
  }

  const localSourceFile = resolveLocalSourceFile(change);
  if (!localSourceFile || !existsSync(localSourceFile)) {
    return null;
  }

  try {
    const content = readFileSync(localSourceFile, 'utf-8');
    const lines = content.split('\n');
    const startLine = Math.max(0, change.lineNumber - 3);
    const endLine = Math.min(lines.length, change.lineNumber + 2);

    return lines
      .slice(startLine, endLine)
      .map((line, index) => {
        const lineNumber = startLine + index + 1;
        const marker = lineNumber === change.lineNumber ? '>' : ' ';
        return `${marker} ${lineNumber.toString().padStart(4)} | ${line}`;
      })
      .join('\n');
  } catch {
    return null;
  }
}

function resolveLocalSourceFile(change) {
  const basePath = change.project.startsWith('custom-')
    ? path.resolve(sourcesDirectory, 'custom', change.project.slice('custom-'.length))
    : path.resolve(sourcesDirectory, 'projects', change.project);
  const candidatePath = path.resolve(basePath, change.relativeFilePath);
  const relativePath = path.relative(basePath, candidatePath);

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return null;
  }

  return candidatePath;
}

function detectSnippetLanguage(filePathValue) {
  const extension = path.extname(filePathValue).slice(1).toLowerCase();
  const basename = path.basename(filePathValue).toLowerCase();
  const languageByExtension = {
    bash: 'bash',
    c: 'c',
    cc: 'cpp',
    cpp: 'cpp',
    cs: 'csharp',
    css: 'css',
    go: 'go',
    h: 'c',
    hpp: 'cpp',
    html: 'html',
    java: 'java',
    js: 'javascript',
    json: 'json',
    jsx: 'jsx',
    kt: 'kotlin',
    kts: 'kotlin',
    php: 'php',
    py: 'python',
    rb: 'ruby',
    scala: 'scala',
    sh: 'bash',
    sql: 'sql',
    swift: 'swift',
    ts: 'typescript',
    tsx: 'tsx',
    xml: 'xml',
    yaml: 'yaml',
    yml: 'yaml',
  };

  if (basename === 'dockerfile') {
    return 'dockerfile';
  }

  return languageByExtension[extension] ?? '';
}

function formatLocation(change) {
  if (change.lineNumber !== null) {
    return `${change.project}/${change.relativeFilePath}:${change.lineNumber}`;
  }

  return `${change.project}/${change.relativeFilePath}`;
}

function formatIssue(issuePath, value) {
  if (typeof value === 'number' || typeof value === 'string') {
    return `${issuePath}:${value}`;
  }

  return `${issuePath}: ${JSON.stringify(value)}`;
}

function sortChanges(changes) {
  return [...changes].sort(compareChanges);
}

function compareChanges(left, right) {
  return (
    left.rule.localeCompare(right.rule) ||
    left.project.localeCompare(right.project) ||
    left.relativeFilePath.localeCompare(right.relativeFilePath) ||
    compareNullableNumbers(left.lineNumber, right.lineNumber) ||
    left.issuePath.localeCompare(right.issuePath) ||
    serializeValue(left.value).localeCompare(serializeValue(right.value))
  );
}

function compareNullableNumbers(left, right) {
  if (left === right) {
    return 0;
  }
  if (left === null) {
    return 1;
  }
  if (right === null) {
    return -1;
  }
  return left - right;
}

function git(args) {
  return execFileSync('git', args, {
    cwd: repositoryRoot,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function ensurePathIsInsideRepository(candidatePath, label) {
  const relativePath = path.relative(repositoryRoot, candidatePath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error(`${label} path must be inside repository root: ${candidatePath}`);
  }
}

function resolveRepositoryPath(candidatePath) {
  if (!candidatePath) {
    return undefined;
  }

  const resolvedPath = path.resolve(repositoryRoot, candidatePath);
  ensurePathIsInsideRepository(resolvedPath, 'sources');
  return resolvedPath;
}

function parsePositiveInteger(candidateValue, fallbackValue) {
  const parsedValue = Number.parseInt(candidateValue ?? '', 10);
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : fallbackValue;
}

function trimTrailingSlash(candidateValue) {
  return candidateValue.replace(/\/+$/, '');
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function escapeMarkdown(value) {
  return value.replaceAll('\\', '\\\\').replaceAll('*', '\\*').replaceAll('_', '\\_');
}

function toGitPath(candidatePath) {
  return candidatePath.split(path.sep).join(path.posix.sep);
}
