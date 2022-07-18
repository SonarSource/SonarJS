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

import * as path from 'path';
import * as ts from 'typescript';
import { AnalysisErrorCode } from '../analysis';

/**
 * Gets the files resolved by a TSConfig
 *
 * The resolving of the files for a given TSConfig file is done
 * by invoking TypeScript compiler.
 *
 * @param tsConfig TSConfig to parse
 * @param parseConfigHost parsing configuration
 * @returns the resolved TSConfig files
 */
export function getFilesForTsConfig(
  tsConfig: string,
  parseConfigHost: ts.ParseConfigHost = {
    useCaseSensitiveFileNames: true,
    readDirectory: ts.sys.readDirectory,
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
  },
):
  | { files: string[]; projectReferences: string[] }
  | { error: string; errorCode?: AnalysisErrorCode } {
  const config = ts.readConfigFile(tsConfig, parseConfigHost.readFile);

  if (config.error !== undefined) {
    console.error(`Failed to parse tsconfig: ${tsConfig} (${config.error.messageText})`);
    return { error: diagnosticToString(config.error) };
  }

  const parsed = ts.parseJsonConfigFileContent(
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

  if (parsed.errors.length > 0) {
    let error = '';
    parsed.errors.forEach(d => {
      error += diagnosticToString(d);
    });
    return { error, errorCode: AnalysisErrorCode.GeneralError };
  }

  const projectReferences = parsed.projectReferences
    ? parsed.projectReferences.map(p => p.path)
    : [];

  return { files: parsed.fileNames, projectReferences };
}

function diagnosticToString(diagnostic: ts.Diagnostic): string {
  if (typeof diagnostic.messageText === 'string') {
    return diagnostic.messageText;
  } else {
    return diagnostic.messageText.messageText;
  }
}
