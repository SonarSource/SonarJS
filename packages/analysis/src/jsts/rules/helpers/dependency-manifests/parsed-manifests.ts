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
import yaml from 'yaml';
import { type File, stripBOM } from '../files.js';

export type PnpmWorkspace = {
  packages?: string[];
  catalog?: Record<string, string>;
  catalogs?: Record<string, Record<string, string>>;
};

const parsedPackageJsonCache = new Map<string, PackageJson | undefined>();
const parsedPnpmWorkspaceCache = new Map<string, PnpmWorkspace | undefined>();

export function clearParsedManifestCache(): void {
  parsedPackageJsonCache.clear();
  parsedPnpmWorkspaceCache.clear();
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
