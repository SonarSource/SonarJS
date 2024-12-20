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
import { RuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

describe('S1533', () => {
  it('S1533', () => {
    const ruleTester = new RuleTester();

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
              suggestions: [
                {
                  output: 'x = Number;',
                  desc: 'Remove "new" operator',
                },
              ],
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
              suggestions: [
                {
                  output: 'x = Number(y);',
                  desc: 'Remove "new" operator',
                },
              ],
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
              suggestions: [
                {
                  output: 'x = String("str");',
                  desc: 'Remove "new" operator',
                },
              ],
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
              suggestions: [
                {
                  output: 'x = String("str", 42);',
                  desc: 'Remove "new" operator',
                },
              ],
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
              suggestions: [
                {
                  output: 'let y: number | boolean | string;',
                  desc: 'Replace "Boolean" with "boolean"',
                },
              ],
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
              suggestions: [
                {
                  output:
                    'function myFunction(param1: boolean, param2: string): Number { return true; }',
                  desc: 'Replace "String" with "string"',
                },
              ],
            },
            {
              message: 'Replace this "Number" wrapper object with primitive type "number".',
              line: 1,
              endLine: 1,
              column: 55,
              endColumn: 61,
              suggestions: [
                {
                  output:
                    'function myFunction(param1: boolean, param2: String): number { return true; }',
                  desc: 'Replace "Number" with "number"',
                },
              ],
            },
          ],
        },
        {
          code: `x = new Boolean(true);`,
          errors: [
            {
              message: 'Remove this use of "Boolean" constructor.',
              suggestions: [
                {
                  output: 'x = Boolean(true);',
                  desc: 'Remove "new" operator',
                },
              ],
            },
          ],
        },
        {
          code: `x = new Boolean(false);`,
          errors: [
            {
              message: 'Remove this use of "Boolean" constructor.',
              suggestions: [
                {
                  output: 'x = Boolean(false);',
                  desc: 'Remove "new" operator',
                },
              ],
            },
          ],
        },
        {
          code: `let y: String;`,
          errors: [
            {
              message: 'Replace this "String" wrapper object with primitive type "string".',
              suggestions: [
                {
                  output: 'let y: string;',
                  desc: 'Replace "String" with "string"',
                },
              ],
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
              message: 'Remove this use of "Number" constructor.',
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
              messageId: 'replaceWrapper',
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
  });
});
