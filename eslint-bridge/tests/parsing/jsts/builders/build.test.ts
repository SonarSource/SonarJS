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
import { SourceCode } from 'eslint';
import { setContext } from 'helpers';
import { buildSourceCode } from 'parsing/jsts';
import path from 'path';
import { AST } from 'vue-eslint-parser';
import { jsTsInput } from '../../../tools';

describe('buildSourceCode', () => {
  it('should build JavaScript source code', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'build', 'file.js');
    const {
      ast: {
        body: [stmt],
      },
    } = buildSourceCode(await jsTsInput({ filePath }), 'js') as SourceCode;

    expect(stmt.type).toEqual('VariableDeclaration');
  });

  it('should build JavaScript source code with TypeScript ESLint parser', async () => {
    console.log = jest.fn();

    setContext({
      workDir: '/tmp/dir',
      shouldUseTypeScriptParserForJS: true,
      sonarlint: false,
      bundles: [],
    });

    const filePath = path.join(__dirname, 'fixtures', 'build', 'file.js');
    const {
      ast: {
        body: [stmt],
      },
    } = buildSourceCode(await jsTsInput({ filePath }), 'js') as SourceCode;

    expect(stmt.type).toEqual('VariableDeclaration');
    expect(console.log).not.toHaveBeenCalled();
  });

  it('should build JavaScript Vue.js source code', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'build', 'js.vue');
    const sourceCode = buildSourceCode(await jsTsInput({ filePath }), 'js');

    const {
      ast: {
        body: [stmt],
      },
    } = sourceCode as AST.ESLintExtendedProgram;
    expect(stmt.type).toEqual('ExportDefaultDeclaration');
  });

  it('should build TypeScript source code', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'build', 'file.ts');
    const tsConfigs = [path.join(__dirname, 'fixtures', 'build', 'tsconfig.json')];
    const {
      ast: {
        body: [stmt],
      },
    } = buildSourceCode(await jsTsInput({ filePath, tsConfigs }), 'ts') as SourceCode;

    expect(stmt.type).toEqual('TSTypeAliasDeclaration');
  });

  it('should build TypeScript Vue.js source code', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'build', 'ts.vue');
    const tsConfigs = [path.join(__dirname, 'fixtures', 'build', 'tsconfig.json')];
    const sourceCode = buildSourceCode(await jsTsInput({ filePath, tsConfigs }), 'ts');

    const {
      ast: {
        body: [stmt],
      },
    } = sourceCode as AST.ESLintExtendedProgram;
    expect(stmt.type).toEqual('ExportDefaultDeclaration');
  });
});
