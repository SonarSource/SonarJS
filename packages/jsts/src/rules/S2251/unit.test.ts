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
import { RuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { describe, it } from 'node:test';

describe('S2251', () => {
  it('S2251', () => {
    const ruleTesterJs = new RuleTester();
    const ruleTesterTs = new RuleTester();

    const testCases = {
      valid: [
        {
          code: `
            for (let i = x; i < y; i++) {}
            `,
        },
        {
          code: `
            for (i = x; i > y; i--) {} {}
            `,
        },
        {
          code: `
            for (i = x; y > i; i++) {} {}
            `,
        },
        {
          code: `
            for (i = x; y < i; i--) {}
            `,
        },
        {
          code: `
            for (i = x; x < y; i--) {}
            `,
        },
        {
          code: `
            for (i = x; x > y; i--) {}
            `,
        },
        {
          code: `
            for (i = x; i > y; i-=1 ) {}
            `,
        },
        {
          code: `
            for (i = x; i > y; i-=+1) {}
            `,
        },
        {
          code: `
            for (i = x; i > y; i+=-x) {}
            `,
        },
        {
          code: `
            for (i = x; i > y; i+=z ) {}
            `,
        },
        {
          code: `
            for (i = x; i > y; i=i-1) {}
            `,
        },
        {
          code: `
            for (i = x; i > y; i=i+z) {}
            `,
        },
        {
          code: `
            for (i = x; i > y; i=z+1) {}
            `,
        },
        {
          code: `
            for (i = x; i > y; i=i*2) {}
            `,
        },
        {
          code: `
            for (i = x; i > y; i=i-z) {}
            `,
        },
        {
          code: `
            for (i = x; i > y; object.x = i + 1) {}
            `,
        },
        {
          code: `
            for (i = x; i+1 < y; i++) {}
            `,
        },
        {
          code: `
            for (i = x; i < y; ) {}
            `,
        },
        {
          code: `
            for (i = x; i > y; update()) {}
            `,
        },
        {
          code: `
            for (i = x; condition(); i++) {}
            `,
        },
        {
          code: `
            for (i = x; ; i++) {}
            `,
        },
        {
          code: `
            for (i = x; i > y; i+=-1) {}
            `,
        },
        {
          code: `
            for (i = x; i < y; i-=-1) {}
            `,
        },
        {
          code: `
            for (i = ""; i<="aaa"; i+="a") {}
            `,
        },
        {
          code: `
            for (let i = 0; i<=10; my_var.i++) {}
            `,
        },
        {
          code: `
            for (let i = 0; i<=10; i=!i) {}
            `,
        },
      ],
      invalid: [
        {
          code: `
            for (i = 0; i < 5; i--) {}
            //          ^^^^^> ^^^
            `,
          errors: [
            {
              message: `{"message":"\\"i\\" is decremented and will never reach its stop condition.","secondaryLocations":[{"column":24,"line":2,"endColumn":29,"endLine":2}]}`,
              line: 2,
              endLine: 2,
              column: 32,
              endColumn: 35,
            },
          ],
          options: ['sonar-runtime'],
        },
        {
          code: `
            for (let i = x; i > y; i++) {}
            //              ^^^^^> ^^^
            `,
          errors: [
            {
              message: `{"message":"\\"i\\" is incremented and will never reach its stop condition.","secondaryLocations":[{"column":28,"line":2,"endColumn":33,"endLine":2}]}`,
              line: 2,
              endLine: 2,
              column: 36,
              endColumn: 39,
            },
          ],
          options: ['sonar-runtime'],
        },
        {
          code: `
            for (let i = x; i >=y; i++) {}
            `,
          errors: 1,
        },
        {
          code: `
            for (let i = x; i < y; i--) {}
            `,
          errors: 1,
        },
        {
          code: `
            for (let i = x; i <=y; i--) {}
            `,
          errors: 1,
        },
        {
          code: `
            for (let i = x; y < i; i++) {}
            `,
          errors: 1,
        },
        {
          code: `
            for (let i = x; y <=i; i++) {}
            `,
          errors: 1,
        },
        {
          code: `
            for (let i = x; y > i; i--) {}
            `,
          errors: 1,
        },
        {
          code: `
            for (let i = x; y >=i; i--) {}
            `,
          errors: 1,
        },
        {
          code: `
            for (let i = x; y >i; i--) {}
            `,
          errors: 1,
        },
        {
          code: `
            for (i = x; i > y; i+=1 ) {}
            `,
          errors: 1,
        },
        {
          code: `
            for (i = x; i > y; i=i+1) {}
            `,
          errors: 1,
        },
        {
          code: `
            for (i = x; i > y; i=i+2) {}
            `,
          errors: 1,
        },
        {
          code: `
            for (i = x; i > y; i=i+1.) {}
            `,
          errors: 1,
        },
        {
          code: `
            for (i = x; i < y; i+=-1) {}
            `,
          errors: 1,
        },
        {
          code: `
            for (i = x; i > y; i-=-1) {}
            `,
          errors: 1,
        },
      ],
    };

    ruleTesterJs.run(
      'Loop increment should move in the right direction JavaScript',
      rule,
      testCases,
    );
    ruleTesterTs.run(
      'Loop increment should move in the right direction TypeScript',
      rule,
      testCases,
    );
  });
});
