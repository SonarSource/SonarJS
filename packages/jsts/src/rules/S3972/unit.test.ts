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

ruleTester.run('Conditionals should start on new lines', rule, {
  valid: [
    {
      code: `
      if (cond1)
        if (cond2) {
          if (cond3) {
          }
        }`,
    },
    {
      code: `
      if (cond1) {
      } else if (cond2) {
      } else if (cond3) {
      }`,
    },
    {
      code: `
      if (cond1) {
      }
      if (cond2) {
      } else if (cond3) {
      }`,
    },
    {
      code: `
      if (cond1)
        doSomething();
      if (cond2) {
      }`,
    },
    {
      code: `foo(); if (cond) bar();`,
    },
    {
      // OK if everything is on one line
      code: `if (cond1) foo(); if (cond2) bar();`,
    },
    {
      code: `
      function myFunc() {
        if (cond1) {
        } else if (cond2) {
        } else if (cond3) {
        }
      }`,
    },
    {
      code: `
      switch(x) {
        case 1:
          if (cond1) {
          } else if (cond2) {
          } else if (cond3) {
          }
          break;
        default:
          if (cond1) {
          } else if (cond2) {
          } else if (cond3) {
          }
          break;
      }`,
    },
  ],
  invalid: [
    {
      code: `
      if (cond1) {
      } if (cond2) {
      }`,
      errors: [
        {
          messageId: 'sameLineCondition',
          line: 3,
          endLine: 3,
          column: 9,
          endColumn: 11,
          suggestions: [
            {
              messageId: 'suggestAddingElse',
              output: `
      if (cond1) {
      } else if (cond2) {
      }`,
            },
            {
              messageId: 'suggestAddingNewline',
              output: `
      if (cond1) {
      }
      if (cond2) {
      }`,
            },
          ],
        },
      ],
    },
    {
      code: `
      switch(x) {
        case 1:
          if (cond1) {
          } else if (cond2) {
          } if (cond3) {
          }
          break;
        default:
          if (cond1) {
          } if (cond2) {
          } else if (cond3) {
          }
          break;
      }`,
      options: ['sonar-runtime'],
      errors: [
        {
          messageId: 'sonarRuntime',
          data: {
            sonarRuntimeData: JSON.stringify({
              secondaryLocations: [
                {
                  line: 6,
                  column: 10,
                  endLine: 6,
                  endColumn: 11,
                  message: '',
                },
              ],
              message: 'Move this "if" to a new line or add the missing "else".',
            }),
          },
          line: 6,
          endLine: 6,
          column: 13,
          endColumn: 15,
        },
        {
          messageId: 'sonarRuntime',
          data: {
            sonarRuntimeData: JSON.stringify({
              secondaryLocations: [
                {
                  line: 11,
                  column: 10,
                  endLine: 11,
                  endColumn: 11,
                  message: '',
                },
              ],
              message: 'Move this "if" to a new line or add the missing "else".',
            }),
          },
          line: 11,
          endLine: 11,
          column: 13,
          endColumn: 15,
        },
      ],
    },
    {
      code: `
      if (cond1) {
      } else if (cond2) {
      } if (cond3) {
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
                  column: 6,
                  endLine: 4,
                  endColumn: 7,
                  message: '',
                },
              ],
              message: 'Move this "if" to a new line or add the missing "else".',
            }),
          },
        },
      ],
    },
    {
      code: `
      if (cond1)
        if (cond2) {
          if (cond3) {
          } if (cond4) {
          }
        }`,
      options: ['sonar-runtime'],
      errors: [
        {
          messageId: 'sonarRuntime',
          data: {
            sonarRuntimeData: JSON.stringify({
              secondaryLocations: [
                {
                  line: 5,
                  column: 10,
                  endLine: 5,
                  endColumn: 11,
                  message: '',
                },
              ],
              message: 'Move this "if" to a new line or add the missing "else".',
            }),
          },
        },
      ],
    },
    {
      code: `
      function myFunc() {
        if (cond1) {
        } else if (cond2) {
        } if (cond3) {
        }
      }`,
      options: ['sonar-runtime'],
      errors: [
        {
          messageId: 'sonarRuntime',
          data: {
            sonarRuntimeData: JSON.stringify({
              secondaryLocations: [
                {
                  line: 5,
                  column: 8,
                  endLine: 5,
                  endColumn: 9,
                  message: '',
                },
              ],
              message: 'Move this "if" to a new line or add the missing "else".',
            }),
          },
        },
      ],
    },
    {
      code: `
      function myFunc() {
        foo(); if (cond1) {
        } if (cond2) {
        }
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
                  endColumn: 9,
                  message: '',
                },
              ],
              message: 'Move this "if" to a new line or add the missing "else".',
            }),
          },
          suggestions: [
            {
              messageId: 'suggestAddingElse',
              output: `
      function myFunc() {
        foo(); if (cond1) {
        } else if (cond2) {
        }
      }`,
            },
            {
              messageId: 'suggestAddingNewline',
              output: `
      function myFunc() {
        foo(); if (cond1) {
        }
               if (cond2) {
        }
      }`,
            },
          ],
        },
      ],
    },
  ],
});
