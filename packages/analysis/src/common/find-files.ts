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
  const directories: NormalizedAbsolutePath[] = [root];

  while (directories.length > 0) {
    const directory = directories.pop()!;
    let entries: Dir;
    try {
      entries = await opendir(directory);
    } catch (error) {
      if (directory === root || !['EACCES', 'EPERM'].includes(error?.code)) {
        throw error;
      }
      warn(`Skipping directory '${directory}' because it cannot be read (${error.code}).`);
      continue;
    }
    for await (const file of entries) {
      const filePath = joinPaths(normalizeToAbsolutePath(file.parentPath), file.name);
      if (!isJsTsExcluded(filePath, jsTsExclusions)) {
        if (file.isDirectory()) {
          directories.push(filePath);
        }
        await onEntry(file, filePath);
      }
    }
  }
}
