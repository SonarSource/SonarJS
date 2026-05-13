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
import { type NormalizedAbsolutePath, type File, dirnamePath } from '../../files.js';
import { closestPatternCache } from '../../find-up/closest.js';
import type { Filesystem } from '../../find-up/find-minimatch.js';

/**
 * Returns the manifest file at exactly `dir` (not a parent directory), or `undefined` if absent.
 */
export function getManifestFileInDir(
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

/**
 * Get the parent directory of the given path.
 * @param path Path to get the parent directory of.
 * @returns The parent directory or `null` if it is the root directory.
 */
export function getParentDirPath(path: NormalizedAbsolutePath): NormalizedAbsolutePath | null {
  const parentDir = dirnamePath(path);
  return parentDir === path ? null : parentDir;
}
