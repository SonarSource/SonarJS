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
import { rule } from './/index.ts';

const ruleTester = new RuleTester({
  parserOptions: { sourceType: 'module', ecmaVersion: 2018, ecmaFeatures: { jsx: true } },
});

ruleTester.run('Local variables should be used', rule, {
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
      
        var {a1, b1, c1} = obj; // Noncompliant, b1

        foo(a1, c1);
      
        var {a2, b2, c2, ...interestingProps2} = obj; // Noncompliant, interestingProps2

      
        var {a3, b: b3, c3, ...interestingProps3} = obj; // Noncompliant, b3

        foo(interestingProps3);
      
        var {} = obj;
      }`,
      errors: [
        {
          message: `Remove the declaration of the unused 'b1' variable.`,
          line: 6,
          column: 18,
        },
        {
          message: `Remove the declaration of the unused 'interestingProps2' variable.`,
          line: 10,
          column: 29,
        },
        {
          message: `Remove the declaration of the unused 'b3' variable.`,
          line: 13,
          column: 21,
        },
      ],
    },
    {
      code: `
    const constUsed = "this is used";
    let letUsed = "this is used";
    var varUsed = "this is used";
    if(constUsed && letUsed && varUsed) {
      const constUsed = "unused"; // Noncompliant
      let letUsed = "unused";     // Noncompliant
      var varUsed = "used";

      function unusedFunc() {     // Noncompliant

      }
    }`,
      errors: [{ line: 6 }, { line: 7 }, { line: 10 }],
    },
    {
      code: `
      function used_in_jsx(icon) {
        const UsedIcon   = icon;
        const UnusedIcon = icon; // Noncompliant
        const lowerCased = icon;
        const tagContent = "content"
        const tagAttribute = "attribute";

        // even if React requires user-defined components to start from capital letter
        // let's test name starting from lower-cased letter
        <lowerCased />;
        return <UsedIcon someAttr={tagAttribute}>{tagContent}</UsedIcon>;
      }
      `,
      errors: [
        { line: 4, message: `Remove the declaration of the unused \'UnusedIcon\' variable.` },
      ],
    },
  ],
});
