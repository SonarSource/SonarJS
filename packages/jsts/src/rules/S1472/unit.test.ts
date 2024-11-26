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
import { rule } from './index.js';
import { TypeScriptRuleTester } from '../../../tests/tools/index.js';

const ruleTester = new TypeScriptRuleTester();
ruleTester.run(`Function call arguments should not start on new lines`, rule, {
  valid: [
    {
      code: `
        foo(bar);
      `,
    },
    {
      code: `
        foo(bar)(baz)(qux);
      `,
    },
    {
      code: `
        foo(bar)
          (baz)
          (qux);
      `,
    },
    {
      code: `
        foo
          (bar, baz, qux);
      `,
    },
    {
      code: `
      (foo
      )((bar));
      `,
    },
    {
      code: `
      const MyContext = React.createContext<{
        foo: number,
        bar: number,
      }>({ foo: 1, bar: 2 });
      `,
    },
    {
      code: `
      const MyContext = React.createContext
      <string>('foo');
      `,
    },
  ],
  invalid: [
    {
      code: `
      foo
        (bar);`,
      errors: [
        {
          message: `Make those call arguments start on line 2.`,
          line: 3,
          endLine: 3,
          column: 9,
          endColumn: 14,
        },
      ],
    },
    {
      code: `(function iieflike(factory){}
      (function () {
          //A lot of code...
        }
      ))`,
      errors: [
        {
          message: `Make those call arguments start on line 1.`,
          line: 2,
          column: 7,
        },
      ],
    },
    {
      code: `
      foo(bar)[baz]
        (qux);
      `,
      errors: 1,
    },
    {
      code: `
      var a = b
      (x || y).doSomething()
      `,
      errors: 1,
    },
    {
      code: `
      var a = (a || b)
      (x || y).doSomething()
      `,
      errors: 1,
    },
    {
      code: `
      var a = (a || b)
      (x).doSomething()
      `,
      errors: 1,
    },
    {
      code: `
      var a = b
          (x || y).doSomething()
      `,
      errors: 1,
    },
    {
      code: 'let x = function() {}\n `hello`',
      errors: [
        {
          message: `Make this template literal start on line 1.`,
          line: 2,
          endLine: 2,
          column: 2,
          endColumn: 3,
        },
      ],
    },
    {
      code: 'let x = function() {}\nx\n`hello`',
      errors: [
        {
          message: `Make this template literal start on line 2.`,
          line: 3,
          endLine: 3,
          column: 1,
          endColumn: 2,
        },
      ],
    },
    {
      code: `
      const MyContext = React.createContext<{
        foo: number,
        bar: number,
      }>
      ({ foo: 1, bar: 2 });
      `,
      errors: [
        {
          message: 'Make those call arguments start on line 5.',
          line: 6,
          endLine: 6,
          column: 7,
          endColumn: 27,
        },
      ],
    },
    {
      code: `
      const MyContext = React.createContext<string>
      ('foo');
      `,
      errors: [
        {
          message: 'Make those call arguments start on line 2.',
          line: 3,
          endLine: 3,
          column: 7,
          endColumn: 14,
        },
      ],
    },
  ],
});
