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
import { TypeScriptRuleTester } from '../tools';
import { rule } from './';

const ruleTester = new TypeScriptRuleTester();
ruleTester.run('Primitive return types should be used.', rule, {
  valid: [
    {
      code: `function foo() {return 1;}`,
    },
    {
      code: `function noReturn(): any {}`,
    },
    {
      code: `function emptyReturn(): any {return;}`,
    },
    {
      code: `// OK, returns different primitive types
        function returnUndefined(x: any): any {
          if (x) {
              return 1;
            }
          return;
        }`,
    },
    {
      code: `// OK, returns different primitive types
            function outer(x: any): any {
              if (x) return "";
              function inner(): number {}
              return 1;
            }`,
    },
    {
      code: `// OK, returns union type
        function ternary(x: any): any {
          const y = x ? 1 : 2;
          return y;
        }`,
    },
    {
      code: `// OK, returns union type
        function ternary(x: any): any {
          const y = x ? 1 : 2;
          return y;
        }`,
    },
    {
      code: `// OK, returns non-primitive type
        function createObject(): any {
          return { foo: 1, bar: null };
        }`,
    },
    {
      code: `
        function withInnerFunction(): any {
          function inner() {
            return 1;
          }
        }`,
    },
    {
      code: `// ok, returns complex type
        function returnsSameComplexType(x: any): any {
          if (x) {
            return new Date();
          } else {
            return new Date();
          }
        }`,
    },
    {
      code: `// OK, returns any in any case
        function returnsAny(x: any, y: any): any {
          if (x) {
            return x;
          } else {
            return y;
          }
        }`,
    },
    {
      code: `class A {
        isFish(animal: Animal): any {
            return 1;
        }
      }`,
    },
  ],
  invalid: [
    {
      code: `function returnNumericLiteral(): any {return 1;}`,
      errors: [
        {
          message: 'Remove this return type or change it to a more specific.',
          line: 1,
          endLine: 1,
          column: 32,
          endColumn: 37,
        },
      ],
    },
    {
      code: `function returnNumericLiteral(): any {return 1 + 1;}`,
      errors: 1,
    },
    {
      code: `function returnStringLiteral(): any {return "foo";}`,
      errors: 1,
    },
    {
      code: `function returnStringLiteral(): any {return "".substr(1);}`,
      errors: 1,
    },
    {
      code: `function returnBooleanLiteral(): any {return false;}`,
      errors: 1,
    },
    {
      code: `enum E {Foo,}
      function returnEnum(): any {return E.Foo;}`,
      errors: 1,
    },
    {
      code: `function returnBooleanLiteral(): any {return 2 > 1;}`,
      errors: 1,
    },
    {
      code: `
        function severalReturnsNumbers(x: any): any {
          if (x) {
            return 1 + 2;
          } else {
            return 3 + 7;
          }
        }`,
      errors: 1,
    },
    {
      code: `
        function severalReturnsStrings(x: string): any {
          if (x.length > 3) {
            return x.substr(3);
          } else {
            return x;
          }
        }`,
      errors: 1,
    },
    {
      code: `//Nested functions
            function outer(): number {
              if (false) return -1;
              function inner(): any {
                return ""; //Nomcompliant
              }
              return 0;
            }`,
      errors: 1,
    },
  ],
});
