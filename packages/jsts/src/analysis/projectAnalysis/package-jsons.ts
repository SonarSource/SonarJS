/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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

import { PackageJson } from 'type-fest';
import { getFsEvents } from '../../../../shared/src/helpers/configuration.js';
import { basename, dirname } from 'node:path/posix';
import { clearDependenciesCache, fillCacheWithNewPath, PACKAGE_JSON } from '../../rules/index.js';
import { getPaths } from './files.js';

export const UNINITIALIZED_ERROR =
  'package.json cache has not been initialized. Call loadFiles() first.';

export type PackageJsonWithPath = {
  filePath: string;
  fileContent: PackageJson;
};

let packageJsons: PackageJsonWithPath[] | undefined;
let baseDir: string | undefined;

export function packageJsonsCacheInitialized(baseDir: string) {
  dirtyCachesIfNeeded(baseDir);
  return typeof packageJsons !== 'undefined';
}

export function getPackageJsons() {
  if (!packageJsons) {
    throw new Error(UNINITIALIZED_ERROR);
  }
  return packageJsons;
}

export function setPackageJsons(newBaseDir: string, newPackageJsons: PackageJsonWithPath[]) {
  packageJsons = newPackageJsons;
  baseDir = newBaseDir;
  for (const projectPath of getPaths()) {
    fillCacheWithNewPath(
      projectPath,
      packageJsons
        .filter(({ filePath }) => projectPath.startsWith(dirname(filePath)))
        .map(({ fileContent }) => fileContent),
    );
  }
}

export function dirtyCachesIfNeeded(currentBaseDir: string) {
  if (currentBaseDir !== baseDir) {
    clearPackageJsonsCache();
  }
  for (const fileEvent of getFsEvents()) {
    const [filename] = fileEvent;
    const filenameLower = basename(filename).toLowerCase();
    if (filenameLower === PACKAGE_JSON) {
      clearPackageJsonsCache();
    }
  }
}

export function clearPackageJsonsCache() {
  packageJsons = undefined;
  baseDir = undefined;
  clearDependenciesCache();
}
