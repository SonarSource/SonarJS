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

ruleTester.run(`Variables declared with "var" should be declared before they are used`, rule, {
  valid: [
    {
      code: `var x;`,
    },
    {
      code: `
      var x;
      print(x);
      `,
    },
    {
      code: `
      function fun(x) {
        print(x);
      }
      `,
    },
    {
      code: `
      print(x);
      let x = 1;
      `,
    },
    {
      code: `
      print(x);
      const x = 1;
      `,
    },
    {
      code: `
      for (var x of xs) {}
      var x;
      `,
    },
    {
      code: `
      for (var x of xs) {}
      x;
      `,
    },
  ],
  invalid: [
    {
      code: `
      print(x);
      var x = 1;
      `,
      errors: [
        {
          message: `{"message":"Move the declaration of \\\"x\\\" before this usage.","secondaryLocations":[{"message":"Declaration","column":10,"line":3,"endColumn":11,"endLine":3}]}`,
          line: 2,
          endLine: 2,
          column: 13,
          endColumn: 14,
        },
      ],
      options: ['sonar-runtime'],
    },
    {
      code: `
      print(x);
      println(x);
      var x = 1;
      `,
      errors: [
        {
          message: `{"message":"Move the declaration of \\\"x\\\" before this usage.","secondaryLocations":[{"message":"Declaration","column":10,"line":4,"endColumn":11,"endLine":4}]}`,
          line: 2,
          endLine: 2,
          column: 13,
          endColumn: 14,
        },
      ],
      options: ['sonar-runtime'],
    },
    {
      code: `
      print(x);
      var x;
      `,
      errors: 1,
    },
    {
      code: `print(x); var x;`,
      errors: 1,
    },
    {
      code: `
      function fun() {
        print(x);
      }
      var x;
      `,
      errors: 1,
    },
    {
      code: `
      let fun = () => {
        print(x);
      }
      var x;
      `,
      errors: 1,
    },
  ],
});
