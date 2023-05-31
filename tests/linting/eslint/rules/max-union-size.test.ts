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
import { RuleTester } from 'eslint';
import { rule } from 'linting/eslint/rules/max-union-size';

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: { ecmaVersion: 2018 },
});

const DEFAULT_THRESHOLD = 3;
const CUSTOM_THRESHOLD = 4;

ruleTester.run('Union types should not have too many elements', rule, {
  valid: [
    {
      code: `let smallUnionType: number | boolean | string;`,
      options: [DEFAULT_THRESHOLD],
    },
    {
      code: `let smallUnionType: number | boolean | string | any[];`,
      options: [CUSTOM_THRESHOLD],
    },
    {
      code: `function smallUnionType(a: number | boolean) {}`,
      options: [DEFAULT_THRESHOLD],
    },
    {
      code: `type T = A | B | C | D;`,
      options: [DEFAULT_THRESHOLD],
    },
    {
      code: `
        type T = A | B | C | D;
        function okFn(a: T) {}`,
      options: [DEFAULT_THRESHOLD],
    },
    {
      code: `
        type T = A | B | C | D;
        let okVarA : T;`,
      options: [DEFAULT_THRESHOLD],
    },
    {
      code: `
        type T = A | B | C | D;
        let okFunctionType: (param: any) => T`,
      options: [DEFAULT_THRESHOLD],
    },
    {
      code: `
        type T = A | B | C | D;
        let okTupleType: [string, T];`,
      options: [DEFAULT_THRESHOLD],
    },
    {
      code: `
        interface Foo {
          a: string;
          b: number;
          c: boolean;
          d: undefined;
          e: 'hello, world!';
          f: 42;
        };
        type Bar = Pick<Foo, 'a' | 'b' | 'c' | 'd'>;
      `,
      options: [DEFAULT_THRESHOLD],
    },
  ],
  invalid: [
    {
      code: `let nokVarA: A | B | C | D`,
      options: [DEFAULT_THRESHOLD],
      errors: [
        {
          message: `Refactor this union type to have less than ${DEFAULT_THRESHOLD} elements.`,
          line: 1,
          endLine: 1,
          column: 14,
          endColumn: 27,
        },
      ],
    },
    {
      code: `let nokVarA: A | B | C | D | E`,
      options: [CUSTOM_THRESHOLD],
      errors: [
        {
          message: `Refactor this union type to have less than ${CUSTOM_THRESHOLD} elements.`,
          line: 1,
          endLine: 1,
          column: 14,
          endColumn: 31,
        },
      ],
    },
    {
      code: `function nokFn(a: A | B | C | D) {}`,
      options: [DEFAULT_THRESHOLD],
      errors: [
        {
          message: `Refactor this union type to have less than ${DEFAULT_THRESHOLD} elements.`,
        },
      ],
    },
    {
      code: `let nokFunctionType: (param: any) => A | B | C | D`,
      options: [DEFAULT_THRESHOLD],
      errors: [
        {
          message: `Refactor this union type to have less than ${DEFAULT_THRESHOLD} elements.`,
        },
      ],
    },
    {
      code: `let nokTupleType : [string, A | B | C | D];`,
      options: [DEFAULT_THRESHOLD],
      errors: [
        {
          message: `Refactor this union type to have less than ${DEFAULT_THRESHOLD} elements.`,
        },
      ],
    },
    {
      code: `interface nokInterfaceDeclaration {
        prop: A | B | C | D;
      }`,
      options: [DEFAULT_THRESHOLD],
      errors: [
        {
          message: `Refactor this union type to have less than ${DEFAULT_THRESHOLD} elements.`,
        },
      ],
    },
    {
      code: `type U = (A | B | C | D) & E;`,
      options: [DEFAULT_THRESHOLD],
      errors: [
        {
          message: `Refactor this union type to have less than ${DEFAULT_THRESHOLD} elements.`,
        },
      ],
    },
  ],
});
