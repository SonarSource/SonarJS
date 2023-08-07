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
import { TypeScriptRuleTester } from '../../../tools';
import { rule } from '@sonar/jsts/rules/no-undefined-argument';

const ruleTester = new TypeScriptRuleTester();
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
