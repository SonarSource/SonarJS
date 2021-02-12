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
import { getFilesForTsConfig } from 'tsconfig';
import * as ts from 'typescript';
import { ParseExceptionCode } from 'parser';
import * as path from 'path';

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
      projectReferences: [],
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

  it('should return projectReferences', () => {
    const readFile = _path => `
    {
      "files": [],
      "references": [{ "path": "foo" }]
    }
    `;
    const result = getFilesForTsConfig('tsconfig.json', { ...defaultParseConfigHost, readFile });
    const cwd = process.cwd().split(path.sep).join(path.posix.sep);
    expect(result).toEqual({
      files: [],
      projectReferences: [`${cwd}/foo`],
    });
  });

  it('should return implicitly included Vue files', () => {
    const tsConfig = path.join(
      __dirname,
      'fixtures',
      'vue-project-tsconfig-implicit',
      'tsconfig.json',
    );
    const result = getFilesForTsConfig(tsConfig, { ...defaultParseConfigHost }) as {
      files: string[];
      projectReferences: string[];
    };
    expect(result.files).toHaveLength(1);
    expect(result.files[0]).toMatch(/.vue$/g);
  });
});
