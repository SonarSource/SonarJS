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

const programs = new Map<string, ts.Program>();
let programCount = 0;

const parseConfigHost: ts.ParseConfigHost = {
  useCaseSensitiveFileNames: true,
  readDirectory: ts.sys.readDirectory,
  fileExists: ts.sys.fileExists,
  readFile: ts.sys.readFile,
};

export function getProgramById(programId: string): ts.Program {
  const program = programs.get(programId);
  if (!program) {
    throw new Error(`failed to find program ${programId}`);
  }
  return program;
}

export function deleteProgram(programId: string): void {
  programs.delete(programId);
}

export function createProgram(tsConfig: string): {
  programId: string;
  files: string[];
  projectReferences: string[];
} {
  console.log(`DEBUG creating program from ${tsConfig}`);
  const config = ts.readConfigFile(tsConfig, parseConfigHost.readFile);

  if (config.error) {
    console.error(`Failed to parse tsconfig: ${tsConfig} (${JSON.stringify(config.error)})`);
    throw Error(diagnosticToString(config.error));
  }

  const parsedConfigFile = ts.parseJsonConfigFileContent(
    config.config,
    parseConfigHost,
    path.resolve(path.dirname(tsConfig)),
    {
      noEmit: true,
    },
    // to include .vue files we can provide additional options here (parameter 'extraFileExtensions')
  );

  if (parsedConfigFile.errors.length > 0) {
    const message = parsedConfigFile.errors.map(diagnosticToString).join('; ');
    throw Error(message);
  }

  const programOptions: ts.CreateProgramOptions = {
    rootNames: parsedConfigFile.fileNames,
    options: { ...parsedConfigFile.options, allowNonTsExtensions: true },
    projectReferences: parsedConfigFile.projectReferences,
  };

  const program = ts.createProgram(programOptions);
  const maybeProjectReferences = program.getProjectReferences();
  const projectReferences = maybeProjectReferences ? maybeProjectReferences.map(p => p.path) : [];
  const files = program.getSourceFiles().map(sourceFile => sourceFile.fileName);

  const programId = nextId();
  programs.set(programId, program);
  console.log(`DEBUG program from ${tsConfig} with id ${programId} is created`);

  return { programId, files, projectReferences };
}

function nextId() {
  programCount++;
  return programCount.toString();
}

function diagnosticToString(diagnostic: ts.Diagnostic): string {
  if (typeof diagnostic.messageText === 'string') {
    return diagnostic.messageText;
  } else {
    return diagnostic.messageText.messageText;
  }
}
