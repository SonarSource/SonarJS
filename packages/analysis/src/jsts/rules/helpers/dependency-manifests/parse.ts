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
import { Minimatch } from 'minimatch';
import type { PackageJson } from 'type-fest';
import { DEFINITELY_TYPED, type DependenciesList } from './resolvers/types.js';

export function addDependencies(
  result: DependenciesList,
  dependencies: PackageJson.Dependency,
  isGlob = false,
) {
  for (const name of Object.keys(dependencies).filter(name => {
    // Add this filter, as the PackageJson.Dependency can be any arbitrary JSON contrary to the claimed Record<String, String> typing.
    const value = dependencies[name];
    return typeof value === 'string' || value === undefined;
  })) {
    addDependency(result, { dependency: name, isGlob, version: dependencies[name] });
  }
}

export function addDependenciesArray(
  result: DependenciesList,
  dependencies: string[],
  isGlob = true,
) {
  for (const name of dependencies) {
    addDependency(result, { dependency: name, isGlob });
  }
}

type AddDependencyParameters = {
  dependency: string;
  isGlob: boolean;
  version?: string;
  alias?: string;
};

export function addDependency(
  result: DependenciesList,
  { dependency, isGlob, version, alias }: AddDependencyParameters,
) {
  if (isGlob) {
    result.set(new Minimatch(dependency, { nocase: true, matchBase: true }), version);
  } else {
    result.set(
      dependency.startsWith(DEFINITELY_TYPED)
        ? dependency.substring(DEFINITELY_TYPED.length)
        : dependency,
      version,
    );
  }
  if (alias) {
    // Also add the alias as a dependency, so it can be resolved in rules, for instance S4328
    result.set(alias, version);
  }
}
