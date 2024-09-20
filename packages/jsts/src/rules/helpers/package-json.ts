/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import Path from 'path/posix';
import { type PackageJson } from 'type-fest';
import { searchFiles, File } from './find-files';
import { toUnixPath } from './files';
import { Minimatch } from 'minimatch';
import { findUp, type Filesystem } from './find-up';

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
const cache: Map<string, Set<string | Minimatch>> = new Map();

let PackageJsonsByBaseDir: Record<string, File<PackageJson>[]>;

export function loadPackageJsons(baseDir: string, exclusions: string[]) {
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

  PackageJsonsByBaseDir = packageJsons as Record<string, File<PackageJson>[]>;
}

export function getAllPackageJsons() {
  return PackageJsonsByBaseDir;
}

export function getPackageJsonsCount() {
  return PackageJsonsByBaseDir ? Object.keys(PackageJsonsByBaseDir).length : 0;
}

export function clearPackageJsons() {
  PackageJsonsByBaseDir = {};
}

export function setPackageJsons(db: Record<string, File<PackageJson>[]>) {
  PackageJsonsByBaseDir = db;
}

/**
 * Retrieve the dependencies of all the package.json files available for the given file.
 *
 * @param fileName context.filename
 * @returns
 */
export function getDependencies(fileName: string) {
  let dirname = Path.dirname(toUnixPath(fileName));
  const cached = cache.get(dirname);
  if (cached) {
    return cached;
  }

  const result = new Set<string | Minimatch>();
  cache.set(dirname, result);

  for (const packageJson of getNearestPackageJsons(fileName)) {
    dirname = Path.dirname(packageJson.filename);
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
  if (!getAllPackageJsons()) {
    return [];
  }
  const results: File<PackageJson>[] = [];
  if (getPackageJsonsCount() === 0) {
    return results;
  }
  let currentDir = Path.dirname(Path.normalize(toUnixPath(file)));
  do {
    const packageJson = PackageJsonsByBaseDir[currentDir];
    if (packageJson?.length) {
      results.push(...packageJson);
    }
    currentDir = Path.dirname(currentDir);
  } while (currentDir !== Path.dirname(currentDir));
  return results;
}

export function getDependenciesFromPackageJson(content: PackageJson) {
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
  if (content.optionalDependencies !== undefined) {
    addDependencies(result, content.optionalDependencies);
  }
  if (content._moduleAliases !== undefined) {
    addDependencies(result, content._moduleAliases as PackageJson.Dependency);
  }
  if (Array.isArray(content.workspaces)) {
    addDependenciesArray(result, content.workspaces);
  } else if (content.workspaces?.packages) {
    addDependenciesArray(result, content.workspaces?.packages);
  }
  return result;
}

function addDependencies(
  result: Set<string | Minimatch>,
  dependencies: PackageJson.Dependency,
  isGlob = false,
) {
  Object.keys(dependencies).forEach(name => addDependency(result, name, isGlob));
}

function addDependenciesArray(
  result: Set<string | Minimatch>,
  dependencies: string[],
  isGlob = true,
) {
  dependencies.forEach(name => addDependency(result, name, isGlob));
}

function addDependency(result: Set<string | Minimatch>, dependency: string, isGlob: boolean) {
  if (isGlob) {
    result.add(new Minimatch(dependency, { nocase: true, matchBase: true }));
  } else {
    result.add(
      dependency.startsWith(DefinitelyTyped)
        ? dependency.substring(DefinitelyTyped.length)
        : dependency,
    );
  }
}

/**
 * Returns the project manifests that are used to resolve the dependencies imported by
 * the module named `fileName`, up to the passed working directory.
 */
export const getManifests = (
  fileName: string,
  workingDirectory: string,
  fileSystem: Filesystem,
): Array<PackageJson> => {
  const files = findUp(Path.dirname(fileName), workingDirectory, 'package.json', fileSystem);

  return files.map(file => {
    const content = file.content;

    try {
      return JSON.parse(content.toString());
    } catch (error) {
      console.debug(`Error parsing file ${file.path}: ${error}`);

      return {};
    }
  });
};
