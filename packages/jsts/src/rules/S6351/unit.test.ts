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
import { describe, it } from 'node:test';

describe('S6351', () => {
  it('S6351', () => {
    const ruleTester = new RuleTester();
    ruleTester.run('Regular expressions with the global flag should be used with caution', rule, {
      valid: [
        {
          code: `/none/;`,
        },
        {
          code: `/unicode/u;`,
        },
        {
          code: `/global/g;`,
        },
        {
          code: `RegExp('none');`,
        },
        {
          code: `RegExp('global', 'g');`,
        },
        {
          code: `new RegExp('global', 'g');`,
        },
        {
          code: `/sticky/y; `,
        },
        {
          code: `RegExp('sticky', 'y');`,
        },
        {
          code: `new RegExp('sticky', 'y');`,
        },
        {
          code: `while (condition) {/foo/g.exec(input);}`,
        },
        {
          code: `while (() => /foo/g.exec(input)) {}`,
        },
        {
          code: `const re = /foo/g; while (re.exec(input)) {}`,
        },
        {
          code: `while (exec(input)) {}`,
        },
        {
          code: `while (/foo/g.execute(input)) {}`,
        },
        {
          code: `while (/foo/u.exec(input)) {}`,
        },
        {
          code: `while (RegExp('foo').exec(input)) {}`,
        },
        {
          code: `
        const re = /foo/;
        re.test('foo');
        re.test('bar');
      `,
        },
        {
          code: `
        const re = /foo/;
        re.exec('foo');
        re.exec('bar');
      `,
        },
        {
          code: `
        const re = /foo/g;
        re.test('foo');
      `,
        },
        {
          code: `
        const re = /foo/g;
        re.exec('foo');
      `,
        },
        {
          code: `
        const re = /foo/g;
        re.test(input);
        re.test(input);
      `,
        },
        {
          code: `re.test(input);`,
        },
        {
          code: `
        const re = /foo/g;
        re.test(input1);
        re.lastIndex = 0;
        re.test(input2);
      `,
        },
        {
          code: `let re; re.lastIndex = 0;`,
        },
        {
          code: `re.lastIndex = 0;`,
        },
        {
          code: `foo = re.lastIndex;`,
        },
        {
          code: `
        const re = /foo/g;
        re.test('foo');
        re.test(''); // ok, empty string is used to reset the pattern
        re.test('bar');

        const re2 = /foo/g;
        re2.test('foo');
        re2.test(""); // ok, empty string is used to reset the pattern
        re2.test('bar');
      `,
        },
      ],
      invalid: [
        {
          code: `/globalsticky/gy;`,
          errors: [
            {
              message: JSON.stringify({
                message: `Remove the 'g' flag from this regex as it is shadowed by the 'y' flag.`,
                secondaryLocations: [],
              }),
              line: 1,
              endLine: 1,
              column: 1,
              endColumn: 17,
            },
          ],
          options: ['sonar-runtime'],
        },
        {
          code: `RegExp('globalsticky', 'gy');`,
          errors: 1,
        },
        {
          code: `new RegExp('globalsticky', 'gy');`,
          errors: 1,
        },
        {
          code: `while (/foo/g.exec(input)) {}`,
          errors: [
            {
              message: JSON.stringify({
                message: `Extract this regular expression to avoid infinite loop.`,
                secondaryLocations: [],
              }),
              line: 1,
              endLine: 1,
              column: 8,
              endColumn: 14,
            },
          ],
          options: ['sonar-runtime'],
        },
        {
          code: `do {} while (/foo/g.exec(input));`,
          errors: 1,
        },
        {
          code: `while ((/foo/g.exec(input)) !== null) {}`,
          errors: 1,
        },
        {
          code: `while (RegExp('foo', 'g').exec(input)) {}`,
          errors: 1,
        },
        {
          code: `while (new RegExp('foo', 'g').exec(input)) {}`,
          errors: 1,
        },
        {
          code: `
        const re = /foo/g;
        re.test('foo');
        re.test('bar');
      `,
          errors: [
            {
              message: JSON.stringify({
                message: `Remove the 'g' flag from this regex as it is used on different inputs.`,
                secondaryLocations: [
                  { message: 'Usage 1', column: 8, line: 3, endColumn: 22, endLine: 3 },
                  { message: 'Usage 2', column: 8, line: 4, endColumn: 22, endLine: 4 },
                ],
              }),
              line: 2,
              endLine: 2,
              column: 20,
              endColumn: 26,
            },
          ],
          options: ['sonar-runtime'],
        },
        {
          code: `
        const re = RegExp('foo', 'g');
        re.test('foo');
        re.test('bar');
      `,
          errors: 1,
        },
        {
          code: `
        const re = new RegExp('foo', 'g');
        re.test('foo');
        re.test('bar');
      `,
          errors: 1,
        },
        {
          code: `
        const re = /foo/g;
        re.exec('foo');
        re.exec('bar');
      `,
          errors: 1,
        },
      ],
    });
  });
});
