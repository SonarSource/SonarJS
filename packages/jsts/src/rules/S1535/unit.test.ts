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
ruleTester.run('"for...in" loops should filter properties before acting on them', rule, {
  valid: [
    {
      code: `
      for (name in object) {
        if (object.hasOwnProperty(name)) {
          print(object[name]);
        }
      }
            `,
    },
    {
      code: `
      for (name in object) { // OK
      }
            `,
    },

    {
      code: `
      for (key in obj)   // OK
      a[key] = b[key];
            `,
    },
    {
      code: `
      for (key in obj) {   // OK
        a[key] = b[key];
      }
            `,
    },
  ],
  invalid: [
    {
      code: `
      for (key in arr) { // Noncompliant {{Restrict what this loop acts on by testing each property.}}
        print(arr[key]);
        print(arr[key]);
      }
            `,
      errors: [
        {
          message: 'Restrict what this loop acts on by testing each property.',
          line: 2,
          endLine: 5,
          column: 7,
          endColumn: 8,
        },
      ],
    },
    {
      code: `
      for (key in arr) { // Noncompliant
        function f() {}
        print(arr[key]);
      }
            `,
      errors: 1,
    },
    {
      code: `
      for (key in obj) {   // Noncompliant
        val = b[key];
      }
            `,
      errors: 1,
    },
    {
      code: `
      for (key in obj) {      // Noncompliant
        a.b = key;
      }
            `,
      errors: 1,
    },
  ],
});
