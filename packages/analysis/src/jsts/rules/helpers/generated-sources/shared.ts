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
import { readdir, stat } from 'node:fs/promises';
import { extname } from 'node:path/posix';
import {
  normalizeToAbsolutePath,
  type NormalizedAbsolutePath,
} from '../../../../../../shared/src/helpers/files.js';
import type { DerivedGeneratedSources, GeneratedSourceFileMatcher } from './contracts.js';

const OBVIOUS_BUILD_OR_CACHE_SEGMENTS = new Set([
  'node_modules',
  'dist',
  'build',
  '.cache',
  'coverage',
  '.next',
]);
const DEFAULT_GENERATED_SOURCE_EXTENSIONS = new Set([
  '.js',
  '.mjs',
  '.cjs',
  '.jsx',
  '.ts',
  '.mts',
  '.cts',
  '.tsx',
]);
const defaultGeneratedSourceFileMatcher: GeneratedSourceFileMatcher = filePath =>
  DEFAULT_GENERATED_SOURCE_EXTENSIONS.has(extname(filePath).toLowerCase());

export function createDerivedGeneratedSources(): DerivedGeneratedSources {
  return {
    familyByFile: new Map<NormalizedAbsolutePath, string>(),
    configPaths: new Set<NormalizedAbsolutePath>(),
    watchedOutputPaths: new Set<NormalizedAbsolutePath>(),
  };
}

export function mergeDerivedGeneratedSources(
  target: DerivedGeneratedSources,
  source: DerivedGeneratedSources,
) {
  for (const [filePath, family] of sortPathEntries(source.familyByFile.entries())) {
    if (!target.familyByFile.has(filePath)) {
      target.familyByFile.set(filePath, family);
    }
  }

  for (const configPath of sortPaths(source.configPaths)) {
    target.configPaths.add(configPath);
  }

  for (const outputPath of sortPaths(source.watchedOutputPaths)) {
    target.watchedOutputPaths.add(outputPath);
  }
}

export function addFamilyFiles(
  family: string,
  filePaths: Iterable<NormalizedAbsolutePath>,
  target: DerivedGeneratedSources,
) {
  for (const filePath of sortPaths(filePaths)) {
    target.familyByFile.set(filePath, family);
  }
}

export function resolveLiteralPath(
  maybePath: string,
  declaredFromDir: NormalizedAbsolutePath,
  baseDir: NormalizedAbsolutePath,
) {
  if (!isLiteralPathToken(maybePath)) {
    return undefined;
  }

  const resolvedPath = normalizeToAbsolutePath(maybePath, declaredFromDir);
  // Explicit generator outputs may legitimately be rooted under dist/build; only prune nested
  // cache/build subtrees when walking inside those declared outputs.
  return isWithinBaseDir(resolvedPath, baseDir) ? resolvedPath : undefined;
}

export function isLiteralPathToken(value: string) {
  return value.length > 0 && !value.includes('$') && !value.includes('`') && !value.includes('+');
}

export function isSourceFile(
  path: NormalizedAbsolutePath,
  sourceFileMatcher: GeneratedSourceFileMatcher = defaultGeneratedSourceFileMatcher,
) {
  return sourceFileMatcher(path);
}

export async function isFile(path: NormalizedAbsolutePath) {
  const stats = await safeStat(path);
  return stats?.isFile() === true;
}

export async function isDirectory(path: NormalizedAbsolutePath) {
  const stats = await safeStat(path);
  return stats?.isDirectory() === true;
}

export async function safeStat(path: NormalizedAbsolutePath) {
  try {
    return await stat(path);
  } catch {
    return undefined;
  }
}

async function safeReadDir(path: NormalizedAbsolutePath) {
  try {
    return await readdir(path, { withFileTypes: true });
  } catch {
    return [];
  }
}

export async function listSourceFilesInDirectory(
  directory: NormalizedAbsolutePath,
  recursive: boolean,
  sourceFileMatcher: GeneratedSourceFileMatcher = defaultGeneratedSourceFileMatcher,
) {
  const entries = await safeReadDir(directory);
  const sourceFiles: NormalizedAbsolutePath[] = [];

  for (const entry of entries) {
    const entryPath = normalizeToAbsolutePath(entry.name, directory);
    if (!isSafeChildEntryPath(entryPath, directory)) {
      continue;
    }

    if (entry.isFile() && isSourceFile(entryPath, sourceFileMatcher)) {
      sourceFiles.push(entryPath);
      continue;
    }

    if (recursive && entry.isDirectory()) {
      sourceFiles.push(...(await listSourceFilesInDirectory(entryPath, true, sourceFileMatcher)));
    }
  }

  return sourceFiles;
}

/**
 * Extracts literal flag values from a shell-like script string.
 * Exported for testing purposes.
 */
export function extractFlagValues(script: string, flags: string[]) {
  const tokens = tokenizeScript(script);
  if (!tokens) {
    return [];
  }

  return extractFlagValuesFromTokens(tokens, flags);
}

export function extractFlagValuesFromTokens(tokens: readonly string[], flags: string[]) {
  const values: string[] = [];
  for (const [index, token] of tokens.entries()) {
    const value = resolveFlagValue(token, tokens[index + 1], flags);
    if (value !== undefined) {
      values.push(value);
    }
  }

  return values;
}

export type ParsedCommandSegment = {
  commandLine: string;
  command: string;
  args: readonly string[];
};

export function parseDirectCommandSegments(script: string): ParsedCommandSegment[] {
  const segments: ParsedCommandSegment[] = [];
  const tokens: string[] = [];
  let current = '';
  let quote: '"' | "'" | undefined;
  let segmentStart = 0;

  const flushToken = () => {
    if (current.length > 0) {
      tokens.push(current);
      current = '';
    }
  };

  const finalizeSegment = (segmentEnd: number, nextSegmentStart: number) => {
    flushToken();

    const commandLine = script.slice(segmentStart, segmentEnd).trim();
    segmentStart = nextSegmentStart;

    if (tokens.length === 0 || commandLine.length === 0) {
      tokens.length = 0;
      return;
    }

    const [command, ...args] = tokens;
    tokens.length = 0;

    if (!isDirectCommandToken(command)) {
      return;
    }

    segments.push({
      commandLine,
      command,
      args,
    });
  };

  for (let index = 0; index < script.length; index++) {
    const char = script[index];

    if (quote) {
      if (char === quote) {
        quote = undefined;
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (char === '&' && script[index + 1] === '&') {
      finalizeSegment(index, index + 2);
      index += 1;
      continue;
    }

    if (isWhitespace(char)) {
      flushToken();
      continue;
    }

    current += char;
  }

  if (quote) {
    return [];
  }

  finalizeSegment(script.length, script.length);
  return segments;
}

function tokenizeScript(script: string) {
  const tokens: string[] = [];
  let current = '';
  let quote: '"' | "'" | undefined;

  for (const char of script) {
    if (quote) {
      if (char === quote) {
        quote = undefined;
      } else {
        current += char;
      }
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (isWhitespace(char)) {
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }

  if (quote) {
    return undefined;
  }

  if (current.length > 0) {
    tokens.push(current);
  }

  return tokens;
}

export function matchesCommandToken(token: string, commandName: string) {
  const lastPathSegment = getLastPathSegment(token);
  return lastPathSegment === commandName || lastPathSegment.startsWith(`${commandName}.`);
}

export function isDirectCommandToken(command: string) {
  return !isShellGeneratedToken(command) && !isEnvironmentAssignment(command);
}

function resolveFlagValue(token: string, nextToken: string | undefined, flags: string[]) {
  if (flags.includes(token)) {
    return nextToken;
  }

  return resolveEqualsFlagValue(token, flags);
}

function resolveEqualsFlagValue(token: string, flags: string[]) {
  for (const flag of flags) {
    const equalsPrefix = `${flag}=`;
    if (token.startsWith(equalsPrefix) && token.length > equalsPrefix.length) {
      return token.slice(equalsPrefix.length);
    }
  }

  return undefined;
}

function isWithinBaseDir(path: NormalizedAbsolutePath, baseDir: NormalizedAbsolutePath) {
  const relativePath = getRelativeToAncestorPath(path, baseDir);
  return relativePath !== undefined;
}

function isSafeChildEntryPath(
  path: NormalizedAbsolutePath,
  parentDirectory: NormalizedAbsolutePath,
) {
  const relativePath = getRelativeToAncestorPath(path, parentDirectory);
  return relativePath !== undefined && !hasObviousBuildOrCacheDirectory(relativePath);
}

function getRelativeToAncestorPath(
  filePath: NormalizedAbsolutePath,
  topDir: NormalizedAbsolutePath,
) {
  const topDirPrefix = topDir.endsWith('/') ? topDir : `${topDir}/`;
  if (filePath === topDir) {
    return '';
  }

  return filePath.startsWith(topDirPrefix) ? filePath.slice(topDirPrefix.length) : undefined;
}

function hasObviousBuildOrCacheDirectory(path: string) {
  return path
    .split('/')
    .some(segment => segment.length > 0 && OBVIOUS_BUILD_OR_CACHE_SEGMENTS.has(segment));
}

// Keep insertion order stable so generated-source maps are deterministic across platforms/runs.
function comparePathsAlphabetically(left: string, right: string) {
  return left.localeCompare(right);
}

function sortPaths<T extends NormalizedAbsolutePath>(paths: Iterable<T>) {
  return [...paths].sort(comparePathsAlphabetically);
}

export function sortPathEntries<T>(entries: Iterable<[NormalizedAbsolutePath, T]>) {
  return [...entries].sort(([left], [right]) => comparePathsAlphabetically(left, right));
}

function getLastPathSegment(path: string) {
  const separatorIndex = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  return separatorIndex >= 0 ? path.slice(separatorIndex + 1) : path;
}

function isShellGeneratedToken(token: string) {
  return token.includes('$') || token.includes('`');
}

function isEnvironmentAssignment(token: string) {
  const equalsIndex = token.indexOf('=');
  if (equalsIndex <= 0) {
    return false;
  }

  return /^[A-Za-z_]\w*$/.test(token.slice(0, equalsIndex));
}

function isWhitespace(char: string) {
  return /[ \t\n\r\f\v]/.test(char);
}
