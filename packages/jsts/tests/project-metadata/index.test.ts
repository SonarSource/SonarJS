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
import path from 'path';
import { toUnixPath } from '../../../shared/src/index.js';
import { getManifests, isSupported } from '../../src/rules/helpers/index.js';
import fs from 'fs';

describe('initialize package.json files', () => {
  const baseDir = path.posix.join(toUnixPath(__dirname), 'fixtures', 'package-json');

  it('should find all package.json files', () => {
    const basePJList = getManifests(baseDir, baseDir, fs);

    const moduleAPJList = getManifests(path.posix.join(baseDir, 'moduleA'), baseDir, fs);

    const moduleAsubmoduleAPJList = getManifests(
      path.posix.join(baseDir, 'moduleA', 'submoduleA'),
      baseDir,
      fs,
    );

    const moduleAsubmoduleBPJList = getManifests(
      path.posix.join(baseDir, 'moduleA', 'submoduleB'),
      baseDir,
      fs,
    );

    const moduleBPJList = getManifests(path.posix.join(baseDir, 'moduleB'), baseDir, fs);

    const moduleBsubmoduleAPJList = getManifests(
      path.posix.join(baseDir, 'moduleB', 'submoduleA'),
      baseDir,
      fs,
    );

    const moduleBsubmoduleBPJList = getManifests(
      path.posix.join(baseDir, 'moduleB', '.submoduleB'),
      baseDir,
      fs,
    );

    expect(basePJList).toHaveLength(1);
    expect(basePJList[0].name).toEqual('myProject');
    expect(moduleAPJList).toHaveLength(2);
    expect(moduleAPJList[0].name).toEqual('module-a');
    expect(moduleAsubmoduleAPJList).toHaveLength(3);
    expect(moduleAsubmoduleAPJList[0].name).toEqual('module-a-submodule-a');
    expect(moduleAsubmoduleBPJList).toHaveLength(3);
    expect(moduleAsubmoduleBPJList[0].name).toEqual('module-a-submodule-b');
    expect(moduleBPJList).toHaveLength(2);
    expect(moduleBPJList[0].name).toEqual(toUnixPath('module-b'));
    expect(moduleBsubmoduleAPJList).toHaveLength(3);
    expect(moduleBsubmoduleAPJList[0].name).toEqual('module-b-submodule-a');
    expect(moduleBsubmoduleBPJList).toHaveLength(3);
    expect(moduleBsubmoduleBPJList[0].name).toEqual('module-b-submodule-b');

    const fakeFilePJList = getManifests(
      path.posix.join(baseDir, 'moduleB', '.submoduleB', 'subfolder1', 'subfolder2', 'subfolder3'),
      baseDir,
      fs,
    );
    expect(fakeFilePJList).toHaveLength(3);
    expect(moduleBsubmoduleBPJList[0].name).toEqual('module-b-submodule-b');
  });

  it('should return empty array when no package.json are in the DB or none exist in the file tree', () => {
    expect(
      getManifests(
        path.posix.join(baseDir, '..', 'another-module'),
        path.posix.join(baseDir, '..'),
        fs,
      ),
    ).toHaveLength(0);

    expect(
      getManifests(
        path.posix.join(baseDir, '..', 'another-module'),
        path.posix.join(baseDir, '..'),
        fs,
      ),
    ).toHaveLength(0);
  });
});

describe('isSupported()', () => {
  let baseDir;
  beforeEach(() => {
    baseDir = path.posix.join(toUnixPath(__dirname), 'fixtures', 'is-supported-node');
  });

  it('should throw an error when a version is invalid', () => {
    expect(() => isSupported('index.js', { node: 'invalid' })).toThrowError(
      'Invalid semver version: "invalid" for "node"',
    );
  });

  it('should return true when no minimum version is provided', () => {
    expect(isSupported('index.js', {})).toBe(true);
  });

  describe('#isSupportedNodeVersion()', () => {
    describe('when package.json#engine.node is defined', () => {
      describe('when there is a minimum version', () => {
        it('should return true when the project supports the feature', () => {
          const projectDir = path.posix.join(baseDir, 'with-node-with-minimum');
          expect(isSupported(projectDir, { node: '4.0.0' })).toBe(true);
        });
        it('should return false when the project does not support the feature', () => {
          const projectDir = path.posix.join(baseDir, 'with-node-with-minimum');
          expect(isSupported(projectDir, { node: '6.0.0' })).toBe(false);
        });
      });

      // coverage
      describe('when there is no minimum version', () => {
        it('should return true', () => {
          const projectDir = path.posix.join(baseDir, 'with-node-no-minimum');
          expect(isSupported(projectDir, { node: '5.0.0' })).toBe(true);
        });
      });
    });
    describe('when package.json#engine.node is undefined', () => {
      it('should return true', () => {
        const projectDir = path.posix.join(baseDir, 'no-node');
        expect(isSupported(projectDir, { node: '6.0.0' })).toBe(true);
      });
    });
    describe('when no package.json is found', () => {
      // we simply don't load the package.json files
      it('should return true', () => {
        const projectDir = path.posix.join(baseDir, 'no-node');
        expect(isSupported(projectDir, { node: '6.0.0' })).toBe(true);
      });
    });
  });
});
