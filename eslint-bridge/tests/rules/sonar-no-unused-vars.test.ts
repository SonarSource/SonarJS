/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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
import { RuleTester } from "eslint";

const ruleTester = new RuleTester({ parserOptions: { sourceType: "module", ecmaVersion: 2018 } });
import { rule } from "../../src/rules/sonar-no-unused-vars";

ruleTester.run("Local variables should be used", rule, {
  valid: [
    {
      code: `
      var a = 0;                // OK, global
      export let b = 0          // OK, global

      function fun() {
        function f1() { console.log("f1"); }        // OK
        f1();
      }

      function bar(){
        try {
        } catch (e) {               // OK
        }

        bar(function unusedFunctionExpression() {});  // OK, ignore function expression
      }
      
      function foo(){
        var x1 = 1,              // OK
         y1 = -x1;               // OK
        foo(y1);
      }
 
      function Person() {
        this.name = null;

        this.getName = function() {   // OK
          return name;
        }
      }
      
      function used_in_template_string() {
        const foo = '.';
        return new RegExp(\`\${foo}\`);
      }
      `,
    },
  ],
  invalid: [
    {
      code: `
      function fun() {
        var a = 0;              // Noncompliant
        var b = 1;              // OK
        return b;
      }`,
      errors: [
        {
          message: `Remove the declaration of the unused 'a' variable.`,
          line: 3,
          endLine: 3,
          column: 13,
          endColumn: 14,
        },
      ],
    },
    {
      code: `
      function fun1() {
        var a = 0;              // OK
        function nested() {     // Noncompliant
          a =  1;
        }
      }
      
      function fun2() {
        var a = 0;              // Noncompliant
        function nested(a) {    // Noncompliant
          a =  1;
        }
      }
      
      function fun3() {
          let a = 0;              // Noncompliant
          const b = 1;            // Noncompliant
          let c                   // OK
          return c;
      }
      
      function* fun4() {
          var a = 0;              // Noncompliant
          var b = 1;              // OK
          return b;
      }`,
      errors: [
        {
          message: `Remove unused function 'nested'.`,
          line: 4,
        },
        {
          line: 10,
        },
        {
          line: 11,
        },
        {
          line: 17,
        },
        {
          line: 18,
        },
        {
          line: 24,
        },
      ],
    },
    {
      code: `
      function fun1() {
        var f1 = function() { console.log("f1"); }  // Noncompliant
      }
      
      function fun2() {
        function f1() { console.log("f1"); }        // Noncompliant
      }
      
      class C {
          f() {
              var a;              // Noncompliant
          }
      }
      
      var f = (p) => {
          var x;                  // Noncompliant
          var y = p.y;            // Noncompliant
      }
      
      var f = p => {
        var x;                    // Noncompliant
      }   

      function foo(){
        var x = 1;               // Noncompliant
        var x = 2;              // Noncompliant
      
        class A {}      // OK, ignore anything except variables and functions
      }
      `,
      errors: [
        {
          line: 3,
        },
        {
          line: 7,
        },
        {
          line: 12,
        },
        {
          line: 17,
        },
        {
          line: 18,
        },
        {
          line: 22,
        },
        {
          line: 26,
        },
        {
          line: 27,
        },
      ],
    },
    {
      code: `
      function objectDestructuringException(obj) {
        var {a, b, c, ...interestingProps} = obj; // OK
        foo(interestingProps);
      
        var {a1, b1, c1} = obj; // Noncompliant
      //         ^^
        foo(a1, c1);
      
        var {a2, b2, c2, ...interestingProps2} = obj; // Noncompliant
      //                    ^^^^^^^^^^^^^^^^^
      
        var {a3, b: b3, c3, ...interestingProps3} = obj; // Noncompliant
      //            ^^
        foo(interestingProps3);
      
        var {} = obj;
      }`,
      errors: [
        {
          message: `Remove the declaration of the unused 'b1' variable.`,
          line: 6,
        },
        {
          message: `Remove the declaration of the unused 'interestingProps2' variable.`,
          line: 10,
        },
        {
          message: `Remove the declaration of the unused 'b3' variable.`,
          line: 13,
        },
      ],
    },
  ],
});
