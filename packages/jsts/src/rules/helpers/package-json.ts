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
import Path from 'path/posix';
import { type PackageJson } from 'type-fest';
import { toUnixPath, stripBOM } from './files.js';
import { Minimatch } from 'minimatch';
import { type Filesystem, createFindUp } from './find-up.js';
import fs from 'fs';
import { debug } from '../../../../shared/src/helpers/logging.js';

export const PACKAGE_JSON = 'package.json';

/**
 * The {@link FindUp} instance dedicated to retrieving `package.json` files
 */
const findPackageJsons = createFindUp(PACKAGE_JSON);

const DefinitelyTyped = '@types/';

type MinimatchDependency = {
  name: Minimatch;
  version?: string;
};

export type NamedDependency = {
  name: string;
  version?: string;
};

type Dependency = MinimatchDependency | NamedDependency;

/**
 * Cache for the available dependencies by dirname. Exported for tests
 */
export const cache: Map<string, Set<Dependency>> = new Map();

/**
 * Returns the dependencies of the root package.json file collected in the cache.
 * As the cache is populated lazily, it could be null in case no rule execution has touched it.
 * This removes duplicate dependencies and keeps the last occurrence.
 */
export function getAllDependencies(): NamedDependency[] {
  const dependencies = [...cache.values()]
    .flatMap(dependencies => [...dependencies])
    .filter((dependency): dependency is NamedDependency => typeof dependency.name === 'string');
  return Object.values(
    dependencies.reduce(
      (result, dependency) => ({
        ...result,
        [dependency.name]: dependency,
      }),
      {},
    ),
  );
}

/**
 * Retrieve the dependencies of all the package.json files available for the given file.
 *
 * @param filename context.filename
 * @param cwd working dir, will search up to that root
 * @returns
 */
export function getDependencies(filename: string, cwd: string) {
  const dirname = Path.dirname(toUnixPath(filename));
  if (!cache.get(dirname)) {
    fillCacheWithNewPath(dirname, getManifests(dirname, cwd, fs));
  }
  return new Set([...cache.get(dirname)!].map(item => item.name));
}

export function fillCacheWithNewPath(dirname: string, manifests: PackageJson[]) {
  const result = new Set<Dependency>();
  cache.set(dirname, result);

  manifests.forEach(manifest => {
    const manifestDependencies = getDependenciesFromPackageJson(manifest);

    manifestDependencies.forEach(dependency => {
      result.add(dependency);
    });
  });

  return new Set([...result].map(item => item.name));
}

/**
 * In the case of SonarIDE, when a package.json file changes, the cache can become obsolete.
 */
export function clearDependenciesCache() {
  debug('Clearing dependencies cache');
  cache.clear();
}

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
  Object.keys(dependencies).forEach(name =>
    addDependency(result, name, isGlob, dependencies[name]),
  );
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

/**
 * Returns the project manifests that are used to resolve the dependencies imported by
 * the module named `filename`, up to the passed working directory.
 */
export const getManifests = (
  dir: string,
  workingDirectory?: string,
  fileSystem?: Filesystem,
): Array<PackageJson> => {
  const files = findPackageJsons(dir, workingDirectory, fileSystem);

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
