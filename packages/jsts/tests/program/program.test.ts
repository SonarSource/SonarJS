/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
import path from 'path';
import ts, { ModuleKind, ScriptTarget } from 'typescript';
import { isRoot, toUnixPath } from '../../src/rules/helpers/index.js';
import { describe, it, type Mock } from 'node:test';
import { expect } from 'expect';
import {
  createAndSaveProgram,
  createProgram,
  createProgramOptions,
  deleteProgram,
  getProgramById,
  isRootNodeModules,
} from '../../src/program/program.js';

describe('program', () => {
  it('should create a program', () => {
    const fixtures = path.join(import.meta.dirname, 'fixtures');
    const reference = path.join(fixtures, 'reference');
    const tsConfig = path.join(fixtures, 'tsconfig.json');

    const { programId, files, projectReferences } = createAndSaveProgram(tsConfig);

    expect(programId).toBeDefined();
    expect(files).toContain(toUnixPath(path.join(fixtures, 'file.ts')));
    // behavior changed in TS 5.5, program will no longer include files from referenced projects
    expect(files).not.toContain(toUnixPath(path.join(reference, 'file.ts')));

    expect(projectReferences).toEqual([path.join(reference, 'tsconfig.json')]);
  });

  it('should skip missing reference of a program', () => {
    const fixtures = path.join(import.meta.dirname, 'fixtures');
    const tsConfig = path.join(fixtures, `tsconfig_missing_reference.json`);

    const { programId, files, projectReferences, missingTsConfig } = createAndSaveProgram(tsConfig);

    expect(programId).toBeDefined();
    expect(files).toEqual(expect.arrayContaining([toUnixPath(path.join(fixtures, 'file.ts'))]));
    expect(projectReferences).toEqual([]);
    expect(missingTsConfig).toBe(false);
  });

  it('should fail creating a program with a syntactically incorrect tsconfig', () => {
    const tsConfig = path.join(import.meta.dirname, 'fixtures', 'tsconfig.syntax.json');
    expect(() => createProgram(tsConfig)).toThrow();
  });

  it('should fail creating a program with a semantically incorrect tsconfig', () => {
    const tsConfig = path.join(import.meta.dirname, 'fixtures', 'tsconfig.semantic.json');
    expect(() => createProgram(tsConfig)).toThrow(/^Unknown compiler option 'targetSomething'./);
  });

  it('should still create a program when extended tsconfig does not exist', () => {
    const fixtures = path.join(import.meta.dirname, 'fixtures');
    const tsConfig = path.join(fixtures, 'tsconfig_missing.json');

    const { programId, files, projectReferences, missingTsConfig } = createAndSaveProgram(tsConfig);

    expect(programId).toBeDefined();
    expect(files).toEqual(expect.arrayContaining([toUnixPath(path.join(fixtures, 'file.ts'))]));
    expect(projectReferences).toEqual([]);
    expect(missingTsConfig).toBe(true);
  });

  it('On missing external tsconfig, Typescript should generate default compilerOptions', () => {
    const fixtures = path.join(import.meta.dirname, 'fixtures');
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
    const tsConfig = path.join(import.meta.dirname, 'fixtures', 'tsconfig_found.json');

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
  it('typescript tsconfig resolution should check all paths until root node_modules', ({
    mock,
  }) => {
    const configHost = {
      useCaseSensitiveFileNames: true,
      readDirectory: ts.sys.readDirectory,
      fileExists: mock.fn((_file: string) => {
        console.log(_file);
        return false;
      }),
      readFile: ts.sys.readFile,
    };

    const tsConfigMissing = path.join(import.meta.dirname, 'fixtures', 'tsconfig_missing.json');
    const searchedFiles: string[] = [];
    let searchFolder;

    let nodeModulesFolder = path.join(import.meta.dirname, 'fixtures');
    do {
      searchFolder = nodeModulesFolder;
      searchedFiles.push(path.join(searchFolder, 'package.json'));
      nodeModulesFolder = path.dirname(nodeModulesFolder);
    } while (!isRoot(searchFolder));

    nodeModulesFolder = path.join(import.meta.dirname, 'fixtures');
    do {
      searchFolder = path.join(nodeModulesFolder, 'node_modules', '@tsconfig', 'node_missing');
      searchedFiles.push(path.join(searchFolder, 'tsconfig.json', 'package.json'));
      searchedFiles.push(path.join(searchFolder, 'package.json'));
      searchedFiles.push(path.join(searchFolder, 'tsconfig.json'));
      searchedFiles.push(path.join(searchFolder, 'tsconfig.json.json'));
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

    const fileExistsMock = (configHost.fileExists as Mock<typeof configHost.fileExists>).mock;
    expect(parsedConfigFile.errors).not.toHaveLength(0);
    expect(fileExistsMock.calls.length).toEqual(searchedFiles.length);
    searchedFiles.forEach((file, index) => {
      expect(fileExistsMock.calls[index].arguments[0]).toEqual(toUnixPath(file));
    });
  });

  it('should find an existing program', () => {
    const fixtures = path.join(import.meta.dirname, 'fixtures');
    const tsConfig = path.join(fixtures, 'tsconfig.json');
    const { programId, files } = createAndSaveProgram(tsConfig);

    const program = getProgramById(programId);

    expect(program.getCompilerOptions().configFilePath).toEqual(toUnixPath(tsConfig));
    // behavior in TS 5.5 changed, program will no longer include files from referenced projects
    expect(program.getSourceFiles().map(s => s.fileName)).toEqual(
      expect.arrayContaining(
        files.map(toUnixPath).filter(file => file.startsWith(toUnixPath(fixtures))),
      ),
    );
  });

  it('should fail finding a non-existing program', () => {
    const programId = '$#&/()=?!£@~+°';
    expect(() => getProgramById(programId)).toThrow(`Failed to find program ${programId}`);
  });

  it('should delete a program', () => {
    const fixtures = path.join(import.meta.dirname, 'fixtures');
    const tsConfig = path.join(fixtures, 'tsconfig.json');
    const { programId } = createAndSaveProgram(tsConfig);

    deleteProgram(programId);
    expect(() => getProgramById(programId)).toThrow(`Failed to find program ${programId}`);
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
      `The 'files' list in config file '${path.resolve('tsconfig.json')}' is empty.`,
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
    const fixtures = toUnixPath(path.join(import.meta.dirname, 'fixtures'));
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
    const fixtures = path.join(import.meta.dirname, 'fixtures', 'vue');
    const tsConfig = path.join(fixtures, 'tsconfig.json');
    const result = createProgramOptions(tsConfig);
    expect(result).toEqual(
      expect.objectContaining({
        rootNames: expect.arrayContaining([toUnixPath(path.join(fixtures, 'file.vue'))]),
      }),
    );
  });

  it('should filter out JSON files on program creation', () => {
    const fixtures = toUnixPath(path.join(import.meta.dirname, 'fixtures', 'json'));
    const tsConfig = toUnixPath(path.join(fixtures, 'tsconfig.json'));
    const { files } = createProgram(tsConfig);
    expect(files.some(file => file.endsWith('.json'))).toBe(false);
  });

  it('should filter out node modules on program creation', () => {
    const fixtures = toUnixPath(path.join(import.meta.dirname, 'fixtures', 'node'));
    const tsConfig = toUnixPath(path.join(fixtures, 'tsconfig.json'));
    const { files } = createProgram(tsConfig);
    expect(files).toEqual([toUnixPath(path.join(fixtures, 'file.ts'))]);
  });
});
