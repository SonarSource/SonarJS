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
import type { PackageJson } from 'type-fest';
import type {
  CatalogSource,
  DependenciesList,
  DependencyManifest,
  ExtendedPackageJson,
  ManifestResolver,
  ModuleType,
  Workspace,
} from './types.js';
import { NormalizedAbsolutePath } from '../../files.js';
import { PACKAGE_JSON, PNPM_WORKSPACE_YAML } from '../index.js';
import { closestPatternCache } from '../../find-up/closest.js';
import { getManifestFileInDir, getParentDirPath } from './helpers.js';
import { addDependencies, addDependenciesArray } from '../parse.js';
import { parsePackageJson, parsePnpmWorkspace } from '../parsed-dependency-files.js';

import { Filesystem } from '../../find-up/find-minimatch.js';

export const packageJsonManifestResolver: ManifestResolver = {
  resolve(dir, topDir, fileSystem): DependencyManifest[] {
    const packageJson = getManifestFileInDir(PACKAGE_JSON, dir, topDir, fileSystem);
    if (!packageJson) {
      return [];
    }
    let parsedPackageJson = parsePackageJson(packageJson) ?? {};
    const pnpmWorkspaceFile = closestPatternCache
      .get(PNPM_WORKSPACE_YAML, fileSystem)
      .get(topDir)
      .get(dir);

    const parsedPnpmWorkspace = pnpmWorkspaceFile
      ? parsePnpmWorkspace(pnpmWorkspaceFile)
      : undefined;
    if (parsedPnpmWorkspace) {
      parsedPackageJson = injectWorkspacePackages(parsedPackageJson, parsedPnpmWorkspace);
    }

    let catalogSource: CatalogSource | undefined = undefined;
    if (parsedPnpmWorkspace) {
      catalogSource = parsedPnpmWorkspace;
    } else {
      const closestParent = findClosestParentPackageJson(dir, topDir, fileSystem);
      if (closestParent) {
        const workspaces = Array.isArray(closestParent.workspaces)
          ? undefined
          : closestParent.workspaces;
        catalogSource = {
          catalog: workspaces?.catalog ?? closestParent.catalog,
          catalogs: workspaces?.catalogs ?? closestParent.catalogs,
        };
      }
    }

    if (catalogSource) {
      parsedPackageJson = resolveCatalogReferences(parsedPackageJson, catalogSource);
    }

    const moduleType: ModuleType = parsedPackageJson.type === 'module' ? 'module' : 'commonjs';
    return [
      {
        type: 'package-json',
        dependencies: buildDependencies(parsedPackageJson),
        moduleType,
      },
    ];
  },
};

function buildDependencies(packageJson: ExtendedPackageJson): DependenciesList {
  const dependencies: DependenciesList = new Map();
  const fieldsToVisit = [
    'name',
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies',
    '_moduleAliases',
    'workspaces',
  ] as const;

  for (const field of fieldsToVisit) {
    if (!packageJson[field]) {
      continue;
    }
    if (field === 'name') {
      addDependencies(dependencies, { [packageJson[field]]: '*' });
      continue;
    }
    if (field === 'workspaces') {
      addDependenciesArray(
        dependencies,
        Array.isArray(packageJson[field])
          ? packageJson[field]
          : (packageJson[field]?.packages ?? []),
      );
      continue;
    }
    addDependencies(dependencies, packageJson[field] as PackageJson.Dependency);
  }

  return dependencies;
}

function resolveCatalogReferences(
  packageJson: ExtendedPackageJson,
  catalogSource: CatalogSource,
): ExtendedPackageJson {
  const depFields = [
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies',
  ] as const;

  const modifiedPackageJson = { ...packageJson };
  for (const field of depFields) {
    const deps = packageJson[field];
    if (!deps) {
      continue;
    }
    const resolvedDeps: Record<string, string> = {};
    for (const [depName, depVersion] of Object.entries(deps)) {
      if (typeof depVersion === 'string' && depVersion.startsWith('catalog:')) {
        const catalogName = depVersion.slice('catalog:'.length).trim() || 'default';
        const resolvedDep =
          catalogName === 'default'
            ? catalogSource.catalog?.[depName]
            : catalogSource.catalogs?.[catalogName]?.[depName];
        resolvedDeps[depName] = resolvedDep ?? depVersion;
        !resolvedDep &&
          console.debug(
            `Dependency "${depName}" could not be resolved for catalog "${catalogName}"`,
          );
      } else {
        resolvedDeps[depName] = depVersion ?? '';
      }
    }
    modifiedPackageJson[field] = resolvedDeps;
  }
  return modifiedPackageJson;
}

function injectWorkspacePackages(
  packageJson: ExtendedPackageJson,
  pnpmWorkspace: Workspace,
): ExtendedPackageJson {
  if (!pnpmWorkspace.packages || packageJson.workspaces) {
    return packageJson;
  }
  return {
    ...packageJson,
    workspaces: pnpmWorkspace.packages,
  } as ExtendedPackageJson;
}

/**
 * Find the closest parent package.json file and parse it.
 * @param dir Directory to start searching from (exclusive)
 * @param topDir Upper bound for the search (inclusive)
 * @param fileSystem Filesystem to use for searching.
 * @returns Parsed package.json content, or undefined if no package.json file is found in any parent directory.
 */
function findClosestParentPackageJson(
  dir: NormalizedAbsolutePath,
  topDir: NormalizedAbsolutePath,
  fileSystem?: Filesystem,
): ExtendedPackageJson | undefined {
  const parentDir = getParentDirPath(dir);
  if (!parentDir) {
    return undefined;
  }
  const file = closestPatternCache.get(PACKAGE_JSON, fileSystem).get(topDir).get(parentDir);
  return file ? parsePackageJson(file) : undefined;
}