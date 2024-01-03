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
import { TypeScriptRuleTester } from '../tools';
import { rule } from './';

const ruleTester = new TypeScriptRuleTester();
ruleTester.run(
  `Optional property declarations should not use both '?' and 'undefined' syntax`,
  rule,
  {
    valid: [
      {
        code: `
          interface Person {
            name: string;
            address: string | undefined;
            pet?: string;
          }
          class Car {
            propWithoutType?;
            brand: string;
            insurance: (undefined | string);
            color?: string;
          }`,
      },
    ],
    invalid: [
      {
        code: `
          interface Person {
            name: string;
            address?: string | undefined;
          }`,
        errors: [
          {
            message: `{"message":"Consider removing 'undefined' type or '?' specifier, one of them is redundant.","secondaryLocations":[{"column":31,"line":4,"endColumn":40,"endLine":4}]}`,
            line: 4,
            endLine: 4,
            column: 20,
            endColumn: 21,
          },
        ],
      },
      {
        code: `
          class Person {
            address?: (string | (undefined | number));
            name: string;
          }`,
        errors: [
          {
            message: JSON.stringify({
              message:
                "Consider removing 'undefined' type or '?' specifier, one of them is redundant.",
              secondaryLocations: [
                {
                  column: 33,
                  line: 3,
                  endColumn: 42,
                  endLine: 3,
                },
              ],
            }),
            line: 3,
            endLine: 3,
          },
        ],
      },
      {
        code: `interface T { p?: undefined | number; }`,
        errors: [
          {
            suggestions: [
              {
                desc: 'Remove "?" operator',
                output: 'interface T { p: undefined | number; }',
              },
              {
                desc: 'Remove "undefined" type annotation',
                output: 'interface T { p?: number; }',
              },
            ],
          },
        ],
      },
      {
        code: `interface T { p?: number | undefined; }`,
        errors: [
          {
            suggestions: [
              {
                output: 'interface T { p: number | undefined; }',
              },
              {
                output: 'interface T { p?: number; }',
              },
            ],
          },
        ],
      },
      {
        code: `interface T { p?: (undefined | number); }`,
        errors: [
          {
            suggestions: [
              {
                output: 'interface T { p: (undefined | number); }',
              },
              {
                output: 'interface T { p?: number; }',
              },
            ],
          },
        ],
      },
      {
        code: `interface T { p?: undefined | number | string; }`,
        errors: [
          {
            suggestions: [
              {
                output: 'interface T { p: undefined | number | string; }',
              },
              {
                output: 'interface T { p?: number | string; }',
              },
            ],
          },
        ],
      },
      {
        code: `interface T { p?: number | undefined | string; }`,
        errors: [
          {
            suggestions: [
              {
                output: 'interface T { p: number | undefined | string; }',
              },
              {
                output: 'interface T { p?: number | string; }',
              },
            ],
          },
        ],
      },
      {
        code: `interface T { p?: number | string | undefined; }`,
        errors: [
          {
            suggestions: [
              {
                output: 'interface T { p: number | string | undefined; }',
              },
              {
                output: 'interface T { p?: number | string; }',
              },
            ],
          },
        ],
      },
      {
        code: `interface T { p?: number | (string | undefined); }`,
        errors: [
          {
            suggestions: [
              {
                output: 'interface T { p: number | (string | undefined); }',
              },
              {
                output: 'interface T { p?: number | string; }',
              },
            ],
          },
        ],
      },
      {
        code: `interface T { p?: undefined; }`,
        errors: [
          {
            suggestions: [
              {
                output: 'interface T { p: undefined; }',
              },
            ],
          },
        ],
      },
      {
        code: `interface T { p?: (undefined) | number; }`,
        errors: [
          {
            suggestions: [
              {
                output: 'interface T { p: (undefined) | number; }',
              },
              {
                output: 'interface T { p?: number; }',
              },
            ],
          },
        ],
      },
    ],
  },
);
