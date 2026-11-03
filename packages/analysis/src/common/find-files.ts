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
import { pathsEqual } from './filesystem.js';
import { opendir } from 'node:fs/promises';
import type { Dirent } from 'node:fs';
import type { Minimatch } from 'minimatch';
import {
  type NormalizedAbsolutePath,
  normalizeToAbsolutePath,
  joinPaths,
} from '../../../shared/src/helpers/files.js';
import { isJsTsExcluded } from './filter/filter-path.js';
import { warn } from '../../../shared/src/helpers/logging.js';

type Entry = [Dirent, NormalizedAbsolutePath];

export async function findFiles(
  dir: string,
  jsTsExclusions: Minimatch[],
  onEntry: (file: Dirent, filePath: NormalizedAbsolutePath) => Promise<void>,
) {
  const root = normalizeToAbsolutePath(dir);
  // Entries are consumed one at a time, as `onEntry` callbacks are not safe to run concurrently.
  for await (const [file, filePath] of walk(root, jsTsExclusions)) {
    await onEntry(file, filePath);
  }
}

/**
 * Lazily yields every non-excluded entry under `root`. Directories are traversed depth-first using
 * an explicit stack (last pushed, first visited), and are queued before their own entry is yielded.
 */
async function* walk(
  root: NormalizedAbsolutePath,
  jsTsExclusions: Minimatch[],
): AsyncGenerator<Entry> {
  const directories: NormalizedAbsolutePath[] = [root];
  let directory: NormalizedAbsolutePath | undefined;
  while ((directory = directories.pop()) !== undefined) {
    yield* readDirectory(directory, pathsEqual(directory, root), directories, jsTsExclusions);
  }
}

async function* readDirectory(
  directory: NormalizedAbsolutePath,
  isRoot: boolean,
  directories: NormalizedAbsolutePath[],
  jsTsExclusions: Minimatch[],
): AsyncGenerator<Entry> {
  const entries = await openDirectory(directory, isRoot);
  if (entries === null) {
    return;
  }
  for await (const file of entries) {
    const filePath = joinPaths(normalizeToAbsolutePath(file.parentPath), file.name);
    if (!isJsTsExcluded(filePath, jsTsExclusions)) {
      if (file.isDirectory()) {
        directories.push(filePath);
      }
      yield [file, filePath];
    }
  }
}

async function openDirectory(directory: NormalizedAbsolutePath, isRoot: boolean) {
  try {
    return await opendir(directory);
  } catch (error) {
    if (isRoot || !['EACCES', 'EPERM'].includes(error?.code)) {
      throw error;
    }
    warn(`Skipping directory '${directory}' because it cannot be read (${error.code}).`);
    return null;
  }
}
