/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
import fs from 'fs';
import path from 'path';
import { toUnixPath, debug, error } from '@sonar/shared';
import { Minimatch } from 'minimatch';

// Patterns enforced to be ignored no matter what the user configures on sonar.properties
const IGNORED_PATTERNS = ['**/.scannerwork/**'];

export interface File<T> {
  filename: string;
  contents: T;
}

export class FileFinder<T> {
  readonly db: Map<string, File<T>[]> = new Map();
  constructor(readonly contentsParser: (filename: string) => T) {}
  /**
   * Look for files in a given path and its child paths.
   * node_modules is ignored
   *
   * @param dir parent folder where the search starts
   * @param patterns glob patterns to search for
   * @param exclusions glob patterns to ignore while walking the tree
   */
  searchFiles(dir: string, patterns: string[], exclusions: string[]) {
    try {
      this.walkDirectory(
        path.posix.normalize(toUnixPath(dir)),
        stringToGlob(patterns),
        stringToGlob(exclusions.concat(IGNORED_PATTERNS)),
      );
    } catch (e) {
      error(`Error while searching for files: ${e}`);
    }
  }

  walkDirectory(dir: string, patterns: Minimatch[], ignoredPatterns: Minimatch[]) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    if (!this.db.has(dir)) {
      this.db.set(dir, []);
    }
    for (const file of files) {
      const filename = path.posix.join(dir, file.name);
      if (ignoredPatterns.some(pattern => pattern.match(filename))) {
        continue; // is ignored pattern
      }
      if (file.isDirectory()) {
        this.walkDirectory(filename, patterns, ignoredPatterns);
      } else if (patterns.some(pattern => pattern.match(filename)) && !file.isDirectory()) {
        try {
          debug(`Found file: ${filename}`);
          const contents = this.contentsParser(filename);
          this.db.get(dir)!.push({ filename, contents });
        } catch (e) {
          debug(`Error parsing file ${filename}: ${e}`);
        }
      }
    }
  }
}

function stringToGlob(patterns: string[]): Minimatch[] {
  return patterns.map(pattern => new Minimatch(pattern, { nocase: true, matchBase: true }));
}
