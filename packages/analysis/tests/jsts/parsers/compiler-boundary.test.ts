/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { describe, it } from 'node:test';
import ts, { SyntaxKind } from 'typescript';
import { CompilerContractError } from 'typescript/errors';
import { parsersMap } from '../../../src/jsts/parsers/eslint.js';
import { parse } from '../../../src/jsts/parsers/parse.js';
import { build } from '../../../src/jsts/builders/build.js';
import { jsTsInput } from '../tools/helpers/input.js';

const require = createRequire(import.meta.url);

describe('single compiler boundary', () => {
  it('shares one compiler interface with upstream rules, helpers and legacy entry points', () => {
    for (const consumer of [
      '@typescript-eslint/eslint-plugin',
      '@typescript-eslint/type-utils',
      'ts-api-utils',
    ]) {
      const dependencyRequire = createRequire(require.resolve(consumer));
      assert.equal(dependencyRequire('typescript'), ts);
    }
    assert.equal(require('typescript/lib/typescript.js'), ts);
    assert.equal(require('typescript/lib/tsserverlibrary.js'), ts);
    assert.equal(SyntaxKind, ts.SyntaxKind);
    assert.equal(require('typescript/package.json').version, ts.version);
    assert.throws(() => (ts as any).transpileModule, /Unsupported SonarJS compiler operation/);
  });

  it('propagates compiler failures without wrapping them or falling back to JavaScript', async () => {
    const input = await jsTsInput({
      filePath: '/sonarjs/contract.js',
      fileContent: 'const value = 1;',
      language: 'js',
      allowTsParserJsFiles: true,
    });
    const original = parsersMap.typescript;
    const failure = new CompilerContractError('Unsupported provider operation');
    parsersMap.typescript = {
      ...original,
      parseForESLint() {
        throw failure;
      },
    };
    try {
      assert.throws(
        () => parse(input.fileContent, parsersMap.typescript, {}),
        error => error === failure,
      );
      assert.throws(
        () => build(input),
        error => error === failure,
      );
    } finally {
      parsersMap.typescript = original;
    }
  });

  it('runs production parsing and Vue delegation without invoking upstream front-end entry points', () => {
    const parserUrl = new URL('../../../src/jsts/parsers/eslint.js', import.meta.url).href;
    const helpersUrl = new URL('../../../../shared/src/helpers/files.js', import.meta.url).href;
    const factoryUrl = new URL('../../../src/jsts/program/factory.js', import.meta.url).href;
    // The same test runs against TS sources and against the compiled JS test tree.
    execFileSync(
      process.execPath,
      [
        '--import',
        'tsx',
        '--input-type=module',
        '-e',
        `
      import assert from 'node:assert/strict';
      import Module from 'node:module';
      const original = Module._load;
      const forbidden = new Map([
        ['@typescript-eslint/parser', ['parse', 'parseForESLint']],
        ['@typescript-eslint/typescript-estree', ['parse', 'parseAndGenerateServices']],
        ['@typescript-eslint/scope-manager', ['analyze']],
      ]);
      Module._load = function(name, ...args) {
        const exports = original.call(this, name, ...args);
        if (!forbidden.has(name)) return exports;
        return new Proxy(exports, { get(target, key) {
          if (forbidden.get(name).includes(key)) return () => { throw new Error('Forbidden upstream invocation: ' + name + '.' + key); };
          return target[key];
        }});
      };
      const {parsersMap} = await import(${JSON.stringify(parserUrl)});
      const {createProgramFromSingleFile} = await import(${JSON.stringify(factoryUrl)});
      const {normalizeToAbsolutePath} = await import(${JSON.stringify(helpersUrl)});
      const filePath = normalizeToAbsolutePath('/sonarjs/compiler-boundary.ts');
      const code = 'const value: number = 1;';
      const program = createProgramFromSingleFile(filePath, code);
      const parsed = parsersMap.typescript.parseForESLint(code, {filePath, programs: [program]});
      assert.equal(parsed.services.program, program);
      const declaration = parsed.ast.body[0].declarations[0];
      assert.equal(program.getTypeChecker().typeToString(parsed.services.getTypeAtLocation(declaration.id)), 'number');
      const vue = parsersMap.vuejs.parseForESLint('<script lang="ts">const value: number = 1;</script>', {
        parser: parsersMap.typescript, filePath: '/sonarjs/component.vue', sourceType: 'module'
      });
      assert.equal(vue.ast.body[0].type, 'VariableDeclaration');
    `,
      ],
      { encoding: 'utf8', stdio: 'pipe' },
    );
  });
});
