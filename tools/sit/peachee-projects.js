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
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { readJsonFile } from './common.js';

const DEFAULT_PROJECTS_PER_SHARD = 16;

const EXCLUDED_SCANNER_PROPERTIES = new Set([
  'sonar.projectDescription',
  'sonar.projectKey',
  'sonar.projectName',
  'sonar.projectVersion',
]);

const EXCLUDED_SCANNER_PROPERTY_PREFIXES = ['sonar.links.'];

export async function loadPeacheeProjects(peacheeRoot) {
  const projectsPath = join(peacheeRoot, 'projects.json');
  const projects = await readJsonFile(projectsPath, 'Peachee projects.json');
  if (projects === null || typeof projects !== 'object' || Array.isArray(projects)) {
    throw new Error(`Peachee projects.json must contain an object: ${projectsPath}`);
  }
  return projects;
}

export function selectEnabledPeacheeProjects(projects, rawProjectFilter = '') {
  const enabledProjects = Object.entries(projects)
    .filter(
      ([, config]) => isEnabledProjectConfig(config) && !requiresAuthenticatedCheckout(config),
    )
    .map(([name]) => name)
    .sort((left, right) => left.localeCompare(right));
  const requestedProjects = parseProjectFilter(rawProjectFilter);
  if (requestedProjects.size === 0) {
    if (enabledProjects.length === 0) {
      throw new Error('No enabled peachee-js projects found');
    }
    return enabledProjects;
  }

  const enabledSet = new Set(enabledProjects);
  const missingProjects = [...requestedProjects].filter(project => !enabledSet.has(project)).sort();
  if (missingProjects.length > 0) {
    throw new Error(
      `Unknown, disabled, or auth-gated peachee-js project(s): ${missingProjects.join(', ')}`,
    );
  }
  return enabledProjects.filter(project => requestedProjects.has(project));
}

export async function buildPeacheeManifest(peacheeRoot, projectNames) {
  const manifest = [];
  for (const projectName of projectNames) {
    const projectRoot = join(peacheeRoot, projectName);
    const properties = parseSonarProperties(
      await readFile(join(projectRoot, 'sonar-project.properties'), 'utf8'),
    );
    manifest.push({
      name: projectName,
      folder: resolve(projectRoot, 'workspace'),
      scannerProperties: buildPeacheeScannerProperties(properties),
    });
  }
  return manifest;
}

export function buildPeacheeShardMatrix(
  projectNames,
  projectsPerShard = DEFAULT_PROJECTS_PER_SHARD,
) {
  const shardSize = Number(projectsPerShard);
  if (!Number.isInteger(shardSize) || shardSize <= 0) {
    throw new Error(`projectsPerShard must be a positive integer: ${projectsPerShard}`);
  }
  if (projectNames.length === 0) {
    throw new Error('No peachee-js projects selected');
  }

  const shardCount = Math.ceil(projectNames.length / shardSize);
  const padding = Math.max(String(shardCount).length, 2);
  const include = [];
  for (let shardIndex = 0; shardIndex < shardCount; shardIndex += 1) {
    const shardProjects = projectNames.slice(shardIndex * shardSize, (shardIndex + 1) * shardSize);
    const shard = String(shardIndex + 1).padStart(padding, '0');
    include.push({
      shard,
      label: `${shardIndex + 1}/${shardCount}`,
      project_count: shardProjects.length,
      project_filter: shardProjects.join(','),
      projects: shardProjects,
    });
  }
  return { include };
}

export function parseSonarProperties(text) {
  const properties = {};
  let currentLine = '';
  let continuing = false;

  for (const rawLine of text.split(/\r?\n/u)) {
    currentLine = continuing ? currentLine + rawLine.replace(/^[\t\f ]+/u, '') : rawLine;
    if (endsWithContinuation(currentLine)) {
      currentLine = currentLine.slice(0, -1);
      continuing = true;
      continue;
    }
    addPropertyLine(properties, currentLine);
    currentLine = '';
    continuing = false;
  }

  if (continuing && currentLine !== '') {
    addPropertyLine(properties, currentLine);
  }
  return properties;
}

export function buildPeacheeScannerProperties(properties) {
  return Object.fromEntries(
    Object.entries(properties).filter(
      ([key, value]) =>
        key.startsWith('sonar.') &&
        !EXCLUDED_SCANNER_PROPERTIES.has(key) &&
        !EXCLUDED_SCANNER_PROPERTY_PREFIXES.some(prefix => key.startsWith(prefix)) &&
        value !== '',
    ),
  );
}

function isEnabledProjectConfig(config) {
  return (
    config !== null &&
    typeof config === 'object' &&
    !Array.isArray(config) &&
    config.analysis !== false
  );
}

function requiresAuthenticatedCheckout(config) {
  if (config === null || typeof config !== 'object' || Array.isArray(config)) {
    return false;
  }
  return typeof config.auth === 'string' ? config.auth.trim() !== '' : Boolean(config.auth);
}

function parseProjectFilter(rawProjectFilter) {
  if (!rawProjectFilter) {
    return new Set();
  }
  return new Set(
    rawProjectFilter
      .split(',')
      .map(project => project.trim())
      .filter(project => project.length > 0),
  );
}

function endsWithContinuation(line) {
  let backslashCount = 0;
  for (let index = line.length - 1; index >= 0 && line[index] === '\\'; index -= 1) {
    backslashCount += 1;
  }
  return backslashCount % 2 === 1;
}

function addPropertyLine(properties, line) {
  const trimmedLine = line.trimStart();
  if (trimmedLine === '' || trimmedLine.startsWith('#') || trimmedLine.startsWith('!')) {
    return;
  }

  const separatorIndex = findSeparatorIndex(line);
  if (separatorIndex === -1) {
    properties[decodeProperty(trimmedLine)] = '';
    return;
  }

  const key = decodeProperty(line.slice(0, separatorIndex).trimEnd());
  let valueStart = separatorIndex;
  while (valueStart < line.length && /\s/u.test(line[valueStart])) {
    valueStart += 1;
  }
  if (line[valueStart] === '=' || line[valueStart] === ':') {
    valueStart += 1;
  }
  while (valueStart < line.length && /\s/u.test(line[valueStart])) {
    valueStart += 1;
  }
  properties[key] = decodeProperty(line.slice(valueStart).trim());
}

function findSeparatorIndex(line) {
  let escaped = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === '\\') {
      escaped = true;
      continue;
    }
    if (character === '=' || character === ':' || /\s/u.test(character)) {
      return index;
    }
  }
  return -1;
}

function decodeProperty(value) {
  return value
    .replace(/\\u([0-9a-fA-F]{4})/gu, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/\\t/gu, '\t')
    .replace(/\\n/gu, '\n')
    .replace(/\\r/gu, '\r')
    .replace(/\\f/gu, '\f')
    .replace(/\\(.)/gu, '$1');
}
