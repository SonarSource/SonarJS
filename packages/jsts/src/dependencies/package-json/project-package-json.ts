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
import fs from 'node:fs/promises';
import path from 'path';
import { toUnixPath, debug } from '@sonar/shared/helpers';
import { PackageJson as PJ } from 'type-fest';

const PACKAGE_JSON = 'package.json';

export interface PackageJson {
  filename: string;
  contents: PJ;
}

export class PackageJsons {
  public db: Array<PackageJson>;
  protected constructor() {
    this.db = [];
  }

  static async init(dir: string) {
    const packageJsons = new PackageJsons();
    await packageJsons.packageJsonLookup(dir);
    return packageJsons;
  }

  /**
   * Look for package.json files in a given path and its child paths.
   * node_modules is ignored
   *
   * @param dir parent folder where the search starts
   */
  protected async packageJsonLookup(dir: string) {
    const files = await fs.readdir(dir, { withFileTypes: true });
    for (const file of files) {
      const filename = toUnixPath(path.join(dir, file.name));
      if (file.name !== 'node_modules' && file.name !== '.scannerwork' && file.isDirectory()) {
        await this.packageJsonLookup(filename);
      } else if (file.name === PACKAGE_JSON && !file.isDirectory()) {
        debug(`package.json found: ${filename}`);
        try {
          const contents = JSON.parse(await fs.readFile(filename, 'utf-8'));
          this.db.push({ filename, contents });
        } catch (e) {
          debug(`${filename} failed to be parsed: ${e}`);
        }
      }
    }
  }

  /**
   * Given a filename, find the nearest package.json
   *
   * @param file source file for which we need a package.json
   */
  getPackageJsonForFile(file: string) {
    const basedir = path.posix.basename(toUnixPath(file));
    let nearestPackageJson: PackageJson | null = null;
    for (const packageJson of this.db) {
      const packageJsonBaseDir = path.posix.basename(packageJson.filename);
      if (
        basedir.startsWith(packageJsonBaseDir) &&
        (nearestPackageJson === null ||
          nearestPackageJson.filename.length < packageJson.filename.length)
      ) {
        nearestPackageJson = packageJson;
      }
    }
    return nearestPackageJson;
  }
}
