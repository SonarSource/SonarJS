/*
 * eslint-plugin-sonarjs
 * Copyright (C) 2018-2021 SonarSource SA
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
import { ruleTester } from '../rule-tester';
import rule = require('../../src/rules/no-collapsible-if');

ruleTester.run('no-collapsible-if', rule, {
  valid: [
    {
      code: `
      if (x) {
        console.log(x);
      }`,
    },
    {
      code: `
      if (x) {
        if (y) {}
          console.log(x);
      }`,
    },
    {
      code: `
      if (x) {
        console.log(x);
        if (y) {}
      }`,
    },
    {
      code: `
      if (x) {
        if (y) {}
      } else {}`,
    },
    {
      code: `
      if (x) {
        if (y) {} else {}
      }`,
    },
  ],

  invalid: [
    {
      code: `
      if (x) {
    //^^ > {{Merge this if statement with the nested one.}}
        if (y) {}
      //^^ {{Nested "if" statement.}}
      }`,
      options: ['sonar-runtime'],
      errors: [
        {
          messageId: 'sonarRuntime',
          data: {
            sonarRuntimeData: JSON.stringify({
              secondaryLocations: [
                {
                  line: 4,
                  column: 8,
                  endLine: 4,
                  endColumn: 10,
                  message: 'Nested "if" statement.',
                },
              ],
              message: 'Merge this if statement with the nested one.',
            }),
          },
          line: 2,
          column: 7,
          endLine: 2,
          endColumn: 9,
        },
      ],
    },
    {
      code: `
      if (x)
        if(y) {}`,
      errors: [{ messageId: 'mergeNestedIfStatement' }],
    },
    {
      code: `
      if (x) {
        if(y) {
          if(z) {
          }
        }
      }`,
      errors: [{ messageId: 'mergeNestedIfStatement' }, { messageId: 'mergeNestedIfStatement' }],
    },
  ],
});
