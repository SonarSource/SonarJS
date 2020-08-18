/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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
import { getFilesForTsConfig } from 'tsconfig';
import * as ts from 'typescript';
import { ParseExceptionCode } from 'parser';

describe('tsconfig', () => {
  const defaultParseConfigHost: ts.ParseConfigHost = {
    useCaseSensitiveFileNames: true,
    readDirectory: ts.sys.readDirectory,
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
  };

  it('should return files from tsconfig', () => {
    const readFile = _path => `
    {
      "files": ["/foo/file.ts"]
    }
    `;
    const result = getFilesForTsConfig('tsconfig.json', { ...defaultParseConfigHost, readFile });
    expect(result).toEqual({
      files: ['/foo/file.ts'],
    });
  });

  it('should report errors from tsconfig', () => {
    const readFile = _path => `
    {
      "files": []
    }
    `;
    const result = getFilesForTsConfig('tsconfig.json', { ...defaultParseConfigHost, readFile });
    expect(result).toEqual({
      error: "The 'files' list in config file 'tsconfig.json' is empty.",
      errorCode: ParseExceptionCode.GeneralError,
    });
  });
});
