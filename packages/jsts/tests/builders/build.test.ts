/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import path from 'path';
import { AST } from 'vue-eslint-parser';
import { jsTsInput } from '../tools/helpers/input.js';
import { describe, it, beforeEach, mock, Mock } from 'node:test';
import { expect } from 'expect';
import { setContext } from '../../../shared/src/helpers/context.js';
import { build } from '../../src/builders/build.js';
import { APIError } from '../../../shared/src/errors/error.js';

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
    const filePath = path.join(import.meta.dirname, 'fixtures', 'build', 'file.js');
    const {
      ast: {
        body: [stmt],
      },
    } = build(await jsTsInput({ filePath }), 'js').sourceCode;

    expect(stmt.type).toEqual('VariableDeclaration');
  });

  it('should build JavaScript source code with TypeScript ESLint parser', async () => {
    setContext({
      workDir: '/tmp/dir',
      shouldUseTypeScriptParserForJS: true,
      sonarlint: false,
      bundles: [],
    });

    const filePath = path.join(import.meta.dirname, 'fixtures', 'build', 'file.js');
    const {
      ast: {
        body: [stmt],
      },
    } = build(await jsTsInput({ filePath }), 'js').sourceCode;

    expect(stmt.type).toEqual('VariableDeclaration');
  });

  it('should build JavaScript Vue.js source code', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'build', 'js.vue');

    const {
      ast: {
        body: [stmt],
      },
    } = build(await jsTsInput({ filePath }), 'js').sourceCode;
    expect(stmt.type).toEqual('ExportDefaultDeclaration');
  });

  it('should build TypeScript source code', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'build', 'file.ts');
    const tsConfigs = [path.join(import.meta.dirname, 'fixtures', 'build', 'tsconfig.json')];
    const {
      ast: {
        body: [stmt],
      },
    } = build(await jsTsInput({ filePath, tsConfigs }), 'ts').sourceCode;

    expect(stmt.type).toEqual('TSTypeAliasDeclaration');
  });

  it('should build TypeScript Vue.js source code', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'build', 'ts.vue');
    const tsConfigs = [path.join(import.meta.dirname, 'fixtures', 'build', 'tsconfig.json')];
    const {
      ast: {
        body: [stmt],
      },
    } = build(await jsTsInput({ filePath, tsConfigs }), 'ts').sourceCode;

    expect(stmt.type).toEqual('ExportDefaultDeclaration');
  });

  it('should build JavaScript code', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'build-js', 'file.js');
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
    } = build(await jsTsInput({ filePath }), 'js').sourceCode;

    expect(stmt.type).toEqual('FunctionDeclaration');
  });

  it('should fail building malformed JavaScript code', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'build-js', 'malformed.js');

    const analysisInput = await jsTsInput({ filePath });
    setContext({
      workDir: '/tmp/dir',
      shouldUseTypeScriptParserForJS: false,
      sonarlint: false,
      bundles: [],
    });

    expect(() => build(analysisInput, 'js')).toThrow(
      APIError.parsingError('Unexpected token (3:0)', { line: 3 }),
    );
  });

  it('should build JavaScript code with TypeScript ESLint parser', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'build-js', 'file.js');
    const {
      ast: {
        body: [stmt],
      },
    } = build(await jsTsInput({ filePath }), 'js').sourceCode;

    expect(stmt.type).toEqual('FunctionDeclaration');
  });

  it('should fail building JavaScript code with TypeScript ESLint parser', async () => {
    console.log = mock.fn();

    const filePath = path.join(import.meta.dirname, 'fixtures', 'build-js', 'malformed.js');
    const analysisInput = await jsTsInput({ filePath });
    expect(() => build(analysisInput, 'js')).toThrow(Error('Unexpected token (3:0)'));

    const log = `DEBUG Failed to parse ${filePath} with typescript-eslint/parser: '}' expected.`;
    const logs = (console.log as Mock<typeof console.log>).mock.calls.map(
      call => call.arguments[0],
    );
    expect(logs).toContain(log);
  });

  it('should build module JavaScript code', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'build-js', 'module.js');
    setContext({
      workDir: '/tmp/dir',
      shouldUseTypeScriptParserForJS: false,
      sonarlint: false,
      bundles: [],
    });
    const sourceCode = build(await jsTsInput({ filePath }), 'js').sourceCode;

    expect(sourceCode.ast.sourceType).toEqual('module');
  });

  it('should build script JavaScript code', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'build-js', 'script.js');
    setContext({
      workDir: '/tmp/dir',
      shouldUseTypeScriptParserForJS: false,
      sonarlint: false,
      bundles: [],
    });
    const sourceCode = build(await jsTsInput({ filePath }), 'js').sourceCode;

    expect(sourceCode.ast.sourceType).toEqual('script');
  });

  it('should support JavaScript decorators', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'build-js', 'decorator.js');
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
    } = build(await jsTsInput({ filePath }), 'js').sourceCode;

    expect((stmt as any).decorators).toHaveLength(1);
    expect((stmt as any).decorators[0].expression.name).toEqual('annotation');
    expect((stmt as any).decorators[0].type).toEqual('Decorator');
  });

  it('should build TypeScript code', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'build-ts', 'file.ts');
    const tsConfigs = [path.join(import.meta.dirname, 'fixtures', 'build-ts', 'tsconfig.json')];

    const {
      ast: {
        body: [stmt],
      },
    } = build(await jsTsInput({ filePath, tsConfigs }), 'ts').sourceCode;
    expect(stmt.type).toEqual('FunctionDeclaration');
  });

  it('should fail building malformed TypeScript code', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'build-ts', 'malformed.ts');
    const tsConfigs = [path.join(import.meta.dirname, 'fixtures', 'build-ts', 'tsconfig.json')];
    const analysisInput = await jsTsInput({ filePath, tsConfigs });
    expect(() => build(analysisInput, 'ts')).toThrow(
      APIError.parsingError(`'}' expected.`, { line: 2 }),
    );
  });

  it('should build TypeScript Vue.js code', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'build-ts', 'file.vue');
    const tsConfigs = [path.join(import.meta.dirname, 'fixtures', 'build-ts', 'tsconfig.json')];
    const sourceCode = build(await jsTsInput({ filePath, tsConfigs }), 'ts').sourceCode;

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
    const filePath = path.join(import.meta.dirname, 'fixtures', 'build-vue', 'js.vue');
    setContext({
      workDir: '/tmp/dir',
      shouldUseTypeScriptParserForJS: false,
      sonarlint: false,
      bundles: [],
    });
    const sourceCode = build(await jsTsInput({ filePath }), 'ts').sourceCode;

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
    const filePath = path.join(import.meta.dirname, 'fixtures', 'build-vue', 'malformed.vue');

    const analysisInput = await jsTsInput({ filePath });
    setContext({
      workDir: '/tmp/dir',
      shouldUseTypeScriptParserForJS: false,
      sonarlint: false,
      bundles: [],
    });
    expect(() => build(analysisInput, 'js')).toThrow(
      APIError.parsingError('Unexpected token (3:0)', { line: 7 }),
    );
  });

  it('should build Vue.js code with TypeScript ESLint parser', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'build-vue', 'ts.vue');
    const sourceCode = build(await jsTsInput({ filePath }), 'ts').sourceCode;

    expect(sourceCode.ast).toBeDefined();
  });

  it('should fail building malformed Vue.js code with TypeScript ESLint parser', async () => {
    console.log = mock.fn();

    const filePath = path.join(import.meta.dirname, 'fixtures', 'build-vue', 'malformed.vue');
    const analysisInput = await jsTsInput({ filePath });
    expect(() => build(analysisInput, 'ts')).toThrow(Error('Expression expected.'));

    const log = `DEBUG Failed to parse ${filePath} with vue-eslint-parser: Expression expected.`;
    const logs = (console.log as Mock<typeof console.log>).mock.calls.map(
      call => call.arguments[0],
    );
    expect(logs).toContain(log);
  });
});
