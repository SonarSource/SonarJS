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
import { rule } from './rule.ts';
import { JavaScriptRuleTester } from '../../../tests/tools/index.ts';

const ruleTester = new JavaScriptRuleTester();

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
              message: 'Merge this if statement with the nested one.',
              secondaryLocations: [
                {
                  message: 'Nested "if" statement.',
                  column: 8,
                  line: 4,
                  endColumn: 10,
                  endLine: 4,
                },
              ],
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
