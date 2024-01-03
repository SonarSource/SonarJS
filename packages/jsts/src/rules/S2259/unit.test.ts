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
import { RuleTester } from 'eslint';
import { JavaScriptRuleTester } from '../tools';
import { rule } from './';

const ruleTesterJsWithTypes = new JavaScriptRuleTester();
const ruleTesterJs = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: 'module' } });

ruleTesterJsWithTypes.run('', rule, {
  valid: [
    {
      code: `
      function builtin_property() {
        var str = "str";
        str.trim(); // OK
      }`,
    },
    {
      code: `
        function chained_properties() {
            var str = "str";
            str.trim().trim(); // OK
            str.undefinedProperty.trim(); // OK, we don't know property "undefinedProperty" and consider it to have ANY_VALUE
        }`,
    },
    {
      code: `
        function property_array() {
            var str = "str";
            str.trim().split("t")[0]; // OK
            str.trim().undefinedArray[0]; // OK
        }`,
    },
    {
      code: `
        function unknown() {
            var y;
            foo(y);
            y = foo();
            y.foo;
        }`,
    },
    {
      code: `
      function class_property() {
            class A {
            }
            A.foo = 42;
       }`,
    },
    {
      code: `
        function branch() {
            var z;
            if (cond) {
              z = foo();
            }
            z.foo();   // FN?
          }`,
    },
    {
      code: `
        function foo() { if (some) { return 42;} }
        function equal_null() {
          var x = foo();
        
          if (x != null) {
            x.foo();
          }
        
          if (null != x) {
            x.foo();
          }
        
          if (x == null) {
            x.foo();    // FN
          }
          if (x == undefined) {
            x.foo();     // FN  
          }
          if (x === null) {
            x.foo(); // FN
          }

          if (x !== null) {
            x.foo();
          } else {
            x.foo();   // FN
          }
        }`,
    },
    {
      code: `
        function ternary() {
            var x;
            if (condition) {
              x = foo();
            }
          
            x ? x.foo() : bar();  // Compliant
          }`,
    },
    {
      code: `
        function duplicated_condition() {
            if (foo("bar")) {
              var x = bar();
            }
          
            if (foo("bar")) {
              x.foo();   // OK
            }
          }`,
    },
    {
      code: `
        function loop_at_least_once() {
            var x;
          
            while (condition()) {
              x = foo();
            }
          
            x.foo();
          }`,
    },
    {
      code: `
        function loop(arr) {
            var obj;
            for(var i = 0; i < arr.length; i++){
              if(i % 2 == 0){
                obj = foo();
              } else {
                obj.bar();   // OK
              }
            }
          }`,
    },
    {
      code: `
        function one_condition() {
            var x = foo();
          
            if (x == null) {
              foo();
            }
          
            if (x
                && x.foo != null) {  // Ok
            }
          }`,
    },
    {
      code: `
        function one_more() {
            var x = foo();
            while (x != null && i < 10) {
            }
          
            if (!x) {
              return;
            }
          
            if (x.foo) {  // Ok
            }
          }`,
    },
    {
      code: `function not_null_if_property_accessed() {
            var x = foo();
          
            if (x.foo) {
              if (x != null) {
              }
              x.foo();   // Ok
            }
          }`,
    },
    {
      code: `
        function tested_copy() {
            var x;
          
            if (condition) {
              x = foo();
            }
          
            var copy = x;
          
            if (!copy) {
              return;
            }
          
            x.foo();
          }`,
    },
    {
      code: `function assignment_left_first() {
            var x;
          
            foo[x=foo()] = foo(x.bar);  // Compliant, we first evaluate LHS of assignment
          }`,
    },
    {
      code: `function array_assignment() {
            var x, y;
            x = 0;
            [x, y] = obj;
            x.foo;
            y.foo;
          }`,
    },
    {
      code: `function object_assignment() {
        var x, y;
        x = 0;
        ({x, y} = obj);
        x.foo;
        y.foo;
      }`,
    },
    {
      code: `function object_assignment_with_named_properties() {
        var x, y;
        x = 0;
        ({prop1:x, prop2:y} = obj);
        x.foo;
        y.foo;
      }`,
    },
    {
      code: `function null_and_not_undefined() {
        var x = null;
      
        while (condition()) {
          if (x === null) {
            x = new Obj();
          }
          x.foo();
        }
      }`,
    },
    {
      code: `function async_function_undefined() {
        async function foo_implicit_return() { console.log("foo"); } // async function always return a Promise
        async function foo_return_undefined() { console.log("foo"); return undefined; } // async function always return a Promise
        foo_implicit_return().then(); // OK
        foo_return_undefined().then(); // OK
      }`,
    },
    {
      code: `function written_in_inner_fn() {
            var x;
            function update_x() {
              x = 42
            }
            update_x()
            x.toString();
        }`,
    },
    {
      code: `
        var x;
        function update_x() {
          x = 42
        }
        update_x()
        x.toString();
          `,
    },
    {
      code: `
        function fn(ys) {
          var x;
          ys.forEach(function (y) { x = y; })
          x.foo 
        }`,
    },
    {
      code: `
      var x;
      x?.foo;
      x?.y?.foo;
      x?.y?.z?.foo;
      `,
    },
    {
      code: `
      if (x != null && x.prop == 0) {}
      if (x == null || x.prop == 0) {}
      if (x != undefined && x.prop == 0) {}
      if (x == undefined || x.prop == 0) {}
      `,
    },
    {
      code: `if (x == null && x?.prop == 0) {}`,
    },
    {
      code: `if (x == null && y.prop == 0) {}`,
    },
  ],
  invalid: [
    {
      code: `
      function property() {
        var x;
        x.foo;
      //^
      }`,
      errors: [
        {
          message: `TypeError can be thrown as "x" might be null or undefined here.`,
          line: 4,
          column: 9,
          endColumn: 10,
        },
      ],
    },
    {
      code: `
      function element() {
        var x;
        x[1];
       }`,
      errors: 1,
    },
    {
      code: `
      function stop_after_NPE() {
            var x;
            var other_x;
            if (x.foo &&    // Noncompliant
                other_x.bar // Noncompliant FP as we can't reach this point after previous issue
            ) {
            }
          }`,
      errors: 2,
    },
    {
      code: `
        function typeof_testing() {
            var x;
          
            if (condition) {
              x = foo();
            }
          
            if (typeof x === 'function') {
              x.call();
            }
          
            if (typeof x === 'object') {
              x.call();
            }
          
            var y = foo();
          
            if (typeof y === 'undefined') {
              y.call();  // Noncompliant
            }
          }`,
      errors: [
        {
          line: 20,
          endLine: 20,
          column: 15,
          endColumn: 16,
        },
      ],
    },
    {
      code: `function one_issue_per_symbol() {
        var x;
      
        if (condition) {
          x.foo(); // Noncompliant
        } else {
          x.bar(); // no issue here as we already have issue for same symbol
        }
      }`,
      errors: 1,
    },
    {
      code: `function for_of_undefined() {
        var undefinedArray;
        for(let i of undefinedArray) {        // Noncompliant
        }
      
        var nullArray = null;
        for(let i of nullArray) {             // Noncompliant
        }
      
        var initializedArray = [];
        for(let i of initializedArray) {      // OK
        }
      
        var x;
        for(x of obj) {                       // OK we should not care about x being undefined
        }
      }`,
      errors: [
        {
          line: 3,
          endLine: 3,
          column: 22,
          endColumn: 36,
        },
        {
          line: 7,
          endLine: 7,
          column: 22,
          endColumn: 31,
        },
      ],
    },
    {
      code: `
        var x;
        x.foo`,
      errors: 1,
    },
    {
      code: `if (x == null && x.prop == 0) {}`,
      errors: [
        {
          messageId: 'shortCircuitError',
        },
      ],
    },
    {
      code: `if (null != x || x.prop == 0) {}`,
      errors: [
        {
          messageId: 'shortCircuitError',
        },
      ],
    },
    {
      code: `if (undefined == x && x.prop == 0) {}`,
      errors: [
        {
          messageId: 'shortCircuitError',
        },
      ],
    },
    {
      code: `if (x.prop != undefined || x.prop.prop2 == 0) {}`,
      errors: [
        {
          line: 1,
          endLine: 1,
          column: 28,
          endColumn: 34,
          messageId: 'shortCircuitError',
        },
      ],
    },
  ],
});

ruleTesterJs.run('', rule, {
  valid: [
    {
      code: `
        function property() {
          var x;
          x.foo; // OK, no type information available
        }`,
    },
  ],
  invalid: [],
});
