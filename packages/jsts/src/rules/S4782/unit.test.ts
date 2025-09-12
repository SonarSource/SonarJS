/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
import path from 'node:path';
import parser from '@typescript-eslint/parser';
import { describe, it } from 'node:test';

describe('S4782', () => {
  it('S4782', () => {
    const ruleTester = new RuleTester();
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
                suggestions: [
                  {
                    desc: 'Remove "?" operator',
                    output: `
          interface Person {
            name: string;
            address: string | undefined;
          }`,
                  },
                  {
                    desc: 'Remove "undefined" type annotation',
                    output: `
          interface Person {
            name: string;
            address?: string;
          }`,
                  },
                ],
              },
            ],
            settings: { sonarRuntime: true },
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
                suggestions: [
                  {
                    desc: 'Remove "?" operator',
                    output: `
          class Person {
            address: (string | (undefined | number));
            name: string;
          }`,
                  },
                  {
                    desc: 'Remove "undefined" type annotation',
                    output: `
          class Person {
            address?: (string | number);
            name: string;
          }`,
                  },
                ],
              },
            ],
            settings: { sonarRuntime: true },
          },
          {
            code: `interface T { p?: undefined | number; }`,
            errors: [
              {
                message:
                  "Consider removing 'undefined' type or '?' specifier, one of them is redundant.",
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
                message:
                  "Consider removing 'undefined' type or '?' specifier, one of them is redundant.",
                suggestions: [
                  {
                    desc: 'Remove "?" operator',
                    output: 'interface T { p: number | undefined; }',
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
            code: `interface T { p?: (undefined | number); }`,
            errors: [
              {
                message:
                  "Consider removing 'undefined' type or '?' specifier, one of them is redundant.",
                suggestions: [
                  {
                    desc: 'Remove "?" operator',
                    output: 'interface T { p: (undefined | number); }',
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
            code: `interface T { p?: undefined | number | string; }`,
            errors: [
              {
                message:
                  "Consider removing 'undefined' type or '?' specifier, one of them is redundant.",
                suggestions: [
                  {
                    desc: 'Remove "?" operator',
                    output: 'interface T { p: undefined | number | string; }',
                  },
                  {
                    desc: 'Remove "undefined" type annotation',
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
                message:
                  "Consider removing 'undefined' type or '?' specifier, one of them is redundant.",
                suggestions: [
                  {
                    desc: 'Remove "?" operator',
                    output: 'interface T { p: number | undefined | string; }',
                  },
                  {
                    desc: 'Remove "undefined" type annotation',
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
                message:
                  "Consider removing 'undefined' type or '?' specifier, one of them is redundant.",
                suggestions: [
                  {
                    desc: 'Remove "?" operator',
                    output: 'interface T { p: number | string | undefined; }',
                  },
                  {
                    desc: 'Remove "undefined" type annotation',
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
                message:
                  "Consider removing 'undefined' type or '?' specifier, one of them is redundant.",
                suggestions: [
                  {
                    desc: 'Remove "?" operator',
                    output: 'interface T { p: number | (string | undefined); }',
                  },
                  {
                    desc: 'Remove "undefined" type annotation',
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
                message:
                  "Consider removing 'undefined' type or '?' specifier, one of them is redundant.",
                suggestions: [
                  {
                    desc: 'Remove "?" operator',
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
                message:
                  "Consider removing 'undefined' type or '?' specifier, one of them is redundant.",
                suggestions: [
                  {
                    desc: 'Remove "?" operator',
                    output: 'interface T { p: (undefined) | number; }',
                  },
                  {
                    desc: 'Remove "undefined" type annotation',
                    output: 'interface T { p?: number; }',
                  },
                ],
              },
            ],
          },
        ],
      },
    );

    const noopRuleTester = new RuleTester({
      parser,
      ecmaVersion: 2018,
      sourceType: 'module',
      parserOptions: {
        project: `tsconfig.json`,
        tsconfigRootDir: path.join(import.meta.dirname, 'fixtures'),
      },
    });

    noopRuleTester.run('S4782 becomes noop when exactOptionalPropertyTypes is enabled', rule, {
      valid: [
        {
          code: 'interface T { p?: string | undefined; }',
          filename: path.join(import.meta.dirname, 'fixtures', 'index.ts'),
        },
      ],
      invalid: [],
    });
  });
});
