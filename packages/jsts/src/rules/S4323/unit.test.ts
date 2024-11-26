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

ruleTester.run('Type aliases should be used', rule, {
  valid: [
    {
      code: `type MyType = string | null | number;`,
    },
    {
      code: `
      type MyType = string | null | number;
      const another: MyType | undefined = "";`,
    },
    {
      code: `
      let x: number | string;
      let y: number | string;
      let z: number | string; // this fine because only 2 types in the union`,
    },
    {
      code: `
      interface A {
        name: string;
        a: number;
      }
      
      interface B {
        name: string;
        b: number;
      }
      
      interface C {
        name: string;
        b: number;
      }`,
    },
    {
      code: `
      // ok, ignore usage inside type alias
      type Alias = number | number[] | undefined;
      function one(x: number | number[] | undefined) {}
      function two(x: number | number[] | undefined) {}`,
    },
    {
      code: `
      let x: number | string | undefined;
      let y: number | string | undefined;
      let z: number | String | undefined; // this fine because case-sensitive`,
    },
    {
      code: `
      let x: T | null | undefined;
      let y: T | null | undefined;
      let z: T | null | undefined; `,
    },
  ],
  invalid: [
    {
      code: `
      function foo(x: string | null | number) {}
      const bar: string | null | number = null;
      function zoo(): string | null | number {}
      `,
      errors: [
        {
          message:
            '{"message":"Replace this union type with a type alias.","secondaryLocations":[{"message":"Following occurrence.","column":17,"line":3,"endColumn":39,"endLine":3},{"message":"Following occurrence.","column":22,"line":4,"endColumn":44,"endLine":4}]}',
          line: 2,
          endLine: 2,
          column: 23,
          endColumn: 45,
        },
      ],
      options: ['sonar-runtime'],
    },
    {
      code: `
      function foo(x: string & null & number) {}
      const bar: string & null & number = null;
      function zoo(): string & null & number {}
      `,
      errors: [
        {
          message:
            '{"message":"Replace this intersection type with a type alias.","secondaryLocations":[{"message":"Following occurrence.","column":17,"line":3,"endColumn":39,"endLine":3},{"message":"Following occurrence.","column":22,"line":4,"endColumn":44,"endLine":4}]}',
          line: 2,
          endLine: 2,
          column: 23,
          endColumn: 45,
        },
      ],
      options: ['sonar-runtime'],
    },
    {
      code: `
      let x: string | null | number;
      let y: number | string | null ;
      let z:   null  |number|     string  ;
      `,
      errors: [
        {
          message:
            '{"message":"Replace this union type with a type alias.","secondaryLocations":[{"message":"Following occurrence.","column":13,"line":3,"endColumn":35,"endLine":3},{"message":"Following occurrence.","column":15,"line":4,"endColumn":40,"endLine":4}]}',
        },
      ],
      options: ['sonar-runtime'],
    },
    {
      code: `
      let x: string & null & number;
      let y: number & string & null ;
      let z:   null  &number&     string  ;
      `,
      errors: [
        {
          message:
            '{"message":"Replace this intersection type with a type alias.","secondaryLocations":[{"message":"Following occurrence.","column":13,"line":3,"endColumn":35,"endLine":3},{"message":"Following occurrence.","column":15,"line":4,"endColumn":40,"endLine":4}]}',
        },
      ],
      options: ['sonar-runtime'],
    },
    {
      code: `
      let x: A | B | C;
      let y: A | B | C;
      let z: A | B | C;
      `,
      errors: [
        {
          message:
            '{"message":"Replace this union type with a type alias.","secondaryLocations":[{"message":"Following occurrence.","column":13,"line":3,"endColumn":22,"endLine":3},{"message":"Following occurrence.","column":13,"line":4,"endColumn":22,"endLine":4}]}',
        },
      ],
      options: ['sonar-runtime'],
    },
  ],
});
