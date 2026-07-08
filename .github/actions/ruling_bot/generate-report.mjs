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

if (!oldResultsArgument) {
  throw new Error('Usage: node generate-report.mjs <old-results-path>');
}

const oldResultsDirectory = path.resolve(repositoryRoot, oldResultsArgument);
ensurePathIsInsideRepository(oldResultsDirectory, 'old results');

const oldResultsGitPath = toGitPath(path.relative(repositoryRoot, oldResultsDirectory));
const changedFiles = getChangedFiles(oldResultsGitPath);
const changes = changedFiles.flatMap(filePath => getRulingChanges(filePath, oldResultsDirectory));

process.stdout.write(generateMarkdown(changes));

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
  const currentData = parseJsonFile(path.join(repositoryRoot, filePath));
  const baseData = parseJsonFromGit(filePath);
  const relativeResultFile = toGitPath(
    path.relative(oldResultsDir, path.join(repositoryRoot, filePath)),
  );

  return [
    ...diffResultObjects({
      currentData,
      baseData,
      relativeResultFile,
      type: 'added',
    }),
    ...diffResultObjects({
      currentData: baseData,
      baseData: currentData,
      relativeResultFile,
      type: 'removed',
    }),
  ];
}

function diffResultObjects({ currentData, baseData, relativeResultFile, type }) {
  const changes = [];

  for (const [issuePath, values] of Object.entries(currentData)) {
    const currentValues = normalizeValues(values);
    const baseValues = new Set(normalizeValues(baseData[issuePath] ?? []).map(serializeValue));

    for (const value of currentValues) {
      if (!baseValues.has(serializeValue(value))) {
        changes.push({
          type,
          resultFile: relativeResultFile,
          issuePath,
          value,
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
  if (changes.length === 0) {
    return '';
  }

  const removed = changes.filter(change => change.type === 'removed');
  const added = changes.filter(change => change.type === 'added');

  let markdown = '## Ruling Report\n\n';

  if (removed.length > 0) {
    markdown += renderSection('Code no longer flagged', removed);
  }

  if (added.length > 0) {
    markdown += renderSection('New issues flagged', added);
  }

  return markdown;
}

function renderSection(title, changes) {
  const groupedByFile = new Map();

  for (const change of changes) {
    if (!groupedByFile.has(change.resultFile)) {
      groupedByFile.set(change.resultFile, []);
    }
    groupedByFile.get(change.resultFile).push(change);
  }

  let markdown = `### ${title} (${changes.length} issue${changes.length > 1 ? 's' : ''})\n\n`;

  const sortedEntries = [...groupedByFile.entries()].sort(([left], [right]) =>
    left.localeCompare(right),
  );

  for (const [resultFile, fileChanges] of sortedEntries) {
    markdown += `#### \`${resultFile}\`\n\n`;
    const sortedChanges = [...fileChanges].sort(compareChanges);
    for (const change of sortedChanges) {
      markdown += `- \`${formatIssue(change.issuePath, change.value)}\`\n`;
    }
    markdown += '\n';
  }

  return markdown;
}

function formatIssue(issuePath, value) {
  if (typeof value === 'number' || typeof value === 'string') {
    return `${issuePath}:${value}`;
  }

  return `${issuePath}: ${JSON.stringify(value)}`;
}

function compareChanges(left, right) {
  return (
    left.issuePath.localeCompare(right.issuePath) ||
    serializeValue(left.value).localeCompare(serializeValue(right.value))
  );
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

function toGitPath(candidatePath) {
  return candidatePath.split(path.sep).join(path.posix.sep);
}
