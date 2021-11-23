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
import { ParseExceptionCode } from './parser';
import { createProgram } from '@typescript-eslint/parser';
import * as ts from 'typescript';

export function getFilesForTsConfig(
  tsConfig: string,
):
  | { files: string[]; projectReferences: string[] }
  | { error: string; errorCode?: ParseExceptionCode } {
  const program = createProgram(tsConfig);

  const diagnostics = program.getGlobalDiagnostics();
  if (diagnostics.length > 0) {
    let error = '';
    diagnostics.forEach(d => {
      error += diagnosticToString(d);
    });
    return { error, errorCode: ParseExceptionCode.GeneralError };
  }

  const getProjectReferences = program.getProjectReferences();
  const projectReferences = getProjectReferences ? getProjectReferences?.map(ref => ref.path) : [];

  const files = program.getSourceFiles().map(source => source.fileName);

  return { files, projectReferences };
}

function diagnosticToString(diagnostic: ts.Diagnostic): string {
  if (typeof diagnostic.messageText === 'string') {
    return diagnostic.messageText;
  } else {
    return diagnostic.messageText.messageText;
  }
}
