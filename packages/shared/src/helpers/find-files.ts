/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import fs from 'node:fs/promises';
import type { Dirent } from 'node:fs';
import { Minimatch } from 'minimatch';
import { toUnixPath } from './files.js';
import { join } from 'node:path/posix';

// Patterns enforced to be ignored no matter what the user configures on sonar.properties
const IGNORED_PATTERNS = ['.scannerwork'];

export async function findFiles(
  dir: string,
  onFile: (file: Dirent, absolutePath: string, relativePath: string) => Promise<void>,
  exclusionsArr: string[] = [],
) {
  const exclusions = exclusionsArr
    .concat(IGNORED_PATTERNS)
    .map(pattern => new Minimatch(pattern.trim(), { nocase: true, matchBase: true, dot: true }));

  const prefixLength = dir.length + 1;
  const files = await fs.readdir(dir, { recursive: true, withFileTypes: true });

  for (const file of files) {
    const filePath = toUnixPath(join(file.parentPath, file.name));
    const relativePath = filePath.substring(prefixLength);
    if (file.isFile() && !exclusions.some(exclusion => exclusion.match(relativePath))) {
      await onFile(file, filePath, relativePath);
    }
  }
}
