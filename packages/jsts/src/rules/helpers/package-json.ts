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
import { type PackageJson } from 'type-fest';
import { toUnixPath, stripBOM } from './files.js';
import { Minimatch } from 'minimatch';
import {
  type Filesystem,
  createFindUp,
  createFindUpFirstMatch,
  MinimatchCache,
} from './find-up.js';
import fs from 'node:fs';
import { ComputedCache } from '../../../../shared/src/helpers/cache.js';

export const PACKAGE_JSON = 'package.json';

export type PackageJsonWithPath = {
  filePath: string;
  fileContent: PackageJson;
};

const closestPackageJsonCache = new ComputedCache(
  (
    topDir: string | undefined,
    _cache: ComputedCache<any, any, Filesystem>,
    filesystem: Filesystem = fs,
  ) => {
    return createFindUpFirstMatch(PACKAGE_JSON, topDir, filesystem);
  },
);

const packageJsonsInParentsCache = new ComputedCache(
  (
    topDir: string | undefined,
    _cache: ComputedCache<any, any, Filesystem>,
    filesystem: Filesystem = fs,
  ) => {
    return createFindUp(PACKAGE_JSON, topDir, filesystem);
  },
);

/**
 * Cache for the available dependencies by dirname. Exported for tests
 */
export const dependenciesCache = new ComputedCache(
  (dir: string, _cache: ComputedCache<any, any, string>, topDir: string | undefined) => {
    const closestPackageJSONDirName = getClosestPackageJSONDir(dir, topDir);
    const result = new Set<string | Minimatch>();

    if (closestPackageJSONDirName) {
      getManifests(closestPackageJSONDirName, topDir, fs).forEach(manifest => {
        const manifestDependencies = getDependenciesFromPackageJson(manifest);

        manifestDependencies.forEach(dependency => {
          result.add(dependency.name);
        });
      });
    }
    return result;
  },
);
const DefinitelyTyped = '@types/';

type MinimatchDependency = {
  name: Minimatch;
  version?: string;
};

type NamedDependency = {
  name: string;
  version?: string;
};

type Dependency = MinimatchDependency | NamedDependency;

export function getClosestPackageJSONDir(dir: string, cwd?: string) {
  return closestPackageJsonCache.get(cwd).get(toUnixPath(dir))?.path;
}

/**
 * Retrieve the dependencies of all the package.json files available for the given file.
 *
 * @param filename context.filename
 * @param cwd working dir, will search up to that root
 * @returns
 */
export function getDependencies(dir: string, cwd: string) {
  return dependenciesCache.get(toUnixPath(dir), cwd);
}

export function fillPackageJsonCaches(
  packageJsons: PackageJsonWithPath[],
  allPaths: Set<string>,
  topDir: string,
) {
  const closestCache = closestPackageJsonCache.get(topDir);
  const allPackageJsonsCache = packageJsonsInParentsCache.get(topDir);
  for (const projectPath of allPaths) {
    fillCacheWithNewPath(
      projectPath,
      this.packageJsons
        .filter(({ filePath }) => projectPath.startsWith(dirname(filePath)))
        .map(({ fileContent }) => fileContent),
    );
  }
}
/**
 * In the case of SonarIDE, when a package.json file changes, the cache can become obsolete.
 */
export function clearDependenciesCache() {
  dependenciesCache.clear();
  closestPackageJsonCache.clear();
  packageJsonsInParentsCache.clear();
  MinimatchCache.clear();
}

/**
 * Returns the project manifests that are used to resolve the dependencies imported by
 * the module named `filename`, up to the passed working directory.
 */
export const getManifests = (
  path: string,
  workingDirectory?: string,
  fileSystem?: Filesystem,
): Array<PackageJson> => {
  const files = packageJsonsInParentsCache.get(workingDirectory, fileSystem).get(path);

  return files.map(file => {
    const content = file.content;

    try {
      return JSON.parse(stripBOM(content.toString()));
    } catch (error) {
      console.debug(`Error parsing file ${file.path}: ${error}`);

      return {};
    }
  });
};

export function getDependenciesFromPackageJson(content: PackageJson) {
  const result = new Set<Dependency>();
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
  result: Set<Dependency>,
  dependencies: PackageJson.Dependency,
  isGlob = false,
) {
  Object.keys(dependencies)
    .filter(name => {
      // Add this filter, as the PackageJson.Dependency can be any arbitrary JSON contrary to the claimed Record<String, String> typing.
      const value = dependencies[name];
      return typeof value === 'string' || typeof value === 'undefined';
    })
    .forEach(name => addDependency(result, name, isGlob, dependencies[name]));
}

function addDependenciesArray(result: Set<Dependency>, dependencies: string[], isGlob = true) {
  dependencies.forEach(name => addDependency(result, name, isGlob));
}

function addDependency(
  result: Set<Dependency>,
  dependency: string,
  isGlob: boolean,
  version?: string,
) {
  if (isGlob) {
    result.add({
      name: new Minimatch(dependency, { nocase: true, matchBase: true }),
      version,
    });
  } else {
    result.add({
      name: dependency.startsWith(DefinitelyTyped)
        ? dependency.substring(DefinitelyTyped.length)
        : dependency,
      version,
    });
  }
}
