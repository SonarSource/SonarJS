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
import { rule } from './index.js';
import { RuleTester } from 'eslint';

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });
ruleTester.run('No implicit global', rule, {
  valid: [
    {
      code: `
      function fun() {
        var y = 3; // OK
      }`,
    },
    {
      code: `
      function fun() {
        otherFun(); // OK
      }`,
    },
    {
      code: `
      function fun() {
        amplify.subscribe()
      }`,
    },
    {
      code: `$()`,
    },
    {
      code: `
      let unflowed;
      unflowed = false;`,
    },
    {
      code: `
      var foo = exports = module.exports = {} // OK
      `,
    },
    {
      code: `module = 1; // OK`,
    },
    {
      code: `jQuery = $ = $$`,
    },
  ],
  invalid: [
    {
      code: `
      function fun() {
        x = 1;
      //^
      }
      `,
      errors: [
        {
          message: `Add the "let", "const" or "var" keyword to this declaration of "x" to make it explicit.`,
          line: 3,
          endLine: 3,
          column: 9,
          endColumn: 10,
        },
      ],
    },
    {
      code: `
       for (z in obj) {}
      `,
      errors: 1,
    },
    {
      code: `
      function fun() {
        x = 1;
      //^
        x = 2;
      }
      `,
      errors: 1,
    },
    {
      code: `for (j = 0; j < array.length; j++){}`,
      errors: 1,
    },
    {
      code: `for (k of obj){}`,
      errors: 1,
    },
    {
      code: `
      function fun(){
        z = 1;   // OK
        var z;
        var var1 = var2 = 1;  // Noncompliant
        fun(arguments) // OK
      }`,
      errors: [
        {
          message: `Add the "let", "const" or "var" keyword to this declaration of "var2" to make it explicit.`,
          line: 5,
          endLine: 5,
          column: 20,
          endColumn: 24,
        },
      ],
    },
  ],
});
