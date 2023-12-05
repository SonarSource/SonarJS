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
import { PackageJsons } from './project-package-json';
import { toUnixPath } from '@sonar/shared';
import { PackageJson } from 'type-fest';

const DefinitelyTyped = '@types/';

const PackageJsonsByBaseDir = new PackageJsons();

function searchPackageJsonFiles(baseDir: string, exclusions: string[]) {
  PackageJsonsByBaseDir.searchPackageJsonFiles(baseDir, exclusions);
}

function getNearestPackageJsons(file: string) {
  return PackageJsonsByBaseDir.getPackageJsonsForFile(file);
}

function getAllPackageJsons() {
  return PackageJsonsByBaseDir.db;
}

/**
 * Cache for each dirname the dependencies of the package.json in this directory, empty set when no package.json.
 */
const dirCache: Map<string, Set<string>> = new Map();

/**
 * Cache for the available dependencies by dirname.
 */
const cache: Map<string, Set<string>> = new Map();

/**
 * Retrieve the dependencies of all the package.json files available for the given file.
 *
 * @param fileName context.filename
 * @param cache Cache for the available dependencies by dirname.
 * @param dirCache Cache for each dirname the dependencies of the package.json in this directory, empty set when no package.json.
 * @returns
 */
function getDependencies(fileName: string) {
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

export {
  searchPackageJsonFiles,
  getNearestPackageJsons,
  getAllPackageJsons,
  getDependencies,
  PackageJsonsByBaseDir,
};
export { PackageJson } from './project-package-json';
