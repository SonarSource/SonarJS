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
import type { Filesystem } from '../find-up/find-minimatch.js';
import type { PackageJson } from 'type-fest';
import {
  type NormalizedAbsolutePath,
  normalizeToAbsolutePath,
  ROOT_PATH,
  stripBOM,
  dirnamePath,
  isRoot,
  type File,
} from '../files.js';
import { DENO_JSON, DENO_JSONC, PACKAGE_JSON } from './index.js';
import { patternInParentsCache } from '../find-up/all-in-parent-dirs.js';
import type { Rule } from 'eslint';
import { closestPatternCache } from '../find-up/closest.js';
import { DenoManifest, parsePackageJson, parseDenoManifest } from './parse.js';

/**
 * Returns the project manifests that are used to resolve the dependencies imported by
 * the module named `filename`, up to the passed working directory.
 */
export const getPackageJsonManifests = (
  dir: NormalizedAbsolutePath,
  topDir?: NormalizedAbsolutePath,
  fileSystem?: Filesystem,
): Array<PackageJson> => {
  const files = patternInParentsCache
    .get(PACKAGE_JSON, fileSystem)
    .get(topDir ?? ROOT_PATH)
    .get(dir);

  return files.map(file => {
    const content = file.content;

    try {
      return JSON.parse(stripBOM(content.toString()));
    } catch (error) {
      console.debug(`Error parsing package.json ${file.path}: ${error}`);

      return {};
    }
  });
};

export const getPackageJsonManifestsSanitizePaths = (
  context: Rule.RuleContext,
  fileSystem?: Filesystem,
): Array<PackageJson> => {
  return getPackageJsonManifests(
    dirnamePath(normalizeToAbsolutePath(context.filename)),
    normalizeToAbsolutePath(context.cwd),
    fileSystem,
  );
};

export type DependencyManifest =
  | { type: 'npm'; manifest: PackageJson }
  | { type: 'deno'; manifest: DenoManifest };

/**
 * Returns dependency manifest files from closest-to-file and then up to root.
 *
 * For each directory, at most one Deno manifest is selected (`deno.json` > `deno.jsonc`)
 * and `package.json` is always included when present.
 */
export const getDependencyManifests = (
  dir: NormalizedAbsolutePath,
  topDir?: NormalizedAbsolutePath,
  fileSystem?: Filesystem,
): DependencyManifest[] => {
  const rootDir = topDir ?? ROOT_PATH;
  const manifests: DependencyManifest[] = [];
  let currentDir: NormalizedAbsolutePath = dir;

  do {
    manifests.push(...getDependencyManifestsInDir(currentDir, rootDir, fileSystem));
    if (currentDir === rootDir || isRoot(currentDir)) {
      break;
    }
    currentDir = dirnamePath(currentDir);
  } while (true);

  return manifests;
};

function getDependencyManifestsInDir(
  dir: NormalizedAbsolutePath,
  topDir: NormalizedAbsolutePath,
  fileSystem?: Filesystem,
): DependencyManifest[] {
  const manifests: DependencyManifest[] = [];
  const packageJson = getManifestFileInDir(PACKAGE_JSON, dir, topDir, fileSystem);
  const denoJson = getManifestFileInDir(DENO_JSON, dir, topDir, fileSystem);
  const denoJsonc = getManifestFileInDir(DENO_JSONC, dir, topDir, fileSystem);

  // if both `deno.json` and `deno.jsonc` are present, prefer `deno.json` and ignore `deno.jsonc`
  if (denoJsonc && denoJson === undefined) {
    manifests.push({ type: 'deno', manifest: parseDenoManifest(denoJsonc) ?? {} });
  } else if (denoJson) {
    manifests.push({ type: 'deno', manifest: parseDenoManifest(denoJson) ?? {} });
  }

  // always include package.json if present
  if (packageJson) {
    manifests.push({ type: 'npm', manifest: parsePackageJson(packageJson) ?? {} });
  }

  return manifests;
}

function getManifestFileInDir(
  manifestName: string,
  dir: NormalizedAbsolutePath,
  topDir: NormalizedAbsolutePath,
  fileSystem?: Filesystem,
): File | undefined {
  const file = closestPatternCache.get(manifestName, fileSystem).get(topDir).get(dir);
  if (file && dirnamePath(file.path) === dir) {
    return file;
  }
  return undefined;
}
