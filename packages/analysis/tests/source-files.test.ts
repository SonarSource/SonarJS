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
import { afterEach, beforeEach, describe, it } from 'node:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { expect } from 'expect';
import { join } from 'node:path/posix';
import {
  dependencyManifestStore,
  initFileStores,
  initFileStoresForAnalysis,
  sourceFileStore,
  tsConfigStore,
} from '../src/file-stores/index.js';
import { createConfiguration, type ConfigurationInput } from '../src/common/configuration.js';
import type { FileType } from '../src/contracts/file.js';
import { sanitizeInputFiles } from '../src/common/input-sanitize.js';
import {
  normalizePath,
  normalizeToAbsolutePath,
  type File,
  type NormalizedAbsolutePath,
} from '../../shared/src/helpers/files.js';
import { UNINITIALIZED_ERROR } from '../src/file-stores/source-files.js';

const fixtures = join(import.meta.dirname, 'fixtures-source-files');

describe('files', () => {
  beforeEach(() => {
    sourceFileStore.clearCache();
  });
  it('should crash getting files before initializing', async () => {
    expect(() => sourceFileStore.getFiles()).toThrow(new Error(UNINITIALIZED_ERROR));
  });

  it('should return the files', async () => {
    const baseDir = normalizeToAbsolutePath(join(fixtures, 'paths'));
    const configuration = createConfiguration({ baseDir });
    await initFileStores(configuration);
    expect(Object.keys(sourceFileStore.getFiles()).length).toEqual(2);
  });

  it('should properly classify files as MAIN or TEST', async () => {
    const baseDir = normalizeToAbsolutePath(join(fixtures, 'paths'));
    const file1 = normalizePath(join(baseDir, 'file.ts'));
    const file2 = normalizePath(join(baseDir, 'subfolder', 'index.ts'));
    const configuration = createConfiguration({
      baseDir,
      tests: ['subfolder'],
    });
    await initFileStores(configuration);
    expect(sourceFileStore.getFiles()).toMatchObject({
      [file1]: {
        fileType: 'MAIN',
        ruleFileType: 'MAIN',
      },
      [file2]: {
        fileType: 'TEST',
        ruleFileType: 'TEST',
      },
    });
  });

  it('should rebuild the directory index from input files on each analysis', async () => {
    const baseDir = normalizeToAbsolutePath('/project');
    const configuration = createConfiguration({ baseDir, canAccessFileSystem: false });

    const { files: firstInputFiles } = await sanitizeInputFiles(
      {
        first: {
          filePath: '/project/src/first.ts',
          fileContent: 'export const first = true;\n',
        },
      },
      configuration,
    );
    await sourceFileStore.isInitialized(configuration, firstInputFiles);
    expect([
      ...sourceFileStore.getFilesInDirectory(normalizeToAbsolutePath('/project/src'))!,
    ]).toEqual(['first.ts']);

    const { files: secondInputFiles } = await sanitizeInputFiles(
      {
        second: {
          filePath: '/project/src/second.ts',
          fileContent: 'export const second = true;\n',
        },
      },
      configuration,
    );
    await sourceFileStore.isInitialized(configuration, secondInputFiles);

    expect([
      ...sourceFileStore.getFilesInDirectory(normalizeToAbsolutePath('/project/src'))!,
    ]).toEqual(['second.ts']);
  });

  it('should promote shared walk files using the file types cached by wantsFile', async () => {
    const baseDir = normalizeToAbsolutePath('/project');
    const configuration = createConfiguration({ baseDir });
    const file: File = {
      filePath: normalizeToAbsolutePath('/project/src/app.test.js'),
      fileContent: 'console.log("shared");\n',
    };

    sourceFileStore.setup(configuration);
    expect(sourceFileStore.wantsFile(file.filePath, configuration)).toBe('content');
    await sourceFileStore.processFile(file.filePath, configuration, file);

    const storedFile = sourceFileStore.getFiles()[file.filePath];
    expect(storedFile).toBe(file);
    expect(storedFile).toMatchObject({
      filePath: file.filePath,
      fileContent: file.fileContent,
      fileType: 'MAIN',
      ruleFileType: 'TEST',
      fileStatus: 'SAME',
    });
  });

  it('should resolve file types when processing a file without cached walk state', async () => {
    const baseDir = normalizeToAbsolutePath('/project');
    const configuration = createConfiguration({ baseDir });
    const file: File = {
      filePath: normalizeToAbsolutePath('/project/src/app.test.js'),
      fileContent: 'console.log("shared");\n',
    };

    sourceFileStore.setup(configuration);
    await sourceFileStore.processFile(file.filePath, configuration, file);

    const storedFile = sourceFileStore.getFiles()[file.filePath];
    expect(storedFile).toBe(file);
    expect(storedFile).toMatchObject({
      filePath: file.filePath,
      fileContent: file.fileContent,
      fileType: 'MAIN',
      ruleFileType: 'TEST',
      fileStatus: 'SAME',
    });
  });
});

describe('filesystem source selection', () => {
  const sourceRoot = 'packages/app/src';
  const testRoot = 'packages/app/tests';
  const mainFile = `${sourceRoot}/main.ts`;
  const nestedFile = `${sourceRoot}/nested/other.ts`;
  const jsFile = `${sourceRoot}/legacy.js`;
  const testFile = `${testRoot}/main.spec.ts`;
  const fixtureFile = `${testRoot}/fixtures/ignored.ts`;
  let baseDir: NormalizedAbsolutePath;

  beforeEach(async () => {
    baseDir = normalizeToAbsolutePath(await mkdtemp(join(tmpdir(), 'sonarjs-source-scope-')));
    const files = {
      [mainFile]: 'export const answer = 42;',
      [nestedFile]: 'export const other = 1;',
      [jsFile]: 'export const legacy = true;',
      [testFile]: 'export const test = true;',
      [fixtureFile]: 'export const fixture = true;',
      'packages/other/src/unselected.ts': 'export const unselected = true;',
      'package.json': '{}',
      'tsconfig.json': '{}',
      'tools/package.json': '{}',
      'tools/tsconfig.json': '{}',
    };
    await Promise.all(
      Object.entries(files).map(async ([relativePath, content]) => {
        const filePath = join(baseDir, relativePath);
        await mkdir(join(filePath, '..'), { recursive: true });
        await writeFile(filePath, content);
      }),
    );
  });

  afterEach(async () => {
    await rm(baseDir, { recursive: true, force: true });
  });

  const cases: {
    name: string;
    configuration: Omit<ConfigurationInput, 'baseDir'>;
    expected: Record<string, FileType>;
  }[] = [
    {
      name: 'discovers files under a nested source root',
      configuration: { sources: [sourceRoot] },
      expected: { [mainFile]: 'MAIN', [nestedFile]: 'MAIN', [jsFile]: 'MAIN' },
    },
    {
      name: 'discovers files under a nested test root',
      configuration: {
        sources: ['absent'],
        tests: [testRoot],
        testExclusions: ['**/fixtures/**'],
      },
      expected: { [testFile]: 'TEST' },
    },
    {
      name: 'discovers a file configured as a source path',
      configuration: { sources: [mainFile] },
      expected: { [mainFile]: 'MAIN' },
    },
    {
      name: 'applies source inclusions to files without excluding their parent directories',
      configuration: { sources: [sourceRoot], inclusions: ['**/*.ts'] },
      expected: { [mainFile]: 'MAIN', [nestedFile]: 'MAIN' },
    },
    {
      name: 'applies test inclusions to files without excluding their parent directories',
      configuration: { sources: ['absent'], tests: [testRoot], testInclusions: ['**/*.spec.ts'] },
      expected: { [testFile]: 'TEST' },
    },
    {
      name: 'applies source and test exclusions independently',
      configuration: {
        sources: ['packages/app'],
        tests: [testRoot],
        exclusions: ['**/nested/**', '**/tests/**'],
        testExclusions: ['**/fixtures/**'],
      },
      expected: { [mainFile]: 'MAIN', [jsFile]: 'MAIN', [testFile]: 'TEST' },
    },
  ];

  for (const { name, configuration, expected } of cases) {
    it(name, async () => {
      await initFileStoresForAnalysis(createConfiguration({ baseDir, ...configuration }));

      const expectedFiles = Object.fromEntries(
        Object.entries(expected).map(([filePath, fileType]) => [
          normalizeToAbsolutePath(filePath, baseDir),
          fileType,
        ]),
      );
      const actualFiles = Object.fromEntries(
        Object.entries(sourceFileStore.getFiles()).map(([filePath, file]) => [
          filePath,
          file.fileType,
        ]),
      );
      expect(actualFiles).toEqual(expectedFiles);
    });
  }

  it('discovers tsconfigs and package manifests outside the source scope', async () => {
    await initFileStoresForAnalysis(createConfiguration({ baseDir, sources: [sourceRoot] }));

    expect([...dependencyManifestStore.getPackageJsons().keys()].sort()).toEqual(
      [baseDir, normalizeToAbsolutePath('tools', baseDir)].sort(),
    );
    expect(tsConfigStore.getTsConfigs().slice().sort()).toEqual(
      ['tsconfig.json', 'tools/tsconfig.json']
        .map(filePath => normalizeToAbsolutePath(filePath, baseDir))
        .sort(),
    );
  });

  it('preserves explicit input files independently of filesystem source selection', async () => {
    const configuration = createConfiguration({ baseDir, sources: ['absent'] });
    const { files } = await sanitizeInputFiles(
      {
        main: {
          filePath: normalizeToAbsolutePath(mainFile, baseDir),
          fileContent: 'export const answer = 42;',
          fileType: 'MAIN',
        },
      },
      configuration,
    );

    await initFileStoresForAnalysis(configuration, files);

    expect(sourceFileStore.getFiles()).toBe(files);
    expect(Object.keys(sourceFileStore.getFiles())).toEqual([
      normalizeToAbsolutePath(mainFile, baseDir),
    ]);
  });
});
