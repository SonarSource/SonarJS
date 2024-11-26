/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import { NodeRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { fileURLToPath } from 'node:url';

const ruleTester = new NodeRuleTester({
  parser: fileURLToPath(import.meta.resolve('@typescript-eslint/parser')),
  parserOptions: { ecmaVersion: 2018, ecmaFeatures: { jsx: true } },
});

ruleTester.run('Shorthand promises should be used', rule, {
  valid: [
    {
      code: `let fulfilledPromise = new Promise(resolve => { resolve(calc(42));  console.log("foo"); });`,
    },
    {
      code: `let fulfilledPromise = Promise.resolve(42);`,
    },
    {
      code: `let fulfilledPromise = Promise.reject('fail');`,
    },
    {
      code: `
      function calc(x:number): number { return x * 2; }
      let somePromise = new Promise(() => { calc(42); }); // 0 parameters
      `,
    },
  ],
  invalid: [
    {
      code: `
      let fulfilledPromise = new Promise(resolve => resolve(calc(42)));
      `,
      errors: [
        {
          message: `Replace this trivial promise with "Promise.resolve".`,
          line: 2,
          endLine: 2,
          column: 34,
          endColumn: 41,
        },
      ],
    },
    {
      code: `let rejectedPromise = new Promise((resolve, reject) => reject(new Error('fail')));`,
      errors: [{ message: `Replace this trivial promise with "Promise.reject".` }],
    },
    {
      code: `let rejectedPromise = new Promise((p1, p2) => p2(new Error('fail')));`,
      errors: [{ message: `Replace this trivial promise with "Promise.reject".` }],
    },
    {
      code: `new Promise(resolve => resolve(calc(42)));`,
      errors: [
        {
          suggestions: [
            {
              desc: 'Replace with "Promise.resolve"',
              output: 'Promise.resolve(calc(42));',
            },
          ],
        },
      ],
    },
    {
      code: `new Promise((resolve, reject) => reject(new Error('fail')));`,
      errors: [
        {
          suggestions: [
            {
              desc: 'Replace with "Promise.reject"',
              output: `Promise.reject(new Error('fail'));`,
            },
          ],
        },
      ],
    },
  ],
});
