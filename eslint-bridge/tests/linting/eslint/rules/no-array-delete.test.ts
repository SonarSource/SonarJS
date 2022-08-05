/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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
import { TypeScriptRuleTester } from '../../../tools';
import { rule } from 'linting/eslint/rules/no-array-delete';

const ruleTester = new TypeScriptRuleTester();
ruleTester.run('[ts] delete should not be used on arrays', rule, {
  valid: [
    {
      code: `
      let a;
      delete a.arr[1] // OK, a.arr could be object
      `,
    },
    {
      code: `
      function foo(arr) {
        delete arr[1] // OK, arr's type is not known, could be object, deleting property of object is allowed
      }
      `,
    },
    {
      code: `
      var obj = { 1: "b" };
      delete obj[1]; // OK, obj is object
      `,
    },
    {
      code: `
      let arr = ['a', 'b', 'c', 'd'];
      delete arr.length; // OK, member access, not array-like access
      `,
    },
  ],
  invalid: [
    {
      code: `
      let arr = ['a', 'b', 'c', 'd'];
      delete arr[1];
      `,
      errors: [
        {
          message: `Remove this use of "delete".`,
          line: 3,
          endLine: 3,
          column: 7,
          endColumn: 13,
        },
      ],
    },
    {
      code: `
      let arr = ['a', 'b', 'c', 'd'];
      delete arr[i];
      `,
      errors: 1,
    },
    {
      code: `
      let arr = ['a', 'b', 'c', 'd'];
      if (true) {
        delete arr[1];
      }
      `,
      errors: 1,
    },
    {
      code: `
      let obj = { a: { b: { c: ['a', 'b', 'c', 'd'] }} }
      delete obj.a.b.c[1];
      `,
      errors: 1,
    },
    {
      code: `
      function arr() { return ['a', 'b', 'c', 'd']; }
      delete arr()[1];
      `,
      errors: 1,
    },
  ],
});
