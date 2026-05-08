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
import type {
  DenoManifest,
  DependenciesList,
  DependencyManifest,
  ManifestResolver,
  ModuleType,
} from './types.js';
import { DENO_JSON, DENO_JSONC } from '../index.js';
import { getManifestFileInDir } from './helpers.js';
import { addDependenciesArray, addDependency } from '../parse.js';
import { parseDenoManifest } from '../parsed-dependency-files.js';

type ImportMapSpecifier = {
  packageName: string;
  version?: string;
};

export const denoManifestResolver: ManifestResolver = {
  resolve(dir, topDir, fileSystem): DependencyManifest[] {
    // if both `deno.json` and `deno.jsonc` are present, prefer `deno.json` and ignore `deno.jsonc`
    const denoJson = getManifestFileInDir(DENO_JSON, dir, topDir, fileSystem);
    const denoJsonc = getManifestFileInDir(DENO_JSONC, dir, topDir, fileSystem);
    const denoModuleType: ModuleType = 'module';
    const effectiveDenoJson = denoJson ?? denoJsonc;

    if (effectiveDenoJson) {
      return [
        {
          type: 'deno',
          dependencies: buildDependencies(parseDenoManifest(effectiveDenoJson) ?? {}),
          moduleType: denoModuleType,
        },
      ];
    }
    return [];
  },
};

function buildDependencies(manifest: DenoManifest): DependenciesList {
  const dependencies: DependenciesList = new Map();

  if (manifest.imports && typeof manifest.imports === 'object') {
    for (const [alias, target] of Object.entries(manifest.imports)) {
      if (typeof target !== 'string') {
        continue;
      }

      const parsedSpecifier = parseInlineNPMImport(target);
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

// Captures `npm:` payload as: package name (scoped or unscoped), optional version, optional ignored subpath.
// Examples:
// npm:cowsay@^1.6.0
// npm:@scopename/mypackage@~11.1.0
const DENO_NPM_IMPORT_PATTERN = /^(@[^/]*\/[^/@]*|[^/@]+)(?:@([^/]*))?(?:\/.*)?$/;

/**
 * Parses an import map URL Specifier matching Deno npm format:
 * npm:<package>[@<version>][/<path>]
 */
export function parseInlineNPMImport(value: string): ImportMapSpecifier | undefined {
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
