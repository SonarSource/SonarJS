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

const ruleTesterJs = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });
const ruleTesterTs = new TypeScriptRuleTester();

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

ruleTesterJs.run('Loop increment should move in the right direction JavaScript', rule, testCases);
ruleTesterTs.run('Loop increment should move in the right direction TypeScript', rule, testCases);
