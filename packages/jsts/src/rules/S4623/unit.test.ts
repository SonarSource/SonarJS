/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
import { RuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { describe, it } from 'node:test';

describe('S4623', () => {
  it('S4623', () => {
    const ruleTester = new RuleTester();
    ruleTester.run(`"undefined" should not be passed as the value of optional parameters`, rule, {
      valid: [
        {
          code: `
      function foo(p1: number | undefined, p2?: number, p3 = 42) {}
      foo(1, 2, 3);
      `,
        },
        {
          code: `
      function foo(p1: number | undefined, p2?: number, p3 = 42) {}
      foo(1, 2);
      `,
        },
        {
          code: `
      function foo(p1: number | undefined, p2?: number, p3 = 42) {}
      foo(1);
      `,
        },
        {
          code: `
      function foo(p1: number | undefined, p2?: number, p3 = 42) {}
      foo(1, 2, [undefined].length);
      `,
        },
        {
          code: `
      function foo(p1: number | undefined, p2?: number, p3 = 42) {}
      foo(undefined); // OK, it's not an optional parameter 
      `,
        },
        {
          code: `unknownCalled(1, undefined);`,
        },
        {
          code: `
      function bar() {}
      bar(undefined); // compile error but we should not explode
      `,
        },
      ],
      invalid: [
        {
          code: `
      function foo(p1: number | undefined, p2?: number, p3 = 42) {}
      foo(1, 2, undefined);
      `,
          errors: [
            {
              message: `Remove this redundant "undefined".`,
              line: 3,
              endLine: 3,
              column: 17,
              endColumn: 26,
              suggestions: [
                {
                  desc: 'Remove this redundant argument',
                  output: `
      function foo(p1: number | undefined, p2?: number, p3 = 42) {}
      foo(1, 2);
      `,
                },
              ],
            },
          ],
        },
        {
          code: `
      function foo(p1: number | undefined, p2?: number, p3 = 42) {}
      foo(1, undefined, undefined);
      foo(1, undefined);
      `,
          errors: 2,
        },
        {
          code: `
      let funcExprWithOneParameter = function(p = 42) {}
      funcExprWithOneParameter(undefined);
      funcExprWithOneParameter(1);
      `,
          errors: 1,
        },
        {
          code: `function foo(p = 42) {}; foo(undefined);`,
          errors: [
            {
              messageId: 'removeUndefined',
              suggestions: [
                {
                  desc: 'Remove this redundant argument',
                  output: 'function foo(p = 42) {}; foo();',
                },
              ],
            },
          ],
        },
        {
          code: `function foo(p = 42) {}; foo(undefined, );`,
          errors: [
            {
              messageId: 'removeUndefined',
              suggestions: [
                {
                  desc: 'Remove this redundant argument',
                  output: 'function foo(p = 42) {}; foo();',
                },
              ],
            },
          ],
        },
        {
          code: `function foo(p, q = 42) {}; foo(1, undefined);`,
          errors: [
            {
              messageId: 'removeUndefined',
              suggestions: [
                {
                  desc: 'Remove this redundant argument',
                  output: 'function foo(p, q = 42) {}; foo(1);',
                },
              ],
            },
          ],
        },
        {
          code: `function foo(p, q = 42) {}; foo(1, undefined, );`,
          errors: [
            {
              messageId: 'removeUndefined',
              suggestions: [
                {
                  desc: 'Remove this redundant argument',
                  output: 'function foo(p, q = 42) {}; foo(1, );',
                },
              ],
            },
          ],
        },
      ],
    });
  });
});
