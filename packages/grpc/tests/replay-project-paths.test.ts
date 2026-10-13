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
import { ReplayProjectPaths } from '../src/replay-project-paths.js';
import type { AnalyzeProjectProtoRequest } from '../src/analyze-project-request.js';
import { normalizeToAbsolutePath } from '../../shared/src/helpers/files.js';

describe('ReplayProjectPaths', () => {
  const logicalRoot = normalizeToAbsolutePath('/original/ci');
  const physicalRoot = normalizeToAbsolutePath('/physical/workspace');

  function request(): AnalyzeProjectProtoRequest {
    return {
      configuration: { baseDir: physicalRoot, sources: ['request-src'] },
      files: { 'src/file.ts': { fileContent: '' } },
      bundles: ['rules/bundle.js'],
      rulesWorkdir: 'rules',
      filesystemCache: {},
    };
  }

  for (const foreignRoot of ['C:/CI/Project', '/home/ci/project', '//server/share/project']) {
    it(`maps logical ${foreignRoot} to native replay and back to the original response key`, () => {
      const input = request();
      input.configuration!.baseDir = foreignRoot;
      input.filesystemCache!.fallbackBaseDir = physicalRoot;
      const key = `${foreignRoot}/src/file.ts`;
      input.files = { [key]: { fileContent: '' } };
      const paths = new ReplayProjectPaths(input);
      paths.useRecordedBaseDir(physicalRoot);
      expect(input.configuration!.baseDir).toBe(physicalRoot);
      expect(input.files).toEqual({ [`${physicalRoot}/src/file.ts`]: { fileContent: '' } });
      expect(input.bundles).toEqual([`${physicalRoot}/rules/bundle.js`]);
      const map = new Map<string, string>();
      paths.restoreResponsePaths(map);
      expect(map.get(`${physicalRoot}/src/file.ts`)).toBe(key);
      paths.restoreSourceOnlyRequest();
      expect(input.filesystemCache).toBeUndefined();
      expect(input.files).toEqual({ [`${physicalRoot}/src/file.ts`]: { fileContent: '' } });
    });
  }

  it('canonicalizes Windows file casing without changing the submitted response key', () => {
    const input = request();
    input.configuration!.baseDir = 'C:/CI/Project';
    input.filesystemCache!.fallbackBaseDir = physicalRoot;
    input.files = { 'c:/ci/project/SRC/main.ts': { fileContent: 'new contents' } };
    const paths = new ReplayProjectPaths(input);
    paths.useRecordedBaseDir(physicalRoot, () =>
      normalizeToAbsolutePath('src/Main.ts', physicalRoot),
    );
    const map = new Map<string, string>();
    paths.restoreResponsePaths(map);
    expect(map.get(`${physicalRoot}/src/Main.ts`)).toBe('c:/ci/project/SRC/main.ts');
  });

  it('rejects aliases that would discard one submitted file', () => {
    const input = request();
    input.files = {
      'src/file.ts': { fileContent: 'one' },
      'src/./file.ts': { fileContent: 'two' },
    };
    expect(() => new ReplayProjectPaths(input).useRecordedBaseDir(logicalRoot)).toThrow(
      'Duplicate',
    );
  });

  it('keeps runtime paths physical and submitted empty contents authoritative', () => {
    const input = request();
    const paths = new ReplayProjectPaths(input);
    paths.useRecordedBaseDir(logicalRoot);
    expect(input.configuration!.baseDir).toBe(logicalRoot);
    expect(input.files).toEqual({ [`${logicalRoot}/src/file.ts`]: { fileContent: '' } });
    expect(input.bundles).toEqual([`${physicalRoot}/rules/bundle.js`]);
    expect(input.rulesWorkdir).toBe(`${physicalRoot}/rules`);
    const responsePaths = new Map<string, string>();
    paths.restoreResponsePaths(responsePaths);
    expect(responsePaths.get(`${logicalRoot}/src/file.ts`)).toBe('src/file.ts');
  });

  it('restores the physical namespace and request configuration after replay fallback', () => {
    const input = request();
    input.configuration!.baseDir = logicalRoot;
    input.filesystemCache!.fallbackBaseDir = physicalRoot;
    const paths = new ReplayProjectPaths(input);
    paths.useRecordedBaseDir(logicalRoot);
    input.configuration!.sources = ['/original/ci/recorded-src'];
    paths.restoreSourceOnlyRequest();
    expect(input.configuration).toEqual({
      baseDir: physicalRoot,
      sources: ['request-src'],
    });
    expect(input.files).toEqual({ [`${physicalRoot}/src/file.ts`]: { fileContent: '' } });
    expect(input.filesystemCache).toBeUndefined();
    const responsePaths = new Map<string, string>();
    paths.restoreResponsePaths(responsePaths);
    expect(responsePaths.get(`${physicalRoot}/src/file.ts`)).toBe('src/file.ts');
  });

  for (const file of ['../outside.ts', '/physical/outside.ts']) {
    it(`rejects a file outside the requested project: ${file}`, () => {
      const input = request();
      input.files = { [file]: { fileContent: 'value' } };
      expect(() => new ReplayProjectPaths(input).useRecordedBaseDir(logicalRoot)).toThrow(
        'outside',
      );
    });
  }

  it('rejects relocation without submitted contents', () => {
    const input = request();
    input.files = { 'src/file.ts': {} };
    expect(() => new ReplayProjectPaths(input).useRecordedBaseDir(logicalRoot)).toThrow('contents');
  });

  it('rejects a relative physical fallback root', () => {
    const input = request();
    input.filesystemCache!.fallbackBaseDir = '../other';
    expect(() => new ReplayProjectPaths(input)).toThrow('must be absolute');
  });
});
