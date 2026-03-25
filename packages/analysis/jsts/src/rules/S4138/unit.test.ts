/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
import { DefaultParserRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { describe, it } from 'node:test';

describe('S4138', () => {
  it('S4138', () => {
    const ruleTester = new DefaultParserRuleTester();

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
              messageId: 'preferForOf',
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
              messageId: 'preferForOf',
              suggestions: [
                {
                  desc: `Replace with "for of" loop`,
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
              messageId: 'preferForOf',
              suggestions: [
                {
                  desc: `Replace with "for of" loop`,
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
              messageId: 'preferForOf',
              suggestions: [
                {
                  desc: `Replace with "for of" loop`,
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
              messageId: 'preferForOf',
              suggestions: [
                {
                  desc: `Replace with "for of" loop`,
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
              messageId: 'preferForOf',
              suggestions: [
                {
                  desc: `Replace with "for of" loop`,
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
              messageId: 'preferForOf',
              suggestions: [
                {
                  desc: `Replace with "for of" loop`,
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
              messageId: 'preferForOf',
              suggestions: [
                {
                  desc: `Replace with "for of" loop`,
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
              messageId: 'preferForOf',
              suggestions: [
                {
                  desc: `Replace with "for of" loop`,
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
              messageId: 'preferForOf',
              suggestions: [
                {
                  desc: `Replace with "for of" loop`,
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
          errors: [
            {
              messageId: 'preferForOf',
              suggestions: [],
            },
          ],
        },
        {
          code: `for (let i = 0; i < arr.length; ++i) { console.log(arr[element]) }`,
          errors: [
            {
              messageId: 'preferForOf',
              suggestions: [],
            },
          ],
        },
      ],
    });
  });
});
