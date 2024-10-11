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
import { NodeRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';

// @typescript-eslint/parser is required for the type assertion test at the end of this test file
import Module from 'node:module';
const require = Module.createRequire(import.meta.url);
const tsParserPath = require.resolve('@typescript-eslint/parser');
const ruleTester = new NodeRuleTester({
  parserOptions: { ecmaVersion: 2018, sourceType: 'module' },
  parser: tsParserPath,
});

ruleTester.run('Redundant pairs of parentheses should be removed', rule, {
  valid: [
    {
      code: `var a = typeof (38);`,
    },
    {
      code: `let a = typeof 39;`,
    },
    {
      code: `const a = (((a * b) + c) / 2.0);`,
    },
    {
      code: `if ((a = 3)) {}`,
    },
    {
      code: `while ((a = 3)) {}`,
    },
    {
      code: `do {} while ((a = 3))`,
    },
    {
      code: `let a = doSomething( /** @type MyObject */ (b));`,
    },
    {
      code: `let a = new MyClass((b = c));`,
    },
    {
      code: `[1, 2, 1, 1].reduce( ( acc, n ) => ( ( acc[n] += 1, acc ) ), [0, 0, 0] ) `,
    },
    {
      code: `with ((a = 3)) {}`,
    },
    {
      code: `switch ((a = 3)) {
        case 1:
        break;
      }`,
    },
    {
      code: `const a = import((a = 'fs'))`,
    },
  ],
  invalid: [
    {
      code: `var a = typeof ((37));`,
      errors: [
        {
          message: `{"message":"Remove these redundant parentheses.","secondaryLocations":[{"column":20,"line":1,"endColumn":21,"endLine":1}]}`,
          line: 1,
          endLine: 1,
          column: 16,
          endColumn: 17,
          suggestions: [
            { desc: 'Remove these redundant parentheses', output: 'var a = typeof (37);' },
          ],
        },
      ],
      options: ['sonar-runtime'],
    },
    {
      code: `const a = ((((a * b) + c)) / 2.0);`,
      errors: [
        {
          message:
            '{"message":"Remove these redundant parentheses.","secondaryLocations":[{"column":25,"line":1,"endColumn":26,"endLine":1}]}',
          line: 1,
          endLine: 1,
          column: 12,
          endColumn: 13,
        },
      ],
      options: ['sonar-runtime'],
    },
    {
      code: `
        (
         (
          (a)
             )
              )`,
      errors: [
        {
          message:
            '{"message":"Remove these redundant parentheses.","secondaryLocations":[{"column":14,"line":6,"endColumn":15,"endLine":6}]}',
          line: 2,
          endLine: 2,
          column: 9,
          endColumn: 10,
        },
        {
          message:
            '{"message":"Remove these redundant parentheses.","secondaryLocations":[{"column":13,"line":5,"endColumn":14,"endLine":5}]}',
          line: 3,
          endLine: 3,
          column: 10,
          endColumn: 11,
        },
      ],
      options: ['sonar-runtime'],
    },
    {
      // Type assertion test requiring @typescript-eslint/parser
      code: `if (myBool) { ((<myCast>obj)).methodCall() }`,
      errors: [
        {
          message:
            '{"message":"Remove these redundant parentheses.","secondaryLocations":[{"column":28,"line":1,"endColumn":29,"endLine":1}]}',
          line: 1,
          endLine: 1,
          column: 15,
          endColumn: 16,
        },
      ],
      options: ['sonar-runtime'],
    },
    {
      code: `(((((a)))))`,
      errors: 4,
    },
    {
      code: `let a = doSomething(( /** @type MyObject */ (b)));`,
      errors: 1,
    },
    {
      code: `if (((a = 3))) {}`,
      errors: 1,
    },
    {
      code: `while (((a = 3))) { ((a = 5)); }`,
      errors: 2,
    },
    {
      code: `let a = new MyClass(((b = c)));`,
      errors: 1,
    },
  ],
});
