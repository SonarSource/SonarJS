/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
import { rules as typescriptESLintRules } from '@typescript-eslint/eslint-plugin';
import { TypeScriptRuleTester } from '../../../tools';

const ruleTester = new TypeScriptRuleTester();
const rule = typescriptESLintRules['prefer-return-this-type'];

ruleTester.run(`Rule should provide a quickfix suggestion with the proper message`, rule, {
  valid: [
    {
      code: `
        class A {
          foo(): A {
            return new A();
          }
        }
      `,
    },
    {
      code: `
        class A {
          foo = (): A => {
            return new A();
          };
        }
      `,
    },
    {
      code: `
        const A = class {
          foo(): A {
            return new A();
          };
        }
      `,
    },
    {
      code: `
        class A {
          foo() {
            return this;
          }
        }
      `,
    },
    {
      code: `
        class A {
          foo(): any {
            return this;
          }
        }
      `,
    },
    {
      code: `
        class A {
          foo(): unknown {
            return this;
          }
        }
      `,
    },
    {
      code: `
        class A {
          foo(a?: A): A {
            return a ?? this;
          }
        }
      `,
    },
    {
      code: `
        class A {
          foo(a: boolean): A | this {
            return a ? new A() : this;
          }
        }
      `,
    },
    {
      code: `
        class A {}
        class B {
          foo(): A {
            return this;
          }
        }
      `,
    },
  ],
  invalid: [
    {
      code: `
class A {
  foo(): A {
    return this;
  }
  bar = (): A => {
    return this;
  };
  baz(): A | undefined {
    return Math.random() > 0.5 ? this : undefined;
  }
}`,
      output: `
class A {
  foo(): this {
    return this;
  }
  bar = (): this => {
    return this;
  };
  baz(): this | undefined {
    return Math.random() > 0.5 ? this : undefined;
  }
}`,
      errors: [
        {
          messageId: 'useThisType',
          line: 3,
          endLine: 3,
          column: 10,
          endColumn: 11,
        },
        {
          messageId: 'useThisType',
        },
        {
          messageId: 'useThisType',
        },
      ],
    },
  ],
});
