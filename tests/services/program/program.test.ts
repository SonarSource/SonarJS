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
import {
  createProgram,
  createProgramOptions,
  getProgramForFile,
  isRootNodeModules,
} from 'services/program';
import { ProgramCache, ProjectTSConfigs, toUnixPath, TSConfig } from 'helpers';
import ts, { ModuleKind, ScriptTarget } from 'typescript';
import { awaitCleanUp } from '../../tools/helpers/wait-gc';
import { jsTsInput } from '../../tools';

jest.setTimeout(60000);

describe('program', () => {
  it('should create a program', () => {
    const fixtures = path.join(__dirname, 'fixtures');
    const reference = path.join(fixtures, 'reference');
    const tsConfig = path.join(fixtures, 'tsconfig.json');

    const { files, projectReferences } = createProgram(tsConfig);

    expect(files).toEqual(
      expect.arrayContaining([
        toUnixPath(path.join(fixtures, 'file.ts')),
        toUnixPath(path.join(reference, 'file.ts')),
      ]),
    );
    expect(projectReferences).toEqual([path.join(reference, 'tsconfig.json')]);
  });

  it('should skip missing reference of a program', () => {
    const fixtures = path.join(__dirname, 'fixtures');
    const tsConfig = path.join(fixtures, `tsconfig_missing_reference.json`);

    const { files, projectReferences, missingTsConfig } = createProgram(tsConfig);

    expect(files).toEqual(expect.arrayContaining([toUnixPath(path.join(fixtures, 'file.ts'))]));
    expect(projectReferences).toEqual([]);
    expect(missingTsConfig).toBe(false);
  });

  it('should fail creating a program with a syntactically incorrect tsconfig', () => {
    const tsConfig = path.join(__dirname, 'fixtures', 'tsconfig.syntax.json');
    expect(() => createProgram(tsConfig)).toThrow();
  });

  it('should fail creating a program with a semantically incorrect tsconfig', () => {
    const tsConfig = path.join(__dirname, 'fixtures', 'tsconfig.semantic.json');
    expect(() => createProgram(tsConfig)).toThrowError(
      /^Unknown compiler option 'targetSomething'./,
    );
  });

  it('should still create a program when extended tsconfig does not exist', () => {
    const fixtures = path.join(__dirname, 'fixtures');
    const tsConfig = path.join(fixtures, 'tsconfig_missing.json');

    const { files, projectReferences, missingTsConfig } = createProgram(tsConfig);

    expect(files).toEqual(expect.arrayContaining([toUnixPath(path.join(fixtures, 'file.ts'))]));
    expect(projectReferences).toEqual([]);
    expect(missingTsConfig).toBe(true);
  });

  it('On missing external tsconfig, Typescript should generate default compilerOptions', () => {
    const fixtures = path.join(__dirname, 'fixtures');
    const tsConfigMissing = path.join(fixtures, 'tsconfig_missing.json');

    const { options, missingTsConfig } = createProgramOptions(tsConfigMissing);

    expect(missingTsConfig).toBe(true);
    expect(options).toEqual({
      configFilePath: toUnixPath(path.join(fixtures, 'tsconfig_missing.json')),
      noEmit: true,
      allowNonTsExtensions: true,
    });
  });

  it('External tsconfig should provide expected compilerOptions', () => {
    const tsConfig = path.join(__dirname, 'fixtures', 'tsconfig_found.json');

    const { options, missingTsConfig } = createProgramOptions(tsConfig);

    expect(missingTsConfig).toBe(false);
    expect(options).toBeDefined();
    expect(options.target).toBe(ScriptTarget['ES2020']);
    expect(options.module).toBe(ModuleKind['CommonJS']);
  });

  /**
   * Empty tsconfig.json fallback relies on Typescript resolution logic. This unit test
   * asserts typescript resolution logic. If it changes, we will need to adapt our logic inside
   * program.ts (createProgramOptions in program.ts)
   */
  it('typescript tsconfig resolution should check all paths until root node_modules', () => {
    const configHost = {
      useCaseSensitiveFileNames: true,
      readDirectory: ts.sys.readDirectory,
      fileExists: jest.fn((_file: string) => false),
      readFile: ts.sys.readFile,
    };

    const tsConfigMissing = path.join(__dirname, 'fixtures', 'tsconfig_missing.json');
    const searchedFiles = [];
    let nodeModulesFolder = path.join(__dirname, 'fixtures');
    let searchFolder;
    do {
      searchFolder = path.join(nodeModulesFolder, 'node_modules', '@tsconfig', 'node_missing');
      searchedFiles.push(path.join(searchFolder, 'tsconfig.json', 'package.json'));
      searchedFiles.push(path.join(searchFolder, 'package.json'));
      searchedFiles.push(path.join(searchFolder, 'tsconfig.json'));
      searchedFiles.push(path.join(searchFolder, 'tsconfig.json', 'tsconfig.json'));
      nodeModulesFolder = path.dirname(nodeModulesFolder);
    } while (!isRootNodeModules(searchFolder));

    const config = ts.readConfigFile(tsConfigMissing, configHost.readFile);
    const parsedConfigFile = ts.parseJsonConfigFileContent(
      config.config,
      configHost,
      path.resolve(path.dirname(tsConfigMissing)),
      {
        noEmit: true,
      },
      tsConfigMissing,
    );

    expect(parsedConfigFile.errors).not.toHaveLength(0);
    expect(configHost.fileExists).toHaveBeenCalledTimes(searchedFiles.length);
    searchedFiles.forEach((file, index) => {
      expect(configHost.fileExists).toHaveBeenNthCalledWith(index + 1, toUnixPath(file));
    });
  });

  it('should return files', () => {
    const result = createProgramOptions('tsconfig.json', '{ "files": ["/foo/file.ts"] }');
    expect(result).toMatchObject({
      rootNames: ['/foo/file.ts'],
      projectReferences: undefined,
    });
  });

  it('should report errors', () => {
    expect(() => createProgramOptions('tsconfig.json', '{ "files": [] }')).toThrow(
      `The 'files' list in config file 'tsconfig.json' is empty.`,
    );
  });

  it('should return projectReferences', () => {
    const result = createProgramOptions(
      'tsconfig.json',
      '{ "files": [], "references": [{ "path": "foo" }] }',
    );
    const cwd = process.cwd().split(path.sep).join(path.posix.sep);
    expect(result).toMatchObject({
      rootNames: [],
      projectReferences: [expect.objectContaining({ path: `${cwd}/foo` })],
    });
  });

  it('jsonParse does not resolve imports, createProgram does', () => {
    const fixtures = toUnixPath(path.join(__dirname, 'fixtures'));
    const tsConfig = toUnixPath(path.join(fixtures, 'paths', 'tsconfig.json'));
    const mainFile = toUnixPath(path.join(fixtures, 'paths', 'file.ts'));
    const dependencyPath = toUnixPath(path.join(fixtures, 'paths', 'subfolder', 'index.ts'));
    let { rootNames: files } = createProgramOptions(tsConfig);
    expect(files).toContain(mainFile);
    expect(files).not.toContain(dependencyPath);

    files = createProgram(tsConfig).files;
    expect(files).toContain(mainFile);
    expect(files).toContain(dependencyPath);
  });

  it('should return Vue files', () => {
    const fixtures = path.join(__dirname, 'fixtures', 'vue');
    const tsConfig = path.join(fixtures, 'tsconfig.json');
    const result = createProgramOptions(tsConfig);
    expect(result).toEqual(
      expect.objectContaining({
        rootNames: expect.arrayContaining([toUnixPath(path.join(fixtures, 'file.vue'))]),
      }),
    );
  });

  it('getProgramFromFile creates Program using tsconfig.json', async () => {
    const fixtures = toUnixPath(path.join(__dirname, 'fixtures', 'paths'));
    const cache = new ProgramCache(2);
    const tsconfigs = new ProjectTSConfigs(fixtures);
    const tsConfig = toUnixPath(path.join(fixtures, 'tsconfig.json'));
    const mainFile = toUnixPath(path.join(fixtures, 'file.ts'));
    const dependencyPath = toUnixPath(path.join(fixtures, 'subfolder', 'index.ts'));

    const program = getProgramForFile(await jsTsInput({ filePath: mainFile }), cache, tsconfigs);
    expect(program).toBeDefined();
    expect(cache.programs.get(tsConfig)).toBeDefined();
    expect(cache.programs.get(tsConfig).files).toContain(dependencyPath);
    expect(cache.programs.get(tsConfig).files).toContain(mainFile);
  });

  // skipping due to indeterminism. See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/FinalizationRegistry#avoid_where_possible
  it.skip('cache should only contain 2 elements and GC should clean up old programs', async () => {
    const cache = new ProgramCache(2);
    const file1Path = toUnixPath(path.join(__dirname, 'fixtures', 'file1.js'));
    const file2Path = toUnixPath(path.join(__dirname, 'fixtures', 'file2.js'));
    const file3Path = toUnixPath(path.join(__dirname, 'fixtures', 'file3.js'));
    const fakeTsConfig1 = `tsconfig-${toUnixPath(file1Path)}.json`;
    const fakeTsConfig2 = `tsconfig-${toUnixPath(file2Path)}.json`;
    const fakeTsConfig3 = `tsconfig-${toUnixPath(file3Path)}.json`;

    getProgramForFile(await jsTsInput({ filePath: file1Path }), cache);
    expect(cache.programs.has(fakeTsConfig1)).toBeTruthy();
    expect(cache.programs.get(fakeTsConfig1).files).toContain(file1Path);

    expect(cache.lru.get()).toContain(cache.programs.get(fakeTsConfig1).program.deref());
    expect(cache.lru.get().indexOf(cache.programs.get(fakeTsConfig1).program.deref())).toEqual(0);

    getProgramForFile(await jsTsInput({ filePath: file2Path }), cache);
    expect(cache.programs.has(fakeTsConfig2)).toBeTruthy();
    expect(cache.programs.get(fakeTsConfig2).files).toContain(file2Path);

    expect(cache.lru.get()).toContain(cache.programs.get(fakeTsConfig1).program.deref());
    expect(cache.lru.get().indexOf(cache.programs.get(fakeTsConfig1).program.deref())).toEqual(0);
    expect(cache.lru.get()).toContain(cache.programs.get(fakeTsConfig2).program.deref());
    expect(cache.lru.get().indexOf(cache.programs.get(fakeTsConfig2).program.deref())).toEqual(1);

    getProgramForFile(await jsTsInput({ filePath: file1Path }), cache);

    expect(cache.lru.get().indexOf(cache.programs.get(fakeTsConfig1).program.deref())).toEqual(1);
    expect(cache.lru.get().indexOf(cache.programs.get(fakeTsConfig2).program.deref())).toEqual(0);

    getProgramForFile(await jsTsInput({ filePath: file3Path }), cache);
    expect(cache.programs.has(fakeTsConfig3)).toBeTruthy();
    expect(cache.programs.get(fakeTsConfig3).files).toContain(file3Path);

    expect(cache.lru.get()).not.toContain(cache.programs.get(fakeTsConfig2).program.deref());
    expect(cache.lru.get()).toContain(cache.programs.get(fakeTsConfig1).program.deref());
    expect(cache.lru.get().indexOf(cache.programs.get(fakeTsConfig1).program.deref())).toEqual(0);
    expect(cache.lru.get()).toContain(cache.programs.get(fakeTsConfig3).program.deref());
    expect(cache.lru.get().indexOf(cache.programs.get(fakeTsConfig3).program.deref())).toEqual(1);

    await awaitCleanUp(cache.programs.get(fakeTsConfig2).program.deref());
    expect(cache.programs.get(fakeTsConfig2).program.deref()).toBeUndefined();

    getProgramForFile(await jsTsInput({ filePath: file2Path }), cache);
    expect(cache.lru.get().indexOf(cache.programs.get(fakeTsConfig2).program.deref())).toEqual(1);
    expect(cache.lru.get().indexOf(cache.programs.get(fakeTsConfig3).program.deref())).toEqual(0);
  });

  it('changing tsconfig contents should trigger program creation', async () => {
    const cache = new ProgramCache();
    const tsconfigs = new ProjectTSConfigs();
    const file1Path = toUnixPath(path.join(__dirname, 'fixtures', 'file1.js'));
    const file2Path = toUnixPath(path.join(__dirname, 'fixtures', 'file2.js'));
    const tsconfigPath = 'tsconfig.json';
    const tsconfig: TSConfig = {
      filename: 'tsconfig.json',
      contents: JSON.stringify({
        files: [file1Path],
      }),
    };
    tsconfigs.db.set(tsconfigPath, tsconfig);

    getProgramForFile(await jsTsInput({ filePath: file1Path }), cache, tsconfigs);
    expect(cache.programs.get(tsconfigPath)).toBeDefined();
    expect(cache.programs.get(tsconfigPath).files).toContain(file1Path);
    expect(cache.programs.get(tsconfigPath).files).not.toContain(file2Path);
    expect(cache.lru.get().length).toEqual(1);

    tsconfig.contents = JSON.stringify({
      files: [file1Path, file2Path],
    });
    cache.clear();

    getProgramForFile(await jsTsInput({ filePath: file1Path }), cache, tsconfigs);
    expect(cache.programs.get(tsconfigPath)).toBeDefined();
    expect(cache.programs.get(tsconfigPath).files).toContain(file1Path);
    expect(cache.programs.get(tsconfigPath).files).toContain(file2Path);
    expect(cache.lru.get().length).toEqual(1);
  });

  it('should not find top dependencies if we limit lookup', async () => {
    const fixtures = toUnixPath(path.join(__dirname, 'fixtures', 'paths'));
    const tsconfigs = new ProjectTSConfigs(fixtures);
    const cacheLimitingResolution = new ProgramCache();
    const filePath = toUnixPath(path.join(__dirname, 'fixtures', 'paths', 'file.ts'));
    process.env['SONARJS_LIMIT_DEPS_RESOLUTION'] = '1';
    const input = await jsTsInput({ filePath: filePath });
    getProgramForFile(input, cacheLimitingResolution, tsconfigs);

    process.env['SONARJS_LIMIT_DEPS_RESOLUTION'] = '0';
    const cacheUnlimitedResolution = new ProgramCache();
    getProgramForFile(input, cacheUnlimitedResolution, tsconfigs);
    expect(cacheUnlimitedResolution.programs.values().next().value.files.length).toBeGreaterThan(
      cacheLimitingResolution.programs.values().next().value.files.length,
    );
  });
});
