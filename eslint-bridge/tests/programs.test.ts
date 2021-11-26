/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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
import { Programs } from '../src/programs';

describe('programs', () => {
  const programs = Programs.getInstance();
  const fixtures = path.join(__dirname, 'fixtures/programs');

  beforeEach(() => {
    programs.clear();
  });

  it('should create a program', () => {
    const tsConfig = path.join(fixtures, 'default.tsconfig.json');
    const { id } = programs.create(tsConfig);
    expect(id).toEqual('0');
  });

  // FIXME: should we just catch the exception or preprocess it first in Programs#create ?
  // it('should fail to create a program from a non existing tsconfig', () => {
  //   const tsConfig = path.join(fixtures, 'nonexisting.tsconfig.json');
  //   const { files } = programs.create(tsConfig);
  //   expect(files).toContain(path.join(fixtures, 'file.vue'));
  // });

  // FIXME: should we just catch the exception or preprocess it first in Programs#create ?
  // it('should fail to create a program from an empty tsconfig', () => {
  //   const tsConfig = path.join(fixtures, 'empty.tsconfig.json');
  //   const { files } = programs.create(tsConfig);
  //   expect(files).toContain(path.join(fixtures, 'file.vue'));
  // });

  it('should retrieve a program', () => {
    const tsConfig = path.join(fixtures, 'default.tsconfig.json');
    const { id } = programs.create(tsConfig);
    expect(() => programs.get(id)).not.toThrowError(`failed to find program ${id}`);
  });

  it('should fail to retrieve a non existing program', () => {
    expect(() => programs.get('na')).toThrowError('failed to find program na');
  });

  it('should return program files', () => {
    const tsConfig = path.join(fixtures, 'default.tsconfig.json');
    const { files } = programs.create(tsConfig);
    expect(files).toContain(path.join(fixtures, 'lib.ts'));
  });

  it('should return unlisted program files', () => {
    const tsConfig = path.join(fixtures, 'unlisted.tsconfig.json');
    const { files } = programs.create(tsConfig);
    expect(files).toContain(path.join(fixtures, 'lib.ts'));
  });

  it('should return implicitly included Vue files', () => {
    const tsConfig = path.join(fixtures, 'vue.tsconfig.json');
    const { files } = programs.create(tsConfig);
    expect(files).toContain(path.join(fixtures, 'file.vue'));
  });

  it('should return project references', () => {
    const tsConfig = path.join(fixtures, 'reference.tsconfig.json');
    const { projectReferences } = programs.create(tsConfig);
    expect(projectReferences).toContain(path.join(fixtures, 'unlisted.tsconfig.json'));
  });

  it('should delete a program', () => {
    const tsConfig = path.join(fixtures, 'default.tsconfig.json');
    const { id } = programs.create(tsConfig);
    expect(() => programs.get(id)).not.toThrowError(`failed to find program ${id}`);
    programs.delete(id);
    expect(() => programs.get(id)).toThrowError(`failed to find program ${id}`);
  });
});
