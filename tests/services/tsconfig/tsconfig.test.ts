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
import * as ts from 'typescript';
import * as path from 'path';
import { getFilesForTsConfig, writeTSConfigFile } from 'services/tsconfig';
import { toUnixPath } from 'helpers';
import * as fs from 'fs/promises';

const defaultParseConfigHost: ts.ParseConfigHost = {
  useCaseSensitiveFileNames: true,
  readDirectory: ts.sys.readDirectory,
  fileExists: ts.sys.fileExists,
  readFile: ts.sys.readFile,
};

describe('getFilesForTsConfig', () => {
  it('should return files', () => {
    const readFile = _path => `{ "files": ["/foo/file.ts"] }`;
    const result = getFilesForTsConfig('tsconfig.json', { ...defaultParseConfigHost, readFile });
    expect(result).toEqual({
      files: ['/foo/file.ts'],
      projectReferences: [],
    });
  });

  it('should report errors', () => {
    const readFile = _path => `{ "files": [] }`;
    expect(() =>
      getFilesForTsConfig('tsconfig.json', { ...defaultParseConfigHost, readFile }),
    ).toThrow(`The 'files' list in config file 'tsconfig.json' is empty.`);
  });

  it('should return projectReferences', () => {
    const readFile = _path => `{ "files": [], "references": [{ "path": "foo" }] }`;
    const result = getFilesForTsConfig('tsconfig.json', { ...defaultParseConfigHost, readFile });
    const cwd = process.cwd().split(path.sep).join(path.posix.sep);
    expect(result).toEqual({
      files: [],
      projectReferences: [`${cwd}/foo`],
    });
  });

  it('should return Vue files', () => {
    const fixtures = path.join(__dirname, 'fixtures');
    const tsConfig = path.join(fixtures, 'tsconfig.json');
    const result = getFilesForTsConfig(tsConfig, { ...defaultParseConfigHost });
    expect(result).toEqual(
      expect.objectContaining({
        files: expect.arrayContaining([toUnixPath(path.join(fixtures, 'file.vue'))]),
      }),
    );
  });

  it('should write tsconfig file', async () => {
    const { filename } = await writeTSConfigFile({
      compilerOptions: { allowJs: true, noImplicitAny: true },
      include: ['/path/to/project/**/*'],
    });
    const content = await fs.readFile(filename, { encoding: 'utf-8' });
    expect(content).toBe(
      '{"compilerOptions":{"allowJs":true,"noImplicitAny":true},"include":["/path/to/project/**/*"]}',
    );
  });
});
