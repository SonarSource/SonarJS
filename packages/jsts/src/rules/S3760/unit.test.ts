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
import { DefaultParserRuleTester, RuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { describe, it } from 'node:test';

describe('S3760', () => {
  it('S3760', () => {
    const ruleTesterJs = new DefaultParserRuleTester();
    const ruleTesterTs = new RuleTester();

    ruleTesterJs.run('No issues without types', rule, {
      valid: [
        {
          code: `
      var num = 42;
      var bool = true;
      num + bool;
            `,
        },
      ],
      invalid: [],
    });

    ruleTesterTs.run('Arithmetic operators should only have numbers as operands', rule, {
      valid: [
        {
          code: `
      function plus() {
        var str = "";
        var bool = true;
        var obj = new Foo();
        var unknown = foo();
        var num = 42;
        var d1 = new Date(), d2 = new Date();
      
        // PLUS -> concatenation
        str + unknown;
        str + num;
        str + obj;
        str + d1;
        d1 + d2;
        str += unknown; str = "";
        unknown += str; unknown = foo();
        bool + unknown; // OK, unknown might be a string

        // PLUS -> addition
        num + num;
        num * num;

        // comparisons
        str < str; str > str; str <= str; str >= str;
        str > obj;
        str < unknown; // OK, unknown

        // DATES
        d1 - d2; // OK
        d1 - unknown; // OK
        unknown - d2; // OK
        d1 + d2; // OK, concatenation
        d1 + bool; // OK, concatenation

        42 + new String(x); // OK

        num++;
        +num;
      }
            `,
        },
        {
          code: `
      var bool = true;
      if (!bool) {
        console.log("hello");
      }
            `,
        },
        {
          code: `
      var num = 42;
      var other = 43;
      other = true;
      num + other; // FN
            `,
        },
      ],
      invalid: [
        {
          code: `
      var num = 42;
      var bool = true;
      num + bool;
            `,
          errors: [
            {
              line: 4,
              endLine: 4,
              column: 13,
              endColumn: 17,
              message: JSON.stringify({
                message: 'Convert this operand into a number.',
                secondaryLocations: [
                  {
                    column: 6,
                    line: 4,
                    endColumn: 9,
                    endLine: 4,
                  },
                ],
              }),
            },
          ],
          options: ['sonar-runtime'],
        },
        {
          code: `
      var num = 42;
      var bool = true;
      num += bool;
            `,
          errors: [
            {
              line: 4,
              endLine: 4,
              column: 14,
              endColumn: 18,
              message: JSON.stringify({
                message: 'Convert this operand into a number.',
                secondaryLocations: [
                  {
                    column: 6,
                    line: 4,
                    endColumn: 9,
                    endLine: 4,
                  },
                ],
              }),
            },
          ],
          options: ['sonar-runtime'],
        },
        {
          code: `
      var num = 42;
      var bool = true;
      bool += num;
            `,
          errors: 1,
        },
        {
          code: `
      var str = "";
      var num = 42;
      var bool = true;
      str < num;
      str > bool;
      bool < num;
            `,
          errors: 3,
        },
        {
          code: `
      var d1 = new Date(), d2 = new Date();
      d1/d2;
      d1*d2
            `,
          errors: 2,
        },
        {
          code: `
      var d1 = new Date(), d2 = new Date();
      d1*=d2;
      d1-=d2; // OK
            `,
          errors: [
            {
              line: 3,
              endLine: 3,
              column: 7,
              endColumn: 13,
              message: JSON.stringify({
                message: 'Convert the operands of this operation into numbers.',
                secondaryLocations: [
                  {
                    column: 6,
                    line: 3,
                    endColumn: 8,
                    endLine: 3,
                  },
                  {
                    column: 10,
                    line: 3,
                    endColumn: 12,
                    endLine: 3,
                  },
                ],
              }),
            },
          ],
          options: ['sonar-runtime'],
        },
        {
          code: `
      var d1 = new Date();
      var num = 42;
      d1 - num; // Noncompliant
            `,
          errors: [{ message: 'Convert the operands of this operation into numbers.', line: 4 }],
        },
        {
          code: `
      var str = "";
      var bool = true;
      var d1 = new Date();
      str++;
      -str;
      -bool;
      -d1;
      d1++;
      --d1;
            `,
          errors: 6,
        },
        {
          code: `
      var str = "42";
      var x = 42;
      str - 4;  // Noncompliant
            `,
          errors: [{ message: 'Convert the operands of this operation into numbers.', line: 4 }],
        },
        {
          code: `
      var str = "42";
      var x;
    
      if (condition()) {
        x = 42;
      }

      str - 4;  // Noncompliant
      foo(x);
            `,
          errors: [{ message: 'Convert the operands of this operation into numbers.', line: 9 }],
        },
        {
          code: `
      function primitive_wrappers(x) {
        -new String(x);
        -new Boolean(x);
        42 / new String(x);
        42 / new Boolean(x);
        42 + new Boolean(x);
        new Number(x) + true;
        true + new Number(x);
        new Number(x) > "42";
        "42" > new Number(x);
      }
            `,
          errors: 9,
        },
        {
          code: `
      var num = 42;
      var other = true;
      other = 43;
      num + other; // FP
            `,
          errors: [{ message: 'Convert this operand into a number.', line: 5 }],
        },
        {
          code: `
      expect(something()).toEqual(-'1');
      `,
          errors: [
            {
              message: JSON.stringify({
                message: 'Convert this operand into a number.',
                secondaryLocations: [],
              }),
              line: 2,
              endLine: 2,
              column: 36,
              endColumn: 39,
            },
          ],
          options: ['sonar-runtime'],
        },
      ],
    });
  });
});
