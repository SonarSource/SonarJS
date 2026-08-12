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
import { NoTypeCheckingRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { describe, it } from 'node:test';
import { expect } from 'expect';
import { Linter } from 'eslint';
import { rules as tsEslintRules } from '../external/typescript-eslint/index.js';
import { parsersMap } from '../../parsers/eslint.js';
import { buildBabelParserOptions } from '../../parsers/options.js';

// Plain .js files (no .ts) are parsed via @babel/eslint-parser with the flow plugin
// (buildBabelParserOptions), never @typescript-eslint/parser. Minimized from real crashes in
// peachee-js's react, react-native, and sam-dash projects (JS-1610 regression, first observed
// 2026-08-11).
//
// The trigger is an *unused* Flow type parameter, regardless of the syntactic form carrying it:
// @babel/eslint-parser emits `def.type === 'TypeParameter'`, which `defToVariableType`'s switch
// (no-unused-vars.js) does not handle. Having no `default` branch, it returns `undefined` and the
// caller immediately reads `.type` off that. The rule only reaches that code path for a variable
// it is about to report, so a type parameter that *is* referenced (see the test using
// `compute<T>(value: T): T` below) stays clear of the bug. Every snippet here therefore leaves
// its type parameter unused.
const FLOW_SNIPPETS = [
  {
    name: 'type alias to a generic function type (sam-dash)',
    code: `
      // @flow
      export type FetchState<U> = <T>(_: number) => T;
    `,
  },
  {
    name: 'arrow function with Flow generic type params (react-native, sam-dash)',
    code: `
      // @flow
      export const isNothing = <U>(fs: number): boolean => true;
    `,
  },
  {
    name: 'generic function declaration',
    code: `
      // @flow
      export function pass<T>(value: number): number {
        return value;
      }
    `,
  },
  {
    name: 'generic class declaration',
    code: `
      // @flow
      export class Box<T> {}
    `,
  },
];

function babelFlowLanguageOptions() {
  return {
    parser: parsersMap.javascript,
    parserOptions: buildBabelParserOptions({}, { jsx: true }),
  };
}

describe('S1481', () => {
  // Characterization test for an upstream bug, kept so the workaround is not silently dropped.
  // It is expected to fail once typescript-eslint adds the missing `default` branch: at that
  // point the crash is gone, and switching rule.ts back to the typescript-eslint rule becomes an
  // option again — delete this suite rather than working around the failure.
  describe('the vendored @typescript-eslint/no-unused-vars still crashes on Flow syntax', () => {
    for (const { name, code } of FLOW_SNIPPETS) {
      it(name, () => {
        const linter = new Linter();
        let crashed = false;
        try {
          linter.verify(code, {
            languageOptions: babelFlowLanguageOptions(),
            plugins: { sonarjs: { rules: { 'no-unused-vars': tsEslintRules['no-unused-vars'] } } },
            rules: { 'sonarjs/no-unused-vars': 'error' },
          });
        } catch (e) {
          expect(e.message).toContain('Cannot read properties of undefined');
          crashed = true;
        }
        expect(crashed).toBeTruthy();
      });
    }
  });

  describe('S1481 on Flow syntax (getESLintCoreRule: no-unused-vars)', () => {
    function lintWithS1481(code: string) {
      const messages = new Linter().verify(code, {
        languageOptions: babelFlowLanguageOptions(),
        plugins: { sonarjs: { rules: { S1481: rule } } },
        rules: { 'sonarjs/S1481': 'error' },
      });
      // Guards against a vacuous pass: a broken parser setup surfaces as a `fatal` message
      // rather than a thrown error, which would otherwise look like a clean run.
      expect(messages.filter(message => message.fatal)).toEqual([]);
      return messages.map(message => message.message);
    }

    for (const { name, code } of FLOW_SNIPPETS) {
      it(`reports nothing on ${name}`, () => {
        // Type parameters are not local variables or functions, so S1481 must stay silent
        // rather than trade the upstream crash for new issues on the same files.
        expect(lintWithS1481(code)).toEqual([]);
      });
    }

    it('still reports genuinely unused locals in a Flow file', () => {
      expect(
        lintWithS1481(`
          // @flow
          export function compute<T>(value: T): T {
            const unusedLocal = 1;
            return value;
          }
        `),
      ).toEqual(["'unusedLocal' is assigned a value but never used."]);
    });
  });

  it('S1481 (decorated: eslint/no-unused-vars)', () => {
    const ruleTester = new NoTypeCheckingRuleTester();

    ruleTester.run('S1481', rule, {
      valid: [
        {
          code: `
            function wrapper() {
              const _unused = 1;
            }
          `,
          options: [{ varsIgnorePattern: '^_' }],
        },
        {
          code: `
            var topLevelUnused = 1;
            let topLevelUnusedToo = 1;
            function topLevelHelper() {}
          `,
        },
        {
          code: `
            export let exportedTopLevelUnused = 1;
          `,
        },
        {
          code: `
            class TopLevelUnused {}
          `,
        },
        {
          code: `
            /*global foo*/
          `,
          languageOptions: { sourceType: 'script' },
        },
        {
          code: `
            function f(unused, used) {
              return used;
            }

            console.log(f(1, 2));
          `,
        },
        {
          code: `
            const { a, ...rest } = foo;

            console.log(rest);
          `,
        },
        {
          code: `
            function f(_unused, used) {
              return used;
            }

            console.log(f(1, 2));
          `,
          options: [{ args: 'all', argsIgnorePattern: '^_' }],
        },
        {
          code: `
            function render(icon) {
              const Icon = icon;
              return <Icon />;
            }
          `,
        },
        {
          code: `
            import { foo } from './foo';

            console.log('used');
          `,
        },
      ],
      invalid: [
        {
          code: `
            function wrapper() {
              const _unused = 1;
            }
          `,
          errors: [{ message: "'_unused' is assigned a value but never used." }],
        },
        {
          code: `
            function wrapper() {
              var localUnused = 1;
            }
          `,
          errors: [{ message: "'localUnused' is assigned a value but never used." }],
        },
        {
          code: `
            function wrapper() {
              function inner() {}
            }
          `,
          errors: [{ message: "'inner' is defined but never used." }],
        },
        {
          code: `
            function f(_unused, used) {
              return used;
            }

            console.log(f(1, 2));
          `,
          options: [{ args: 'all' }],
          errors: [{ message: "'_unused' is defined but never used." }],
        },
        {
          code: `
            function buildQuery(queryParams) {
              const { query: _query, ...queryParamsForCache } = queryParams;

              console.log(queryParamsForCache);
            }
          `,
          errors: [{ message: "'_query' is assigned a value but never used." }],
        },
        {
          code: `
            function assign(foo) {
              let a, rest;

              ({ a, ...rest } = foo);
              console.log(rest);
            }
          `,
          errors: [{ message: "'a' is assigned a value but never used." }],
        },
        {
          code: `
            function render(icon) {
              const UsedIcon = icon;
              const UnusedIcon = icon;

              return <UsedIcon />;
            }
          `,
          errors: [{ message: "'UnusedIcon' is assigned a value but never used." }],
        },
      ],
    });
  });
});
