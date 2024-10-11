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

import Module from 'node:module';
const require = Module.createRequire(import.meta.url);
const tsParserPath = require.resolve('@typescript-eslint/parser');
const ruleTester = new NodeRuleTester({
  parserOptions: { ecmaVersion: 2018 },
  parser: tsParserPath,
});

ruleTester.run('Wrapper objects should not be used for primitive types', rule, {
  valid: [
    {
      code: `
        // not primitive wrapper constructors
        x = new Array();
        x = new MyObject();
        x = new Foo.MyObject();
        x = new MyObject;
        
        // OK without "new"
        x = Boolean(y);
        x = Number(y);
        x = String(y);
        
        let a: string;
        let b: number | string | boolean | Array;
        const c: number = 3;
        
        function myFunction(param1: boolean, param2: string): boolean { return true; }`,
    },
  ],
  invalid: [
    {
      code: `x = new Number;`,
      errors: [
        {
          message: 'Remove this use of "Number" constructor.',
          line: 1,
          endLine: 1,
          column: 5,
          endColumn: 15,
        },
      ],
    },
    {
      code: `x = new Number(y);`,
      errors: [
        {
          message: 'Remove this use of "Number" constructor.',
          line: 1,
          endLine: 1,
          column: 5,
          endColumn: 18,
        },
      ],
    },
    {
      code: `x = new String("str");`,
      errors: [
        {
          message: 'Remove this use of "String" constructor.',
          line: 1,
          endLine: 1,
          column: 5,
          endColumn: 22,
        },
      ],
    },
    {
      code: `x = new String("str", 42);`,
      errors: [
        {
          message: 'Remove this use of "String" constructor.',
          line: 1,
          endLine: 1,
          column: 5,
          endColumn: 26,
        },
      ],
    },
    {
      code: `let y: number | Boolean | string;`,
      errors: [
        {
          message: 'Replace this "Boolean" wrapper object with primitive type "boolean".',
          line: 1,
          endLine: 1,
          column: 17,
          endColumn: 24,
        },
      ],
    },
    {
      code: `function myFunction(param1: boolean, param2: String): Number { return true; }`,
      errors: [
        {
          message: 'Replace this "String" wrapper object with primitive type "string".',
          line: 1,
          endLine: 1,
          column: 46,
          endColumn: 52,
        },
        {
          message: 'Replace this "Number" wrapper object with primitive type "number".',
          line: 1,
          endLine: 1,
          column: 55,
          endColumn: 61,
        },
      ],
    },
    {
      code: `x = new Boolean(true);`,
      errors: [
        {
          message: 'Remove this use of "Boolean" constructor.',
        },
      ],
    },
    {
      code: `x = new Boolean(false);`,
      errors: [
        {
          message: 'Remove this use of "Boolean" constructor.',
        },
      ],
    },
    {
      code: `let y: String;`,
      errors: [
        {
          message: 'Replace this "String" wrapper object with primitive type "string".',
        },
      ],
    },
    {
      code: `
        x = new Number(true);
        x = new Number(false);
        x = new Number(0);`,
      errors: 3,
    },
    {
      code: `
        x = new String(y);
        x = new String(42);
        x = new String();
        x = new String("");`,
      errors: 4,
    },
    {
      code: `x = new Number(true);`,
      errors: [
        {
          suggestions: [
            {
              desc: 'Remove "new" operator',
              output: 'x = Number(true);',
            },
          ],
        },
      ],
    },
    {
      code: `function foo(): Number {}`,
      errors: [
        {
          suggestions: [
            {
              desc: 'Replace "Number" with "number"',
              output: 'function foo(): number {}',
            },
          ],
        },
      ],
    },
  ],
});
