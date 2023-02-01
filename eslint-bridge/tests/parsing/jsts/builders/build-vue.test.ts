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
import { buildVue } from 'parsing/jsts/builders/build-vue';
import path from 'path';
import { AST } from 'vue-eslint-parser';
import { APIError } from 'errors';
import { jsTsInput } from '../../../tools';

describe('buildVue', () => {
  it('should build Vue.js code with JavaScript parser', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'build-vue', 'js.vue');
    const tryTypeScriptParser = false;
    const sourceCode = buildVue(await jsTsInput({ filePath }), tryTypeScriptParser);

    const {
      ast: {
        body: [stmt],
        templateBody,
      },
    } = sourceCode as AST.ESLintExtendedProgram;
    expect(stmt.type).toEqual('ExpressionStatement');
    expect(templateBody).toBeDefined();
  });

  it('should fail building malformed Vue.js code', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'build-vue', 'malformed.vue');

    const analysisInput = await jsTsInput({ filePath });
    const tryTypeScriptParser = false;
    expect(() => buildVue(analysisInput, tryTypeScriptParser)).toThrow(
      APIError.parsingError('Unexpected token (3:0)', { line: 7 }),
    );
  });

  it('should build Vue.js code with TypeScript ESLint parser', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'build-vue', 'ts.vue');
    const tryTypeScriptParser = true;
    const sourceCode = buildVue(
      await jsTsInput({ filePath }),
      tryTypeScriptParser,
    ) as AST.ESLintExtendedProgram;

    expect(sourceCode.ast).toBeDefined();
  });

  it('should fail building malformed Vue.js code with TypeScript ESLint parser', async () => {
    console.log = jest.fn();

    const filePath = path.join(__dirname, 'fixtures', 'build-vue', 'malformed.vue');
    const analysisInput = await jsTsInput({ filePath });
    const tryTypeScriptParser = true;
    expect(() => buildVue(analysisInput, tryTypeScriptParser)).toThrow();

    const log = `DEBUG Failed to parse ${filePath} with TypeScript parser: Expression expected.`;
    expect(console.log).toHaveBeenCalledWith(log);
  });
});
