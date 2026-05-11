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
import { NormalizedAbsolutePath, dirnamePath } from '../../files.js';
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

    let catalogSource: CatalogSource | undefined = undefined;
    const closestParent = findClosestParentPackageJsonWithCatalogs(dir, topDir, fileSystem);

    if (closestParent) {
      // If the closest parent package.json has catalogs defined, we use it as the catalog source for resolving catalog references.
      const workspaces = Array.isArray(closestParent.workspaces)
        ? undefined
        : closestParent.workspaces;
      catalogSource = {
        catalog: workspaces?.catalog ?? closestParent.catalog,
        catalogs: workspaces?.catalogs ?? closestParent.catalogs,
      };
    } else {
      // No parent package.json with catalogs found, we check if there's a pnpm workspace file that we can use as a catalog source.
      const pnpmWorkspaceFile = closestPatternCache
        .get(PNPM_WORKSPACE_YAML, fileSystem)
        .get(topDir)
        .get(dir);
      const parsedPnpmWorkspace = pnpmWorkspaceFile
        ? parsePnpmWorkspace(pnpmWorkspaceFile)
        : undefined;
      if (parsedPnpmWorkspace) {
        parsedPackageJson = injectWorkspacePackages(parsedPackageJson, parsedPnpmWorkspace);
        catalogSource = parsedPnpmWorkspace;
      }
    }

    parsedPackageJson = resolveCatalogReferences(parsedPackageJson, catalogSource);

    const moduleType: ModuleType = parsedPackageJson.type === 'module' ? 'module' : 'commonjs';
    return [
      {
        type: 'package-json',
        manifest: parsedPackageJson,
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
  catalogSource: CatalogSource | undefined,
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
            ? catalogSource?.catalog?.[depName]
            : catalogSource?.catalogs?.[catalogName]?.[depName];
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
 * Find the closest parent package.json with catalogs defined.
 * @param dir Directory to start the search from
 * @param topDir Top directory to stop the search at
 * @param fileSystem Filesystem to use for the search
 * @returns The closest parent package.json with catalogs, or undefined if no package.json with catalogs is found
 */
function findClosestParentPackageJsonWithCatalogs(
  dir: NormalizedAbsolutePath,
  topDir: NormalizedAbsolutePath,
  fileSystem?: Filesystem,
): ExtendedPackageJson | undefined {
  if (dir === topDir) {
    // No point in searching for parent package.json if we're already at the top directory.
    return undefined;
  }

  let currentDir = getParentDirPath(dir);
  const cache = closestPatternCache.get(PACKAGE_JSON, fileSystem).get(topDir);

  while (currentDir !== null) {
    const file = cache.get(currentDir);
    if (!file) {
      return undefined;
    }

    const parsed = parsePackageJson(file);
    if (parsed && hasCatalogs(parsed)) {
      return parsed;
    }

    const fileDir = dirnamePath(file.path);
    if (fileDir === topDir) {
      return undefined;
    }
    currentDir = getParentDirPath(fileDir);
  }

  return undefined;
}

function hasCatalogs(packageJson: ExtendedPackageJson): boolean {
  if (packageJson.catalog || packageJson.catalogs) {
    return true;
  }
  const { workspaces } = packageJson;
  if (workspaces && !Array.isArray(workspaces)) {
    return !!(workspaces.catalog || workspaces.catalogs);
  }
  return false;
}
