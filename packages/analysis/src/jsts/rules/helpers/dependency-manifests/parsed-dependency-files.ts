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
import type { PackageJson } from 'type-fest';
import ts from 'typescript';
import yaml from 'yaml';
import { type File, normalizeToAbsolutePath, stripBOM } from '../files.js';
import type { DenoJson, Workspace } from './resolvers/types.js';

const parsedPackageJsonCache = new Map<string, PackageJson | undefined>();
const parsedPnpmWorkspaceCache = new Map<string, Workspace | undefined>();
const parsedDenoManifestCache = new Map<string, DenoJson | undefined>();

export function clearParsedDependencyFileCache(): void {
  parsedPackageJsonCache.clear();
  parsedPnpmWorkspaceCache.clear();
  parsedDenoManifestCache.clear();
}

function getOrSetParsedDependencyFile<T>(
  cache: Map<string, T | undefined>,
  file: File,
  parse: (file: File) => T | undefined,
): T | undefined {
  const cacheKey = normalizeToAbsolutePath(file.filePath);
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }
  const parsed = parse(file);
  cache.set(cacheKey, parsed);
  return parsed;
}

export function parsePackageJson(file: File): PackageJson | undefined {
  return getOrSetParsedDependencyFile(parsedPackageJsonCache, file, file =>
    parsePackageJsonContent(file.fileContent, file.filePath),
  );
}

export function parsePackageJsonContent(
  content: string,
  filePath?: string,
): PackageJson | undefined {
  try {
    return JSON.parse(stripBOM(content)) as PackageJson;
  } catch (error) {
    if (filePath) {
      console.debug(`Error parsing package.json ${filePath}: ${error}`);
    }
    return undefined;
  }
}

export function parsePnpmWorkspace(file: File): Workspace | undefined {
  return getOrSetParsedDependencyFile(parsedPnpmWorkspaceCache, file, parsePnpmWorkspaceContent);
}

function parsePnpmWorkspaceContent(file: File): Workspace | undefined {
  try {
    const parsedPnpm = yaml.parse(file.fileContent);
    if (
      parsedPnpm &&
      ('catalog' in parsedPnpm || 'catalogs' in parsedPnpm || 'packages' in parsedPnpm)
    ) {
      return parsedPnpm;
    }
    return undefined;
  } catch (error) {
    console.debug(`Error parsing pnpm workspace ${file.filePath}: ${error}`);
    return undefined;
  }
}

export function parseDenoManifest(file: File): DenoJson | undefined {
  return getOrSetParsedDependencyFile(parsedDenoManifestCache, file, parseDenoManifestContent);
}

function parseDenoManifestContent(file: File): DenoJson | undefined {
  try {
    // ts.parseConfigFileTextToJson handles JSON with comments and trailing commas
    const parsed = ts.parseConfigFileTextToJson(file.filePath, stripBOM(file.fileContent));
    if (parsed.error) {
      const message = ts.flattenDiagnosticMessageText(parsed.error.messageText, '\n');
      console.debug(`Error parsing deno manifest ${file.filePath}: ${message}`);
      return;
    }
    return parsed.config as DenoJson;
  } catch (error) {
    console.debug(`Error parsing deno manifest ${file.filePath}: ${error}`);
    return;
  }
}
