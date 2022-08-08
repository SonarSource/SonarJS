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

import { SourceCode } from 'eslint';
import { buildJs } from 'parsing/jsts/builders/build-js';
import path from 'path';
import { AnalysisErrorCode, JsTsAnalysisInput } from 'services/analysis';

describe('buildJs', () => {
  it('should build JavaScript code', () => {
    const filePath = path.join(__dirname, 'fixtures', 'build-js', 'file.js');
    const fileType = 'MAIN';

    const input = { filePath, fileType } as JsTsAnalysisInput;
    const tryTypeScriptParser = false;
    const {
      ast: {
        body: [stmt],
      },
    } = buildJs(input, tryTypeScriptParser) as SourceCode;

    expect(stmt.type).toEqual('FunctionDeclaration');
  });

  it('should fail building malformed JavaScript code', () => {
    const filePath = path.join(__dirname, 'fixtures', 'build-js', 'malformed.js');
    const fileType = 'MAIN';

    const input = { filePath, fileType } as JsTsAnalysisInput;
    const tryTypeScriptParser = false;
    const error = buildJs(input, tryTypeScriptParser);

    expect(error).toEqual({
      line: 3,
      message: 'Unexpected token (3:0)',
      code: AnalysisErrorCode.Parsing,
    });
  });

  it('should build JavaScript code with TypeScript ESLint parser', () => {
    console.log = jest.fn();

    const filePath = path.join(__dirname, 'fixtures', 'build-js', 'file.js');
    const fileType = 'MAIN';

    const input = { filePath, fileType } as JsTsAnalysisInput;
    const tryTypeScriptParser = true;
    const {
      ast: {
        body: [stmt],
      },
    } = buildJs(input, tryTypeScriptParser) as SourceCode;

    expect(stmt.type).toEqual('FunctionDeclaration');
    expect(console.log).not.toHaveBeenCalled();
  });

  it('should fail building JavaScript code with TypeScript ESLint parser', () => {
    console.log = jest.fn();

    const filePath = path.join(__dirname, 'fixtures', 'build-js', 'malformed.js');
    const fileType = 'MAIN';

    const input = { filePath, fileType } as JsTsAnalysisInput;
    const tryTypeScriptParser = true;
    buildJs(input, tryTypeScriptParser);

    const log = `DEBUG Failed to parse ${input.filePath} with TypeScript parser: '}' expected.`;
    expect(console.log).toHaveBeenCalledWith(log);
  });

  it('should build module JavaScript code', () => {
    const filePath = path.join(__dirname, 'fixtures', 'build-js', 'module.js');
    const fileType = 'MAIN';

    const input = { filePath, fileType } as JsTsAnalysisInput;
    const tryTypeScriptParser = false;
    const sourceCode = buildJs(input, tryTypeScriptParser) as SourceCode;

    expect(sourceCode.ast.sourceType).toEqual('module');
  });

  it('should build script JavaScript code', () => {
    const filePath = path.join(__dirname, 'fixtures', 'build-js', 'script.js');
    const fileType = 'MAIN';

    const input = { filePath, fileType } as JsTsAnalysisInput;
    const tryTypeScriptParser = false;
    const sourceCode = buildJs(input, tryTypeScriptParser) as SourceCode;

    expect(sourceCode.ast.sourceType).toEqual('script');
  });
});
