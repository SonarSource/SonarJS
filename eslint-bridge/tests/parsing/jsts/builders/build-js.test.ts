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
import { APIError } from 'errors';
import { SourceCode } from 'eslint';
import { buildJs } from 'parsing/jsts/builders/build-js';
import path from 'path';
import { jsTsInput } from '../../../tools';

describe('buildJs', () => {
  it('should build JavaScript code', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'build-js', 'file.js');
    const tryTypeScriptParser = false;
    const {
      ast: {
        body: [stmt],
      },
    } = buildJs(await jsTsInput({ filePath }), tryTypeScriptParser) as SourceCode;

    expect(stmt.type).toEqual('FunctionDeclaration');
  });

  it('should fail building malformed JavaScript code', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'build-js', 'malformed.js');

    const analysisInput = await jsTsInput({ filePath });
    const tryTypeScriptParser = false;

    expect(() => buildJs(analysisInput, tryTypeScriptParser)).toThrow(
      APIError.parsingError('Unexpected token (3:0)', { line: 3 }),
    );
  });

  it('should build JavaScript code with TypeScript ESLint parser', async () => {
    console.log = jest.fn();

    const filePath = path.join(__dirname, 'fixtures', 'build-js', 'file.js');
    const tryTypeScriptParser = true;
    const {
      ast: {
        body: [stmt],
      },
    } = buildJs(await jsTsInput({ filePath }), tryTypeScriptParser) as SourceCode;

    expect(stmt.type).toEqual('FunctionDeclaration');
    expect(console.log).not.toHaveBeenCalled();
  });

  it('should fail building JavaScript code with TypeScript ESLint parser', async () => {
    console.log = jest.fn();

    const filePath = path.join(__dirname, 'fixtures', 'build-js', 'malformed.js');
    const analysisInput = await jsTsInput({ filePath });
    const tryTypeScriptParser = true;
    expect(() => buildJs(analysisInput, tryTypeScriptParser)).toThrow();

    const log = `DEBUG Failed to parse ${filePath} with TypeScript parser: '}' expected.`;
    expect(console.log).toHaveBeenCalledWith(log);
  });

  it('should build module JavaScript code', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'build-js', 'module.js');
    const tryTypeScriptParser = false;
    const sourceCode = buildJs(await jsTsInput({ filePath }), tryTypeScriptParser) as SourceCode;

    expect(sourceCode.ast.sourceType).toEqual('module');
  });

  it('should build script JavaScript code', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'build-js', 'script.js');
    const tryTypeScriptParser = false;
    const sourceCode = buildJs(await jsTsInput({ filePath }), tryTypeScriptParser) as SourceCode;

    expect(sourceCode.ast.sourceType).toEqual('script');
  });

  it('should support JavaScript decorators', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'build-js', 'decorator.js');
    const tryTypeScriptParser = false;
    const {
      ast: {
        body: [stmt],
      },
    } = buildJs(await jsTsInput({ filePath }), tryTypeScriptParser) as SourceCode;

    expect((stmt as any).decorators).toHaveLength(1);
    expect((stmt as any).decorators[0].expression.name).toEqual('annotation');
    expect((stmt as any).decorators[0].type).toEqual('Decorator');
  });
});
