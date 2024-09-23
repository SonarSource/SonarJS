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
import { rule } from './/index.js';
import { RuleTester } from 'eslint';

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: { ecmaVersion: 2018 },
});

ruleTester.run('Optional boolean parameters should have default value', rule, {
  valid: [
    {
      code: `function f(b: boolean = false) {}`,
    },
    {
      code: `function f(b: boolean | undefined = true) {}`,
    },
    {
      code: `function f(b: boolean | string) {}`,
    },
    {
      code: `function f(b: boolean & string) {}`,
    },
    {
      code: `function f(b?: string) {}`,
    },
    {
      code: `abstract class A{
                abstract foo(p?: boolean): number;
            }`,
    },
    {
      code: `function foo(b?: boolean);`,
    },
    {
      code: `interface i {
              m(b?: boolean): void;
              new (b?: boolean): void; // Construct signatures can not contain initializer
              (b?: boolean): void; // Call signatures can not contain initializer
            }`,
    },
    {
      code: `type Foo = (p?: boolean) => void; //A parameter initializer is only allowed in a function or constructor implementation`,
    },
  ],
  invalid: [
    {
      code: `function f(b?: boolean) {}`,
      errors: [
        {
          message: `Provide a default value for 'b' so that the logic of the function is more evident when this parameter is missing. Consider defining another function if providing default value is not possible.`,
          line: 1,
          endLine: 1,
          column: 12,
          endColumn: 23,
        },
      ],
    },
    {
      code: `function f(b: boolean | undefined) {}`,
      errors: 1,
    },
    {
      code: `function f(b: undefined | boolean) {}`,
      errors: 1,
    },
    {
      code: `let f = (b?: boolean) => b;`,
      errors: 1,
    },
    {
      code: `
      class c {
        m(b?: boolean): void {}
      }
      `,
      errors: 1,
    },
  ],
});
