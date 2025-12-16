/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import { DefaultParserRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { describe, it } from 'node:test';

describe('S2189', () => {
  it('S2189', () => {
    const ruleTester = new DefaultParserRuleTester();

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
        {
          code: `
      // False positive scenario: imported/required variable
      // This should NOT raise an issue because the variable is imported
      // and may be modified externally
      import { externalFlag } from './external';
      while (externalFlag) {
        doSomething();
      }`,
        },
        {
          code: `
      // False positive scenario: object passed as argument
      // This should NOT raise an issue because objects can be modified
      // by the function they're passed to
      let obj = { flag: true };
      while (obj.flag) {
        processObject(obj);
      }`,
        },
        {
          code: `
      // False positive scenario: file-scope variable with function call in loop
      // This should NOT raise an issue because the function may modify the file-scope variable
      let globalFlag = true;
      while (globalFlag) {
        someFunction();
      }`,
        },
        {
          code: `
      // False positive scenario: file-scope variable written elsewhere in file
      // This should NOT raise an issue because the variable is modified elsewhere
      let fileFlag = true;

      function toggleFlag() {
        fileFlag = false;
      }

      while (fileFlag) {
        doSomething();
      }`,
        },
        {
          code: `
      // False positive scenario: function parameter in compound condition
      // This should NOT raise because the loop can terminate via the other condition
      function processItems(items, maxCount) {
        let count = 0;
        while (count < maxCount && items[count]) {
          processItem(items[count]);
          count++;
        }
      }`,
        },
        {
          code: `
      // False positive scenario: parameter controls loop behavior in compound condition
      function block(ordinary) {
        let indent = 0;
        while (!ordinary && getIndent() > indent) {
          indent++;
        }
      }`,
        },
        {
          code: `
      // False positive scenario: parameter in OR condition with changing variable
      function scanHexDigits(minCount, scanAsManyAsPossible) {
        let digits = 0;
        while (digits < minCount || scanAsManyAsPossible) {
          if (!isHexDigit(getChar())) {
            break;
          }
          digits++;
        }
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
  });
});
