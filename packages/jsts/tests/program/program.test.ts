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
import path from 'node:path/posix';
import ts, { ModuleKind, ScriptTarget } from 'typescript';
import { isRoot, toUnixPath } from '../../src/rules/helpers/index.js';
import { describe, it, type Mock } from 'node:test';
import { expect } from 'expect';
import {
  createProgramOptions,
  createStandardProgram,
  sanitizeProgramReferences,
} from '../../src/program/index.js';
import { isRootNodeModules } from '../../src/program/tsconfig/utils.js';

describe('program', () => {
  it('should create a program', () => {
    const fixtures = path.join(toUnixPath(import.meta.dirname), 'fixtures');
    const reference = path.join(fixtures, 'reference');
    const tsConfig = path.join(fixtures, 'tsconfig.json');

    const programOptions = createProgramOptions(tsConfig);
    const program = createStandardProgram(programOptions);
    const files = program.getSourceFiles().map(f => f.fileName);

    expect(program).toBeDefined();
    expect(files).toContain(toUnixPath(path.join(fixtures, 'file.ts')));
    // behavior changed in TS 5.5, program will no longer include files from referenced projects
    expect(files).not.toContain(toUnixPath(path.join(reference, 'file.ts')));

    expect(sanitizeProgramReferences(program)).toEqual([path.join(reference, 'tsconfig.json')]);
  });

  it('should skip missing reference of a program', () => {
    const fixtures = path.join(toUnixPath(import.meta.dirname), 'fixtures');
    const tsConfig = path.join(fixtures, `tsconfig_missing_reference.json`);

    const programOptions = createProgramOptions(tsConfig);
    const program = createStandardProgram(programOptions);

    expect(program).toBeDefined();
    expect(program.getSourceFiles().map(f => f.fileName)).toEqual(
      expect.arrayContaining([toUnixPath(path.join(fixtures, 'file.ts'))]),
    );
    expect(sanitizeProgramReferences(program)).toEqual([]);
    expect(programOptions.missingTsConfig).toBe(false);
  });

  it('should fail creating a program with a syntactically incorrect tsconfig', () => {
    const tsConfig = path.join(toUnixPath(import.meta.dirname), 'fixtures', 'tsconfig.syntax.json');
    expect(() => createProgramOptions(tsConfig)).toThrow();
  });

  it('should fail creating a program with a semantically incorrect tsconfig', () => {
    const tsConfig = path.join(
      toUnixPath(import.meta.dirname),
      'fixtures',
      'tsconfig.semantic.json',
    );
    expect(() => createProgramOptions(tsConfig)).toThrow(
      /^Unknown compiler option 'targetSomething'./,
    );
  });

  it('should still create a program when extended tsconfig does not exist', () => {
    const fixtures = path.join(toUnixPath(import.meta.dirname), 'fixtures');
    const tsConfig = path.join(fixtures, 'tsconfig_missing.json');

    const programOptions = createProgramOptions(tsConfig);
    const program = createStandardProgram(programOptions);

    expect(program).toBeDefined();
    expect(program.getSourceFiles().map(f => f.fileName)).toEqual(
      expect.arrayContaining([toUnixPath(path.join(fixtures, 'file.ts'))]),
    );
    expect(sanitizeProgramReferences(program)).toEqual([]);
    expect(programOptions.missingTsConfig).toBe(true);
  });

  it('On missing external tsconfig, Typescript should generate default compilerOptions', () => {
    const fixtures = path.join(toUnixPath(import.meta.dirname), 'fixtures');
    const tsConfigMissing = path.join(fixtures, 'tsconfig_missing.json');

    const programOptions = createProgramOptions(tsConfigMissing);
    expect(programOptions.options).toEqual({
      configFilePath: toUnixPath(path.join(fixtures, 'tsconfig_missing.json')),
      noEmit: true,
      allowNonTsExtensions: true,
    });
    expect(programOptions.missingTsConfig).toBe(true);
  });

  it('External tsconfig should provide expected compilerOptions', () => {
    const tsConfig = path.join(toUnixPath(import.meta.dirname), 'fixtures', 'tsconfig_found.json');

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

    const tsConfigMissing = path.join(
      toUnixPath(import.meta.dirname),
      'fixtures',
      'tsconfig_missing.json',
    );
    const searchedFiles: string[] = [];
    let searchFolder;

    let nodeModulesFolder = path.join(toUnixPath(import.meta.dirname), 'fixtures');
    do {
      searchFolder = nodeModulesFolder;
      searchedFiles.push(path.join(searchFolder, 'package.json'));
      nodeModulesFolder = path.dirname(nodeModulesFolder);
    } while (!isRoot(searchFolder));

    nodeModulesFolder = path.join(toUnixPath(import.meta.dirname), 'fixtures');
    do {
      searchFolder = path.join(nodeModulesFolder, 'node_modules', '@tsconfig', 'node_missing');
      searchedFiles.push(
        path.join(searchFolder, 'tsconfig.json', 'package.json'),
        path.join(searchFolder, 'package.json'),
        path.join(searchFolder, 'tsconfig.json'),
        path.join(searchFolder, 'tsconfig.json.json'),
        path.join(searchFolder, 'tsconfig.json', 'tsconfig.json'),
      );
      nodeModulesFolder = path.dirname(nodeModulesFolder);
    } while (!isRootNodeModules(searchFolder));

    const config = ts.readConfigFile(tsConfigMissing, configHost.readFile);
    const parsedConfigFile = ts.parseJsonConfigFileContent(
      config.config,
      configHost,
      path.dirname(tsConfigMissing),
      {
        noEmit: true,
      },
      tsConfigMissing,
    );

    const fileExistsMock = (configHost.fileExists as Mock<typeof configHost.fileExists>).mock;
    expect(parsedConfigFile.errors).not.toHaveLength(0);
    expect(fileExistsMock.calls.length).toEqual(searchedFiles.length);
    for (const [index, file] of searchedFiles.entries()) {
      expect(fileExistsMock.calls[index].arguments[0]).toEqual(toUnixPath(file));
    }
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
    expect(result).toMatchObject({
      rootNames: [],
      projectReferences: [expect.objectContaining({ path: `foo` })],
    });
  });

  it('jsonParse does not resolve imports, createProgram does', () => {
    const fixtures = toUnixPath(path.join(toUnixPath(import.meta.dirname), 'fixtures'));
    const tsConfig = toUnixPath(path.join(fixtures, 'paths', 'tsconfig.json'));
    const mainFile = toUnixPath(path.join(fixtures, 'paths', 'file.ts'));
    const dependencyPath = toUnixPath(path.join(fixtures, 'paths', 'subfolder', 'index.ts'));
    let { rootNames: files } = createProgramOptions(tsConfig);
    expect(files).toContain(mainFile);
    expect(files).not.toContain(dependencyPath);

    const programOptions = createProgramOptions(tsConfig);
    const program = createStandardProgram(programOptions);
    files = program.getSourceFiles().map(f => f.fileName);
    expect(files).toContain(mainFile);
    expect(files).toContain(dependencyPath);
  });

  it('should return Vue files', () => {
    const fixtures = path.join(toUnixPath(import.meta.dirname), 'fixtures', 'vue');
    const tsConfig = path.join(fixtures, 'tsconfig.json');
    const result = createProgramOptions(tsConfig);
    expect(result).toEqual(
      expect.objectContaining({
        rootNames: expect.arrayContaining([toUnixPath(path.join(fixtures, 'file.vue'))]),
      }),
    );
  });
});
