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
import { opendir } from 'node:fs/promises';
import type { Dir, Dirent } from 'node:fs';
import type { Minimatch } from 'minimatch';
import {
  type NormalizedAbsolutePath,
  normalizeToAbsolutePath,
  joinPaths,
} from '../../../shared/src/helpers/files.js';
import { isJsTsExcluded } from './filter/filter-path.js';
import { warn } from '../../../shared/src/helpers/logging.js';

export async function findFiles(
  dir: string,
  jsTsExclusions: Minimatch[],
  onEntry: (file: Dirent, filePath: NormalizedAbsolutePath) => Promise<void>,
) {
  const root = normalizeToAbsolutePath(dir);
  await walkDirectory(root, root, jsTsExclusions, onEntry);
}

async function walkDirectory(
  directory: NormalizedAbsolutePath,
  root: NormalizedAbsolutePath,
  jsTsExclusions: Minimatch[],
  onEntry: (file: Dirent, filePath: NormalizedAbsolutePath) => Promise<void>,
) {
  let entries: Dir;
  try {
    entries = await opendir(directory);
  } catch (error) {
    if (directory === root || !['EACCES', 'EPERM'].includes(error?.code)) {
      throw error;
    }
    warn(`Skipping directory '${directory}' because it cannot be read (${error.code}).`);
    return;
  }
  const included: { file: Dirent; filePath: NormalizedAbsolutePath }[] = [];
  for await (const file of entries) {
    const filePath = joinPaths(normalizeToAbsolutePath(file.parentPath), file.name);
    if (!isJsTsExcluded(filePath, jsTsExclusions)) {
      included.push({ file, filePath });
    }
  }
  // Entries are processed sequentially to preserve traversal order and avoid
  // opening too many directories at once.
  await included.reduce(
    (previous, { file, filePath }) =>
      previous.then(async () => {
        await onEntry(file, filePath);
        if (file.isDirectory()) {
          await walkDirectory(filePath, root, jsTsExclusions, onEntry);
        }
      }),
    Promise.resolve(),
  );
}
