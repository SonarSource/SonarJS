/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import { getContext, setContext, toUnixPath } from '@sonar/shared';
import { analyzeProject, clearTSConfigs, ProjectAnalysisInput, RuleConfig } from '@sonar/jsts';
import { searchFiles, File } from '../../src/rules';

const defaultRules: RuleConfig[] = [
  { key: 'no-duplicate-in-composite', configurations: [], fileTypeTarget: ['MAIN'] },
  { key: 'no-extra-semi', configurations: [], fileTypeTarget: ['MAIN'] },
  { key: 'no-duplicate-string', configurations: [], fileTypeTarget: ['MAIN'] },
  { key: 'sonar-no-regex-spaces', configurations: [], fileTypeTarget: ['MAIN'] },
  { key: 'prefer-default-last', configurations: [], fileTypeTarget: ['MAIN'] },
  { key: 'bool-param-default', configurations: [], fileTypeTarget: ['MAIN'] },
  { key: 'sonar-no-dupe-keys', configurations: [], fileTypeTarget: ['MAIN'] },
  { key: 'strings-comparison', configurations: [], fileTypeTarget: ['MAIN'] },
  { key: 'prefer-promise-shorthand', configurations: [], fileTypeTarget: ['MAIN'] },
  { key: 'no-with', configurations: [], fileTypeTarget: ['MAIN'] },
  { key: 'no-throw-literal', configurations: [], fileTypeTarget: ['MAIN'] },
  { key: 'object-shorthand', configurations: [], fileTypeTarget: ['MAIN'] },
  { key: 'prefer-template', configurations: [], fileTypeTarget: ['MAIN'] },
  { key: 'no-useless-intersection', configurations: [], fileTypeTarget: ['MAIN'] },
  { key: 'no-array-delete', configurations: [], fileTypeTarget: ['MAIN'] },
  { key: 'different-types-comparison', configurations: [], fileTypeTarget: ['MAIN'] },
  { key: 'no-octal', configurations: [], fileTypeTarget: ['MAIN'] },
  { key: 'destructuring-assignment-syntax', configurations: [], fileTypeTarget: ['MAIN'] },
  { key: 'no-unused-function-argument', configurations: [], fileTypeTarget: ['MAIN'] },
];

function filesDBtoFilesInput(filesDB: Record<string, File<void>[]>) {
  const allFiles = {};
  Object.values(filesDB).forEach(files => {
    files.forEach(file => {
      allFiles[file.filename] = {
        fileType: 'MAIN',
        language: file.filename.toLowerCase().endsWith('js') ? 'js' : 'ts',
      };
    });
  });
  return allFiles;
}

function prepareInput(files: Record<string, File<void>[]>): ProjectAnalysisInput {
  return {
    rules: defaultRules,
    baseDir: fixtures,
    files: filesDBtoFilesInput(files),
    isSonarlint: getContext().sonarlint,
  };
}

const fixtures = path.join(__dirname, 'fixtures');

describe('analyzeProject', () => {
  beforeEach(() => {
    jest.resetModules();
    clearTSConfigs();
    setContext({
      workDir: '/tmp/dir',
      shouldUseTypeScriptParserForJS: true,
      sonarlint: false,
      bundles: [],
    });
  });

  it('should analyze the whole project with program', async () => {
    const { files } = searchFiles(fixtures, { files: { pattern: '*.js,*.ts' } }, []);
    const result = await analyzeProject(prepareInput(files as Record<string, File<void>[]>));
    expect(result).toBeDefined();

    expect(result.files[toUnixPath(path.join(fixtures, 'parsing-error.js'))]).toMatchObject({
      parsingError: { code: 'PARSING', message: 'Unexpected token (3:0)', line: 3 },
    });
    expect(result.meta.withWatchProgram).toBeFalsy();
    expect(result.meta.withProgram).toBeTruthy();
    expect(result.meta.programsCreated.length).toEqual(3);
  });

  it('should analyze the whole project with watch program', async () => {
    setContext({
      workDir: '/tmp/dir',
      shouldUseTypeScriptParserForJS: true,
      sonarlint: true,
      bundles: [],
    });
    const { files } = searchFiles(fixtures, { files: { pattern: '*.js,*.ts,*.vue' } }, []);
    const result = await analyzeProject(prepareInput(files as Record<string, File<void>[]>));
    expect(result).toBeDefined();

    expect(result.files[toUnixPath(path.join(fixtures, 'parsing-error.js'))]).toMatchObject({
      parsingError: { code: 'PARSING', message: 'Unexpected token (3:0)', line: 3 },
    });
    expect(result.meta.withWatchProgram).toBeTruthy();
    expect(result.meta.withProgram).toBeFalsy();
    expect(result.meta.programsCreated.length).toEqual(0);
  });

  it('should return a default result when the project is empty', async () => {
    const result = await analyzeProject(prepareInput({} as Record<string, File<void>[]>));
    expect(result).toEqual(
      expect.objectContaining({
        files: {},
        meta: expect.objectContaining({}),
      }),
    );
  });
});
