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
import { toUnixPath } from './files';
import { Minimatch } from 'minimatch';
import { type Filesystem, createFindUp } from './find-up';
import fs from 'fs';
import { stripBOM } from './files';

export const PACKAGE_JSON = 'package.json';

/**
 * The {@link FindUp} instance dedicated to retrieving `package.json` files
 */
const findPackageJsons = createFindUp(PACKAGE_JSON);

const DefinitelyTyped = '@types/';

/**
 * Cache for the available dependencies by dirname.
 */
const cache: Map<string, Set<string | Minimatch>> = new Map();

/**
 * Retrieve the dependencies of all the package.json files available for the given file.
 *
 * @param filename context.filename
 * @param cwd working dir, will search up to that root
 * @returns
 */
export function getDependencies(filename: string, cwd: string) {
  let dirname = Path.dirname(toUnixPath(filename));
  const cached = cache.get(dirname);
  if (cached) {
    return cached;
  }
  const result = new Set<string | Minimatch>();
  cache.set(dirname, result);

  getManifests(dirname, cwd, fs).forEach(manifest => {
    const manifestDependencies = getDependenciesFromPackageJson(manifest);

    manifestDependencies.forEach(dependency => {
      result.add(dependency);
    });
  });

  return result;
}

export function getDependenciesFromPackageJson(content: PackageJson) {
  const result = new Set<string | Minimatch>();
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
