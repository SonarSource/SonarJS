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
import { S2301 } from './index';
import { TypeScriptRuleTester } from '../../../tests/tools';
import { RuleTester } from 'eslint';

const ruleTester = new TypeScriptRuleTester();

ruleTester.run('S2301:TypeScript', S2301, {
  invalid: [
    {
      name: 'function with a boolean parameter that creates a path',
      code: `const unaryTest = (foo: boolean) => {
  if (foo) {
    return 5;
  }
  
  return 10;
};

const binaryTest = (foo: boolean) => {
  if (foo === true) {
    return 5;
  }
  
  return 10;
};

const nestedTest = (foo: boolean) => {
  if (true) {
    if (foo === true) {
      return 5;
    }
  }
  
  return 10;
};`,
      options: ['sonar-runtime'],
      errors: [
        {
          line: 2,
          column: 7,
          endLine: 2,
          endColumn: 10,
          messageId: 'sonarRuntime',
          data: {
            parameterName: 'foo',
            sonarRuntimeData: JSON.stringify({
              message:
                'Provide multiple methods instead of using "foo" to determine which action to take.',
              secondaryLocations: [
                {
                  message: 'Parameter "foo" was declared here',
                  column: 19,
                  line: 1,
                  endColumn: 31,
                  endLine: 1,
                },
              ],
            }),
          },
        },
        {
          line: 10,
          column: 7,
          endLine: 10,
          endColumn: 10,
          messageId: 'sonarRuntime',
          data: {
            parameterName: 'foo',
            sonarRuntimeData: JSON.stringify({
              message:
                'Provide multiple methods instead of using "foo" to determine which action to take.',
              secondaryLocations: [
                {
                  message: 'Parameter "foo" was declared here',
                  column: 20,
                  line: 9,
                  endColumn: 32,
                  endLine: 9,
                },
              ],
            }),
          },
        },
        {
          line: 19,
          column: 9,
          endLine: 19,
          endColumn: 12,
          messageId: 'sonarRuntime',
          data: {
            parameterName: 'foo',
            sonarRuntimeData: JSON.stringify({
              message:
                'Provide multiple methods instead of using "foo" to determine which action to take.',
              secondaryLocations: [
                {
                  message: 'Parameter "foo" was declared here',
                  column: 20,
                  line: 17,
                  endColumn: 32,
                  endLine: 17,
                },
              ],
            }),
          },
        },
      ],
    },
    {
      name: 'function with multiple boolean parameters that create a path',
      code: `const unaryTest = (foo: boolean, bar: boolean) => {
  if (foo) {
    return 5;
  }
  
  if (bar) {
    return 10;
  }
  
  return 15;
};

const binaryTest = (foo: boolean, bar: boolean) => {
  if (foo === true) {
    return 5;
  }
  
  if (bar === true) {
    return 10;
  }
  
  return 15;
};

const nestedTest = (foo: boolean, bar: boolean) => {
  if (true) {
    if (foo === true) {
      return 5;
    }
  }
  
  if (true) {
    if (bar === true) {
      return 10;
    }
  }
  
  return 15;
};`,
      options: ['sonar-runtime'],
      errors: [
        {
          line: 2,
          column: 7,
          endLine: 2,
          endColumn: 10,
          messageId: 'sonarRuntime',
          data: {
            parameterName: 'foo',
            sonarRuntimeData: JSON.stringify({
              message:
                'Provide multiple methods instead of using "foo" to determine which action to take.',
              secondaryLocations: [
                {
                  message: 'Parameter "foo" was declared here',
                  column: 19,
                  line: 1,
                  endColumn: 31,
                  endLine: 1,
                },
              ],
            }),
          },
        },
        {
          line: 6,
          column: 7,
          endLine: 6,
          endColumn: 10,
          messageId: 'sonarRuntime',
          data: {
            parameterName: 'bar',
            sonarRuntimeData: JSON.stringify({
              message:
                'Provide multiple methods instead of using "bar" to determine which action to take.',
              secondaryLocations: [
                {
                  message: 'Parameter "bar" was declared here',
                  column: 33,
                  line: 1,
                  endColumn: 45,
                  endLine: 1,
                },
              ],
            }),
          },
        },
        {
          line: 14,
          column: 7,
          endLine: 14,
          endColumn: 10,
          messageId: 'sonarRuntime',
          data: {
            parameterName: 'foo',
            sonarRuntimeData: JSON.stringify({
              message:
                'Provide multiple methods instead of using "foo" to determine which action to take.',
              secondaryLocations: [
                {
                  message: 'Parameter "foo" was declared here',
                  column: 20,
                  line: 13,
                  endColumn: 32,
                  endLine: 13,
                },
              ],
            }),
          },
        },
        {
          line: 18,
          column: 7,
          endLine: 18,
          endColumn: 10,
          messageId: 'sonarRuntime',
          data: {
            parameterName: 'bar',
            sonarRuntimeData: JSON.stringify({
              message:
                'Provide multiple methods instead of using "bar" to determine which action to take.',
              secondaryLocations: [
                {
                  message: 'Parameter "bar" was declared here',
                  column: 34,
                  line: 13,
                  endColumn: 46,
                  endLine: 13,
                },
              ],
            }),
          },
        },
        {
          line: 27,
          column: 9,
          endLine: 27,
          endColumn: 12,
          messageId: 'sonarRuntime',
          data: {
            parameterName: 'foo',
            sonarRuntimeData: JSON.stringify({
              message:
                'Provide multiple methods instead of using "foo" to determine which action to take.',
              secondaryLocations: [
                {
                  message: 'Parameter "foo" was declared here',
                  column: 20,
                  line: 25,
                  endColumn: 32,
                  endLine: 25,
                },
              ],
            }),
          },
        },
        {
          line: 33,
          column: 9,
          endLine: 33,
          endColumn: 12,
          messageId: 'sonarRuntime',
          data: {
            parameterName: 'bar',
            sonarRuntimeData: JSON.stringify({
              message:
                'Provide multiple methods instead of using "bar" to determine which action to take.',
              secondaryLocations: [
                {
                  message: 'Parameter "bar" was declared here',
                  column: 34,
                  line: 25,
                  endColumn: 46,
                  endLine: 25,
                },
              ],
            }),
          },
        },
      ],
    },
  ],
  valid: [
    {
      name: `function with no parameter`,
      options: ['sonar-runtime'],
      code: `function legacy() {
  if (foo) {
    return true;
  }
  
  return false;
}

const arrow = () => {
  if (foo) {
    return true;
  }
  
  return false;
}

const arrow = () => {
  let foo: boolean;

  if (foo) {
    return true;
  }
  
  return false;
}
`,
    },
    {
      name: `function with a boolean parameter that does not create a path`,
      options: ['sonar-runtime'],
      code: `function legacy(bar: boolean) {
  if (foo) {
    return true;
  }
  
  return false;
}

const arrow = (bar: boolean) => {
  if (foo) {
    return true;
  }
  
  return false;
}

const arrow = (foo2: boolean) => {
  let foo2: boolean;

  if (foo2) {
    return true;
  }
  
  return false;
}

const arrow = (foo: boolean) => {
  if (true) {
    return foo;
  }
  
  return false;
}
`,
    },
  ],
});

const javaScriptRuleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 2018,
  },
});

javaScriptRuleTester.run('S2301:JavaScript', S2301, {
  invalid: [],
  valid: [
    {
      name: `function with no parameter`,
      options: ['sonar-runtime'],
      code: `function legacy() {
  if (foo) {
    return true;
  }
  
  return false;
}

const arrow1 = () => {
  if (foo) {
    return true;
  }
  
  return false;
}

const arrow2 = () => {
  let foo = true;

  if (foo) {
    return true;
  }
  
  return false;
}
`,
    },
    {
      name: `function with a boolean parameter that does not create a path`,
      options: ['sonar-runtime'],
      code: `function legacy(bar) {
  if (foo) {
    return true;
  }
  
  return false;
}

const arrow1 = (bar) => {
  if (foo) {
    return true;
  }
  
  return false;
}

const arrow2 = (foo2) => {
  foo2 = true;

  if (foo2) {
    return true;
  }
  
  return false;
}

const arrow3 = (foo) => {
  if (true) {
    return foo;
  }
  
  return false;
}
`,
    },
    {
      name: 'function with a boolean parameter that creates a path',
      code: `const unaryTest = (foo) => {
  if (foo) {
    return 5;
  }
  
  return 10;
};

const binaryTest = (foo) => {
  if (foo === true) {
    return 5;
  }
  
  return 10;
};

const nestedTest = (foo) => {
  if (true) {
    if (foo === true) {
      return 5;
    }
  }
  
  return 10;
};`,
      options: ['sonar-runtime'],
    },
  ],
});
