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

import path from 'path';
import { FileFinder, setContext, toUnixPath } from '@sonar/shared';
import {
  analyzeProject,
  defaultEnvironments,
  defaultGlobals,
  ProjectAnalysisInput,
} from '@sonar/jsts';

describe('analyzeJSTS', () => {
  beforeEach(() => {
    jest.resetModules();
    setContext({
      workDir: '/tmp/dir',
      shouldUseTypeScriptParserForJS: true,
      sonarlint: false,
      bundles: [],
    });
  });

  it('should analyze whole project with program', async () => {
    const fixtures = path.join(__dirname, 'fixtures');
    const files = new FileFinder(contents => contents);
    files.searchFiles(fixtures, ['*.js', '*.ts'], []);
    const allFiles = {};
    files.db.forEach(files => {
      files.forEach(file => {
        allFiles[file.filename] = {
          fileType: 'MAIN',
          language: file.filename.toLowerCase().endsWith('js') ? 'js' : 'ts',
        };
      });
    });

    const analysisInput: ProjectAnalysisInput = {
      rules: [{ key: 'no-duplicate-in-composite', configurations: [], fileTypeTarget: ['MAIN'] }],
      environments: defaultEnvironments,
      globals: defaultGlobals,
      baseDir: fixtures,
      files: allFiles,
    };

    const result = await analyzeProject(analysisInput);

    expect(result).toBeDefined();

    expect(result.files[toUnixPath(path.join(fixtures, 'parsing-error.js'))]).toMatchObject({
      parsingError: { code: 'PARSING', message: 'Unexpected token (3:0)', line: 3 },
    });
    expect(result.meta.withWatchProgram).toBeFalsy();
    expect(result.meta.withProgram).toBeTruthy();
    expect(result.meta.programsCreated).toEqual(3);
  });
});
