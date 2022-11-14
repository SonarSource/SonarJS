/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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
  deleteProgram,
  getProgramById,
  isLastTsConfigCheck,
} from 'services/program';
import { addTsConfigIfMissing, toUnixPath } from 'helpers';
import ts from 'typescript';

describe('program', () => {
  it('should create a program', async () => {
    const fixtures = path.join(__dirname, 'fixtures');
    const reference = path.join(fixtures, `reference`);
    const tsConfig = path.join(fixtures, `tsconfig.json`);

    const { programId, files, projectReferences } = await createProgram(tsConfig);

    expect(programId).toBeDefined();
    expect(files).toEqual(
      expect.arrayContaining([
        toUnixPath(path.join(fixtures, 'file.ts')),
        toUnixPath(path.join(reference, 'file.ts')),
      ]),
    );
    expect(projectReferences).toEqual([addTsConfigIfMissing(toUnixPath(reference))]);
  });

  it('should fail creating a program with a syntactically incorrect tsconfig', async () => {
    const tsConfig = path.join(__dirname, 'fixtures', 'tsconfig.syntax.json');
    const error = await createProgram(tsConfig).catch(err => err);
    expect(error).toBeInstanceOf(Error);
  });

  it('should fail creating a program with a semantically incorrect tsconfig', async () => {
    const tsConfig = path.join(__dirname, `fixtures/tsconfig.semantic.json`);
    const error = await createProgram(tsConfig).catch(err => err);
    expect(error.message).toMatch(/^Unknown compiler option 'targetSomething'./);
  });

  it('should still create a program when extended tsconfig does not exist', async () => {
    const fixtures = path.join(__dirname, 'fixtures');
    const tsConfig = path.join(fixtures, `tsconfig_missing.json`);

    const { programId, files, projectReferences, missingTsConfig } = await createProgram(tsConfig);

    expect(programId).toBeDefined();
    expect(files).toEqual(expect.arrayContaining([toUnixPath(path.join(fixtures, 'file.ts'))]));
    expect(projectReferences).toEqual([]);
    expect(missingTsConfig).toBe(true);
  });

  it('missing external tsconfig should be different than found external tsconfig', () => {
    const tsConfigMissing = path.join(__dirname, 'fixtures', `tsconfig_missing.json`);
    const tsConfig = path.join(__dirname, 'fixtures', `tsconfig_found.json`);

    const { options: configMissing } = createProgramOptions(tsConfigMissing);
    const { options: configFound } = createProgramOptions(tsConfig);

    expect(configFound).toBeDefined();
    expect(configFound.target).toBeDefined();
    expect(configFound.module).toBeDefined();
    expect(configMissing).toBeDefined();
    expect(configMissing.target).toBeUndefined();
    expect(configMissing.module).toBeUndefined();
  });

  it('should check all paths until root node_modules', async () => {
    const configHost = {
      useCaseSensitiveFileNames: true,
      readDirectory: ts.sys.readDirectory,
      fileExists: jest.fn((_file: string) => false),
      readFile: ts.sys.readFile,
    };

    const tsConfigMissing = path.join(__dirname, 'fixtures', `tsconfig_missing.json`);
    const searchedFiles = [];
    let nodeModulesFolder = path.join(__dirname, 'fixtures');
    let searchFolder = path.join(nodeModulesFolder, 'node_modules', '@tsconfig', 'node_missing');
    do {
      searchedFiles.push(path.join(searchFolder, 'tsconfig.json', 'package.json'));
      searchedFiles.push(path.join(searchFolder, 'package.json'));
      searchedFiles.push(path.join(searchFolder, 'tsconfig.json'));
      searchedFiles.push(path.join(searchFolder, 'tsconfig.json', 'tsconfig.json'));
      nodeModulesFolder = path.dirname(nodeModulesFolder);
      searchFolder = path.join(nodeModulesFolder, 'node_modules', '@tsconfig', 'node_missing');
    } while (!isLastTsConfigCheck(searchedFiles[searchedFiles.length - 1]));

    expect(() => createProgramOptions(tsConfigMissing, configHost)).toThrow();
    expect(configHost.fileExists).toHaveBeenCalledTimes(searchedFiles.length);
    searchedFiles.forEach((file, index) => {
      expect(configHost.fileExists).toHaveBeenNthCalledWith(index + 1, toUnixPath(file));
    });
  });

  it('should find an existing program', async () => {
    const fixtures = path.join(__dirname, 'fixtures');
    const tsConfig = path.join(fixtures, 'tsconfig.json');
    const { programId, files, projectReferences } = await createProgram(tsConfig);

    const program = getProgramById(programId);

    expect(program.getCompilerOptions().configFilePath).toEqual(toUnixPath(tsConfig));
    expect(program.getRootFileNames()).toEqual(
      files.map(toUnixPath).filter(file => file.startsWith(toUnixPath(fixtures))),
    );
    expect(
      program
        .getProjectReferences()
        .map(reference => addTsConfigIfMissing(toUnixPath(reference.path))),
    ).toEqual(projectReferences.map(p => addTsConfigIfMissing(toUnixPath(p))));
  });

  it('should fail finding a non-existing program', () => {
    const programId = '$#&/()=?!£@~+°';
    expect(() => getProgramById(programId)).toThrow(`Failed to find program ${programId}`);
  });

  it('should delete a program', async () => {
    const fixtures = path.join(__dirname, 'fixtures');
    const tsConfig = path.join(fixtures, 'tsconfig.json');
    const { programId } = await createProgram(tsConfig);

    deleteProgram(programId);
    expect(() => getProgramById(programId)).toThrow(`Failed to find program ${programId}`);
  });
});
