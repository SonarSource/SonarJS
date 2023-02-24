/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
import tmp from 'tmp';
import fs from 'fs/promises';
import { promisify } from 'util';

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
): { files: string[]; projectReferences: string[] } {
  const config = ts.readConfigFile(tsConfig, parseConfigHost.readFile);

  if (config.error !== undefined) {
    console.error(`Failed to parse tsconfig: ${tsConfig} (${config.error.messageText})`);
    throw Error(diagnosticToString(config.error));
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
    throw new Error(error);
  }

  const projectReferences = parsed.projectReferences
    ? parsed.projectReferences.map(p => p.path)
    : [];

  return { files: parsed.fileNames, projectReferences };
}

/**
 * Any temporary file created with the `tmp` library will be removed once the Node.js process terminates.
 */
tmp.setGracefulCleanup();

/**
 * Create the TSConfig file and returns its path.
 *
 * The file is written in a temporary location in the file system and is marked to be removed after Node.js process terminates.
 *
 * @param tsConfig TSConfig to write
 * @returns the resolved TSConfig file path
 */
export async function writeTSConfigFile(tsConfig: any): Promise<{ filename: string }> {
  const filename = await promisify(tmp.file)();
  await fs.writeFile(filename, JSON.stringify(tsConfig), 'utf-8');
  return { filename };
}

function diagnosticToString(diagnostic: ts.Diagnostic): string {
  if (typeof diagnostic.messageText === 'string') {
    return diagnostic.messageText;
  } else {
    return diagnostic.messageText.messageText;
  }
}
