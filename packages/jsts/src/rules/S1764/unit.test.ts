/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import { rule } from './rule.js';
import { JavaScriptRuleTester } from '../../../tests/tools/index.js';

const ruleTester = new JavaScriptRuleTester();

ruleTester.run('no-identical-expressions', rule, {
  valid: [
    { code: `1 << 1;` },
    { code: `1n << 1n;` },
    { code: `foo(), foo();` },
    { code: `if (Foo instanceof Foo) { }` },
    {
      code: `name === "any" || name === "string" || name === "number" || name === "boolean" || name === "never"`,
    },
    { code: `a != a;` },
    { code: `a === a;` },
    { code: `a !== a;` },

    { code: `node.text === "eval" || node.text === "arguments";` },
    { code: `nodeText === '"use strict"' || nodeText === "'use strict'";` },
    { code: `name.charCodeAt(0) === CharacterCodes._ && name.charCodeAt(1) === CharacterCodes._;` },
    { code: `if (+a !== +b) { }` },
    { code: 'first(`const`) || first(`var`);' },
    {
      code: 'window[`${prefix}CancelAnimationFra  me`] || window[`${prefix}CancelRequestAnimationFrame`];',
    },
    { code: '' },
    { code: `dirPath.match(/localhost:\d+/) || dirPath.match(/localhost:\d+\s/);` },
    { code: `a == b || a == c;` },
    { code: `a == b;` },
  ],
  invalid: [
    {
      code: 'a == b && a == b',
      errors: [
        {
          messageId: 'correctIdenticalSubExpressions',
          data: {
            operator: '&&',
          },
          column: 1,
          endColumn: 17,
        },
      ],
    },
    {
      code: 'a == b || a == b',
      errors: [
        {
          messageId: 'correctIdenticalSubExpressions',
          data: {
            operator: '||',
          },
        },
      ],
    },
    {
      code: `a == b || a == b
      //     ^^^^^^>   ^^^^^^`,
      options: ['sonar-runtime'],
      errors: [
        {
          messageId: 'sonarRuntime',
          data: {
            operator: '||',
            sonarRuntimeData: JSON.stringify({
              message:
                'Correct one of the identical sub-expressions on both sides of operator "||"',
              secondaryLocations: [
                {
                  column: 0,
                  line: 1,
                  endColumn: 6,
                  endLine: 1,
                },
              ],
            }),
          },
          line: 1,
          endLine: 1,
          column: 11,
          endColumn: 17,
        },
      ],
    },
    {
      code: 'a > a',
      errors: [
        {
          messageId: 'correctIdenticalSubExpressions',
          data: {
            operator: '>',
          },
        },
      ],
    },
    {
      code: 'a >= a',
      errors: [
        {
          messageId: 'correctIdenticalSubExpressions',
          data: {
            operator: '>=',
          },
        },
      ],
    },
    {
      code: 'a < a',
      errors: [
        {
          messageId: 'correctIdenticalSubExpressions',
          data: {
            operator: '<',
          },
        },
      ],
    },
    {
      code: 'a <= a',
      errors: [
        {
          messageId: 'correctIdenticalSubExpressions',
          data: {
            operator: '<=',
          },
        },
      ],
    },
    {
      code: '5 / 5',
      errors: [
        {
          messageId: 'correctIdenticalSubExpressions',
          data: {
            operator: '/',
          },
        },
      ],
    },
    {
      code: '5 - 5',
      errors: [
        {
          messageId: 'correctIdenticalSubExpressions',
          data: {
            operator: '-',
          },
        },
      ],
    },
    {
      code: 'a << a',
      errors: [
        {
          messageId: 'correctIdenticalSubExpressions',
          data: {
            operator: '<<',
          },
        },
      ],
    },
    {
      code: 'a << a',
      errors: [
        {
          messageId: 'correctIdenticalSubExpressions',
          data: {
            operator: '<<',
          },
        },
      ],
    },
    {
      code: 'a >> a',
      errors: [
        {
          messageId: 'correctIdenticalSubExpressions',
          data: {
            operator: '>>',
          },
        },
      ],
    },
    {
      code: '1 >> 1',
      errors: [
        {
          messageId: 'correctIdenticalSubExpressions',
          data: {
            operator: '>>',
          },
        },
      ],
    },
    {
      code: '5 << 5',
      errors: [
        {
          messageId: 'correctIdenticalSubExpressions',
          data: {
            operator: '<<',
          },
        },
      ],
    },
    {
      code: 'obj.foo() == obj.foo()',
      errors: [
        {
          messageId: 'correctIdenticalSubExpressions',
          data: {
            operator: '==',
          },
        },
      ],
    },
    {
      code: 'foo(/*comment*/() => doSomething()) === foo(() => doSomething())',
      errors: [
        {
          messageId: 'correctIdenticalSubExpressions',
          data: {
            operator: '===',
          },
        },
      ],
    },
    {
      code: '(a == b) == (a == b)',
      errors: [
        {
          messageId: 'correctIdenticalSubExpressions',
          data: {
            operator: '==',
          },
        },
      ],
    },
    {
      code: 'if (+a !== +a);',
      errors: [
        {
          messageId: 'correctIdenticalSubExpressions',
          data: {
            operator: '!==',
          },
        },
      ],
    },
  ],
});
