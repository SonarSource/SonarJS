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

ruleTester.run('no-duplicated-branches if', rule, {
  valid: [
    {
      code: `
      if (a) {
        first('const');
        first('foo');
      } else {
        first('var');
        first('foo');
      }`,
    },
    {
      // small branches
      code: `
      if (a) {
        first();
      } else {
        first();
      }`,
    },
    {
      code: `
      if (a) {
        first();
        first();
      } else {
        second();
        second();
      }`,
    },
    {
      code: `
      if (a) {
        first();
        second();
      } else {
        second();
        first();
      }`,
    },
    {
      code: `
      if (a) {
        first();
        second();
      } else {
        first();
        third();
      }`,
    },
    {
      code: `
      if (a) {
        first();
        second();
      } else {
        first();
      }`,
    },
    {
      code: `
      if(a == 1) {
        doSomething();  //no issue, usually this is done on purpose to increase the readability
      } else if (a == 2) {
        doSomethingElse();
      } else {
        doSomething();
      }`,
    },
  ],
  invalid: [
    {
      code: `
      if (a) {
        first();
        second();
      } else {
        first();
        second();
      }`,
      errors: [
        {
          messageId: 'sameConditionalBlock',
          data: {
            type: 'branch',
            line: 2,
          },
          line: 5,
          endLine: 8,
          column: 14,
          endColumn: 8,
        },
      ],
    },
    {
      code: `
      if (a) {
        first();
        second();
      } else if (b) {
        first();
        second();
      }`,
      options: ['sonar-runtime'],
      errors: [
        {
          line: 5,
          messageId: 'sonarRuntime',
          data: {
            type: 'branch',
            line: 2,
            sonarRuntimeData: JSON.stringify({
              message:
                "This branch's code block is the same as the block for the branch on line 2.",
              secondaryLocations: [
                {
                  message: 'Original',
                  column: 13,
                  line: 2,
                  endColumn: 7,
                  endLine: 5,
                },
              ],
            }),
          },
        },
      ],
    },

    /**
     * message: JSON.stringify({
            secondaryLocations: [
              {
                line: 2,
                column: 13,
                endLine: 5,
                endColumn: 7,
                message: 'Original',
              },
            ],
            message,
          })
     */

    {
      code: `
      if (a) {
        first();
        second();
      } else if (b) {
        second();
        third();
      } else {
        first();
        second();
      }`,
      errors: [
        {
          messageId: 'sameConditionalBlock',
          data: {
            type: 'branch',
            line: 2,
          },
          line: 8,
        },
      ],
    },
    {
      code: `
      if(a == 1) {
        doSomething();
      } else if (a == 2) {
        doSomething();
      }`,
      errors: [
        {
          messageId: 'sameConditionalBlock',
          data: {
            type: 'branch',
            line: 2,
          },
          line: 4,
        },
      ],
    },
    {
      code: `
      if(a == 1) {
        doSomething();
      } else if (a == 2) {
        doSomething();
      } else if (a == 3) {
        doSomething();
      }`,
      errors: [
        {
          messageId: 'sameConditionalBlock',
          data: {
            type: 'branch',
            line: 2,
          },
          line: 4,
        },
        {
          messageId: 'sameConditionalBlock',
          data: {
            type: 'branch',
            line: 4,
          },
          line: 6,
        },
      ],
    },
  ],
});

ruleTester.run('no-duplicated-branches switch', rule, {
  valid: [
    {
      code: `
      function foo() {
        switch (a) {
          case 1:
            return first();
          default:
            return first();
        }
      }`,
    },
    {
      // small branches
      code: `
      switch (a) {
        case 1: {
          // comment
          break;
        }
        case 2: {
          // comment
          break;
        }
      }`,
    },
    {
      code: `
      switch (a) {
        case 1:
          first();
          second();
          break;
        default:
          second();
          first();
      }`,
    },
    {
      code: `
      switch (a) {
        case 1:
          first();
          second();
          break;
        case 2:
          third();
      }`,
    },
  ],
  invalid: [
    {
      code: `
      switch(a) {
        case 2:
        case 1:
          first();
          second();
          break;
        case 3:
          first();
          second();
          break;
      }`,
      errors: [
        {
          messageId: 'sameConditionalBlock',
          data: {
            type: 'case',
            line: '4',
          },
          line: 8,
        },
      ],
    },
    {
      code: `
      switch (a) {
        case 1:
          first();
          second();
          break;
        default:
          first();
          second();
      }`,
      errors: [
        {
          messageId: 'sameConditionalBlock',
          data: {
            type: 'case',
            line: 3,
          },
          line: 7,
          endLine: 9,
          column: 9,
          endColumn: 20,
        },
      ],
    },
    {
      code: `
      switch (a) {
        case 1:
          first();
          second();
          break;
        case 2:
          first();
          second();
          break;
      }`,
      options: ['sonar-runtime'],
      errors: [
        {
          line: 7,
          messageId: 'sonarRuntime',
          data: {
            type: 'case',
            line: '3',
            sonarRuntimeData: JSON.stringify({
              message: `This case's code block is the same as the block for the case on line 3.`,
              secondaryLocations: [
                {
                  message: 'Original',
                  column: 8,
                  line: 3,
                  endColumn: 16,
                  endLine: 6,
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
          first();
          first();
          break;
        case 2:
          second();
          second();
          break;
        case 3:
          first();
          first();
          break;
      }`,
      errors: [
        {
          messageId: 'sameConditionalBlock',
          line: 11,
          data: {
            type: 'case',
            line: 3,
          },
        },
      ],
    },
    {
      code: `
      switch (a) {
        case 1: {
          first();
          second();
          break;
        }
        default: {
          first();
          second();
        }
      }`,
      errors: [
        {
          messageId: 'sameConditionalBlock',
          line: 8,
          data: {
            type: 'case',
            line: 3,
          },
        },
      ],
    },
    {
      // check that for each branch we generate only one issue
      code: `
      switch (a) {
        case 1:
          first();
          second();
          break;
        case 2:
          first();
          second();
          break;
        case 3:
          first();
          second();
          break;
        case 4:
          first();
          second();
          break;
      }`,
      errors: [
        {
          messageId: 'sameConditionalBlock',
          line: 7,
          data: {
            type: 'case',
            line: 3,
          },
        },
        {
          messageId: 'sameConditionalBlock',
          line: 11,
          data: {
            type: 'case',
            line: 7,
          },
        },
        {
          messageId: 'sameConditionalBlock',
          line: 15,
          data: {
            type: 'case',
            line: 11,
          },
        },
      ],
    },
    {
      code: `
      switch(a) {
        case 1:
          doSomething();
          break;
        case 2:
          doSomething();
          break;
      }`,
      errors: [
        {
          messageId: 'sameConditionalBlock',
          line: 6,
          data: {
            type: 'case',
            line: 3,
          },
        },
      ],
    },
    {
      code: `
      switch(a) {
        case 0:
          foo();
          bar();
          break;
        case 2:
        case 1:
          first();
          second();
          break;
        case 3:
          first();
          second();
          break;
      }`,
      errors: [
        {
          messageId: 'sameConditionalBlock',
          line: 12,
          data: {
            type: 'case',
            line: 8,
          },
        },
      ],
    },
  ],
});
