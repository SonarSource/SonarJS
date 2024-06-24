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
import { rule } from './rule';
import { JavaScriptRuleTester } from '../../../tests/tools';

const ruleTester = new JavaScriptRuleTester();

const falsySonarRuntimeData = JSON.stringify({
  secondaryLocations: [
    { message: 'Evaluated here to be falsy', line: 3, column: 12, endLine: 3, endColumn: 13 },
  ],
  message: 'This always evaluates to falsy. Consider refactoring this code.',
});
const truthySonarRuntimeData = JSON.stringify({
  secondaryLocations: [
    { message: 'Evaluated here to be truthy', line: 3, column: 12, endLine: 3, endColumn: 13 },
  ],
  message: 'This always evaluates to truthy. Consider refactoring this code.',
});

ruleTester.run('no-gratuitous-expressions', rule, {
  valid: [
    {
      code: `
      function bar(x: boolean) {
        if (x && y) {
        } else {
          if (x) {} // OK, else branch
        }
      }
      `,
    },
    {
      code: `
      function bar(x: boolean) {
        if (x) {
          x = bar();
          if (x) { }
        }
      }
      `,
    },
    {
      code: `
      function bar(x: boolean) {
        if (x) {
          while (cond) {
            x = bar();
            if (x) { }
          }
        }
      }
      `,
    },
    {
      code: `
      function bar(x: boolean) {
        if (x) {
          nested();
          if (x) { }
        }

        function nested() {
          x = bar();
        }
      }
      `,
    },
    {
      code: `
      function render(children, right) {
        if (children) {
          return (
            <div>
              {right && children}
            </div>
          );
        }
      }
      `,
    },
  ],
  invalid: [
    {
      code: `
        if (true) {}
        if (false) {}`,
      options: ['sonar-runtime'],
      errors: [
        {
          messageId: 'sonarRuntime',
          data: {
            value: 'truthy',
            sonarRuntimeData: JSON.stringify({
              secondaryLocations: [],
              message: 'This always evaluates to truthy. Consider refactoring this code.',
            }),
          },
          line: 2,
        },
        {
          messageId: 'sonarRuntime',
          data: {
            value: 'falsy',
            sonarRuntimeData: JSON.stringify({
              secondaryLocations: [],
              message: 'This always evaluates to falsy. Consider refactoring this code.',
            }),
          },
          line: 3,
        },
      ],
    },
    {
      code: `
      function bar(x: boolean, z) {
        if (x && z) {
          if (y && x) {} // "x" always true
          if (y && z) {} // "z" always true
        }
      }`,
      options: ['sonar-runtime'],
      errors: [
        {
          messageId: 'sonarRuntime',
          data: {
            value: 'truthy',
            sonarRuntimeData: truthySonarRuntimeData,
          },
          line: 4,
          column: 20,
          endLine: 4,
          endColumn: 21,
        },
        {
          messageId: 'sonarRuntime',
          data: {
            value: 'truthy',
            sonarRuntimeData: JSON.stringify({
              secondaryLocations: [
                {
                  message: 'Evaluated here to be truthy',
                  line: 3,
                  column: 17,
                  endLine: 3,
                  endColumn: 18,
                },
              ],
              message: 'This always evaluates to truthy. Consider refactoring this code.',
            }),
          },
          line: 5,
          column: 20,
          endLine: 5,
          endColumn: 21,
        },
      ],
    },
    {
      code: `
      function bar(x: boolean) {
        if (x) {
          if (x) { // "x" always true
          }
        }
      }`,
      options: ['sonar-runtime'],
      errors: [
        {
          messageId: 'sonarRuntime',
          data: {
            value: 'truthy',
            sonarRuntimeData: truthySonarRuntimeData,
          },
          line: 4,
          column: 15,
          endLine: 4,
          endColumn: 16,
        },
      ],
    },
    {
      code: `
      function bar(x: boolean ) {
        x++;
        if (x) {
          if (x) { // Noncompliant
          }
        }
        x = foo();
      }`,
      options: ['sonar-runtime'],
      errors: [
        {
          messageId: 'sonarRuntime',
          data: {
            value: 'truthy',
            sonarRuntimeData: JSON.stringify({
              secondaryLocations: [
                {
                  message: 'Evaluated here to be truthy',
                  line: 4,
                  column: 12,
                  endLine: 4,
                  endColumn: 13,
                },
              ],
              message: 'This always evaluates to truthy. Consider refactoring this code.',
            }),
          },
          line: 5,
          column: 15,
          endLine: 5,
          endColumn: 16,
        },
      ],
    },
    {
      code: `
      function bar(x: boolean) {
        if (x) {
          if (!x) { // Noncompliant
          }
        }
      }`,
      options: ['sonar-runtime'],
      errors: [
        {
          messageId: 'sonarRuntime',
          data: {
            value: 'truthy',
            sonarRuntimeData: truthySonarRuntimeData,
          },
          line: 4,
          column: 16,
          endLine: 4,
          endColumn: 17,
        },
      ],
    },
    {
      code: `
      function bar(x: boolean) {
        if (!x) {
          foo(!x) // Noncompliant
        }
      }`,
      options: ['sonar-runtime'],
      errors: [
        {
          messageId: 'sonarRuntime',
          data: {
            value: 'falsy',
            sonarRuntimeData: JSON.stringify({
              secondaryLocations: [
                {
                  message: 'Evaluated here to be falsy',
                  line: 3,
                  column: 13,
                  endLine: 3,
                  endColumn: 14,
                },
              ],
              message: 'This always evaluates to falsy. Consider refactoring this code.',
            }),
          },
          line: 4,
          column: 16,
          endLine: 4,
          endColumn: 17,
        },
      ],
    },
    {
      code: `
      function bar(x: boolean) {
        if (x) {
          x = 42;
        } else {
          foo(!x) // Noncompliant
        }
      }`,
      options: ['sonar-runtime'],
      errors: [
        {
          messageId: 'sonarRuntime',
          data: {
            value: 'falsy',
            sonarRuntimeData: falsySonarRuntimeData,
          },
          line: 6,
          column: 16,
          endLine: 6,
          endColumn: 17,
        },
      ],
    },
    {
      code: `
      function bar(x: boolean) {
        if (x) {
          return foo() || x; // OK
        } else {
          x || bar(); // Noncompliant
          x || bar() || bar(); // Noncompliant
          bar() || x || bar(); // FN, not supported
        }
      }`,
      options: ['sonar-runtime'],
      errors: [
        {
          messageId: 'sonarRuntime',
          data: {
            value: 'falsy',
            sonarRuntimeData: falsySonarRuntimeData,
          },
          line: 6,
          column: 11,
          endLine: 6,
          endColumn: 12,
        },
        {
          messageId: 'sonarRuntime',
          data: {
            value: 'falsy',
            sonarRuntimeData: falsySonarRuntimeData,
          },
          line: 7,
          column: 11,
          endLine: 7,
          endColumn: 12,
        },
      ],
    },
    {
      code: `
      function bar(x: boolean) {
        if (!!x) {
          x && foo(); // Noncompliant
        }
      }`,
      options: ['sonar-runtime'],
      errors: [
        {
          messageId: 'sonarRuntime',
          data: {
            value: 'truthy',
            sonarRuntimeData: JSON.stringify({
              secondaryLocations: [
                {
                  message: 'Evaluated here to be truthy',
                  line: 3,
                  column: 14,
                  endLine: 3,
                  endColumn: 15,
                },
              ],
              message: 'This always evaluates to truthy. Consider refactoring this code.',
            }),
          },
          line: 4,
          column: 11,
          endLine: 4,
          endColumn: 12,
        },
      ],
    },
    {
      code: `
      function render(children, right) {
        if (right) {
          return (
            <div>
              {right && children}
            </div>
          );
        }
      }
      `,
      options: ['sonar-runtime'],
      errors: [
        {
          messageId: 'sonarRuntime',
          data: {
            value: 'truthy',
            sonarRuntimeData: JSON.stringify({
              secondaryLocations: [
                {
                  message: 'Evaluated here to be truthy',
                  line: 3,
                  column: 12,
                  endLine: 3,
                  endColumn: 17,
                },
              ],
              message: 'This always evaluates to truthy. Consider refactoring this code.',
            }),
          },
          line: 6,
          column: 16,
          endLine: 6,
          endColumn: 21,
        },
      ],
    },
  ],
});
