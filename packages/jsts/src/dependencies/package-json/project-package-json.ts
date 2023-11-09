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
import { toUnixPath, debug } from '@sonar/shared/helpers';
import { PackageJson as PJ } from 'type-fest';

const PACKAGE_JSON = 'package.json';
const IGNORED_DIRS = ['node_modules', '.scannerwork'];

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
   */
  async packageJsonLookup(dir: string) {
    dir = path.posix.normalize(toUnixPath(dir));
    try {
      const files = await fs.readdir(dir, { withFileTypes: true });
      for (const file of files) {
        const filename = path.posix.join(dir, file.name);
        if (file.isDirectory() && !IGNORED_DIRS.includes(file.name)) {
          await this.packageJsonLookup(filename);
        } else if (file.name.toLowerCase() === PACKAGE_JSON && !file.isDirectory()) {
          debug(`package.json found: ${filename}`);
          const contents = JSON.parse(await fs.readFile(filename, 'utf-8'));
          this.db.set(dir, { filename, contents });
        }
      }
    } catch (e) {
      error(`Failed to search for package.json files: ${e}`);
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
    return undefined;
  }
}
