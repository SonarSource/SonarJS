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
import { toUnixPath } from '@sonar/shared';
import {
  loadPackageJsons,
  getAllPackageJsons,
  getNearestPackageJsons,
  clearPackageJsons,
  getPackageJsonsCount,
} from '@sonar/jsts';

describe('initialize package.json files', () => {
  beforeEach(() => {
    clearPackageJsons();
  });

  it('should find all package.json files', () => {
    const baseDir = path.posix.join(toUnixPath(__dirname), 'fixtures');
    loadPackageJsons(baseDir, []);
    expect(getPackageJsonsCount()).toEqual(7);

    const basePJList = getNearestPackageJsons(path.posix.join(baseDir, 'index.js'));
    const basePJ = toUnixPath(path.posix.join(baseDir, 'package.json'));

    const moduleAPJList = getNearestPackageJsons(path.posix.join(baseDir, 'moduleA', 'index.js'));
    const moduleAPJ = toUnixPath(path.posix.join(baseDir, 'moduleA', 'package.json'));

    const moduleAsubmoduleAPJList = getNearestPackageJsons(
      path.posix.join(baseDir, 'moduleA', 'submoduleA', 'index.js'),
    );
    const moduleAsubmoduleAPJ = toUnixPath(
      path.posix.join(baseDir, 'moduleA', 'submoduleA', 'package.json'),
    );

    const moduleAsubmoduleBPJList = getNearestPackageJsons(
      path.posix.join(baseDir, 'moduleA', 'submoduleB', 'index.js'),
    );
    const moduleAsubmoduleBPJ = toUnixPath(
      path.posix.join(baseDir, 'moduleA', 'submoduleB', 'package.json'),
    );

    const moduleBPJList = getNearestPackageJsons(path.posix.join(baseDir, 'moduleB', 'index.js'));
    const moduleBPJ = toUnixPath(path.posix.join(baseDir, 'moduleB', 'package.json'));

    const moduleBsubmoduleAPJList = getNearestPackageJsons(
      path.posix.join(baseDir, 'moduleB', 'submoduleA', 'index.js'),
    );
    const moduleBsubmoduleAPJ = toUnixPath(
      path.posix.join(baseDir, 'moduleB', 'submoduleA', 'package.json'),
    );

    const moduleBsubmoduleBPJList = getNearestPackageJsons(
      path.posix.join(baseDir, 'moduleB', 'submoduleB', 'index.js'),
    );
    const moduleBsubmoduleBPJ = toUnixPath(
      path.posix.join(baseDir, 'moduleB', 'submoduleB', 'package.json'),
    );

    expect(basePJList).toHaveLength(1);
    expect(basePJList[0].filename).toEqual(basePJ);
    expect(moduleAPJList).toHaveLength(2);
    expect(moduleAPJList[0].filename).toEqual(toUnixPath(moduleAPJ));
    expect(moduleAsubmoduleAPJList).toHaveLength(3);
    expect(moduleAsubmoduleAPJList[0].filename).toEqual(moduleAsubmoduleAPJ);
    expect(moduleAsubmoduleBPJList).toHaveLength(3);
    expect(moduleAsubmoduleBPJList[0].filename).toEqual(moduleAsubmoduleBPJ);
    expect(moduleBPJList).toHaveLength(2);
    expect(moduleBPJList[0].filename).toEqual(toUnixPath(moduleBPJ));
    expect(moduleBsubmoduleAPJList).toHaveLength(3);
    expect(moduleBsubmoduleAPJList[0].filename).toEqual(moduleBsubmoduleAPJ);
    expect(moduleBsubmoduleBPJList).toHaveLength(3);
    expect(moduleBsubmoduleBPJList[0].filename).toEqual(moduleBsubmoduleBPJ);

    const fakeFilePJList = getNearestPackageJsons(
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
    );
    expect(fakeFilePJList).toHaveLength(3);
    expect(fakeFilePJList[0].filename).toEqual(moduleBsubmoduleBPJ);
  });

  it('should ignore package.json files from ignored patterns', () => {
    const baseDir = path.posix.join(toUnixPath(__dirname), 'fixtures');

    loadPackageJsons(baseDir, ['moduleA']);
    expect(getPackageJsonsCount()).toEqual(4);
    const expected = [
      ['package.json'],
      ['moduleB', 'package.json'],
      ['moduleB', 'submoduleA', 'package.json'],
      ['moduleB', 'submoduleB', 'package.json'],
    ];
    const actual = getAllPackageJsons();
    const expectedMap = {};
    expected.forEach(packageJson => {
      const filename = path.posix.join(baseDir, ...packageJson);
      expectedMap[path.posix.dirname(filename)] = [{ filename, contents: expect.any(Object) }];
    });
    expect(actual).toEqual(expectedMap);

    clearPackageJsons();
    loadPackageJsons(baseDir, ['module*']);
    expect(getPackageJsonsCount()).toEqual(1);
    expect(getAllPackageJsons()).toEqual({
      [baseDir]: [
        { filename: path.posix.join(baseDir, 'package.json'), contents: expect.any(Object) },
      ],
    });
  });

  it('should return empty array when no package.json are in the DB or none exist in the file tree', () => {
    const baseDir = path.posix.join(toUnixPath(__dirname), 'fixtures');

    expect(getPackageJsonsCount()).toEqual(0);
    expect(
      getNearestPackageJsons(path.posix.join(baseDir, '..', 'another-module', 'index.js')),
    ).toHaveLength(0);

    loadPackageJsons(baseDir, ['']);
    expect(getPackageJsonsCount()).toEqual(7);
    expect(
      getNearestPackageJsons(path.posix.join(baseDir, '..', 'another-module', 'index.js')),
    ).toHaveLength(0);
  });
});
