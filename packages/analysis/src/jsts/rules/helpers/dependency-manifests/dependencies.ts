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
import type { Rule } from 'eslint';
import { ComputedCache } from '../cache.js';
import fs from 'node:fs';
import { extname } from 'node:path/posix';
import { minVersion } from 'semver';
import type { PackageJson } from 'type-fest';
import { type NormalizedAbsolutePath, normalizeToAbsolutePath, dirnamePath } from '../files.js';
import { getClosestDependencyManifestDir } from './closest.js';
import { getDependencyManifests } from './all-in-parent-dirs.js';
import { DEFINITELY_TYPED, type DependenciesList, type ModuleType } from './resolvers/types.js';
import { parsePackageJsonContent } from './parsed-dependency-files.js';

const MODULE_TYPE_BY_EXTENSION: Readonly<Record<string, ModuleType>> = {
  '.mjs': 'module',
  '.mts': 'module',
  '.cjs': 'commonjs',
  '.cts': 'commonjs',
};

/**
 * Cache for the available dependencies by dirname. Exported for tests
 */
export const dependenciesCache = new ComputedCache(
  (dir: NormalizedAbsolutePath, topDir?: NormalizedAbsolutePath) => {
    const closestDependencyManifestDir = getClosestDependencyManifestDir(dir, topDir);
    const result: DependenciesList = new Map();

    if (!closestDependencyManifestDir) {
      return result;
    }

    for (const { dependencies } of getDependencyManifests(
      closestDependencyManifestDir,
      topDir,
      fs,
    )) {
      for (const [name, version] of dependencies) {
        if (!result.has(name)) {
          result.set(name, version);
        }
      }
    }

    return result;
  },
);

/**
 * Cache for module type signal by dirname. Exported for tests.
 */
export const moduleTypeCache = new ComputedCache(
  (dir: NormalizedAbsolutePath, topDir?: NormalizedAbsolutePath): ModuleType | undefined => {
    const closestDependencyManifestDirName = getClosestDependencyManifestDir(dir, topDir);
    if (!closestDependencyManifestDirName) {
      return undefined;
    }
    const [firstManifest] = getDependencyManifests(closestDependencyManifestDirName, topDir, fs);
    return firstManifest?.moduleType;
  },
);

/**
 * Retrieve the dependencies of all the dependency manifest files available for the given file.
 *
 * @param dir dirname of the context.filename
 * @param topDir working dir, will search up to that root
 * @returns Map of dependency names to their version strings
 */
export function getDependencies(
  dir: NormalizedAbsolutePath,
  topDir: NormalizedAbsolutePath,
): DependenciesList {
  const closestDependencyManifestDir = getClosestDependencyManifestDir(dir, topDir);
  if (closestDependencyManifestDir) {
    return dependenciesCache.get(closestDependencyManifestDir, topDir);
  }
  return new Map();
}

/**
 * Retrieve the module type signal for a file.
 *
 * Extension-specific module kinds (.mjs/.mts and .cjs/.cts) are explicit and
 * take precedence. Otherwise, package.json#type from the closest manifest only
 * is used. If that closest manifest exists but omits "type", default to CommonJS.
 */
export function getModuleType(filePath: NormalizedAbsolutePath, topDir: NormalizedAbsolutePath) {
  const extensionSignal = MODULE_TYPE_BY_EXTENSION[extname(filePath).toLowerCase()];
  if (extensionSignal) {
    return extensionSignal;
  }
  return moduleTypeCache.get(dirnamePath(filePath), topDir);
}

/**
 * Inline npm: imports parsed from the source file currently being linted (Deno-style).
 * Set by the linter before each file is verified, cleared afterwards via clearFileCaches().
 * Allows dependency-helper consumers (getReactVersion, getDependenciesSanitizePaths)
 * to see the same dependency picture as rule-activation filtering.
 */
let currentFileInlineDependencies: DependenciesList | null = null;

export function setCurrentFileInlineDependencies(deps: DependenciesList | null): void {
  currentFileInlineDependencies = deps;
}

/**
 * Merges inline npm: imports with manifest dependencies, giving precedence to inline imports.
 */
export function withCurrentFileInlineDependencies(manifest: DependenciesList): DependenciesList {
  if (!currentFileInlineDependencies || currentFileInlineDependencies.size === 0) {
    return manifest;
  }
  const merged: DependenciesList = new Map(manifest);
  for (const [name, inlineVersion] of currentFileInlineDependencies) {
    // Inline npm: imports are the version actually loaded at runtime for this file,
    // so they take precedence over the project-wide manifest version.
    if (merged.has(name)) {
      const manifestVersion = merged.get(name);
      if (manifestVersion !== inlineVersion) {
        console.debug(
          `Dependency "${typeof name === 'string' ? name : name.pattern}" has a version conflict between the manifest ` +
            `(${manifestVersion ?? '<unspecified>'}) and an inline npm: import ` +
            `(${inlineVersion ?? '<unspecified>'}). Using the inline version.`,
        );
      }
    }
    merged.set(name, inlineVersion);
  }
  return merged;
}

export function getDependenciesSanitizePaths(context: Rule.RuleContext): DependenciesList {
  return withCurrentFileInlineDependencies(
    getDependencies(
      dirnamePath(normalizeToAbsolutePath(context.filename)),
      normalizeToAbsolutePath(context.cwd),
    ),
  );
}

/**
 * Gets the React version from the closest package.json.
 *
 * @param context ESLint rule context
 * @returns React version string (coerced from range) or null if not found
 */
export function getReactVersion(context: Rule.RuleContext): string | null {
  const dir = dirnamePath(normalizeToAbsolutePath(context.filename));
  const dependencies = withCurrentFileInlineDependencies(
    getDependencies(dir, normalizeToAbsolutePath(context.cwd)),
  );
  const reactVersion = dependencies.get('react');
  // Deno npm: imports reflect the actual runtime version and are intentionally included here, unlike the TypeScript/Node.js version signals
  if (!reactVersion) {
    return null;
  }
  return parseReactVersion(reactVersion);
}

/**
 * Parses a React version string and returns a valid semver version.
 * Exported for testing purposes.
 *
 * @param reactVersion Version string from package.json (e.g., "^18.0.0", "19.0", "catalog:frontend")
 * @returns Valid semver version string or null if parsing fails
 */
export function parseReactVersion(reactVersion: string): string | null {
  try {
    // Coerce version ranges (e.g., "^18.0.0") to valid semver versions
    return minVersion(reactVersion)?.version ?? null;
  } catch {
    // Handle non-semver strings like pnpm catalog references (e.g., "catalog:frontend")
    return null;
  }
}

function getAllDependencySignals(packageJson: {
  dependencies?: PackageJson.Dependency;
  devDependencies?: PackageJson.Dependency;
  peerDependencies?: PackageJson.Dependency;
  optionalDependencies?: PackageJson.Dependency;
}) {
  return {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
    ...packageJson.peerDependencies,
    ...packageJson.optionalDependencies,
  };
}

function getDependencyVersionSignal(
  packageJson: PackageJson,
  dependencyName: string,
): string | null {
  const dependencyVersion = getAllDependencySignals(packageJson)[dependencyName];
  return typeof dependencyVersion === 'string' ? dependencyVersion : null;
}

function getVersionSignalFromManifests(
  dir: NormalizedAbsolutePath,
  topDir: NormalizedAbsolutePath,
  dependencyName: string,
  fallbackSignal?: (packageJson: PackageJson) => string | null,
): string | null {
  // Walk up nearest-first. At each node manifest, prefer the primary signal
  // (e.g. @types/node — catalog/workspace-resolved by the npm resolver) over the
  // fallback (engines.node, read from the same manifest's PackageJson). The
  // first valid primary signal wins; otherwise the first valid fallback wins; if
  // neither is valid, continue walking parents. This lets a parent package's
  // engines.node be picked up when the nested package declares neither signal,
  // or only unusable fallbacks like "*" / "latest".
  // Deno manifests are skipped — @types/node and engines.node are npm concepts.
  const lookupKey = dependencyName.startsWith(DEFINITELY_TYPED)
    ? dependencyName.substring(DEFINITELY_TYPED.length)
    : dependencyName;

  for (const manifest of getDependencyManifests(
    normalizeToAbsolutePath(dir),
    normalizeToAbsolutePath(topDir),
    fs,
  )) {
    if (manifest.type !== 'package-json') {
      continue;
    }
    const version = manifest.dependencies.get(lookupKey) ?? null;
    if (isValidDependencySignal(version)) {
      return version;
    }
    if (fallbackSignal) {
      const fb = fallbackSignal(manifest.manifest);
      if (isValidDependencySignal(fb)) {
        return fb;
      }
    }
  }

  return null;
}

function isValidDependencySignal(versionSignal: string | null): versionSignal is string {
  return versionSignal !== null && versionSignal !== 'latest' && versionSignal !== '*';
}

function hasTypeScriptNativePreviewSignal(packageJson: PackageJson): boolean {
  return isValidDependencySignal(
    getDependencyVersionSignal(packageJson, '@typescript/native-preview'),
  );
}

function getTypeScriptVersionSignalsFromPackageJson(packageJson: PackageJson): string[] {
  const result: string[] = [];
  const nativePreviewVersion = getDependencyVersionSignal(
    packageJson,
    '@typescript/native-preview',
  );
  if (isValidDependencySignal(nativePreviewVersion)) {
    result.push(nativePreviewVersion);
  }
  const typeScriptVersion = getDependencyVersionSignal(packageJson, 'typescript');
  if (isValidDependencySignal(typeScriptVersion)) {
    result.push(typeScriptVersion);
  }
  return result;
}

export function getTypeScriptSignalsFromPackageJsonFiles(
  packageJsonFiles: Iterable<{ content: string | Buffer }>,
): { typeScriptVersionSignals: string[]; hasTypeScriptNativePreview: boolean } {
  const typeScriptVersionSignals: string[] = [];
  let hasTypeScriptNativePreview = false;

  for (const packageJsonFile of packageJsonFiles) {
    const packageJson = parsePackageJsonContent(packageJsonFile.content);
    if (packageJson === undefined) {
      continue;
    }
    typeScriptVersionSignals.push(...getTypeScriptVersionSignalsFromPackageJson(packageJson));
    hasTypeScriptNativePreview =
      hasTypeScriptNativePreview || hasTypeScriptNativePreviewSignal(packageJson);
  }

  return { typeScriptVersionSignals, hasTypeScriptNativePreview };
}

/**
 * Gets a Node.js version signal by walking up from `dir` toward `topDir`,
 * picking the closest package.json with @types/node (preferred) or engines.node.
 *
 * @param dir directory to start the upward search from (e.g. tsconfig dir, file dir)
 * @param topDir analysis base directory; walk stops here. Defaults to `dir` to
 *   preserve the legacy "manifest at exactly this dir" semantics for callers
 *   that don't yet provide a separate analysis root.
 * @returns raw version string from @types/node or engines.node, or null if not found
 */
export function getNodeVersionSignal(
  dir: NormalizedAbsolutePath,
  topDir: NormalizedAbsolutePath = dir,
): string | null {
  return getVersionSignalFromManifests(dir, topDir, '@types/node', packageJson => {
    const enginesNode = packageJson.engines?.['node'];
    return typeof enginesNode === 'string' ? enginesNode : null;
  });
}

/**
 * Gets a TypeScript version signal from the closest package.json walking up
 * from `dir` to `topDir`. Defaults `topDir = dir` for backward compatibility.
 *
 * @returns raw version string from typescript dependency, or null if not found
 */
export function getTypeScriptVersionSignal(
  dir: NormalizedAbsolutePath,
  topDir: NormalizedAbsolutePath = dir,
): string | null {
  return getVersionSignalFromManifests(dir, topDir, 'typescript');
}
