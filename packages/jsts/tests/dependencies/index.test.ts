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

import path from 'path';
import { toUnixPath } from '@sonar/shared/helpers';
import {
  searchPackageJsonFiles,
  getAllPackageJsons,
  getNearestPackageJson,
  PackageJsonsByBaseDir,
} from '@sonar/jsts';

describe('initialize package.json files', () => {
  beforeEach(() => {
    jest.resetModules();
    getAllPackageJsons().clear();
  });

  it('should find all package.json files', async () => {
    const baseDir = path.posix.join(toUnixPath(__dirname), 'fixtures');
    await searchPackageJsonFiles(baseDir, []);
    expect(getAllPackageJsons().size).toEqual(7);

    expect(getNearestPackageJson(path.posix.join(baseDir, 'index.js')).filename).toEqual(
      toUnixPath(path.posix.join(baseDir, 'package.json')),
    );
    expect(getNearestPackageJson(path.posix.join(baseDir, 'moduleA', 'index.js')).filename).toEqual(
      toUnixPath(path.posix.join(baseDir, 'moduleA', 'package.json')),
    );
    expect(
      getNearestPackageJson(path.posix.join(baseDir, 'moduleA', 'submoduleA', 'index.js')).filename,
    ).toEqual(toUnixPath(path.posix.join(baseDir, 'moduleA', 'submoduleA', 'package.json')));
    expect(
      getNearestPackageJson(path.posix.join(baseDir, 'moduleA', 'submoduleB', 'index.js')).filename,
    ).toEqual(toUnixPath(path.posix.join(baseDir, 'moduleA', 'submoduleB', 'package.json')));
    expect(getNearestPackageJson(path.posix.join(baseDir, 'moduleB', 'index.js')).filename).toEqual(
      toUnixPath(path.posix.join(baseDir, 'moduleB', 'package.json')),
    );
    expect(
      getNearestPackageJson(path.posix.join(baseDir, 'moduleB', 'submoduleA', 'index.js')).filename,
    ).toEqual(toUnixPath(path.posix.join(baseDir, 'moduleB', 'submoduleA', 'package.json')));
    expect(
      getNearestPackageJson(path.posix.join(baseDir, 'moduleB', 'submoduleB', 'index.js')).filename,
    ).toEqual(toUnixPath(path.posix.join(baseDir, 'moduleB', 'submoduleB', 'package.json')));
    expect(
      getNearestPackageJson(
        path.posix.join(
          __dirname,
          'fixtures',
          'moduleB',
          'submoduleB',
          'subfolder1',
          'subfolder2',
          'subfolder3',
          'index.js',
        ),
      ).filename,
    ).toEqual(toUnixPath(path.posix.join(baseDir, 'moduleB', 'submoduleB', 'package.json')));
  });

  it('should ignore package.json files from ignored patterns', async () => {
    const baseDir = path.posix.join(toUnixPath(__dirname), 'fixtures');

    await searchPackageJsonFiles(baseDir, ['**/moduleA/**']);
    expect(getAllPackageJsons().size).toEqual(4);
    const packageJsons = [
      ['package.json'],
      ['moduleB', 'package.json'],
      ['moduleB', 'submoduleA', 'package.json'],
      ['moduleB', 'submoduleB', 'package.json'],
    ];
    expect(getAllPackageJsons()).toEqual(
      new Map(
        packageJsons.map(packageJson => {
          const filename = path.posix.join(baseDir, ...packageJson);
          return [path.posix.dirname(filename), { filename, contents: expect.any(Object) }];
        }),
      ),
    );

    getAllPackageJsons().clear();
    await searchPackageJsonFiles(baseDir, ['**/module*/**']);
    expect(getAllPackageJsons().size).toEqual(1);
    expect(getAllPackageJsons()).toEqual(
      new Map([
        [
          baseDir,
          { filename: path.posix.join(baseDir, 'package.json'), contents: expect.any(Object) },
        ],
      ]),
    );
  });

  it('should return null when no package.json are in the DB or none exist in the file tree', async () => {
    const baseDir = path.posix.join(toUnixPath(__dirname), 'fixtures');

    expect(getAllPackageJsons().size).toEqual(0);
    expect(
      getNearestPackageJson(path.posix.join(baseDir, '..', 'another-module', 'index.js')),
    ).toBeNull();

    await searchPackageJsonFiles(baseDir, ['']);
    expect(getAllPackageJsons().size).toEqual(7);
    expect(
      getNearestPackageJson(path.posix.join(baseDir, '..', 'another-module', 'index.js')),
    ).toBeNull();
  });

  it('should return log error when cannot access baseDir', async () => {
    const baseDir = path.posix.join(toUnixPath(__dirname), 'fixtures');

    console.error = jest.fn();

    jest.spyOn(PackageJsonsByBaseDir, 'walkDirectory').mockImplementation(dir => {
      throw Error(`Cannot access ${dir}`);
    });

    await searchPackageJsonFiles(baseDir, ['']);
    expect(console.error).toHaveBeenCalledWith(
      `Error while searching for package.json files: Error: Cannot access ${baseDir}`,
    );
  });
});
