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
import { rule } from './rule';
import { JavaScriptRuleTester } from '../../../tests/tools';

const ruleTester = new JavaScriptRuleTester();

const SONAR_RUNTIME = 'sonar-runtime';

ruleTester.run('no-identical-conditions', rule, {
  valid: [
    {
      code: 'if (a) {} else if (b) {}',
    },
    {
      code: 'if (a) {} else {}',
    },
    {
      code: 'if (a && b) {} else if (a) {}',
    },
    {
      code: 'if (a && b) {} else if (c && d) {}',
    },
    {
      code: 'if (a || b) {} else if (c || d) {}',
    },
    {
      code: 'if (a ?? b) {} else if (c) {}',
    },
    {
      code: `
      switch (a) {
        case 1:  break;
        case 2:  break;
        case 3:  break;
        default: break;
      }
      `,
    },
  ],
  invalid: [
    {
      code: `
        if (a) {}
        else if (a) {}
      `,
      errors: [
        {
          messageId: 'duplicatedCondition',
          data: {
            line: 2,
          },
          line: 3,
          column: 18,
          endColumn: 19,
        },
      ],
    },
    {
      code: `
        if (a) {}
        //  ^>
        else if (a) {}
        //       ^
      `,
      options: [SONAR_RUNTIME],
      errors: [
        {
          messageId: 'sonarRuntime',
          data: {
            line: 2,
            sonarRuntimeData: JSON.stringify({
              message: 'This condition is covered by the one on line 2',
              secondaryLocations: [
                {
                  message: 'Covering',
                  column: 12,
                  line: 2,
                  endColumn: 13,
                  endLine: 2,
                },
              ],
            }),
          },
        },
      ],
    },
    {
      code: `
        if (b) {}
        else if (a) {}
        else if (a) {}
      `,
      errors: [
        {
          messageId: 'duplicatedCondition',
          data: {
            line: 3,
          },
          line: 4,
          column: 18,
          endColumn: 19,
        },
      ],
    },
    {
      code: `
        if (a) {}
        else if (b) {}
        else if (a) {}
      `,
      errors: [
        {
          messageId: 'duplicatedCondition',
          data: {
            line: 2,
          },
          line: 4,
          column: 18,
          endColumn: 19,
        },
      ],
    },
    {
      code: `
        if (a || b) {}
        // >^^^^^^
        else if (a) {}
        //       ^`,
      options: [SONAR_RUNTIME],
      errors: [
        {
          messageId: 'sonarRuntime',
          line: 4,
          column: 18,
          endLine: 4,
          endColumn: 19,
          data: {
            line: 2,
            sonarRuntimeData: JSON.stringify({
              message: 'This condition is covered by the one on line 2',
              secondaryLocations: [
                {
                  message: 'Covering',
                  column: 12,
                  line: 2,
                  endColumn: 18,
                  endLine: 2,
                },
              ],
            }),
          },
        },
      ],
    },
    {
      code: `if (a || b) {} else if (b) {}`,
      errors: [{ messageId: 'duplicatedCondition' }],
    },
    {
      code: `if ((a === b && fn(c)) || d) {} else if (a === b && fn(c)) {}`,
      errors: [{ messageId: 'duplicatedCondition' }],
    },
    {
      code: `if (a) {} else if (a && b) {}`,
      errors: [{ messageId: 'duplicatedCondition' }],
    },
    {
      code: `if (a && b) ; else if (b && a) {}`,
      errors: [{ messageId: 'duplicatedCondition' }],
    },
    {
      code: `if (a) {} else if (b) {} else if (c && a || b) {}`,
      errors: [{ messageId: 'duplicatedCondition' }],
    },
    {
      code: `if (a) {} else if (b) {} else if (c && (a || b)) {}`,
      errors: [{ messageId: 'duplicatedCondition' }],
    },
    {
      code: `if (a) {} else if (b && c) {} else if (d && (a || e && c && b)) {}`,
      errors: [{ messageId: 'duplicatedCondition' }],
    },
    {
      code: `if (a || b && c) {} else if (b && c && d) {}`,
      errors: [{ messageId: 'duplicatedCondition' }],
    },
    {
      code: `if (a || b) {} else if (b && c) {}`,
      errors: [{ messageId: 'duplicatedCondition' }],
    },
    {
      code: `if (a) {} else if (b) {} else if ((a || b) && c) {}`,
      errors: [{ messageId: 'duplicatedCondition' }],
    },
    {
      code: `if ((a && (b || c)) || d) {} else if ((c || b) && e && a) {}`,
      errors: [{ messageId: 'duplicatedCondition' }],
    },
    {
      code: `if (a && b || b && c) {} else if (a && b && c) {}`,
      errors: [{ messageId: 'duplicatedCondition' }],
    },
    {
      code: `if (a) {} else if (b && c) {} else if (d && (c && e && b || a)) {}`,
      errors: [{ messageId: 'duplicatedCondition' }],
    },
    {
      code: `if (a || (b && (c || d))) {} else if ((d || c) && b) {}`,
      errors: [{ messageId: 'duplicatedCondition' }],
    },
    {
      code: `if (a || b) {} else if ((b || a) && c) {}`,
      errors: [{ messageId: 'duplicatedCondition' }],
    },
    {
      code: `if (a || b) {} else if (c) {} else if (d) {} else if (b && (a || c)) {}`,
      errors: [{ messageId: 'duplicatedCondition' }],
    },
    {
      code: `if (a || b || c) {} else if (a || (b && d) || (c && e)) {}`,
      errors: [{ messageId: 'duplicatedCondition' }],
    },
    {
      code: `if (a || (b || c)) {} else if (a || (b && c)) {}`,
      errors: [{ messageId: 'duplicatedCondition' }],
    },
    {
      code: `if (a || b) {} else if (c) {} else if (d) {} else if ((a || c) && (b || d)) {}`,
      errors: [{ messageId: 'duplicatedCondition' }],
    },
    {
      code: `if (a) {} else if (b) {} else if (c && (a || d && b)) {}`,
      errors: [{ messageId: 'duplicatedCondition' }],
    },
    {
      code: `if (a) {} else if (a || a) {}`,
      errors: [{ messageId: 'duplicatedCondition' }],
    },
    {
      code: `if (a) {} else if (a && a) {}`,
      errors: [{ messageId: 'duplicatedCondition' }],
    },
    {
      code: `
        switch (a) {
          case 1:
            f();
            break;
          case 2:
            g();
            break;
          case 1:
            h();
            break;
        }
      `,
      options: [SONAR_RUNTIME],
      errors: [
        {
          messageId: 'sonarRuntime',
          data: {
            line: 9,
            column: 15,
            endColumn: 16,
            sonarRuntimeData: JSON.stringify({
              message: 'This case duplicates the one on line 3',
              secondaryLocations: [
                {
                  message: 'Original',
                  column: 15,
                  line: 3,
                  endColumn: 16,
                  endLine: 3,
                },
              ],
            }),
          },
        },
      ],
    },
    {
      code: `
        switch (a) {
          case 1:
            f();
            break;
          case 2:
            g();
            break;
          case 1:
            h();
            break;
          case 1:
            i();
            break;
        }
      `,
      errors: [
        {
          messageId: 'duplicatedCase',
          data: {
            line: 3,
          },
          line: 9,
          column: 16,
          endColumn: 17,
        },
        {
          messageId: 'duplicatedCase',
          data: {
            line: 3,
          },
          line: 12,
          column: 16,
          endColumn: 17,
        },
      ],
    },
  ],
});
