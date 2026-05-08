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
import { type File, stripBOM } from '../files.js';
import type { DenoManifest } from './resolvers/types.js';

export type PnpmWorkspace = {
  packages?: string[];
  catalog?: Record<string, string>;
  catalogs?: Record<string, Record<string, string>>;
};

const parsedPackageJsonCache = new Map<string, PackageJson | undefined>();
const parsedPnpmWorkspaceCache = new Map<string, PnpmWorkspace | undefined>();
const parsedDenoManifestCache = new Map<string, DenoManifest | undefined>();

export function clearParsedManifestCache(): void {
  parsedPackageJsonCache.clear();
  parsedPnpmWorkspaceCache.clear();
  parsedDenoManifestCache.clear();
}

export function parsePackageJson(file: File): PackageJson | undefined {
  const cached = parsedPackageJsonCache.get(file.path);
  if (cached || parsedPackageJsonCache.has(file.path)) {
    return cached;
  }
  const parsed = parsePackageJsonContent(file.content, file.path);
  parsedPackageJsonCache.set(file.path, parsed);
  return parsed;
}

export function parsePackageJsonContent(
  content: string | Buffer,
  filePath?: string,
): PackageJson | undefined {
  const packageJsonContent = typeof content === 'string' ? content : content.toString();
  try {
    return JSON.parse(stripBOM(packageJsonContent)) as PackageJson;
  } catch (error) {
    if (filePath) {
      console.debug(`Error parsing package.json ${filePath}: ${error}`);
    }
    return undefined;
  }
}

export function parsePnpmWorkspace(file: File): PnpmWorkspace | undefined {
  const cached = parsedPnpmWorkspaceCache.get(file.path);
  if (cached || parsedPnpmWorkspaceCache.has(file.path)) {
    return cached;
  }
  const parsed = parsePnpmWorkspaceContent(file);
  parsedPnpmWorkspaceCache.set(file.path, parsed);
  return parsed;
}

function parsePnpmWorkspaceContent(file: File): PnpmWorkspace | undefined {
  try {
    const parsedPnpm = yaml.parse(file.content.toString());
    if (
      parsedPnpm &&
      ('catalog' in parsedPnpm || 'catalogs' in parsedPnpm || 'packages' in parsedPnpm)
    ) {
      return parsedPnpm;
    }
    return undefined;
  } catch (error) {
    console.debug(`Error parsing pnpm workspace ${file.path}: ${error}`);
    return undefined;
  }
}

export function parseDenoManifest(file: File): DenoManifest | undefined {
  const cached = parsedDenoManifestCache.get(file.path);
  if (cached || parsedDenoManifestCache.has(file.path)) {
    return cached;
  }
  const parsed = parseDenoManifestContent(file);
  parsedDenoManifestCache.set(file.path, parsed);
  return parsed;
}

function parseDenoManifestContent(file: File): DenoManifest | undefined {
  try {
    // ts.parseConfigFileTextToJson handles JSON with comments and trailing commas
    const parsed = ts.parseConfigFileTextToJson(file.path, stripBOM(file.content.toString()));
    if (parsed.error) {
      const message = ts.flattenDiagnosticMessageText(parsed.error.messageText, '\n');
      console.debug(`Error parsing deno manifest ${file.path}: ${message}`);
      return;
    }
    return parsed.config as DenoManifest;
  } catch (error) {
    console.debug(`Error parsing deno manifest ${file.path}: ${error}`);
    return;
  }
}
