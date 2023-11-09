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
import fs from 'fs/promises';
import path from 'path';
import { toUnixPath, debug, error } from '@sonar/shared/helpers';
import { PackageJson as PJ } from 'type-fest';
import { Minimatch } from 'minimatch';

const PACKAGE_JSON = 'package.json';

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
      const patterns = exclusions.map(exclusion => new Minimatch(exclusion));
      await this.walkDirectory(path.posix.normalize(toUnixPath(dir)), patterns);
    } catch (e) {
      error(`Error while searching for package.json files: ${e}`);
    }
  }

  private async walkDirectory(dir: string, ignoredPatterns: Minimatch[]) {
    const files = await fs.readdir(dir, { withFileTypes: true });
    for (const file of files) {
      const filename = path.posix.join(dir, file.name);
      if (ignoredPatterns.some(pattern => pattern.match(filename))) {
        continue; // is ignored pattern
      }
      if (file.isDirectory()) {
        await this.walkDirectory(filename, ignoredPatterns);
      } else if (file.name.toLowerCase() === PACKAGE_JSON && !file.isDirectory()) {
        debug(`Found package.json: ${filename}`);
        const contents = JSON.parse(await fs.readFile(filename, 'utf-8'));
        this.db.set(dir, { filename, contents });
      }
    }
  }
  /**
   * Given a filename, find the nearest package.json
   *
   * @param file source file for which we need a package.json
   */
  getPackageJsonForFile(file: string) {
    let currentDir = path.posix.dirname(path.posix.normalize(toUnixPath(file)));
    do {
      const packageJson = this.db.get(currentDir);
      if (packageJson) {
        return packageJson;
      }
      currentDir = path.posix.dirname(currentDir);
    } while (currentDir !== path.posix.dirname(currentDir));
    return null;
  }
}
