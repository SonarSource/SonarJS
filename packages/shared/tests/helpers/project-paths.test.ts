/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import { describe, it } from 'node:test';
import { expect } from 'expect';
import {
  normalizeProjectRoot,
  relativeProjectPath,
  replayProjectRoot,
} from '../../src/helpers/project-paths.js';

describe('portable project namespaces (host independent)', () => {
  for (const [input, expected] of [
    ['C:\\ci\\project\\', 'C:/ci/project'],
    ['d:/ci/./project/sub/..', 'd:/ci/project'],
    ['C:/', 'C:/'],
    ['C:/Build/Project with spaces/λ', 'C:/Build/Project with spaces/λ'],
    ['/home/ci/./project/', '/home/ci/project'],
    ['/', '/'],
    ['\\\\server\\share\\ci\\project', '//server/share/ci/project'],
    ['//server/share/ci/project/', '//server/share/ci/project'],
  ]) {
    it(`normalizes ${input} to forward slashes without the host cwd`, () => {
      expect(normalizeProjectRoot(input)).toBe(expected);
    });
  }
  for (const root of [
    'C:',
    'C:project',
    'project',
    '../project',
    '\\ci\\project',
    '\\\\?\\C:\\ci',
  ]) {
    it(`rejects an ambiguous or device root: ${root}`, () => {
      expect(() => normalizeProjectRoot(root)).toThrow();
    });
  }
  for (const [root, file, relative] of [
    ['C:/CI/Project', 'c:/ci/project/src/a.ts', 'src/a.ts'],
    ['C:/ci/project', 'C:\\ci\\project\\src\\a.ts', 'src/a.ts'],
    ['C:/ci/project', 'src\\a.ts', 'src/a.ts'],
    ['C:/CI/Prójèct 空', 'C:/CI/Prójèct 空/src/ä.ts', 'src/ä.ts'],
    ['//server/share/project', '//SERVER/SHARE/project/src/a.ts', 'src/a.ts'],
    ['/ci/project', '/ci/project/src/a.ts', 'src/a.ts'],
    ['/ci/project', './src/sub/../a.ts', 'src/a.ts'],
    ['/ci/project', '/CI/project/src/a.ts', undefined],
    ['C:/ci/project', 'D:/ci/project/src/a.ts', undefined],
    ['C:/ci/project', 'C:/ci/project-other/a.ts', undefined],
    ['C:/ci/project', 'C:a.ts', undefined],
    ['C:/ci/project', '/ci/project/a.ts', undefined],
    ['/ci/project', 'C:/ci/project/a.ts', undefined],
    ['/ci/project', '../outside.ts', undefined],
    ['C:/ci/project', '..\\outside.ts', undefined],
  ]) {
    it(`bounds ${file} inside ${root}`, () => {
      expect(relativeProjectPath(file!, root!)).toBe(relative);
    });
  }
  for (const [recorded, physical, platform, expected] of [
    ['C:/ci/project', '/tmp/sqaa', 'linux', '/tmp/sqaa'],
    ['C:/ci/project', '/tmp/sqaa', 'darwin', '/tmp/sqaa'],
    ['/home/ci/project', 'D:/sqaa', 'win32', 'D:/sqaa'],
    ['C:/ci/project', 'D:/sqaa', 'win32', 'C:/ci/project'],
    ['/ci/project', '/tmp/sqaa', 'linux', '/ci/project'],
    ['//server/share/project', '/tmp/sqaa', 'linux', '/tmp/sqaa'],
    ['//server/share/project', 'D:/sqaa', 'win32', '//server/share/project'],
  ]) {
    it(`selects a replay root for ${recorded} on ${platform}`, () => {
      expect(replayProjectRoot(recorded, physical, platform as NodeJS.Platform)).toBe(expected);
    });
  }
});
