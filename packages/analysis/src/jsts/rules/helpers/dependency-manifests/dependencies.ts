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
import {
  type NormalizedAbsolutePath,
  normalizeToAbsolutePath,
  dirnamePath,
  stripBOM,
} from '../files.js';
import { getClosestDependencyManifestDir } from './closest.js';
import { getDependencyManifests, getPackageJsonManifests } from './all-in-parent-dirs.js';
import { DEFINITELY_TYPED, type DependenciesList, type ModuleType } from './resolvers/types.js';

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
  baseDir: NormalizedAbsolutePath,
  dependencyName: string,
  fallbackSignal?: (packageJson: PackageJson) => string | null,
): string | null {
  // Only look at npm manifests: Deno `npm:` imports are download aliases and don't carry
  // meaningful version signals for the project's actual npm dependency resolution.
  const lookupKey = dependencyName.startsWith(DEFINITELY_TYPED)
    ? dependencyName.substring(DEFINITELY_TYPED.length)
    : dependencyName;

  for (const manifest of getDependencyManifests(
    normalizeToAbsolutePath(baseDir),
    normalizeToAbsolutePath(baseDir),
    fs,
  )) {
    if (manifest.type !== 'npm') {
      continue;
    }
    const version = manifest.dependencies.get(lookupKey) ?? null;
    if (isValidDependencySignal(version)) {
      return version;
    }
  }

  if (fallbackSignal) {
    const packageJson = getPackageJsonManifests(baseDir, baseDir, fs)[0];
    if (packageJson) {
      const fallbackVersion = fallbackSignal(packageJson);
      if (fallbackVersion !== null && fallbackVersion !== undefined) {
        return fallbackVersion;
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
 * Gets a Node.js version signal from the package.json at baseDir.
 * Checks @types/node in all dependency fields first, then engines.node.
 * Returns the raw version string for further parsing.
 *
 * @param baseDir project base directory containing package.json
 * @returns raw version string from @types/node or engines.node, or null if not found
 */
export function getNodeVersionSignal(baseDir: NormalizedAbsolutePath): string | null {
  return getVersionSignalFromManifests(baseDir, '@types/node', packageJson => {
    const enginesNode = packageJson.engines?.['node'];
    return typeof enginesNode === 'string' ? enginesNode : null;
  });
}

/**
 * Gets a TypeScript version signal from the package.json at baseDir.
 * Checks dependency fields for "typescript" and returns the raw version range.
 *
 * @param baseDir project base directory containing package.json
 * @returns raw version string from typescript dependency, or null if not found
 */
export function getTypeScriptVersionSignal(baseDir: NormalizedAbsolutePath): string | null {
  return getVersionSignalFromManifests(baseDir, 'typescript');
}

function parsePackageJsonContent(content: string | Buffer): PackageJson | undefined {
  const packageJsonContent = typeof content === 'string' ? content : content.toString();
  try {
    return JSON.parse(stripBOM(packageJsonContent)) as PackageJson;
  } catch {
    return undefined;
  }
}
