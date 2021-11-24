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
import { createProgram } from '@typescript-eslint/parser';
import ts from 'typescript';

export class Programs {
  private static readonly instance = new Programs();
  private readonly programs = new Map<string, ts.Program>();
  private programCount = 0;

  public static getInstance() {
    return this.instance;
  }

  public create(tsConfig: string): { id: string; files: string[]; projectReferences: string[] } {
    const program = createProgram(tsConfig);

    const maybeProjectReferences = program.getProjectReferences();
    const projectReferences = maybeProjectReferences
      ? maybeProjectReferences?.map(ref => ref.path)
      : [];
    const files = program.getSourceFiles().map(source => source.fileName);

    const id = (this.programCount++).toString();
    this.programs.set(id, program);

    return { id, files, projectReferences };
  }

  public get(id: string): ts.Program {
    const program = this.programs.get(id);
    if (!program) {
      throw new Error(`failed to find program ${id}`);
    }
    return program;
  }

  public delete(id: string) {
    this.programs.delete(id);
  }

  public clear() {
    this.programCount = 0;
    this.programs.clear();
  }
}
