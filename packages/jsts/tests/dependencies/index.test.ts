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
import { searchPackageJsonFiles, getAllPackageJsons, getNearestPackageJson } from '@sonar/jsts';

describe('initialize package.json files', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('should find all package.json files', async () => {
    const baseDir = path.join(__dirname, 'fixtures');
    await searchPackageJsonFiles(baseDir);
    expect(getAllPackageJsons().size).toEqual(7);

    expect(getNearestPackageJson(path.join(__dirname, 'fixtures', 'index.js')).filename).toEqual(
      toUnixPath(path.join(__dirname, 'fixtures', 'package.json')),
    );
    expect(
      getNearestPackageJson(path.join(__dirname, 'fixtures', 'moduleA', 'index.js')).filename,
    ).toEqual(toUnixPath(path.join(__dirname, 'fixtures', 'moduleA', 'package.json')));
    expect(
      getNearestPackageJson(path.join(__dirname, 'fixtures', 'moduleA', 'submoduleA', 'index.js'))
        .filename,
    ).toEqual(
      toUnixPath(path.join(__dirname, 'fixtures', 'moduleA', 'submoduleA', 'package.json')),
    );
    expect(
      getNearestPackageJson(path.join(__dirname, 'fixtures', 'moduleA', 'submoduleB', 'index.js'))
        .filename,
    ).toEqual(
      toUnixPath(path.join(__dirname, 'fixtures', 'moduleA', 'submoduleB', 'package.json')),
    );
    expect(
      getNearestPackageJson(path.join(__dirname, 'fixtures', 'moduleB', 'index.js')).filename,
    ).toEqual(toUnixPath(path.join(__dirname, 'fixtures', 'moduleB', 'package.json')));
    expect(
      getNearestPackageJson(path.join(__dirname, 'fixtures', 'moduleB', 'submoduleA', 'index.js'))
        .filename,
    ).toEqual(
      toUnixPath(path.join(__dirname, 'fixtures', 'moduleB', 'submoduleA', 'package.json')),
    );
    expect(
      getNearestPackageJson(path.join(__dirname, 'fixtures', 'moduleB', 'submoduleB', 'index.js'))
        .filename,
    ).toEqual(
      toUnixPath(path.join(__dirname, 'fixtures', 'moduleB', 'submoduleB', 'package.json')),
    );
    expect(
      getNearestPackageJson(
        path.join(
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
    ).toEqual(
      toUnixPath(path.join(__dirname, 'fixtures', 'moduleB', 'submoduleB', 'package.json')),
    );
  });
});
