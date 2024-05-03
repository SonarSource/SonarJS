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
import { TypeScriptRuleTester } from '../tools';
import { rule } from './';
import type { Options } from './rule';

const createOptions = (threshold: number): Options => {
  return [{ threshold }];
};

const ruleTesterThreshold0 = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });
ruleTesterThreshold0.run(
  'Regular expressions should not be too complicated with threshold 0',
  rule,
  {
    valid: [
      {
        code: `let regex;

if (isString(regex)) {
  regex = new RegExp('^' + regex + '$');
}`,
      },
      {
        code: `/ /`,
        options: createOptions(0),
      },
      {
        code: `/abc/`,
        options: createOptions(0),
      },
      {
        code: `/^abc$/`,
        options: createOptions(0),
      },
      {
        code: `/(?:abc)/`,
        options: createOptions(0),
      },
      {
        code: `/(abc)/`,
        options: createOptions(0),
      },
      {
        code: `/\\w.u/`,
        options: createOptions(0),
      },
      {
        code: `RegExp('abc')`,
        options: createOptions(0),
      },
      {
        code: `new RegExp('abc')`,
        options: createOptions(0),
      },
      {
        code: 'RegExp(`abc`)',
        options: createOptions(0),
      },
      {
        code: `RegExp('[malformed')`,
        options: createOptions(0),
      },
      {
        code: `RegExp(123)`,
        options: createOptions(0),
      },
      {
        code: `RegExp(unknown)`,
        options: createOptions(0),
      },
      {
        code: `let uninitialized; RegExp(uninitialized)`,
        options: createOptions(0),
      },
      {
        code: `new Foo('abc')`,
        options: createOptions(0),
      },
      {
        code: `Foo('abc')`,
        options: createOptions(0),
      },
      {
        code: `RegExp('(a|' + 'b)')`,
        options: createOptions(0),
      },
    ],
    invalid: [
      {
        code: `/(?=abc)/`,
        errors: [
          {
            message: JSON.stringify({
              message: `Simplify this regular expression to reduce its complexity from 1 to the 0 allowed.`,
              cost: 1,
              secondaryLocations: [{ message: `+1`, column: 1, line: 1, endColumn: 4, endLine: 1 }],
            }),
            line: 1,
            endLine: 1,
            column: 1,
            endColumn: 10,
          },
        ],
        options: createOptions(0),
      },
      {
        code: `RegExp('\\r?');`,
        errors: [
          {
            message: JSON.stringify({
              message: `Simplify this regular expression to reduce its complexity from 1 to the 0 allowed.`,
              cost: 1,
              secondaryLocations: [], // Secondary location removed when invalid (start===end)
            }),
            line: 1,
            endLine: 1,
            column: 8,
            endColumn: 13,
          },
        ],
        options: createOptions(0),
      },
      {
        code: `RegExp('\\\\r?');`,
        errors: [
          {
            message: JSON.stringify({
              message: `Simplify this regular expression to reduce its complexity from 1 to the 0 allowed.`,
              cost: 1,
              secondaryLocations: [
                { message: '+1', column: 11, line: 1, endColumn: 12, endLine: 1 },
              ],
            }),
            line: 1,
            endLine: 1,
            column: 8,
            endColumn: 14,
          },
        ],
        options: createOptions(0),
      },
      {
        code: `/(?<=abc)/`,
        errors: [
          {
            message: JSON.stringify({
              message: `Simplify this regular expression to reduce its complexity from 1 to the 0 allowed.`,
              cost: 1,
              secondaryLocations: [{ message: `+1`, column: 1, line: 1, endColumn: 5, endLine: 1 }],
            }),
            line: 1,
            endLine: 1,
            column: 1,
            endColumn: 11,
          },
        ],
        options: createOptions(0),
      },
      {
        code: `/[a-z0-9]/`,
        errors: [
          {
            message: JSON.stringify({
              message: `Simplify this regular expression to reduce its complexity from 1 to the 0 allowed.`,
              cost: 1,
              secondaryLocations: [{ message: `+1`, column: 1, line: 1, endColumn: 2, endLine: 1 }],
            }),
            line: 1,
            endLine: 1,
            column: 1,
            endColumn: 11,
          },
        ],
        options: createOptions(0),
      },
      {
        code: `/x*/`,
        errors: [
          {
            message: JSON.stringify({
              message: `Simplify this regular expression to reduce its complexity from 1 to the 0 allowed.`,
              cost: 1,
              secondaryLocations: [{ message: `+1`, column: 2, line: 1, endColumn: 3, endLine: 1 }],
            }),
            line: 1,
            endLine: 1,
            column: 1,
            endColumn: 5,
          },
        ],
        options: createOptions(0),
      },
      {
        code: `/x{1,2}/`,
        errors: [
          {
            message: JSON.stringify({
              message: `Simplify this regular expression to reduce its complexity from 1 to the 0 allowed.`,
              cost: 1,
              secondaryLocations: [{ message: `+1`, column: 2, line: 1, endColumn: 7, endLine: 1 }],
            }),
            line: 1,
            endLine: 1,
            column: 1,
            endColumn: 9,
          },
        ],
        options: createOptions(0),
      },
      {
        code: `/(?:abc)*/`,
        errors: 1,
        options: createOptions(0),
      },
      {
        code: `/((?:abc)*)/`,
        errors: 1,
        options: createOptions(0),
      },
      {
        code: `/((?:abc)*)?/`,
        errors: 1,
        options: createOptions(0),
      },
      {
        code: `/a|b/`,
        errors: [
          {
            message: JSON.stringify({
              message: `Simplify this regular expression to reduce its complexity from 1 to the 0 allowed.`,
              cost: 1,
              secondaryLocations: [{ message: `+1`, column: 2, line: 1, endColumn: 3, endLine: 1 }],
            }),
            line: 1,
            endLine: 1,
            column: 1,
            endColumn: 6,
          },
        ],
        options: createOptions(0),
      },
      {
        code: `/a|b|c/`,
        errors: [
          {
            message: JSON.stringify({
              message: `Simplify this regular expression to reduce its complexity from 2 to the 0 allowed.`,
              cost: 2,
              secondaryLocations: [
                { message: `+1`, column: 2, line: 1, endColumn: 3, endLine: 1 },
                { message: `+1`, column: 4, line: 1, endColumn: 5, endLine: 1 },
              ],
            }),
            line: 1,
            endLine: 1,
            column: 1,
            endColumn: 8,
          },
        ],
        options: createOptions(0),
      },
      {
        code: `/(?:a|b)*/`,
        errors: 1,
        options: createOptions(0),
      },
      {
        code: `/(?:a|b|c)*/`,
        errors: [
          {
            message: JSON.stringify({
              message: `Simplify this regular expression to reduce its complexity from 4 to the 0 allowed.`,
              cost: 4,
              secondaryLocations: [
                { message: `+1`, column: 10, line: 1, endColumn: 11, endLine: 1 },
                {
                  message: `+2 (incl 1 for nesting)`,
                  column: 5,
                  line: 1,
                  endColumn: 6,
                  endLine: 1,
                },
                { message: `+1`, column: 7, line: 1, endColumn: 8, endLine: 1 },
              ],
            }),
            line: 1,
            endLine: 1,
            column: 1,
            endColumn: 13,
          },
        ],
        options: createOptions(0),
      },
      {
        code: `/(foo)\\1/`,
        errors: [
          {
            message: JSON.stringify({
              message: `Simplify this regular expression to reduce its complexity from 1 to the 0 allowed.`,
              cost: 1,
              secondaryLocations: [{ message: `+1`, column: 6, line: 1, endColumn: 8, endLine: 1 }],
            }),
            line: 1,
            endLine: 1,
            column: 1,
            endColumn: 10,
          },
        ],
        options: createOptions(0),
      },
      {
        code: `RegExp('x*')`,
        errors: [
          {
            message: JSON.stringify({
              message: `Simplify this regular expression to reduce its complexity from 1 to the 0 allowed.`,
              cost: 1,
              secondaryLocations: [
                { message: `+1`, column: 9, line: 1, endColumn: 10, endLine: 1 },
              ],
            }),
            line: 1,
            endLine: 1,
            column: 8,
            endColumn: 12,
          },
        ],
        options: createOptions(0),
      },
      {
        code: `new RegExp('x*')`,
        errors: [
          {
            message: JSON.stringify({
              message: `Simplify this regular expression to reduce its complexity from 1 to the 0 allowed.`,
              cost: 1,
              secondaryLocations: [
                { message: `+1`, column: 13, line: 1, endColumn: 14, endLine: 1 },
              ],
            }),
            line: 1,
            endLine: 1,
            column: 12,
            endColumn: 16,
          },
        ],
        options: createOptions(0),
      },
      {
        code: 'RegExp(`x*`)',
        errors: 1,
        options: createOptions(0),
      },
      {
        code: `
        RegExp('/s*')
        `,
        options: createOptions(0),
        errors: [
          {
            message: JSON.stringify({
              message:
                'Simplify this regular expression to reduce its complexity from 1 to the 0 allowed.',
              cost: 1,
              secondaryLocations: [
                {
                  message: '+1',
                  column: 18,
                  line: 2,
                  endColumn: 19,
                  endLine: 2,
                },
              ],
            }),
          },
        ],
      },
      {
        code: `
        RegExp('|/?[a-z]')
        `,
        options: createOptions(0),
        errors: [
          {
            message: JSON.stringify({
              message:
                'Simplify this regular expression to reduce its complexity from 4 to the 0 allowed.',
              cost: 4,
              secondaryLocations: [
                { message: '+1', column: 16, line: 2, endColumn: 17, endLine: 2 },
                {
                  message: '+2 (incl 1 for nesting)',
                  column: 18,
                  line: 2,
                  endColumn: 19,
                  endLine: 2,
                },
                { message: '+1', column: 19, line: 2, endColumn: 20, endLine: 2 },
              ],
            }),
          },
        ],
      },
    ],
  },
);

const ruleTesterThreshold1 = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });
ruleTesterThreshold1.run(
  'Regular expressions should not be too complicated with threshold 1',
  rule,
  {
    valid: [
      {
        code: `
        const part1 = 'x*';
        const part2 = 'y*';
        RegExp(part1 + part2);
      `,
        options: createOptions(1),
      },
    ],
    invalid: [
      {
        code: `RegExp('x*' + 'y*')`,
        errors: 1,
        options: createOptions(1),
      },
      {
        code: `RegExp('x*' + 'y*' + 'z*')`,
        errors: 1,
        options: createOptions(1),
      },
      {
        code: `
        const part1 = 'x*' + 'y*';
        const part2 = 'a*' + 'b*';
        RegExp(part1 + part2);
      `,
        errors: [
          {
            message: JSON.stringify({
              message: `Simplify this regular expression to reduce its complexity from 2 to the 1 allowed.`,
              cost: 1,
              secondaryLocations: [
                { message: `+1`, column: 24, line: 2, endColumn: 25, endLine: 2 },
                { message: `+1`, column: 31, line: 2, endColumn: 32, endLine: 2 },
              ],
            }),
            line: 2,
            endLine: 2,
            column: 23,
            endColumn: 27,
          },
          {
            message: JSON.stringify({
              message: `Simplify this regular expression to reduce its complexity from 2 to the 1 allowed.`,
              cost: 1,
              secondaryLocations: [
                { message: `+1`, column: 24, line: 3, endColumn: 25, endLine: 3 },
                { message: `+1`, column: 31, line: 3, endColumn: 32, endLine: 3 },
              ],
            }),
            line: 3,
            endLine: 3,
            column: 23,
            endColumn: 27,
          },
        ],
        options: createOptions(1),
      },
    ],
  },
);

const typeAwareRuleTester = new TypeScriptRuleTester();
typeAwareRuleTester.run(
  'Regular expressions should not be too complicated with type information',
  rule,
  {
    valid: [
      {
        code: `'str'.search('abc')`,
        options: createOptions(0),
      },
    ],
    invalid: [
      {
        code: `'str'.search('x*')`,
        errors: [
          {
            message: JSON.stringify({
              message: `Simplify this regular expression to reduce its complexity from 1 to the 0 allowed.`,
              cost: 1,
              secondaryLocations: [
                { message: `+1`, column: 15, line: 1, endColumn: 16, endLine: 1 },
              ],
            }),
            line: 1,
            endLine: 1,
            column: 14,
            endColumn: 18,
          },
        ],
        options: createOptions(0),
      },
    ],
  },
);

const ruleTesterDefaultThreshold = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });
ruleTesterDefaultThreshold.run(
  'Regular expressions should not be too complicated with default threshold',
  rule,
  {
    valid: [
      {
        code: `/ /`,
      },
    ],
    invalid: [
      {
        code: `/^(?:(?:31(\\/|-|\\.)(?:0?[13578]|1[02]))\\1|(?:(?:29|30)(\\/|-|\\.)(?:0?[13-9]|1[0-2])\\2))(?:(?:1[6-9]|[2-9]\\d)?\\d{2})$|^(?:29(\\/|-|\.)0?2\\3(?:(?:(?:1[6-9]|[2-9]\\d)?(?:0[48]|[2468][048]|[13579][26])|(?:(?:16|[2468][048]|[3579][26])00))))$|^(?:0?[1-9]|1\\d|2[0-8])(\\/|-|\\.)(?:(?:0?[1-9])|(?:1[0-2]))\\4(?:(?:1[6-9]|[2-9]\\d)?\\d{2})$/`,
        errors: 1,
      },
    ],
  },
);
