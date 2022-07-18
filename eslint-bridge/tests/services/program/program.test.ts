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
import { createProgram, deleteProgram, getProgramById } from 'services';
import { toUnixPath } from '../../testing';

describe('program', () => {
  it('should create a program', () => {
    const fixtures = path.join(__dirname, 'fixtures');
    const reference = path.join(fixtures, `reference`);
    const tsConfig = path.join(fixtures, `tsconfig.json`);

    const { programId, files, projectReferences } = createProgram(tsConfig);

    expect(programId).toBeDefined();
    expect(files).toEqual(
      expect.arrayContaining([
        toUnixPath(path.join(fixtures, 'file.ts')),
        toUnixPath(path.join(reference, 'file.ts')),
      ]),
    );
    expect(projectReferences).toEqual([toUnixPath(reference)]);
  });

  it('should fail creating a program with a syntactically incorrect tsconfig', () => {
    const tsConfig = path.join(__dirname, 'fixtures', 'tsconfig.syntax.json');
    expect(() => createProgram(tsConfig)).toThrowError();
  });

  it('should fail creating a program with a semantically incorrect tsconfig', () => {
    const tsConfig = path.join(__dirname, `fixtures/tsconfig.semantic.json`);
    expect(() => createProgram(tsConfig)).toThrow(/^Unknown compiler option 'targetSomething'./);
  });

  it('should find an existing program', () => {
    const fixtures = path.join(__dirname, 'fixtures');
    const tsConfig = path.join(fixtures, 'tsconfig.json');
    const { programId, files, projectReferences } = createProgram(tsConfig);

    const program = getProgramById(programId);

    expect(program.getCompilerOptions().configFilePath).toEqual(toUnixPath(tsConfig));
    expect(program.getRootFileNames()).toEqual(
      files.map(toUnixPath).filter(file => file.startsWith(toUnixPath(fixtures))),
    );
    expect(program.getProjectReferences().map(reference => reference.path)).toEqual(
      projectReferences.map(toUnixPath),
    );
  });

  it('should fail finding a non-existing program', () => {
    const programId = '$#&/()=?!£@~+°';
    expect(() => getProgramById(programId)).toThrow(`Failed to find program ${programId}`);
  });

  it('should delete a program', () => {
    const fixtures = path.join(__dirname, 'fixtures');
    const tsConfig = path.join(fixtures, 'tsconfig.json');
    const { programId } = createProgram(tsConfig);

    deleteProgram(programId);
    expect(() => getProgramById(programId)).toThrow(`Failed to find program ${programId}`);
  });
});
