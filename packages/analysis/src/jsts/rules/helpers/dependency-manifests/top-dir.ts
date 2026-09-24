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
import fs from 'node:fs';
import {
  type NormalizedAbsolutePath,
  dirnamePath,
  isRoot,
  joinPaths,
  normalizeToAbsolutePath,
  relativeToAncestorPath,
} from '../files.js';
import { isSonarRuntime } from '../sonar-runtime.js';
import { ComputedCache } from '../cache.js';

const repositoryRootCache = new ComputedCache(
  (startDir: NormalizedAbsolutePath): NormalizedAbsolutePath | null => {
    let dir = startDir;
    while (true) {
      // A worktree or submodule has a .git file rather than a directory.
      if (fs.existsSync(joinPaths(dir, '.git'))) {
        return dir;
      }
      if (isRoot(dir)) {
        return null;
      }
      dir = dirnamePath(dir);
    }
  },
);

/** Bounds standalone dependency lookup to the repository containing the linted file. */
export function getDependencyTopDir(
  context: Rule.RuleContext,
  filePath: NormalizedAbsolutePath,
): NormalizedAbsolutePath {
  const cwd = normalizeToAbsolutePath(context.cwd);
  if (isSonarRuntime(context)) {
    return cwd;
  }

  const fileDir = dirnamePath(filePath);
  const repositoryRoot = repositoryRootCache.get(fileDir);
  if (repositoryRoot) {
    // Keep the existing cwd boundary when linting a nested repository or submodule
    // from a parent workspace; otherwise, include manifests up to the repo root.
    return relativeToAncestorPath(repositoryRoot, cwd) === undefined ? repositoryRoot : cwd;
  }

  // Without a repository marker, keep the existing working-directory boundary.
  // A file outside cwd cannot be bounded by cwd, so use its own directory.
  return relativeToAncestorPath(fileDir, cwd) === undefined ? fileDir : cwd;
}
