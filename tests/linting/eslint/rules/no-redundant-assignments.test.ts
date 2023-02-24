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
import { TypeScriptRuleTester } from '../../../tools';
import { rule } from 'linting/eslint/rules/no-redundant-assignments';

const ruleTesterTs = new TypeScriptRuleTester();

ruleTesterTs.run('', rule, {
  valid: [
    {
      code: `
        function circleOfAssignments (array) {
          var buffer = new Array(len);
          for (var chk = 1; chk < len; chk *= 2) {
             var tmp = array;
             array = buffer;
             buffer = tmp;
         }
     }
     `,
    },
    {
      code: `function identities(x) {
        let y = x;
        let z = x;
        z = y; // FN
      }`,
    },
    {
      code: `function compliant(cond) {
        let x = 0;
        let mx = 0;
        if (cond) {
           x = getSomething();
           mx = x;
        }
    }`,
    },
    {
      code: `function writtenInsideLoop(cond, items) {
        while (cond) {
          let x = 42;
        }
        for (const item of items) {
          const { id, state } = item
        }
      }`,
    },
    {
      code: `function sameConstraintsAcrossBranches(z) {
        let x;
        let y = z;
        if (check(x)) { // function using x in condition forces constraint to ANY_VALUE
          y = x;
        }
        read(y);

        y = z;
      }`,
    },
    {
      code: `function differentStrictConstraints(x, y) {
        if (x === "" && y === 0) {
          x = y; // OK
        }
      }`,
    },
    {
      code: `function unconstrainedSymbolicValues(x, y) {
        x = y; // OK
      }`,
    },
    {
      code: `function unknownSymbolicValues() {
        u1 = u2; // OK
      }`,
    },
    {
      code: `function differentIdentities(x, y) {
        let z = y;
        z = x; // OK
      }`,
    },
    {
      code: `function nonSingleValueConstraints(x, y) {
      if (x === "hello" && y === "hello") {
        x = y; // OK
      }
    }`,
    },
    {
      code: `function assignmentsWithOperation() {
        let x = 0;
        let y = x;
        y *= x; // OK
      }`,
    },
    {
      code: `function exceptions() {
        let x = "";
        let y = {
          foo() {
            return "";
          }
        }

        x = y.foo(); // FN we don't evaluate properties

        let array = [0];
        let e = 0;
        e = array[0]; // FN we ignore subscript values

        x = x // OK basic self-assignment already covered by S1656
      }`,
    },
    {
      code: `function undef() {
        let x;
        let y;
        let z;
        z = x; // FN
      }`,
    },
    {
      code: `function singleValueConstraints(x, y) {
        if (x === "" && y === "") {
          x = y; // FN
        }
      }`,
    },
    {
      code: `function if_true_branch(pred1, pred2, param) {
        if (pred1) {
          param = 42;
        }
        if (pred2) {
          param = 42;
        }
      }`,
    },
    {
      code: `function if_true_branch_no_param(pred1, pred2) {
        var localX;
        if (pred1) {
          localX = 42;
        }
        if (pred2) {
          localX = 42;
        }
      }`,
    },
    {
      code: `function var_increment(arr) {
        for (var i = 0; i < arr.length; i++) {
          for (var j = 0; j < arr.length; j++) {
            console.log(arr[i] + arr[j]);
          }
        }
      }`,
    },
    {
      code: `const enum A {
        Monday = 1,
        Tuesday = 2
      }`,
    },
    {
      code: `function using_destructuring() {
        let {a, ...rest} = {a: 42, b: 5};
        a = 42; // FN
      }`,
    },
    {
      code: `function maybe_redundant() {
        var n = 0;
        if (p) {
          n = 42;
        } else {
          n = 43;
        }
        var x = 42;
        x = n;
      }`,
    },
    {
      code: `function function_call() {
        var x = foo();
        x = foo();
      }`,
    },
    {
      code: `function increment() {
        let xxx = 42;
        let yyy = xxx;
        xxx++;
        yyy = xxx;
      }`,
    },
    {
      code: `function scanNumber(): string {
        let end = pos;
        pos++;
        end = pos;
    }`,
    },
  ],
  invalid: [
    {
      code: `
      function overwrite() {
        let z = 42;
        z = 42; // Noncompliant {{Review this redundant assignment: "z" already holds the assigned value along all execution paths.}}
      }`,
      errors: [
        {
          message:
            'Review this redundant assignment: "z" already holds the assigned value along all execution paths.',
        },
      ],
    },
    {
      code: `function nul() {
        let x = null;
        let y = null;
        y = x; // Noncompliant
      //^^^^^
      }`,
      errors: 1,
    },
    {
      code: `function literalsNotYetDone() {
        let x = 1;
        let y = 1;
        let z = x;
        z = y; // Noncompliant
      }`,
      errors: 1,
    },
    {
      code: `function rspecExample() {
        var b = 0;
        var a = b;
        var c = a;
        b = c; // Noncompliant
      }`,
      errors: 1,
    },
    {
      code: `function if_then_else(p) {
        let xx = 0;
        if (p) {
          xx = 42;
        } else {
          xx = 42;
        }
        xx = 42;
      }`,
      errors: 1,
    },
    {
      code: `function outer() {
        let x = 42;
        let y = 0;
        for (;;) {
          y = x;
          y = 42;
        }
      }`,
      errors: [
        {
          line: 6,
        },
      ],
    },
  ],
});
