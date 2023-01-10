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
import { APIError } from 'errors';
import { jsTsInput } from '../../../tools';

describe('buildTs', () => {
  it('should build TypeScript code', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'build-ts', 'file.ts');
    const tsConfigs = [path.join(__dirname, 'fixtures', 'build-ts', 'tsconfig.json')];

    const isVueFile = false;
    const sourceCode = buildTs(await jsTsInput({ filePath, tsConfigs }), isVueFile);

    const {
      ast: {
        body: [stmt],
      },
    } = sourceCode as AST.ESLintExtendedProgram;
    expect(stmt.type).toEqual('FunctionDeclaration');
  });

  it('should fail building malformed TypeScript code', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'build-ts', 'malformed.ts');
    const tsConfigs = [path.join(__dirname, 'fixtures', 'build-ts', 'tsconfig.json')];
    const isVueFile = false;
    const analysisInput = await jsTsInput({ filePath, tsConfigs });
    expect(() => buildTs(analysisInput, isVueFile)).toThrow(
      APIError.parsingError(`'}' expected.`, { line: 2 }),
    );
  });

  it('should build TypeScript Vue.js code', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'build-ts', 'file.vue');
    const tsConfigs = [path.join(__dirname, 'fixtures', 'build-ts', 'tsconfig.json')];
    const isVueFile = true;
    const sourceCode = buildTs(
      await jsTsInput({ filePath, tsConfigs }),
      isVueFile,
    ) as AST.ESLintExtendedProgram;

    const {
      ast: {
        body: [stmt],
        templateBody,
      },
    } = sourceCode as AST.ESLintExtendedProgram;
    expect(stmt.type).toEqual('ImportDeclaration');
    expect(templateBody).toBeDefined();
  });

  it('should fail building excluded TypeScript code from TSConfig', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'build-ts', 'excluded.ts');
    const tsConfigs = [path.join(__dirname, 'fixtures', 'build-ts', 'tsconfig.json')];

    const analysisInput = await jsTsInput({ filePath, tsConfigs });
    const isVueFile = false;
    expect(() => buildTs(analysisInput, isVueFile)).toThrow(/TSConfig does not include this file./);
  });
});
