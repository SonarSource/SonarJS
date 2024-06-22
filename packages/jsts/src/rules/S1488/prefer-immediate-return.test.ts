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
import rule = require('../../src/rules/prefer-immediate-return');

ruleTester.run('prefer-immediate-return', rule, {
  valid: [
    {
      code: `
        function thrown_ok() {
          throw new Error();
        }
      `,
    },
    {
      code: `
        function thrown_expression() {
          const x = new Error();
          throw foo(x);
        }
      `,
    },
    {
      code: `
        function thrown_different_variable(y) {
          const x = new Error();
          throw y;
        }
      `,
    },
    {
      code: `
        function code_between_declaration_and_return() {
          let x = 42;
          foo();
          return x;
        }
      `,
    },
    {
      code: `
        function return_expression() {
          let x = 42;
          return x + 5;
        }
      `,
    },
    {
      code: `
        function return_without_value() {
          let x = 42;
          return;
        }
      `,
    },
    {
      code: `
        function not_return_statement() {
          let x = 42;
          foo(x);
        }
      `,
    },
    {
      code: `
        function no_init_value() {
          let x;
          return x;
        }
      `,
    },
    {
      code: `
        function pattern_declared() {
          let { x } = foo();
          return x;
        }
      `,
    },
    {
      code: `
        function two_variables_declared() {
          let x = 42,
            y;
          return x;
        }
      `,
    },
    {
      code: `
        function different_variable_returned(y) {
          let x = 42;
          return y;
        }
      `,
    },
    {
      code: `
        function only_return() {
          return 42;
        }
      `,
    },
    {
      code: `
        function one_statement() {
          foo();
        }
      `,
    },
    {
      code: `
        function empty_block() {}
      `,
    },
    {
      code: `
        let arrow_function_ok = (a, b) => {
          return a + b;
        };
      `,
    },
    {
      code: `
        let arrow_function_no_block = (a, b) => a + b;
      `,
    },
    {
      code: `
        function variable_has_type_annotation() {
          let foo: number = 1;
          return foo;
        }
      `,
    },
    {
      code: `
        function variable_is_used() {
          var bar = {
            doSomethingElse(p) {},
            doSomething() {
              bar.doSomethingElse(1);
            },
          };
          return bar;
        }
      `,
    },
  ],
  invalid: [
    {
      code: `
        function var_returned() {
          var x = 42;
          return x;
        }`,
      errors: [
        {
          messageId: 'doImmediateAction',
          data: {
            action: 'return',
            variable: 'x',
          },
          line: 3,
          column: 19,
          endColumn: 21,
        },
      ],
      output: `
        function var_returned() {
          return 42;
        }`,
    },
    {
      code: `
        function let_returned() {
          let x = 42;
          return x;
        }
      `,
      errors: [
        {
          messageId: 'doImmediateAction',
          data: {
            action: 'return',
            variable: 'x',
          },
          line: 3,
          column: 19,
          endColumn: 21,
        },
      ],
      output: `
        function let_returned() {
          return 42;
        }
      `,
    },
    {
      code: `
        function const_returned() {
          const x = 42;
          return x;
        }
      `,
      errors: [
        {
          messageId: 'doImmediateAction',
          data: {
            action: 'return',
            variable: 'x',
          },
          line: 3,
          column: 21,
          endColumn: 23,
        },
      ],
      output: `
        function const_returned() {
          return 42;
        }
      `,
    },
    {
      code: `
        function code_before_declaration() {
          foo();
          var x = 42;
          return x;
        }
      `,
      errors: [
        {
          messageId: 'doImmediateAction',
          data: {
            action: 'return',
            variable: 'x',
          },
          line: 4,
          column: 19,
          endColumn: 21,
        },
      ],
      output: `
        function code_before_declaration() {
          foo();
          return 42;
        }
      `,
    },
    {
      code: `
        function thrown_nok() {
          const x = new Error();
          throw x;
        }`,
      errors: [
        {
          messageId: 'doImmediateAction',
          data: {
            action: 'throw',
            variable: 'x',
          },
          line: 3,
          column: 21,
          endColumn: 32,
        },
      ],
      output: `
        function thrown_nok() {
          throw new Error();
        }`,
    },
    {
      code: `
        function different_blocks() {
          if (foo) {
            let x = foo();
            return x;
          }

          try {
            let x = foo();
            return x;
          } catch (e) {
            let x = foo();
            return x;
          } finally {
            let x = foo();
            return x;
          }
        }
      `,
      errors: [
        {
          messageId: 'doImmediateAction',
          data: {
            action: 'return',
            variable: 'x',
          },
          line: 4,
          column: 21,
          endColumn: 26,
        },
        {
          messageId: 'doImmediateAction',
          data: {
            action: 'return',
            variable: 'x',
          },
          line: 9,
          column: 21,
          endColumn: 26,
        },
        {
          messageId: 'doImmediateAction',
          data: {
            action: 'return',
            variable: 'x',
          },
          line: 12,
          column: 21,
          endColumn: 26,
        },
        {
          messageId: 'doImmediateAction',
          data: {
            action: 'return',
            variable: 'x',
          },
          line: 15,
          column: 21,
          endColumn: 26,
        },
      ],
      output: `
        function different_blocks() {
          if (foo) {
            return foo();
          }

          try {
            return foo();
          } catch (e) {
            return foo();
          } finally {
            return foo();
          }
        }
      `,
    },
    {
      code: `
        function two_declarations(a) {
          if (a) {
            let x = foo();
            return x;
          } else {
            let x = bar();
            return x + 42;
          }
        }
      `,
      errors: [
        {
          messageId: 'doImmediateAction',
          data: {
            action: 'return',
            variable: 'x',
          },
          line: 4,
          column: 21,
          endColumn: 26,
        },
      ],
      output: `
        function two_declarations(a) {
          if (a) {
            return foo();
          } else {
            let x = bar();
            return x + 42;
          }
        }
      `,
    },
    {
      code: `
        function homonymous_is_used() {
          const bar = {
            doSomethingElse(p) {
              var bar = 2;
              return p + bar;
            },
            doSomething() {
              return this.doSomethingElse(1);
            },
          };
          return bar;
        }
      `,
      errors: [
        {
          messageId: 'doImmediateAction',
          data: {
            action: 'return',
            variable: 'bar',
          },
          line: 3,
          column: 23,
          endLine: 11,
          endColumn: 12,
        },
      ],
      output: `
        function homonymous_is_used() {
          return {
            doSomethingElse(p) {
              var bar = 2;
              return p + bar;
            },
            doSomething() {
              return this.doSomethingElse(1);
            },
          };
        }
      `,
    },
    {
      code: `
        function inside_switch(x) {
          switch (x) {
            case 1:
              const y = 3;
              return y;
            default:
              const z = 2;
              return z;
          }
        }
      `,
      errors: [
        {
          messageId: 'doImmediateAction',
          data: {
            action: 'return',
            variable: 'y',
          },
          line: 5,
          column: 25,
          endColumn: 26,
        },
        {
          messageId: 'doImmediateAction',
          data: {
            action: 'return',
            variable: 'z',
          },
          line: 8,
          column: 25,
          endColumn: 26,
        },
      ],
      output: `
        function inside_switch(x) {
          switch (x) {
            case 1:
              return 3;
            default:
              return 2;
          }
        }
      `,
    },
    {
      code: `
        function var_returned() {
          var x = 42;
          return x
        }`,
      errors: [
        {
          messageId: 'doImmediateAction',
          data: {
            action: 'return',
            variable: 'x',
          },
          line: 3,
          column: 19,
          endColumn: 21,
        },
      ],
      output: `
        function var_returned() {
          return 42
        }`,
    },
    {
      // hoisted variables
      code: `
      function foo() {
        if (cond) {
          var x = 42;
          return x;
      }
      }
      `,
      errors: [
        {
          messageId: 'doImmediateAction',
          data: {
            action: 'return',
            variable: 'x',
          },
        },
      ],
      output: `
      function foo() {
        if (cond) {
          return 42;
      }
      }
      `,
    },
    {
      code: `
        function var_returned() {
          // comment1
          var x /* commentInTheMiddle1 */ = 42; // commentOnTheLine1
          // comment2
          return /* commentInTheMiddle2 */ x;   // commentOnTheLine2
          // comment3
        }`,
      errors: [
        {
          messageId: 'doImmediateAction',
          data: {
            action: 'return',
            variable: 'x',
          },
          line: 4,
          column: 45,
          endColumn: 47,
        },
      ],
      output: `
        function var_returned() {
          // comment1
          // commentOnTheLine1
          // comment2
          return /* commentInTheMiddle2 */ 42;   // commentOnTheLine2
          // comment3
        }`,
    },
  ],
});
