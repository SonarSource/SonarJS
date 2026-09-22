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
  dirnamePath,
  isRoot,
  getPathRoot,
} from '../files.js';
import { PACKAGE_JSON } from './index.js';
import { patternInParentsCache } from '../find-up/all-in-parent-dirs.js';
import type { Rule } from 'eslint';
import { type DependencyManifest, type ManifestResolver } from './resolvers/types.js';
import { denoManifestResolver } from './resolvers/deno.js';
import { parsePackageJson } from './parsed-dependency-files.js';
import { packageJsonManifestResolver } from './resolvers/package-json.js';

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
    .get(topDir ?? getPathRoot(dir))
    .get(dir);

  return files.map(file => parsePackageJson(file) ?? {});
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

/**
 * Registry of manifest resolvers. Add a new entry here to support a new package manager
 * or manifest format (e.g., Bun).
 */
const MANIFEST_RESOLVERS: ManifestResolver[] = [denoManifestResolver, packageJsonManifestResolver];

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
  const rootDir = topDir ?? getPathRoot(dir);
  const manifests: DependencyManifest[] = [];
  let currentDir: NormalizedAbsolutePath = dir;

  do {
    const manifestsInDir = MANIFEST_RESOLVERS.flatMap(manifestResolver =>
      manifestResolver.resolve(currentDir, rootDir, fileSystem),
    );
    manifests.push(...manifestsInDir);
    if (currentDir === rootDir || isRoot(currentDir)) {
      break;
    }
    currentDir = dirnamePath(currentDir);
  } while (true);

  return manifests;
};
