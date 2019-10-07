/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2019 SonarSource SA
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

import { RuleTester } from "eslint";
import * as path from "path";
import { rule } from "../../src/rules/prefer-optional";

const ruleTester = new RuleTester({
  parser: path.resolve(`${__dirname}/../../node_modules/@typescript-eslint/parser`),
  parserOptions: { ecmaVersion: 2018 },
});

ruleTester.run("Prefer to use optional decorator instead of explicit type", rule, {
  valid: [
    {
      code: `
      interface Foo {
        a?: number;
      }
      `,
    },
    {
      code: `
      class Foo {
        a?: number;
      }
      `,
    },
    {
      code: `
      interface Foo<T> {
        a: Foo<undefined> | number;
      }
      `,
    },
    {
      code: `
      interface Foo {
        a: undefined;
      }
      `,
    },
    {
      code: `function foo(param: number | undefined) {}`,
    },
  ],
  invalid: [
    {
      code: `
      interface Foo {
        a: number | undefined;
      }
      `,
      errors: [
        {
          message:
            "Consider using '?' syntax to declare this property instead of 'undefined' in its type.",
          line: 3,
          column: 9,
          endLine: 3,
          endColumn: 31,
        },
      ],
    },
    {
      code: `
      interface Foo {
        a?: number | undefined;
      }
      `,
      errors: [
        {
          message: "Consider removing redundant 'undefined' type",
          line: 3,
          column: 9,
          endLine: 3,
          endColumn: 32,
        },
      ],
    },
    {
      code: `
      class Foo {
        a?: number | undefined;
      }
      `,
      errors: 1,
    },
    {
      code: `
      const obj: {
        a?: number | undefined;
      }
      `,
      errors: 1,
    },
    {
      code: `
      interface Foo {
        a: number | undefined;
        c: string;
        b?: boolean | null | undefined;
      }
      `,
      errors: 2,
    },
    {
      code: `
      interface Foo {
        [computed]: string | undefined;
      }
      `,
      errors: 1,
    },
    {
      code: `
      interface Foo {
        a: undefined | string | undefined;
      }
      `,
      errors: 1,
    },
  ],
});
