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
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function resolvePathUnder(root, value, label) {
  const allowedRoot = resolve(root);
  const candidate = isAbsolute(value) ? value : resolve(allowedRoot, value);
  const resolved = resolve(candidate);
  const relativePath = relative(allowedRoot, resolved);
  if (
    relativePath === '..' ||
    relativePath.startsWith(`..${pathSeparator()}`) ||
    isAbsolute(relativePath)
  ) {
    throw new Error(`${label} escapes allowed directory: ${resolved}`);
  }
  return resolved;
}

export async function readJsonFile(path, label = 'JSON file') {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`${label} must be valid JSON: ${path}: ${error.message}`);
    }
    throw error;
  }
}

export async function writeJsonFile(path, payload) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

export function emptyFpsMetrics() {
  return {
    issues_analyzed: null,
    false_positive_rate: null,
    cluster_count: null,
    clusters: [],
  };
}

export async function appendGithubOutput(key, value) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) {
    throw new Error('GITHUB_OUTPUT is not set');
  }
  const delimiter = `EOF_${randomUUID().replaceAll('-', '')}`;
  await writeFile(outputPath, `${key}<<${delimiter}\n${value}\n${delimiter}\n`, {
    encoding: 'utf8',
    flag: 'a',
  });
}

export function isMain(importMetaUrl) {
  return process.argv[1] !== undefined && fileURLToPath(importMetaUrl) === resolve(process.argv[1]);
}

export function parseOptionArgs(argv) {
  const args = new Map();
  for (let i = 2; i < argv.length; i += 2) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!key?.startsWith('--') || value === undefined) {
      throw new Error(`Invalid argument list near ${key ?? '<end>'}`);
    }
    args.set(key, value);
  }
  return args;
}

export function requireOption(args, key) {
  const value = args.get(key);
  if (value === undefined || value === '') {
    throw new Error(`Missing required ${key} argument`);
  }
  return value;
}

function pathSeparator() {
  return process.platform === 'win32' ? '\\' : '/';
}
