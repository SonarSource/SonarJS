/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */

import path from 'path';
import { File, searchFiles, toUnixPath } from '@sonar/shared';
import { PackageJson } from 'type-fest';

export const PACKAGE_JSON = 'package.json';
export const parsePackageJson = (_filename: string, contents: string | null) =>
  contents ? (JSON.parse(contents) as PackageJson) : {};

const DefinitelyTyped = '@types/';

/**
 * Cache for each dirname the dependencies of the package.json in this directory, empty set when no package.json.
 */
const dirCache: Map<string, Set<string>> = new Map();

/**
 * Cache for the available dependencies by dirname.
 */
const cache: Map<string, Set<string>> = new Map();

let PackageJsonsByBaseDir: Map<string, File<PackageJson>[]>;

export function searchPackageJsonFiles(baseDir: string, exclusions: string[]) {
  const { packageJsons } = searchFiles(
    baseDir,
    {
      packageJsons: {
        pattern: PACKAGE_JSON,
        parser: parsePackageJson,
      },
    },
    exclusions,
  );

  PackageJsonsByBaseDir = packageJsons as Map<string, File<PackageJson>[]>;
}

export function getAllPackageJsons() {
  return PackageJsonsByBaseDir;
}

export function setPackageJsons(db: Map<string, File<PackageJson>[]>) {
  PackageJsonsByBaseDir = db;
}

/**
 * Retrieve the dependencies of all the package.json files available for the given file.
 *
 * @param fileName context.filename
 * @returns
 */
export function getDependencies(fileName: string) {
  let dirname = path.posix.dirname(toUnixPath(fileName));
  const cached = cache.get(dirname);
  if (cached) {
    return cached;
  }

  const result = new Set<string>();
  cache.set(dirname, result);

  for (const packageJson of getNearestPackageJsons(fileName)) {
    dirname = path.posix.dirname(packageJson.filename);
    const dirCached = dirCache.get(dirname);
    if (dirCached) {
      dirCached.forEach(d => result.add(d));
    } else {
      const dep = getDependenciesFromPackageJson(packageJson.contents);
      dep.forEach(d => result.add(d));
      dirCache.set(dirname, dep);
    }
  }

  return result;
}

/**
 * Given a filename, return all package.json files in the ancestor paths
 * ordered from nearest to furthest
 *
 * @param file source file for which we need a package.json
 */
export function getNearestPackageJsons(file: string) {
  if (!PackageJsonsByBaseDir) {
    return [];
  }
  const results: File<PackageJson>[] = [];
  if (PackageJsonsByBaseDir.size === 0) {
    return results;
  }
  let currentDir = path.posix.dirname(path.posix.normalize(toUnixPath(file)));
  do {
    const packageJson = PackageJsonsByBaseDir.get(currentDir);
    if (packageJson?.length) {
      results.push(...packageJson);
    }
    currentDir = path.posix.dirname(currentDir);
  } while (currentDir !== path.posix.dirname(currentDir));
  return results;
}

function getDependenciesFromPackageJson(content: PackageJson) {
  const result = new Set<string>();
  if (content.name) {
    addDependencies(result, { [content.name]: '*' });
  }
  if (content.dependencies !== undefined) {
    addDependencies(result, content.dependencies);
  }
  if (content.devDependencies !== undefined) {
    addDependencies(result, content.devDependencies);
  }
  if (content.peerDependencies !== undefined) {
    addDependencies(result, content.peerDependencies);
  }
  return result;
}

function addDependencies(result: Set<string>, dependencies: any) {
  Object.keys(dependencies).forEach(name =>
    result.add(name.startsWith(DefinitelyTyped) ? name.substring(DefinitelyTyped.length) : name),
  );
}
