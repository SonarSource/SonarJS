/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
import {
  isSupported,
  normalizeToAbsolutePath,
  joinPaths,
  type NormalizedAbsolutePath,
} from '../../src/rules/helpers/index.js';
import fs from 'node:fs';
import { describe, it, beforeEach } from 'node:test';
import { expect } from 'expect';
import { getManifests } from '../../src/rules/helpers/package-jsons/all-in-parent-dirs.js';

describe('initialize package.json files', () => {
  const baseDir = joinPaths(
    normalizeToAbsolutePath(import.meta.dirname),
    'fixtures',
    'package-json',
  );

  it('should find all package.json files', () => {
    const basePJList = getManifests(baseDir, baseDir, fs);

    const moduleAPJList = getManifests(joinPaths(baseDir, 'moduleA'), baseDir, fs);

    const moduleAsubmoduleAPJList = getManifests(
      joinPaths(baseDir, 'moduleA', 'submoduleA'),
      baseDir,
      fs,
    );

    const moduleAsubmoduleBPJList = getManifests(
      joinPaths(baseDir, 'moduleA', 'submoduleB'),
      baseDir,
      fs,
    );

    const moduleBPJList = getManifests(joinPaths(baseDir, 'moduleB'), baseDir, fs);

    const moduleBsubmoduleAPJList = getManifests(
      joinPaths(baseDir, 'moduleB', 'submoduleA'),
      baseDir,
      fs,
    );

    const moduleBsubmoduleBPJList = getManifests(
      joinPaths(baseDir, 'moduleB', '.submoduleB'),
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
    expect(moduleBPJList[0].name).toEqual('module-b');
    expect(moduleBsubmoduleAPJList).toHaveLength(3);
    expect(moduleBsubmoduleAPJList[0].name).toEqual('module-b-submodule-a');
    expect(moduleBsubmoduleBPJList).toHaveLength(3);
    expect(moduleBsubmoduleBPJList[0].name).toEqual('module-b-submodule-b');

    const fakeFilePJList = getManifests(
      joinPaths(baseDir, 'moduleB', '.submoduleB', 'subfolder1', 'subfolder2', 'subfolder3'),
      baseDir,
      fs,
    );
    expect(fakeFilePJList).toHaveLength(3);
    expect(moduleBsubmoduleBPJList[0].name).toEqual('module-b-submodule-b');
  });

  it('should return empty array when no package.json are in the DB or none exist in the file tree', () => {
    const anotherModuleDir = joinPaths(baseDir, '..', 'another-module');
    const parentDir = joinPaths(baseDir, '..');
    expect(getManifests(anotherModuleDir, parentDir, fs)).toHaveLength(0);

    expect(getManifests(anotherModuleDir, parentDir, fs)).toHaveLength(0);
  });
});

describe('isSupported()', () => {
  let baseDir: NormalizedAbsolutePath;
  beforeEach(() => {
    baseDir = joinPaths(
      normalizeToAbsolutePath(import.meta.dirname),
      'fixtures',
      'is-supported-node',
    );
  });

  it('should throw an error when a version is invalid', () => {
    expect(() => isSupported(normalizeToAbsolutePath('index.js'), { node: 'invalid' })).toThrow(
      'Invalid semver version: "invalid" for "node"',
    );
  });

  it('should return true when no minimum version is provided', () => {
    expect(isSupported(normalizeToAbsolutePath('index.js'), {})).toBe(true);
  });

  describe('#isSupportedNodeVersion()', () => {
    describe('when package.json#engine.node is defined', () => {
      describe('when there is a minimum version', () => {
        it('should return true when the project supports the feature', () => {
          const projectDir = joinPaths(baseDir, 'with-node-with-minimum');
          expect(isSupported(projectDir, { node: '4.0.0' })).toBe(true);
        });
        it('should return false when the project does not support the feature', () => {
          const projectDir = joinPaths(baseDir, 'with-node-with-minimum');
          expect(isSupported(projectDir, { node: '6.0.0' })).toBe(false);
        });
      });

      // coverage
      describe('when there is no minimum version', () => {
        it('should return true', () => {
          const projectDir = joinPaths(baseDir, 'with-node-no-minimum');
          expect(isSupported(projectDir, { node: '5.0.0' })).toBe(true);
        });
      });
    });
    describe('when package.json#engine.node is undefined', () => {
      it('should return true', () => {
        const projectDir = joinPaths(baseDir, 'no-node');
        expect(isSupported(projectDir, { node: '6.0.0' })).toBe(true);
      });
    });
    describe('when no package.json is found', () => {
      // we simply don't load the package.json files
      it('should return true', () => {
        const projectDir = joinPaths(baseDir, 'no-node');
        expect(isSupported(projectDir, { node: '6.0.0' })).toBe(true);
      });
    });
  });
});
