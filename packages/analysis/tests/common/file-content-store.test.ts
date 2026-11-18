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
import { beforeEach, describe, it } from 'node:test';
import { expect } from 'expect';
import ts from 'typescript';
import { fileContentStore } from '../../src/common/file-content-store.js';
import { SourceFileStore } from '../../src/file-stores/source-files.js';
import { createConfiguration } from '../../src/common/configuration.js';
import { createAnalyzableFiles } from '../../src/projectAnalysis.js';
import { normalizeToAbsolutePath } from '../../../shared/src/helpers/files.js';
import { IncrementalCompilerHost } from '../../src/jsts/program/compilerHost.js';
import {
  clearSourceFileContentCache,
  setSourceFilesContext,
} from '../../src/jsts/program/cache/sourceFileCache.js';
import {
  clearTsConfigContentCache,
  getTsConfigContentCache,
} from '../../src/jsts/program/cache/tsconfigCache.js';

const baseDir = normalizeToAbsolutePath('/project');
const path = normalizeToAbsolutePath('/project/tsconfig.json');

describe('shared file contents', () => {
  beforeEach(clearSourceFileContentCache);

  it('serves edits through every view without replacing file metadata or object identities', async () => {
    const files = createAnalyzableFiles();
    const file = (files[path] = {
      filePath: path,
      fileContent: '{}',
      fileType: 'MAIN',
      ruleFileType: 'MAIN',
      fileStatus: 'CHANGED',
    });
    const store = new SourceFileStore();
    await store.isInitialized(createConfiguration({ baseDir }), files);
    setSourceFilesContext(store.context);
    const host = new IncrementalCompilerHost({}, baseDir);
    const configs = getTsConfigContentCache();
    configs.set(path, { contents: '{}', missing: false });
    expect(store.getFile(path)).toBe(file);

    configs.set(path, { contents: '{"compilerOptions":{}}', missing: false });
    expect(file.fileContent).toBe('{"compilerOptions":{}}');
    expect(host.readFile(path)).toBe(file.fileContent);

    file.fileContent = '';
    expect(configs.get(path)).toEqual({ contents: '', missing: false });
    expect(host.readFile(path)).toBe('');
    expect(fileContentStore.get(path)).toBe('');
    expect(JSON.parse(JSON.stringify(file))).toEqual({ ...file, fileContent: '' });
    expect(store.getFiles()).toBe(files);
  });

  it('caches dependency contents without adding analysis roots', async () => {
    const store = new SourceFileStore();
    const files = createAnalyzableFiles();
    await store.isInitialized(createConfiguration({ baseDir }), files);
    setSourceFilesContext(store.context);
    const dependency = normalizeToAbsolutePath('/project/node_modules/pkg/index.ts');
    fileContentStore.set(dependency, 'export const value = 42;');
    const host = new IncrementalCompilerHost({}, baseDir);
    expect(host.getSourceFile(dependency, ts.ScriptTarget.ESNext)?.text).toContain('42');
    expect(store.getFile(dependency)).toBeUndefined();
    expect(store.getFiles()).toEqual({});
  });

  it('does not expose a missing TSConfig sentinel as an existing source file', () => {
    getTsConfigContentCache().set(path, { contents: '{}', missing: true });
    expect(getTsConfigContentCache().get(path)).toEqual({ contents: '{}', missing: true });
    expect(fileContentStore.has(path)).toBe(false);
    clearSourceFileContentCache();
    expect(getTsConfigContentCache().get(path)).toBeUndefined();
  });

  it('reloads a TSConfig after invalidation while preserving other shared contents', () => {
    const other = '/project/dependency.ts';
    fileContentStore.set(other, 'export {};');
    const original = { fileContent: '{}' };
    fileContentStore.register(path, original);
    getTsConfigContentCache().set(path, { contents: '{}', missing: false });
    clearTsConfigContentCache();
    fileContentStore.set(path, '{"files":[]}');
    fileContentStore.register(path, { fileContent: '{"files":[]}' });
    expect(fileContentStore.get(path)).toBe('{"files":[]}');
    expect(original.fileContent).toBe('{}');
    expect(fileContentStore.get(other)).toBe('export {};');
  });

  it('shares contents between different File objects for the same path', () => {
    const first = { fileContent: 'first' };
    const second = { fileContent: 'second' };
    fileContentStore.register(path, first);
    fileContentStore.register(path, second);
    expect(first.fileContent).toBe('second');
    first.fileContent = '';
    expect(second.fileContent).toBe('');
    expect(fileContentStore.get(path)).toBe('');
    fileContentStore.clear();
    expect(first.fileContent).toBe('');
    fileContentStore.register(path, second);
    second.fileContent = 'next';
    expect(fileContentStore.get(path)).toBe('next');
  });

  it('does not retain filesystem traces in production hosts', () => {
    fileContentStore.set(path, '{}');
    const host = new IncrementalCompilerHost({}, baseDir);
    host.readFile(path);
    host.fileExists(path);
    expect(host.getTrackedFsCalls()).toEqual([]);
  });
});
