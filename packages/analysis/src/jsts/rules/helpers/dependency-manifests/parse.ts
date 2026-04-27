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
import type { File } from '../files.js';
import { stripBOM } from '../files.js';
import ts from 'typescript';
import { type DependencyManifest } from './all-in-parent-dirs.js';

const DefinitelyTyped = '@types/';

type Dependency = {
  name: string | Minimatch;
  version?: string;
  alias?: string;
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
    // see https://www.npmjs.com/package/module-alias
    addDependencies(result, content._moduleAliases as PackageJson.Dependency);
  }
  if (Array.isArray(content.workspaces)) {
    addDependenciesArray(result, content.workspaces);
  } else if (content.workspaces?.packages) {
    addDependenciesArray(result, content.workspaces?.packages);
  }
  return result;
}

function getDependenciesFromDenoManifest(manifest: DenoManifest): Set<Dependency> {
  const dependencies = new Set<Dependency>();

  if (manifest.imports && typeof manifest.imports === 'object') {
    for (const [alias, target] of Object.entries(manifest.imports)) {
      if (typeof target !== 'string') {
        continue;
      }

      const parsedSpecifier = parseImportMapSpecifier(target);
      if (parsedSpecifier) {
        addDependency(dependencies, {
          dependency: parsedSpecifier.packageName,
          isGlob: false,
          version: parsedSpecifier.version,
          alias,
        });
      }
    }
  }

  if (Array.isArray(manifest.workspace)) {
    addDependenciesArray(dependencies, manifest.workspace);
  } else if (manifest.workspace?.members) {
    addDependenciesArray(dependencies, manifest.workspace.members);
  }

  return dependencies;
}

function addDependencies(
  result: Set<Dependency>,
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

// https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script/type/importmap
type ImportMap = Record<string, unknown>;

export type DenoManifest = {
  imports?: ImportMap;
  workspace?: string[] | { members?: string[] };
};

type ImportMapSpecifier = {
  packageName: string;
  version?: string;
};

export function getDependenciesFromManifest(manifest: DependencyManifest): Set<Dependency> {
  switch (manifest.type) {
    case 'npm':
      return getDependenciesFromPackageJson(manifest.manifest);
    case 'deno':
      return getDependenciesFromDenoManifest(manifest.manifest);
  }
}

export function parsePackageJson(file: File): PackageJson | undefined {
  try {
    return JSON.parse(stripBOM(file.content.toString())) as PackageJson;
  } catch (error) {
    console.debug(`Error parsing package.json ${file.path}: ${error}`);
    return undefined;
  }
}

export function parseDenoManifest(file: File): DenoManifest | undefined {
  try {
    // ts.parseConfigFileTextToJson handles JSON with comments and trailing commas
    const parsed = ts.parseConfigFileTextToJson(file.path, stripBOM(file.content.toString()));
    if (parsed.error) {
      const message = ts.flattenDiagnosticMessageText(parsed.error.messageText, '\n');
      console.debug(`Error parsing deno manifest ${file.path}: ${message}`);
      return;
    }
    return parsed.config as DenoManifest;
  } catch (error) {
    console.debug(`Error parsing deno manifest ${file.path}: ${error}`);
    return;
  }
}

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

function addDependenciesArray(result: Set<Dependency>, dependencies: string[], isGlob = true) {
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

function addDependency(
  result: Set<Dependency>,
  { dependency, isGlob, version, alias }: AddDependencyParameters,
) {
  if (isGlob) {
    result.add({
      name: new Minimatch(dependency, { nocase: true, matchBase: true }),
      version,
      alias,
    });
  } else {
    result.add({
      name: dependency.startsWith(DefinitelyTyped)
        ? dependency.substring(DefinitelyTyped.length)
        : dependency,
      version,
      alias,
    });
  }
}
