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
import path from 'node:path';
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
    // Captured before the pnpm injection below, which would otherwise fake a workspace root.
    const declaresWorkspaces = !!parsedPackageJson.workspaces;
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

    // Bun only reads catalogs from the workspace root: a package.json declaring `workspaces` is
    // itself a root unless an ancestor workspace already includes it, otherwise the closest
    // parent package.json with catalogs is the root.
    const isWorkspaceRoot =
      declaresWorkspaces && !isIncludedInAncestorWorkspace(dir, topDir, fileSystem);
    const closestParent = isWorkspaceRoot
      ? undefined
      : findClosestParentPackageJsonWithCatalogs(dir, topDir, fileSystem);
    const catalogSource = mergeCatalogSources(
      closestParent ? getCatalogSource(closestParent) : getCatalogSource(parsedPackageJson),
      parsedPnpmWorkspace,
    );

    parsedPackageJson = resolveCatalogReferences(parsedPackageJson, catalogSource);

    // Match Node's resolution: explicit "module" is ESM, anything else (including
    // missing "type") is CommonJS.
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

    const fileDir = dirnamePath(file.filePath);
    if (fileDir === topDir) {
      return undefined;
    }
    currentDir = getParentDirPath(fileDir);
  }

  return undefined;
}

/**
 * Check whether an ancestor package.json declares this directory as one of its workspaces.
 * @param dir Directory of the package.json being resolved
 * @param topDir Top directory to stop the search at
 * @param fileSystem Filesystem to use for the search
 * @returns True when an ancestor workspace includes this directory, false otherwise
 */
function isIncludedInAncestorWorkspace(
  dir: NormalizedAbsolutePath,
  topDir: NormalizedAbsolutePath,
  fileSystem?: Filesystem,
): boolean {
  if (dir === topDir) {
    return false;
  }

  let currentDir = getParentDirPath(dir);
  const cache = closestPatternCache.get(PACKAGE_JSON, fileSystem).get(topDir);

  while (currentDir !== null) {
    const file = cache.get(currentDir);
    if (!file) {
      return false;
    }

    const ancestorDir = dirnamePath(file.filePath);
    const parsed = parsePackageJson(file);
    if (parsed && declaresWorkspaceDir(parsed, ancestorDir, dir)) {
      return true;
    }

    if (ancestorDir === topDir) {
      return false;
    }
    currentDir = getParentDirPath(ancestorDir);
  }

  return false;
}

function declaresWorkspaceDir(
  packageJson: ExtendedPackageJson,
  ancestorDir: NormalizedAbsolutePath,
  dir: NormalizedAbsolutePath,
): boolean {
  const { workspaces } = packageJson;
  const patterns = Array.isArray(workspaces) ? workspaces : workspaces?.packages;
  if (!patterns?.length || !dir.startsWith(`${ancestorDir}/`)) {
    return false;
  }

  const relativeDir = dir.slice(ancestorDir.length + 1);
  const normalizedPatterns = patterns.map(normalizeWorkspacePattern);

  // Bun resolves literal workspace paths before expanding workspace globs. A negated glob only
  // filters glob expansion, so it cannot remove a workspace explicitly listed by its path.
  if (
    normalizedPatterns.some(
      pattern =>
        !hasWorkspaceGlobSyntax(pattern) && normalizeLiteralWorkspacePath(pattern) === relativeDir,
    )
  ) {
    return true;
  }

  const workspaceGlobs = normalizedPatterns.filter(hasWorkspaceGlobSyntax).map(pattern => ({
    isExclusion: pattern.startsWith('!'),
    workspacePattern: pattern.startsWith('!') ? pattern.slice(1) : pattern,
  }));
  const matches = (workspacePattern: string) =>
    new Minimatch(workspacePattern, { nonegate: true }).match(relativeDir);

  return workspaceGlobs.some(
    ({ isExclusion, workspacePattern }, index) =>
      !isExclusion &&
      matches(workspacePattern) &&
      !workspaceGlobs
        .slice(index + 1)
        .some(({ isExclusion, workspacePattern }) => isExclusion && matches(workspacePattern)),
  );
}

function normalizeWorkspacePattern(pattern: string): string {
  const isExclusion = pattern.startsWith('!');
  let normalizedPattern = isExclusion ? pattern.slice(1) : pattern;
  normalizedPattern = normalizedPattern.startsWith('./')
    ? normalizedPattern.slice(2)
    : normalizedPattern;
  while (normalizedPattern.endsWith('/')) {
    normalizedPattern = normalizedPattern.slice(0, -1);
  }
  return isExclusion ? `!${normalizedPattern}` : normalizedPattern;
}

function normalizeLiteralWorkspacePath(pattern: string): string {
  return path.posix.normalize(pattern.replaceAll('\\', '/'));
}

function hasWorkspaceGlobSyntax(pattern: string): boolean {
  if (pattern.startsWith('!')) {
    return true;
  }
  return ['*', '{', '[', '?'].some(token => containsUnescapedToken(pattern, token));
}

function containsUnescapedToken(pattern: string, token: string): boolean {
  for (
    let index = pattern.indexOf(token);
    index !== -1;
    index = pattern.indexOf(token, index + 1)
  ) {
    let slashCount = 0;
    for (
      let slashIndex = index - 1;
      slashIndex >= 0 && pattern[slashIndex] === '\\';
      slashIndex--
    ) {
      slashCount++;
    }
    if (slashCount % 2 === 0) {
      return true;
    }
  }
  return false;
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

function getCatalogSource(packageJson: ExtendedPackageJson): CatalogSource | undefined {
  if (!hasCatalogs(packageJson)) {
    return undefined;
  }
  const workspaces = Array.isArray(packageJson.workspaces) ? undefined : packageJson.workspaces;
  return {
    catalog: workspaces?.catalog ?? packageJson.catalog,
    catalogs: workspaces?.catalogs ?? packageJson.catalogs,
  };
}

function mergeCatalogSources(
  ...sources: Array<CatalogSource | undefined>
): CatalogSource | undefined {
  const catalog = sources.find(source => source?.catalog)?.catalog;
  const catalogs = sources.find(source => source?.catalogs)?.catalogs;
  return catalog || catalogs ? { catalog, catalogs } : undefined;
}
