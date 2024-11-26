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
import { NodeRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { fileURLToPath } from 'node:url';

const ruleTester = new NodeRuleTester({
  parser: fileURLToPath(import.meta.resolve('@typescript-eslint/parser')),
  parserOptions: { ecmaVersion: 2018, ecmaFeatures: { jsx: true } },
});

const DEFAULT_THRESHOLD = 3;
const CUSTOM_THRESHOLD = 4;

const createOptions = (threshold: number) => {
  return [{ threshold }];
};

ruleTester.run('Union types should not have too many elements', rule, {
  valid: [
    {
      code: `let smallUnionType: number | boolean | string;`,
      options: createOptions(DEFAULT_THRESHOLD),
    },
    {
      code: `let smallUnionType: number | boolean | string | any[];`,
      options: createOptions(CUSTOM_THRESHOLD),
    },
    {
      code: `function smallUnionType(a: number | boolean) {}`,
      options: createOptions(DEFAULT_THRESHOLD),
    },
    {
      code: `type T = A | B | C | D;`,
      options: createOptions(DEFAULT_THRESHOLD),
    },
    {
      code: `
        type T = A | B | C | D;
        function okFn(a: T) {}`,
      options: createOptions(DEFAULT_THRESHOLD),
    },
    {
      code: `
        type T = A | B | C | D;
        let okVarA : T;`,
      options: createOptions(DEFAULT_THRESHOLD),
    },
    {
      code: `
        type T = A | B | C | D;
        let okFunctionType: (param: any) => T`,
      options: createOptions(DEFAULT_THRESHOLD),
    },
    {
      code: `
        type T = A | B | C | D;
        let okTupleType: [string, T];`,
      options: createOptions(DEFAULT_THRESHOLD),
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
      options: createOptions(DEFAULT_THRESHOLD),
    },
  ],
  invalid: [
    {
      code: `let nokVarA: A | B | C | D`,
      options: createOptions(DEFAULT_THRESHOLD),
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
      options: createOptions(CUSTOM_THRESHOLD),
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
      options: createOptions(DEFAULT_THRESHOLD),
      errors: [
        {
          message: `Refactor this union type to have less than ${DEFAULT_THRESHOLD} elements.`,
        },
      ],
    },
    {
      code: `let nokFunctionType: (param: any) => A | B | C | D`,
      options: createOptions(DEFAULT_THRESHOLD),
      errors: [
        {
          message: `Refactor this union type to have less than ${DEFAULT_THRESHOLD} elements.`,
        },
      ],
    },
    {
      code: `let nokTupleType : [string, A | B | C | D];`,
      options: createOptions(DEFAULT_THRESHOLD),
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
      options: createOptions(DEFAULT_THRESHOLD),
      errors: [
        {
          message: `Refactor this union type to have less than ${DEFAULT_THRESHOLD} elements.`,
        },
      ],
    },
    {
      code: `type U = (A | B | C | D) & E;`,
      options: createOptions(DEFAULT_THRESHOLD),
      errors: [
        {
          message: `Refactor this union type to have less than ${DEFAULT_THRESHOLD} elements.`,
        },
      ],
    },
  ],
});
