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
import { TypeScriptRuleTester } from '../../../tests/tools/index.js';
import { rule } from './index.js';

const ruleTesterJs = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: 'module' } });
ruleTesterJs.run('"for in" should not be used with iterables [js]', rule, {
  valid: [
    {
      code: `
        const array = [1, 2, 3];
        for (let value in array) console.log(value); // not reported if type information is missing`,
    },
    {
      code: `
        for (const x of [3, 4, 5]) {
          console.log(x);
        }
    `,
    },
  ],
  invalid: [],
});

const ruleTesterTs = new TypeScriptRuleTester();
ruleTesterTs.run('"for in" should not be used with iterables [ts]', rule, {
  valid: [
    {
      code: `
        const object = { fst: 1, snd: 2 };
        for (let value in object) console.log(value);`,
    },
  ],
  invalid: [
    {
      code: `
        const array = [1, 2, 3];
        for (let value in array) console.log(value);`,
      errors: [
        {
          message: `Use \"for...of\" to iterate over this \"Array\".`,
          line: 3,
          column: 9,
          endLine: 3,
          endColumn: 12,
        },
      ],
    },
    {
      code: `
        const array = new Int8Array(5);
        for (let value in array) console.log(value);`,
      errors: 1,
    },
    {
      code: `
        const set = new Set([1, 2, 3, 4, 5]);
        for (let value in set) console.log(value);`,
      errors: 1,
    },
    {
      code: `
        const map = new Map(); map.set('zero', 0);
        for (let value in map) console.log(value);`,
      errors: 1,
    },
    {
      code: `
        const string = 'Hello';
        for (let value in string) console.log(value);`,
      errors: 1,
    },
    {
      code: `
        const string = new String('Hello');
        for (let value in string) console.log(value);`,
      errors: 1,
    },
    {
      code: `
for (const x in [3, 4, 5]) {
  console.log(x);
}
      `,
      errors: 1,
    },
    {
      code: `
const z = [3, 4, 5];
for (const x in z) {
  console.log(x);
}
      `,
      errors: 1,
    },
    {
      code: `
const fn = (arr: number[]) => {
  for (const x in arr) {
    console.log(x);
  }
};
      `,
      errors: 1,
    },
    {
      code: `
const fn = (arr: number[] | string[]) => {
  for (const x in arr) {
    console.log(x);
  }
};
      `,
      errors: 1,
    },
    {
      code: `
const fn = <T extends any[]>(arr: T) => {
  for (const x in arr) {
    console.log(x);
  }
};
      `,
      errors: 1,
    },
  ],
});
