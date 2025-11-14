/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
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
import type { Dirent } from 'node:fs';
import { toUnixPath } from './files.js';
import { join } from 'node:path/posix';
import { isJsTsExcluded } from './filter/filter-path.js';

export async function findFiles(
  dir: string,
  onEntry: (file: Dirent, filePath: string) => Promise<void>,
) {
  const directories = [dir];

  while (directories.length > 0) {
    const directory = directories.pop()!;
    for await (const file of await opendir(directory)) {
      const filePath = join(toUnixPath(file.parentPath), file.name);
      if (!isJsTsExcluded(filePath)) {
        if (file.isDirectory()) {
          directories.push(filePath);
        }
        await onEntry(file, filePath);
      }
    }
  }
}
