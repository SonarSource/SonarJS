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
import { buildParserOptions } from '../../src/parsers/index.ts';
import { createAndSaveProgram, getProgramById } from '../../src/program/index.ts';
import path from 'path';

describe('buildParserOptions', () => {
  it('should build parser options', () => {
    const usingBabel = false;
    const filePath = '/tmp/dir';
    const parser = '/some/parser';
    expect(buildParserOptions({ filePath, parser }, usingBabel)).toEqual({
      tokens: true,
      comment: true,
      loc: true,
      range: true,
      ecmaVersion: 2018,
      sourceType: 'module',
      codeFrame: false,
      ecmaFeatures: {
        jsx: true,
        globalReturn: false,
        legacyDecorators: true,
      },
      extraFileExtensions: ['.vue'],
      parser,
      filePath,
    });
  });

  it('should include Babel parser options', () => {
    const filePath = '/tmp/dir';
    const usingBabel = true;
    const parserOptions = buildParserOptions({ filePath }, usingBabel);
    expect(parserOptions).toEqual(
      expect.objectContaining({
        requireConfigFile: false,
      }),
    );
    expect(parserOptions.babelOptions).toEqual(
      expect.objectContaining({
        babelrc: false,
        configFile: false,
      }),
    );
  });

  it('should build parser options with TSConfig', () => {
    const tsConfigs = ['/some/tsconfig'];
    const filePath = '/tmp/dir';
    expect(buildParserOptions({ filePath, project: tsConfigs })).toEqual(
      expect.objectContaining({
        project: tsConfigs,
      }),
    );
  });

  it('should build parser options with TypeScript program', () => {
    const tsConfig = path.join(__dirname, 'fixtures', 'options', 'tsconfig.json');

    const { programId } = createAndSaveProgram(tsConfig);
    const program = getProgramById(programId);

    const filePath = '/tmp/dir';
    expect(buildParserOptions({ filePath, programs: [program] })).toEqual(
      expect.objectContaining({
        programs: [program],
      }),
    );
  });
});
