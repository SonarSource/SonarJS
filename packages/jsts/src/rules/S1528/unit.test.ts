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
import { RuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { describe, it } from 'node:test';

describe('S1528', () => {
  it('S1528', () => {
    const eslintRuleTester = new RuleTester();

    const typeScriptRuleTester = new RuleTester();
    const testCases = {
      valid: [
        {
          code: `
            var o = new Object();
            `,
        },
        {
          code: `
            var a1 = [x1, x2, x3];;
            `,
        },
        {
          code: `
            var a2 = [];
            `,
        },
        {
          code: `
            let unstableArray = Array.from({length: n});
            `,
        },
      ],
      invalid: [
        {
          code: `
            var a = new Array(x1, x2, x3);
            `,
          errors: [
            {
              message: 'Use either a literal or "Array.from()" instead of the "Array" constructor.',
              line: 2,
              endLine: 2,
              column: 21,
              endColumn: 42,
              suggestions: [
                {
                  desc: 'Replace with a literal',
                  output: `
            var a = [x1, x2, x3];
            `,
                },
              ],
            },
          ],
        },
        {
          code: `
            myArray = new Array(foo + 2).join('#');
            `,
          errors: [
            {
              message: 'Use either a literal or "Array.from()" instead of the "Array" constructor.',
              line: 2,
              endLine: 2,
              column: 23,
              endColumn: 41,
              suggestions: [
                {
                  desc: 'Replace with "Array.from()"',
                  output: `
            myArray = Array.from({length: foo + 2}).join('#');
            `,
                },
              ],
            },
          ],
        },
        {
          code: `
            myArray = new Array(42).join('#');
            `,
          errors: [
            {
              message: 'Use "Array.from()" instead of the "Array" constructor.',
              line: 2,
              endLine: 2,
              column: 23,
              endColumn: 36,
              suggestions: [
                {
                  desc: 'Replace with "Array.from()"',
                  output: `
            myArray = Array.from({length: 42}).join('#');
            `,
                },
              ],
            },
          ],
        },
      ],
    };

    eslintRuleTester.run('JS: Array constructor should not be used', rule, testCases);
    typeScriptRuleTester.run('TS: Array constructor should not be used', rule, testCases);
  });
});
