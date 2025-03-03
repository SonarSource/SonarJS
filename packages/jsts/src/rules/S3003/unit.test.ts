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
import { DefaultParserRuleTester, RuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

describe('S3003', () => {
  it('S3003', () => {
    const ruleTesterJs = new DefaultParserRuleTester();
    ruleTesterJs.run('Comparison operators should not be used with strings [js]', rule, {
      valid: [
        {
          code: `
      let str1 = 'hello', str2 = 'world';
      str1 < str2; // not reported without type information`,
        },
      ],
      invalid: [],
    });

    const ruleTesterTs = new RuleTester();
    ruleTesterTs.run(`Comparison operators should not be used with strings [ts]`, rule, {
      valid: [
        {
          code: `
        let str1 = 'hello', str2 = 'world';
        str1 == str2;`,
        },
        {
          code: `
        let str = 'hello', num = 5;
        str < num;`,
        },
        {
          code: `
        let str = 'hello', num = 5;
        num < str;`,
        },
        {
          code: `
        let str = 'hello';
        str < 'h';`,
        },
        {
          code: `
        let str = 'hello';
        'h' < str;`,
        },
        {
          code: `
        ['foo', 'bar', 'baz'].sort((a, b) => a < b);
      `,
        },
        {
          code: `
        sort((a: string, b: string) => a < b)
      `,
        },
      ],
      invalid: [
        {
          code: `
        let str1 = 'hello', str2 = 'world';
        str1 < str2;`,
          options: ['sonar-runtime'],
          errors: [
            {
              message:
                '{"message":"Convert operands of this use of \\"<\\" to number type.","secondaryLocations":[{"column":8,"line":3,"endColumn":12,"endLine":3},{"column":15,"line":3,"endColumn":19,"endLine":3}]}',
              line: 3,
              column: 14,
              endLine: 3,
              endColumn: 15,
            },
          ],
        },
        {
          code: `
        let str1 = 'hello', str2 = 'world';
        str1 <= str2;`,
          errors: 1,
        },
        {
          code: `
        let str1 = 'hello', str2 = 'world';
        str1 > str2;`,
          errors: 1,
        },
        {
          code: `
        let str1 = 'hello', str2 = 'world';
        str1 >= str2;`,
          errors: 1,
        },
        {
          code: `
        (function () {})((a: string, b: string) => a < b)
      `,
          errors: 1,
        },
      ],
    });
  });
});
