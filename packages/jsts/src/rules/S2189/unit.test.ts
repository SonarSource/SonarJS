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
import { rule } from './index.js';

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });

ruleTester.run('Loops should not be infinite', rule, {
  valid: [
    {
      code: `
      for (var i=0;i<5;i++) {
        console.log("hello");
      }
            `,
    },
    {
      code: `
      var j = 0;
      while (true) { // reachable end condition added
        j++;
        if (j  == Integer.MIN_VALUE) {  // true at Integer.MAX_VALUE +1
          break;
        }
      }
            `,
    },
    {
      code: `
      function * generator() {
        while(true) { // OK (yield in the loop)
            foo();
            yield;
        }
      }
            `,
    },
    {
      code: `
      function someFunction() {
        while(true) { // OK (return in the loop)
            foo();
            return;
        }
      }
            `,
    },
    {
      code: `
      const sleep = time => {
        let count = 0;
        const waitTill = new Date(new Date().getTime() + time);
        while (waitTill > new Date()) { // OK (new Date() is different at each evaluation)
          count += 1;
        }
      };
            `,
    },
    {
      code: `
      function do_while() {

        var trueValue = true;
      
        do {                      // FN
          trueValue = true;
        } while (trueValue);
      }
            `,
    },
    {
      code: `
      function always_true() {

        var trueValue = true;
      
        while(trueValue) {        // FN
          trueValue = 42;
        }
      }
            `,
    },
    {
      code: `
      function throws_interrupts_loop() {
        for(;;) {               // OK
            throw "We are leaving!";
        }
    
        while(true) {           // OK Doubly-nested throw
            while(true) {
                throw "We are leaving from deep inside!";
            }
        }
      }
            `,
    },
    {
      code: `
      while (until === undefined) {
        until = getUntil();
      }
            `,
    },
    {
      code: `
      outer:
      while (true) {
        while (true) {
          console.log("hello");
          break outer;
        }
      }
            `,
    },
    {
      code: `
      while (true) {  // FN
        inner:
        while (true) {
          console.log("hello");
          break inner;
        }
      }
            `,
    },
    {
      code: `
      let xs = [1, 2, 3];
      while (xs) {
        doSomething(xs.pop());
      }`,
    },
    {
      code: `
      let xs = [1, 2, 3];
      while (xs) {
        doSomething(xs);
      }`,
    },
    {
      code: `
      var parent = $container.find('.list')[0];
      while (parent && parent.firstChild) {
        parent.removeChild(parent.firstChild);
      }`,
    },
    {
      code: `
      let coverage = [1, 2, 3];
      while (coverage) {
        coverage.length;
        doSomething(coverage);
      }`,
    },
  ],
  invalid: [
    {
      code: `
      var k = 0;
      var b = true;
      while (b) { // Noncompliant; b never written to in loop
        k++;
      }
            `,
      errors: [
        {
          line: 4,
          endLine: 4,
          column: 14,
          endColumn: 15,
          message: "'b' is not modified in this loop.",
        },
      ],
    },
    {
      code: `
      while (true) {
        console.log("hello");
      }
            `,
      errors: [
        {
          line: 2,
          endLine: 2,
          column: 7,
          endColumn: 12,
          message: "Correct this loop's end condition to not be invariant.",
        },
      ],
    },
    {
      code: `
      for (;;) {
        console.log("hello");
      }
            `,
      errors: 1,
    },
    {
      code: `
      for (var str = '';str >= '0' && '9' >= str;) {
        console.log("hello");
      }
            `,
      errors: 1,
    },
    {
      code: `
      for (;true;) {
        console.log("hello");
      }
            `,
      errors: 1,
    },
    {
      code: `
      while (true) { // Noncompliant
        while (true) {
          if (cond) {
            break;
          }
        }
      }
            `,
      errors: 1,
    },
    {
      code: `
      do {
        console.log("hello");
      } while (true);
            `,
      errors: 1,
    },
    {
      code: `
      while (true) {
        function doSomething() {
          return "hello";
        }
      }
            `,
      errors: 1,
    },
    {
      code: `
      while (true) {
        var a = function () {return 0;};
      }
            `,
      errors: 1,
    },
  ],
});
