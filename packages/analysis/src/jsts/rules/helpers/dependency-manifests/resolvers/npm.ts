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
import yaml from 'yaml';
import type {
  ManifestResolver,
  DependencyManifest,
  ModuleType,
  DependenciesList,
} from './types.js';
import { type File, stripBOM } from '../../files.js';
import { PACKAGE_JSON, PNPM_WORKSPACE_YAML } from '../index.js';
import { closestPatternCache } from '../../find-up/closest.js';
import { getManifestFileInDir } from './helpers.js';
import { addDependencies, addDependenciesArray } from '../parse.js';

type PnpmWorkspace = {
  packages?: string[];
  catalog?: Record<string, string>;
  catalogs?: Record<string, Record<string, string>>;
};

export const npmManifestResolver: ManifestResolver = {
  resolve(dir, topDir, fileSystem): DependencyManifest[] {
    const packageJson = getManifestFileInDir(PACKAGE_JSON, dir, topDir, fileSystem);
    if (!packageJson) {
      return [];
    }
    const parsedPackageJson = parsePackageJson(packageJson) ?? {};
    const pnpmWorkspaceFile = closestPatternCache
      .get(PNPM_WORKSPACE_YAML, fileSystem)
      .get(topDir)
      .get(dir);
    const parsedPnpmWorkspace = pnpmWorkspaceFile
      ? parsePnpmWorkspace(pnpmWorkspaceFile)
      : undefined;
    let manifest = parsedPackageJson;
    if (parsedPnpmWorkspace) {
      manifest = injectWorkspacePackages(manifest, parsedPnpmWorkspace);
      manifest = resolveCatalogReferences(manifest, parsedPnpmWorkspace);
    }
    const moduleType: ModuleType = manifest.type === 'module' ? 'module' : 'commonjs';
    return [
      {
        type: 'npm',
        dependencies: buildDependencies(manifest),
        moduleType,
      },
    ];
  },
};

function buildDependencies(packageJson: PackageJson): DependenciesList {
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

function parsePackageJson(file: File): PackageJson | undefined {
  try {
    return JSON.parse(stripBOM(file.content.toString())) as PackageJson;
  } catch (error) {
    console.debug(`Error parsing package.json ${file.path}: ${error}`);
    return undefined;
  }
}

function parsePnpmWorkspace(file: File): PnpmWorkspace | undefined {
  try {
    const parsedPnpm = yaml.parse(file.content.toString());
    if (
      parsedPnpm &&
      ('catalog' in parsedPnpm || 'catalogs' in parsedPnpm || 'packages' in parsedPnpm)
    ) {
      return parsedPnpm;
    }
    return undefined;
  } catch (error) {
    console.debug(`Error parsing pnpm workspace ${file.path}: ${error}`);
    return undefined;
  }
}

function resolveCatalogReferences(
  packageJson: PackageJson,
  pnpmWorkspace: PnpmWorkspace,
): PackageJson {
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
            ? pnpmWorkspace.catalog?.[depName]
            : pnpmWorkspace.catalogs?.[catalogName]?.[depName];
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
  packageJson: PackageJson,
  pnpmWorkspace: PnpmWorkspace,
): PackageJson {
  if (!pnpmWorkspace.packages || packageJson.workspaces) {
    return packageJson;
  }
  const modifiedPackageJson = { ...packageJson };
  modifiedPackageJson.workspaces = pnpmWorkspace.packages;
  return modifiedPackageJson;
}
