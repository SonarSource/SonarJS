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
import ts from 'typescript';
import { ParseExceptionCode } from './parser';

export class Programs {
  private static readonly instance = new Programs();
  private readonly programs = new Map<string, ts.Program>();
  private programCount = 0;

  public static getInstance() {
    return this.instance;
  }

  public create(tsConfig: string): { id: string; files: string[]; projectReferences: string[] } {
    const parseConfigHost: ts.ParseConfigHost = {
      useCaseSensitiveFileNames: true,
      readDirectory: ts.sys.readDirectory,
      fileExists: ts.sys.fileExists,
      readFile: ts.sys.readFile,
    };
    const config = ts.readConfigFile(tsConfig, parseConfigHost.readFile);

    if (config.error !== undefined) {
      console.error(`Failed to parse tsconfig: ${tsConfig} (${config.error.messageText})`);
      throw { error: Programs.diagnosticToString(config.error) };
    }

    const parsedCommandLine = ts.parseJsonConfigFileContent(
      config.config,
      parseConfigHost,
      path.resolve(path.dirname(tsConfig)),
      {
        noEmit: true,
      },
      undefined,
      undefined,
      [
        {
          extension: '.vue',
          scriptKind: ts.ScriptKind.Deferred,
          isMixedContent: true,
        },
      ],
    );

    if (parsedCommandLine.errors.length > 0) {
      let error = '';
      parsedCommandLine.errors.forEach(d => {
        error += Programs.diagnosticToString(d);
      });
      throw { error, errorCode: ParseExceptionCode.GeneralError };
    }

    const createProgramOptions: ts.CreateProgramOptions = {
      rootNames: parsedCommandLine.fileNames,
      options: {...parsedCommandLine.options, allowNonTsExtensions: true},
      projectReferences: parsedCommandLine.projectReferences,
    };
    const program = ts.createProgram(createProgramOptions);
    const maybeProjectReferences = program.getProjectReferences();
    const projectReferences = maybeProjectReferences ? maybeProjectReferences.map(p => p.path) : [];
    const files = program.getSourceFiles().map(sourceFile => sourceFile.fileName);

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

  private static diagnosticToString(diagnostic: ts.Diagnostic): string {
    if (typeof diagnostic.messageText === 'string') {
      return diagnostic.messageText;
    } else {
      return diagnostic.messageText.messageText;
    }
  }
}

