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
import { setContext, APIError } from '@sonar/shared/index.js';
import { buildSourceCode } from '../../src/index.js';
import path from 'path';
import { AST } from 'vue-eslint-parser';
import { jsTsInput } from '../tools/index.js';
describe('buildSourceCode', () => {
  beforeEach(() => {
    setContext({
      workDir: '/tmp/dir',
      shouldUseTypeScriptParserForJS: true,
      sonarlint: false,
      bundles: [],
    });
  });
  it('should build JavaScript source code', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'build', 'file.js');
    const {
      ast: {
        body: [stmt],
      },
    } = buildSourceCode(await jsTsInput({ filePath }), 'js');

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
    } = buildSourceCode(await jsTsInput({ filePath }), 'js');

    expect(stmt.type).toEqual('VariableDeclaration');
  });

  it('should build JavaScript Vue.js source code', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'build', 'js.vue');

    const {
      ast: {
        body: [stmt],
      },
    } = buildSourceCode(await jsTsInput({ filePath }), 'js');
    expect(stmt.type).toEqual('ExportDefaultDeclaration');
  });

  it('should build TypeScript source code', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'build', 'file.ts');
    const tsConfigs = [path.join(__dirname, 'fixtures', 'build', 'tsconfig.json')];
    const {
      ast: {
        body: [stmt],
      },
    } = buildSourceCode(await jsTsInput({ filePath, tsConfigs }), 'ts');

    expect(stmt.type).toEqual('TSTypeAliasDeclaration');
  });

  it('should build TypeScript Vue.js source code', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'build', 'ts.vue');
    const tsConfigs = [path.join(__dirname, 'fixtures', 'build', 'tsconfig.json')];
    const {
      ast: {
        body: [stmt],
      },
    } = buildSourceCode(await jsTsInput({ filePath, tsConfigs }), 'ts');

    expect(stmt.type).toEqual('ExportDefaultDeclaration');
  });

  it('should build JavaScript code', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'build-js', 'file.js');
    setContext({
      workDir: '/tmp/dir',
      shouldUseTypeScriptParserForJS: false,
      sonarlint: false,
      bundles: [],
    });
    const {
      ast: {
        body: [stmt],
      },
    } = buildSourceCode(await jsTsInput({ filePath }), 'js');

    expect(stmt.type).toEqual('FunctionDeclaration');
  });

  it('should fail building malformed JavaScript code', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'build-js', 'malformed.js');

    const analysisInput = await jsTsInput({ filePath });
    setContext({
      workDir: '/tmp/dir',
      shouldUseTypeScriptParserForJS: false,
      sonarlint: false,
      bundles: [],
    });

    expect(() => buildSourceCode(analysisInput, 'js')).toThrow(
      APIError.parsingError('Unexpected token (3:0)', { line: 3 }),
    );
  });

  it('should build JavaScript code with TypeScript ESLint parser', async () => {
    console.log = jest.fn();

    const filePath = path.join(__dirname, 'fixtures', 'build-js', 'file.js');
    const {
      ast: {
        body: [stmt],
      },
    } = buildSourceCode(await jsTsInput({ filePath }), 'js');

    expect(stmt.type).toEqual('FunctionDeclaration');
  });

  it('should fail building JavaScript code with TypeScript ESLint parser', async () => {
    console.log = jest.fn();

    const filePath = path.join(__dirname, 'fixtures', 'build-js', 'malformed.js');
    const analysisInput = await jsTsInput({ filePath });
    expect(() => buildSourceCode(analysisInput, 'js')).toThrow(Error('Unexpected token (3:0)'));

    const log = `DEBUG Failed to parse ${filePath} with TypeScript parser: '}' expected.`;
    expect(console.log).toHaveBeenCalledWith(log);
  });

  it('should build module JavaScript code', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'build-js', 'module.js');
    setContext({
      workDir: '/tmp/dir',
      shouldUseTypeScriptParserForJS: false,
      sonarlint: false,
      bundles: [],
    });
    const sourceCode = buildSourceCode(await jsTsInput({ filePath }), 'js');

    expect(sourceCode.ast.sourceType).toEqual('module');
  });

  it('should build script JavaScript code', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'build-js', 'script.js');
    setContext({
      workDir: '/tmp/dir',
      shouldUseTypeScriptParserForJS: false,
      sonarlint: false,
      bundles: [],
    });
    const sourceCode = buildSourceCode(await jsTsInput({ filePath }), 'js');

    expect(sourceCode.ast.sourceType).toEqual('script');
  });

  it('should support JavaScript decorators', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'build-js', 'decorator.js');
    setContext({
      workDir: '/tmp/dir',
      shouldUseTypeScriptParserForJS: false,
      sonarlint: false,
      bundles: [],
    });
    const {
      ast: {
        body: [stmt],
      },
    } = buildSourceCode(await jsTsInput({ filePath }), 'js');

    expect((stmt as any).decorators).toHaveLength(1);
    expect((stmt as any).decorators[0].expression.name).toEqual('annotation');
    expect((stmt as any).decorators[0].type).toEqual('Decorator');
  });

  it('should build TypeScript code', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'build-ts', 'file.ts');
    const tsConfigs = [path.join(__dirname, 'fixtures', 'build-ts', 'tsconfig.json')];

    const {
      ast: {
        body: [stmt],
      },
    } = buildSourceCode(await jsTsInput({ filePath, tsConfigs }), 'ts');
    expect(stmt.type).toEqual('FunctionDeclaration');
  });

  it('should fail building malformed TypeScript code', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'build-ts', 'malformed.ts');
    const tsConfigs = [path.join(__dirname, 'fixtures', 'build-ts', 'tsconfig.json')];
    const analysisInput = await jsTsInput({ filePath, tsConfigs });
    expect(() => buildSourceCode(analysisInput, 'ts')).toThrow(
      APIError.parsingError(`'}' expected.`, { line: 2 }),
    );
  });

  it('should build TypeScript Vue.js code', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'build-ts', 'file.vue');
    const tsConfigs = [path.join(__dirname, 'fixtures', 'build-ts', 'tsconfig.json')];
    const sourceCode = buildSourceCode(await jsTsInput({ filePath, tsConfigs }), 'ts');

    const {
      ast: {
        body: [stmt],
        templateBody,
      },
    } = sourceCode as AST.ESLintExtendedProgram;
    expect(stmt.type).toEqual('ImportDeclaration');
    expect(templateBody).toBeDefined();
  });

  it('should build Vue.js code with JavaScript parser', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'build-vue', 'js.vue');
    setContext({
      workDir: '/tmp/dir',
      shouldUseTypeScriptParserForJS: false,
      sonarlint: false,
      bundles: [],
    });
    const sourceCode = buildSourceCode(await jsTsInput({ filePath }), 'ts');

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
    setContext({
      workDir: '/tmp/dir',
      shouldUseTypeScriptParserForJS: false,
      sonarlint: false,
      bundles: [],
    });
    expect(() => buildSourceCode(analysisInput, 'js')).toThrow(
      APIError.parsingError('Unexpected token (3:0)', { line: 7 }),
    );
  });

  it('should build Vue.js code with TypeScript ESLint parser', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'build-vue', 'ts.vue');
    const sourceCode = buildSourceCode(await jsTsInput({ filePath }), 'ts');

    expect(sourceCode.ast).toBeDefined();
  });

  it('should fail building malformed Vue.js code with TypeScript ESLint parser', async () => {
    console.log = jest.fn();

    const filePath = path.join(__dirname, 'fixtures', 'build-vue', 'malformed.vue');
    const analysisInput = await jsTsInput({ filePath });
    expect(() => buildSourceCode(analysisInput, 'ts')).toThrow(Error('Expression expected.'));

    const log = `DEBUG Failed to parse ${filePath} with TypeScript parser: Expression expected.`;
    expect(console.log).toHaveBeenCalledWith(log);
  });
});
