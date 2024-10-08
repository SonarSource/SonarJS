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
import { RuleTester } from 'eslint';
import { rule } from './index.js';

import Module from 'node:module';
const require = Module.createRequire(import.meta.url);
const tsParserPath = require.resolve('@typescript-eslint/parser');
const ruleTester = new RuleTester({
  parserOptions: { ecmaVersion: 2018, sourceType: 'module' },
  parser: tsParserPath,
});

ruleTester.run(
  'Union and intersection types should not be defined with duplicated elements',
  rule,
  {
    valid: [
      {
        code: `
      interface Person {
        age: number;
        name: string;
      }
      interface Loggable<T> {
        log(param: T): string;
      }
      type okUnion = number | string;
      type okUnionWithDifferentTypeParam = Loggable<number> | Loggable<string>;
      type okIntersection = Person & Loggable<Person>;`,
      },
    ],
    invalid: [
      {
        code: `type nokUDuplicate = number | number | string;`,
        errors: [
          {
            message: `{"message":"Remove this duplicated type or replace with another one.","secondaryLocations":[{"message":"Original","column":21,"line":1,"endColumn":27,"endLine":1}]}`,
            line: 1,
            endLine: 1,
            column: 31,
            endColumn: 37,
          },
        ],
        options: ['sonar-runtime'],
      },

      {
        code: `type nokUDuplicate2 = number | number | number | string;`,
        errors: [
          {
            message: `{"message":"Remove this duplicated type or replace with another one.","secondaryLocations":[{"message":"Original","column":22,"line":1,"endColumn":28,"endLine":1},{"message":"Another duplicate","column":40,"line":1,"endColumn":46,"endLine":1}]}`,
            line: 1,
            endLine: 1,
            column: 32,
            endColumn: 38,
          },
        ],
        options: ['sonar-runtime'],
      },
      {
        code: `
        type nokUFunctionType = ((a: boolean) => boolean) | ((a: boolean) => boolean);
        type nokUTuple = [boolean, number] | [boolean, number];
        type nokUArray = number [] | number [];
        type nokUStringLiteral = "ValueA" | "ValueA";
        type nokUUnion = (number | string) | (number | string);
        type nokIDuplicate = Person & Person & Loggable<Person>;
        type nokIDuplicate2 = number & number & number & string;
        type nokIFunctionType = ((a: boolean) => boolean) & ((a: boolean) => boolean);
        type nokITuple = [boolean, number] & [boolean, number];
        type nokIArray = number [] & number [];
        type nokIStringLiteral = "ValueA" & "ValueA";
        type nokIUnion = (number | string) & (number | string);`,
        errors: 12,
      },
      {
        code: `type T = number | number`,
        errors: [
          {
            suggestions: [
              {
                desc: 'Remove duplicate types',
                output: `type T = number`,
              },
            ],
          },
        ],
      },
      {
        code: `type T = number & number`,
        errors: [{ suggestions: [{ output: `type T = number` }] }],
      },
      {
        code: `type T = number | number | number`,
        errors: [{ suggestions: [{ output: `type T = number` }] }],
      },
      {
        code: `type T = number | string | number`,
        errors: [{ suggestions: [{ output: `type T = number | string` }] }],
      },
      {
        code: `type T = string | number | number`,
        errors: [{ suggestions: [{ output: `type T = string | number` }] }],
      },
      {
        code: `type T = number | string | boolean | number`,
        errors: [{ suggestions: [{ output: `type T = number | string | boolean` }] }],
      },
      {
        code: `type T = (number | string) & (number | string)`,
        errors: [{ suggestions: [{ output: `type T = (number | string)` }] }],
      },
      {
        code: `type T = (number) | string | number`,
        errors: [{ suggestions: [{ output: `type T = (number) | string` }] }],
      },
      {
        code: `type T = number | string | (number)`,
        errors: [{ suggestions: [{ output: `type T = number | string` }] }],
      },
      {
        code: `type T = (number | string) & (number | string) & Foo`,
        errors: [{ suggestions: [{ output: `type T = (number | string) & Foo` }] }],
      },
      {
        code: `type T = ((A) | B) & C & C`,
        errors: [{ suggestions: [{ output: `type T = ((A) | B) & C` }] }],
      },
      {
        code: `type T = A & ((B)) & A`,
        errors: [{ suggestions: [{ output: `type T = A & ((B))` }] }],
      },
      {
        code: `function foo(p: A | (B) | A) {}`,
        errors: [{ suggestions: [{ output: `function foo(p: A | (B)) {}` }] }],
      },
    ],
  },
);
