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
import path from 'node:path';

export function readProjectPropertiesForJob(peacheeRoot, jobName, headSha, runtime) {
  const relativePath = path.posix.join(jobName, 'sonar-project.properties');

  if (headSha) {
    try {
      // A missing properties file becomes structured unresolved output, not CLI noise.
      return runtime.execFileSync('git', ['show', `${headSha}:${relativePath}`], {
        cwd: peacheeRoot,
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch {
      return undefined;
    }
  }

  const propertiesPath = path.join(peacheeRoot, jobName, 'sonar-project.properties');
  if (!runtime.existsSync(propertiesPath)) {
    return undefined;
  }

  return runtime.readFileSync(propertiesPath, 'utf-8');
}

export function parseProjectProperties(content, projectDir) {
  const properties = parseProperties(content);
  const sonarSources = splitPropertyList(properties.get('sonar.sources'));
  const sonarTests = splitPropertyList(properties.get('sonar.tests'));

  return {
    projectKey: properties.get('sonar.projectKey')?.trim(),
    projectDir,
    hasSonarTests: sonarTests.length > 0,
    sonarSources,
    sonarTests,
  };
}

function parseProperties(content) {
  const properties = new Map();

  for (const rawLine of joinContinuedLines(content)) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith('#') || line.startsWith('!')) {
      continue;
    }

    const separatorIndex = rawLine.search(/\s*[=:]/u);
    if (separatorIndex === -1) {
      properties.set(rawLine.trim(), '');
      continue;
    }

    const key = rawLine.slice(0, separatorIndex).trim();
    const value = rawLine.slice(separatorIndex).replace(/^\s*[=:]\s*/u, '');
    properties.set(key, value.trim());
  }

  return properties;
}

function joinContinuedLines(content) {
  const logicalLines = [];
  let currentLine = '';
  let continuing = false;

  for (const rawLine of content.split(/\r?\n/u)) {
    currentLine += continuing ? rawLine.replace(/^\s+/u, '') : rawLine;

    if (hasContinuationBackslash(currentLine)) {
      currentLine = currentLine.slice(0, -1);
      continuing = true;
      continue;
    }

    logicalLines.push(currentLine);
    currentLine = '';
    continuing = false;
  }

  if (currentLine.length > 0) {
    logicalLines.push(currentLine);
  }

  return logicalLines;
}

function hasContinuationBackslash(line) {
  const trailingBackslashes = line.match(/\\+$/u)?.[0].length ?? 0;
  return trailingBackslashes % 2 === 1;
}

function splitPropertyList(value) {
  return (value ?? '')
    .split(',')
    .map(entry => entry.trim())
    .filter(entry => entry.length > 0);
}
