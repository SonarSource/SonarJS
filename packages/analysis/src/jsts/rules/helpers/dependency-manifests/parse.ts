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
import { DependenciesList } from './resolvers/types.js';

const DefinitelyTyped = '@types/';

export type Dependency = {
  name: string | Minimatch;
  version?: string;
  alias?: string;
};

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

type ImportMapSpecifier = {
  packageName: string;
  version?: string;
};

// Captures `npm:` payload as: package name (scoped or unscoped), optional version, optional ignored subpath.
// Examples:
// npm:cowsay@^1.6.0
// npm:@scopename/mypackage@~11.1.0
const DENO_NPM_IMPORT_PATTERN = /^(@[^/]*\/[^/@]*|[^/@]+)(?:@([^/]*))?(?:\/.*)?$/;

/**
 * Parses an import map URL Specifier matching Deno npm format:
 * npm:<package>[@<version>][/<path>]
 */
export function parseImportMapSpecifier(value: string): ImportMapSpecifier | undefined {
  // currently only handle npm: specifiers since rules are focused on NPM dependencies
  if (!value.startsWith('npm:')) {
    return undefined;
  }

  const match = DENO_NPM_IMPORT_PATTERN.exec(value.slice('npm:'.length));
  if (!match) {
    return undefined;
  }

  const [, packageName, version] = match;
  return {
    packageName,
    version: version || undefined,
  };
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
      dependency.startsWith(DefinitelyTyped)
        ? dependency.substring(DefinitelyTyped.length)
        : dependency,
      version,
    );
  }
  if (alias) {
    // TODO: REVIEW ALIAS ACCESS IN RULES
    // Also add the alias as a dependency, so it can be resolved in rules, for instance S4328
    result.set(alias, version);
  }
}
