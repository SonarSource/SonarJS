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

import { Minimatch } from 'minimatch';
import { PackageJson } from 'type-fest';

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
      return typeof value === 'string' || value === undefined;
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
