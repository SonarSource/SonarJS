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
import { describe, it } from 'node:test';
import path from 'node:path';
import { normalizeToAbsolutePath } from '../../../../shared/src/helpers/files.js';
import * as reference from '@typescript-eslint/parser';
import plugin from '@typescript-eslint/eslint-plugin';
import { Linter } from 'eslint';
import ts from 'typescript';
import { CompilerContractError } from 'typescript/errors';
import { scopeShape } from './tools/frontend-comparison.js';
import * as owned from '../../../src/jsts/frontend/parser.js';
import { createProgramFromSingleFile } from '../../../src/jsts/program/factory.js';

const cases = [
  ['jsdoc', '/** @jsx jsx */\nimport { jsx } from "any"; /** docs */ const value = 1;'],
  [
    'typescript',
    'type Box<T> = { value: T }; interface Box<T> { other?: T }; const box: Box<number> = { value: 1 };',
  ],
  [
    'namespaces',
    'namespace A { export interface Item {} }; namespace A { export const n = 1 }; enum E { A, B }; let e: E = E.A;',
  ],
  ['imports', 'import type { A } from "a"; import { type B, c } from "b"; export type { A }; c();'],
  [
    'methods',
    'class C { private x = 1; get value() { return this.x; } set value(x: number) { this.x = x; } m<T>(x: T): T { return x; } }',
  ],
  ['lexical', '// line\u2028const re = /a+/gu; /* block */ const text = `a${re}b`; const n = 2n;'],
  [
    'decorators',
    '@sealed class C { @field accessor value = 1; @method run(@arg input: number) {} }',
  ],
  [
    'jsx',
    'const Component = <T,>(p: { value: T }) => <><span value={p.value}>{`a${p.value}`}</span></>;',
  ],
  [
    'ambient',
    'declare namespace Lib { interface A {} } declare global { interface Window { value: string } } export {};',
  ],
] as const;

describe('owned TypeScript front end', () => {
  for (const [name, code] of cases) {
    it(`preserves AST, tokens, comments, scopes and node maps: ${name}`, () => {
      const options = {
        filePath: name === 'jsx' ? 'input.tsx' : 'input.ts',
        sourceType: 'module' as const,
      };
      const expected = reference.parseForESLint(code, options);
      const actual = owned.parseForESLint(code, options);
      assert.deepEqual(actual.ast as unknown, expected.ast);
      assert.deepEqual(actual.visitorKeys, expected.visitorKeys);
      assert.deepEqual(scopeShape(actual), scopeShape(expected));
      const visit = (a: any, b: any) => {
        const actualTs = actual.services.esTreeNodeToTSNodeMap.get(a);
        const expectedTs = expected.services.esTreeNodeToTSNodeMap.get(b);
        assert.deepEqual(
          actualTs && [actualTs.kind, actualTs.pos, actualTs.end],
          expectedTs && [expectedTs.kind, expectedTs.pos, expectedTs.end],
        );
        if (actualTs && expectedTs) {
          assert.deepEqual(
            actual.services.tsNodeToESTreeNodeMap.get(actualTs)?.range,
            expected.services.tsNodeToESTreeNodeMap.get(expectedTs)?.range,
          );
        }
        for (const key of actual.visitorKeys[a.type] ?? []) {
          const av = a[key],
            bv = b[key];
          if (Array.isArray(av))
            av.forEach((node, index) => {
              if (node?.type) visit(node, bv[index]);
            });
          else if (av?.type) visit(av, bv);
        }
      };
      visit(actual.ast, expected.ast);
      assert.equal(actual.services.program, null);
    });
  }

  it('preserves script/global-return scopes and JSX factory references', () => {
    for (const options of [
      { sourceType: 'script' as const, ecmaFeatures: { globalReturn: true } },
      {
        sourceType: 'module' as const,
        jsxPragma: 'h',
        jsxFragmentName: 'Fragment',
        filePath: 'file.tsx',
      },
    ]) {
      const code =
        options.sourceType === 'script'
          ? 'var value = 1; return value;'
          : 'const value = <><div /></>;';
      assert.deepEqual(
        scopeShape(owned.parseForESLint(code, options)),
        scopeShape(reference.parseForESLint(code, options)),
      );
    }
  });

  it('uses the supplied compiler AST and preserves typed findings and fixes', () => {
    const filePath = normalizeToAbsolutePath(path.join(import.meta.dirname, 'typed.ts'));
    const code = `class C { private value = 1; read() { return this.value; } }
      const value = 1 as number; const result = value + 'text'; Promise.resolve(1);`;
    const program = createProgramFromSingleFile(filePath, code, {
      strict: true,
      target: ts.ScriptTarget.ESNext,
    });
    const options = { filePath, programs: [program], sourceType: 'module' as const };
    const actual = owned.parseForESLint(code, options);
    const expected = reference.parseForESLint(code, options);
    assert.equal(actual.services.program, program);
    assert.deepEqual(actual.ast as unknown, expected.ast);
    assert.deepEqual(scopeShape(actual), scopeShape(expected));
    const node = actual.ast.body[0];
    assert.equal(
      actual.services.esTreeNodeToTSNodeMap.get(node),
      program.getSourceFile(filePath)!.statements[0],
    );
    const lint = (parser: typeof owned | typeof reference) =>
      new Linter().verify(
        code,
        {
          files: ['**/*.ts'],
          languageOptions: { parser: parser as any, parserOptions: options },
          plugins: { ts: plugin as any },
          rules: {
            'ts/prefer-readonly': 'error',
            'ts/no-floating-promises': 'error',
            'ts/no-unnecessary-type-assertion': 'error',
          },
        },
        { filename: filePath },
      );
    const findings = lint(owned);
    assert.ok(findings.length > 0);
    assert.ok(findings.every(finding => !finding.fatal && finding.ruleId !== null));
    assert.deepEqual(findings, lint(reference));
  });

  it('preserves a supplied program for Windows paths and relative paths', () => {
    for (const [filePath, tsconfigRootDir] of [
      ['C:/sonarjs/input.ts', undefined],
      [String.raw`C:\sonarjs\input.ts`, undefined],
      ['input.ts', process.cwd()],
      ['input.ts', '.'],
    ]) {
      const normalized = normalizeToAbsolutePath(filePath!, normalizeToAbsolutePath(process.cwd()));
      const program = createProgramFromSingleFile(normalized, 'const value: number = 1;');
      const parsed = owned.parseForESLint('const value: number = 1;', {
        filePath,
        tsconfigRootDir,
        programs: [program],
      });
      assert.equal(parsed.services.program, program);
      assert.equal(
        parsed.services.esTreeNodeToTSNodeMap.get(parsed.ast.body[0]),
        program.getSourceFile(normalized)!.statements[0],
      );
    }
  });

  it('rejects a program returning a declaration file for a source-file path', () => {
    for (const extension of ['ts', 'mts', 'cts']) {
      const filePath = normalizeToAbsolutePath(`/sonarjs/redirect.${extension}`);
      const declarationPath = normalizeToAbsolutePath(`/sonarjs/redirect.d.${extension}`);
      const code = 'declare const value: number;';
      const program = createProgramFromSingleFile(declarationPath, code);
      const redirected = new Proxy(program, {
        get(target, key) {
          return key === 'getSourceFile'
            ? () => program.getSourceFile(declarationPath)
            : Reflect.get(target, key);
        },
      });
      assert.throws(
        () => owned.parseForESLint(code, { filePath, programs: [redirected] }),
        /not found/,
      );
      assert.throws(
        () => reference.parseForESLint(code, { filePath, programs: [redirected] }),
        /not found/,
      );
    }
  });

  it('rejects unsupported automatic project selection explicitly', () => {
    for (const options of [{ project: true }, { projectService: true }]) {
      assert.throws(() => owned.parseForESLint('const value = 1;', options), CompilerContractError);
    }
  });

  it('keeps parse failures and locations equivalent', () => {
    for (const code of ['const value = ;', 'class C {', 'const value = "unterminated']) {
      const fail = (parser: { parseForESLint: (code: string) => unknown }) => {
        try {
          parser.parseForESLint(code);
        } catch (error) {
          return [error.message, error.lineNumber, error.column, error.index];
        }
        assert.fail('Invalid source was accepted');
      };
      assert.deepEqual(fail(owned), fail(reference));
    }
  });
});
