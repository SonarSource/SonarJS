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

import { buildVue } from 'parsing/jsts';
import path from 'path';
import { AST } from 'vue-eslint-parser';
import { JsTsAnalysisInput } from 'services/analysis/analyzers/js';
import { AnalysisErrorCode } from 'services/analysis';

describe('buildVue', () => {
  it('should build Vue.js code with JavaScript parser', () => {
    const filePath = path.join(__dirname, 'fixtures', 'vue', 'js.vue');
    const fileType = 'MAIN';

    const input = { filePath, fileType } as JsTsAnalysisInput;
    const tryTypeScriptParser = false;
    const sourceCode = buildVue(input, tryTypeScriptParser);

    const {
      ast: {
        body: [stmt],
        templateBody,
      },
    } = sourceCode as AST.ESLintExtendedProgram;
    expect(stmt.type).toEqual('ExpressionStatement');
    expect(templateBody).toBeDefined();
  });

  it('should fail building malformed Vue.js code', () => {
    const filePath = path.join(__dirname, 'fixtures', 'vue', 'malformed.vue');
    const fileType = 'MAIN';

    const input = { filePath, fileType } as JsTsAnalysisInput;
    const tryTypeScriptParser = false;
    const error = buildVue(input, tryTypeScriptParser);

    expect(error).toEqual({
      line: 7,
      message: 'Unexpected token (3:0)',
      code: AnalysisErrorCode.Parsing,
    });
  });

  it('should build Vue.js code with TypeScript ESLint parser', () => {
    const filePath = path.join(__dirname, 'fixtures', 'vue', 'ts.vue');
    const fileType = 'MAIN';

    const input = { filePath, fileType } as JsTsAnalysisInput;
    const tryTypeScriptParser = true;
    const sourceCode = buildVue(input, tryTypeScriptParser) as AST.ESLintExtendedProgram;

    expect(sourceCode.ast).toBeDefined();
  });

  it('should fail building malformed Vue.js code with TypeScript ESLint parser', () => {
    console.log = jest.fn();

    const filePath = path.join(__dirname, 'fixtures', 'vue', 'malformed.vue');
    const fileType = 'MAIN';

    const input = { filePath, fileType } as JsTsAnalysisInput;
    const tryTypeScriptParser = true;
    buildVue(input, tryTypeScriptParser);

    const log = `DEBUG Failed to parse ${input.filePath} with TypeScript parser: Expression expected.`;
    expect(console.log).toHaveBeenCalledWith(log);
  });
});
