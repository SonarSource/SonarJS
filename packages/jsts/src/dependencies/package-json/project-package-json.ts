/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import { toUnixPath, debug, error, readFileSync } from '@sonar/shared';
import { PackageJson as PJ } from 'type-fest';
import { Minimatch } from 'minimatch';

const PACKAGE_JSON = 'package.json';

// Patterns enforced to be ignored no matter what the user configures on sonar.properties
const IGNORED_PATTERNS = ['**/.scannerwork/**'];

export interface PackageJson {
  filename: string;
  contents: PJ;
}

export class PackageJsons {
  readonly db: Map<string, PackageJson> = new Map();

  /**
   * Look for package.json files in a given path and its child paths.
   * node_modules is ignored
   *
   * @param dir parent folder where the search starts
   * @param exclusions glob patterns to ignore while walking the tree
   */
  async searchPackageJsonFiles(dir: string, exclusions: string[]) {
    try {
      const patterns = exclusions
        .concat(IGNORED_PATTERNS)
        .map(exclusion => new Minimatch(exclusion, { dot: true }));
      this.walkDirectory(path.posix.normalize(toUnixPath(dir)), patterns);
    } catch (e) {
      error(`Error while searching for package.json files: ${e}`);
    }
  }

  walkDirectory(dir: string, ignoredPatterns: Minimatch[]) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
      const filename = path.posix.join(dir, file.name);
      if (ignoredPatterns.some(pattern => pattern.match(filename))) {
        continue; // is ignored pattern
      }
      if (file.isDirectory()) {
        this.walkDirectory(filename, ignoredPatterns);
      } else if (file.name.toLowerCase() === PACKAGE_JSON && !file.isDirectory()) {
        try {
          debug(`Found package.json: ${filename}`);
          const contents = JSON.parse(readFileSync(filename));
          this.db.set(dir, { filename, contents });
        } catch (e) {
          debug(`Error reading file ${filename}: ${e}`);
        }
      }
    }
  }
  /**
   * Given a filename, return all package.json files in the ancestor paths
   * ordered from nearest to furthest
   *
   * @param file source file for which we need a package.json
   */
  getPackageJsonsForFile(file: string) {
    const results: PackageJson[] = [];
    if (this.db.size === 0) {
      return results;
    }
    let currentDir = path.posix.dirname(path.posix.normalize(toUnixPath(file)));
    do {
      const packageJson = this.db.get(currentDir);
      if (packageJson) {
        results.push(packageJson);
      }
      currentDir = path.posix.dirname(currentDir);
    } while (currentDir !== path.posix.dirname(currentDir));
    return results;
  }
}
