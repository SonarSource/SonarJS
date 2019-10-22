/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2019 SonarSource SA
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
import { RuleTester } from "eslint";
import { rule } from "../../src/rules/prefer-promise-shorthand";

const ruleTester = new RuleTester({
  parser: require.resolve("@typescript-eslint/parser"),
  parserOptions: { ecmaVersion: 2018 },
});

ruleTester.run("Shorthand promises should be used", rule, {
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
      code: `let fulfilledPromise = new Promise(resolve => resolve(calc(42)));`,
      errors: [
        {
          message: `Replace this trivial promise with "Promise.resolve(calc(42))".`,
          line: 1,
          endLine: 1,
          column: 24,
          endColumn: 65,
        },
      ],
    },
    {
      code: `let rejectedPromise = new Promise((resolve, reject) => reject(new Error('fail')));`,
      errors: 1,
    },
    {
      code: `let rejectedPromise = new Promise(r => r(42));`,
      errors: 1,
    },
    {
      code: `let rejectedPromise = new Promise(function(resolve) { resolve(42); });`,
      errors: 1,
    },
  ],
});
