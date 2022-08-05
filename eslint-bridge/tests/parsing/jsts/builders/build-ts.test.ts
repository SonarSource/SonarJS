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

import { buildTs } from 'parsing/jsts/builders/build-ts';
import path from 'path';
import { AST } from 'vue-eslint-parser';
import { JsTsAnalysisInput } from 'services/analysis/analyzers/js';
import { AnalysisError, AnalysisErrorCode } from 'services/analysis';

describe('buildTs', () => {
  it('should build TypeScript code', () => {
    const filePath = path.join(__dirname, 'fixtures', 'build-ts', 'file.ts');
    const fileType = 'MAIN';
    const tsConfigs = [path.join(__dirname, 'fixtures', 'build-ts', 'tsconfig.json')];

    const input = { filePath, fileType, tsConfigs } as JsTsAnalysisInput;
    const isVueFile = false;
    const sourceCode = buildTs(input, isVueFile);

    const {
      ast: {
        body: [stmt],
      },
    } = sourceCode as AST.ESLintExtendedProgram;
    expect(stmt.type).toEqual('FunctionDeclaration');
  });

  it('should fail building malformed TypeScript code', () => {
    const filePath = path.join(__dirname, 'fixtures', 'build-ts', 'malformed.ts');
    const fileType = 'MAIN';
    const tsConfigs = [path.join(__dirname, 'fixtures', 'build-ts', 'tsconfig.json')];

    const input = { filePath, fileType, tsConfigs } as JsTsAnalysisInput;
    const isVueFile = false;
    const error = buildTs(input, isVueFile);

    expect(error).toEqual({
      line: 2,
      message: "'}' expected.",
      code: AnalysisErrorCode.Parsing,
    });
  });

  it('should build TypeScript Vue.js code', () => {
    const filePath = path.join(__dirname, 'fixtures', 'build-ts', 'file.vue');
    const fileType = 'MAIN';
    const tsConfigs = [path.join(__dirname, 'fixtures', 'build-ts', 'tsconfig.json')];

    const input = { filePath, fileType, tsConfigs } as JsTsAnalysisInput;
    const isVueFile = true;
    const sourceCode = buildTs(input, isVueFile) as AST.ESLintExtendedProgram;

    const {
      ast: {
        body: [stmt],
        templateBody,
      },
    } = sourceCode as AST.ESLintExtendedProgram;
    expect(stmt.type).toEqual('ImportDeclaration');
    expect(templateBody).toBeDefined();
  });

  it('should fail building excluded TypeScript code from TSConfig', () => {
    const filePath = path.join(__dirname, 'fixtures', 'build-ts', 'excluded.ts');
    const fileType = 'MAIN';
    const tsConfigs = [path.join(__dirname, 'fixtures', 'build-ts', 'tsconfig.json')];

    const input = { filePath, fileType, tsConfigs } as JsTsAnalysisInput;
    const isVueFile = false;
    const { code, message } = buildTs(input, isVueFile) as AnalysisError;

    expect(code).toEqual(AnalysisErrorCode.Parsing);
    expect(message).toMatch(/^"parserOptions.project" has been set for @typescript-eslint\/parser/);
  });
});
