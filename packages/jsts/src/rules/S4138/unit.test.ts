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
import { NodeRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';

const ruleTester = new NodeRuleTester({ parserOptions: { ecmaVersion: 2018 } });

ruleTester.run(`Decorated rule should provide suggestion`, rule, {
  valid: [
    {
      code: `for (let i = 0; i < arr.length; ++i) console.log(i, arr[i]);`,
    },
  ],
  invalid: [
    {
      code: `for (let i = 0; i < arr.length; ++i) console.log(arr[i]);`,
      errors: [
        {
          suggestions: [
            {
              desc: `Replace with "for of" loop`,
              output: `for (const element of arr) console.log(element);`,
            },
          ],
        },
      ],
    },
    {
      code: `for (let i = 0; i < arr.length; ++i) { console.log(arr[i]); }`,
      errors: [
        {
          suggestions: [
            {
              output: `for (const element of arr) { console.log(element); }`,
            },
          ],
        },
      ],
    },
    {
      code: `for (let i = 0; i < arr.length; ++i) { console.log(arr[i]); } ++arr[i];`,
      errors: [
        {
          suggestions: [
            {
              output: `for (const element of arr) { console.log(element); } ++arr[i];`,
            },
          ],
        },
      ],
    },
    {
      code: `++arr[i]; for (let i = 0; i < arr.length; ++i) { console.log(arr[i]); }`,
      errors: [
        {
          suggestions: [
            {
              output: `++arr[i]; for (const element of arr) { console.log(element); }`,
            },
          ],
        },
      ],
    },
    {
      code: `for (let i = 0; i < arr.length; ++i) console.log(arr[i] + arr[i]);`,
      errors: [
        {
          suggestions: [
            {
              output: `for (const element of arr) console.log(element + element);`,
            },
          ],
        },
      ],
    },
    {
      code: `
for (let i = 0; i < arr.length; ++i) {
  if (foo() < arr[i]) {
    console.log(arr[i] * 2);
  }
}`,
      errors: [
        {
          suggestions: [
            {
              output: `
for (const element of arr) {
  if (foo() < element) {
    console.log(element * 2);
  }
}`,
            },
          ],
        },
      ],
    },
    {
      code: `
for (let i = 0; i < arr.length; ++i) {
  console.log(arr[i]);
  for (let j = 0; j < arr.length; ++j) {
    console.log(arr[j]);
  }
}`,
      errors: [
        {
          suggestions: [
            {
              output: `
for (const element of arr) {
  console.log(element);
  for (let j = 0; j < arr.length; ++j) {
    console.log(arr[j]);
  }
}`,
            },
          ],
        },
        {
          suggestions: [
            {
              output: `
for (let i = 0; i < arr.length; ++i) {
  console.log(arr[i]);
  for (const element of arr) {
    console.log(element);
  }
}`,
            },
          ],
        },
      ],
    },
    {
      code: `
for (let i = 0; i < arr.length; ++i) {
  console.log(arr[i]);
  for (let i = 0; i < arr.length; ++i) {
    console.log(arr[i]);
  }
}
console.log(arr[i]);`,
      errors: [
        {
          suggestions: [
            {
              output: `
for (const element of arr) {
  console.log(element);
  for (let i = 0; i < arr.length; ++i) {
    console.log(arr[i]);
  }
}
console.log(arr[i]);`,
            },
          ],
        },
        {
          suggestions: [
            {
              output: `
for (let i = 0; i < arr.length; ++i) {
  console.log(arr[i]);
  for (const element of arr) {
    console.log(element);
  }
}
console.log(arr[i]);`,
            },
          ],
        },
      ],
    },
    {
      code: `for (let i = 0; i < arr.length; ++i) console.log(arr[element])`,
      errors: [{ suggestions: [] }],
    },
    {
      code: `for (let i = 0; i < arr.length; ++i) { console.log(arr[element]) }`,
      errors: [{ suggestions: [] }],
    },
  ],
});
