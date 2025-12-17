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

const validTestCases = [
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
      // False positive scenario: local variable in compound condition with other changing variables
      // Pattern from yaml-lint: detectedIndent doesn't change but other variables do
      function parseIndent() {
        let detectedIndent = false;
        let lineIndent = 0;
        let ch = getChar();
        while ((!detectedIndent || lineIndent < 4) && ch === 0x20) {
          lineIndent++;
          ch = getChar();
        }
      }`,
  },
  {
    code: `
      // False positive scenario: variable in simple compound condition where other part changes
      // Pattern from json_parse: ch appears in condition and changes in loop
      function skipWhitespace() {
        let ch = getChar();
        while (ch && ch <= ' ') {
          ch = getChar();
        }
      }`,
  },
  {
    code: `
      // False positive scenario: file-scope variable modified by function expression
      // Pattern from json_parse: ch is file-scope, next is a function expression that modifies it
      var at = 0;
      var ch = '';
      var text = 'input text';

      var next = function() {
        ch = text.charAt(at);
        at += 1;
        return ch;
      };

      function white() {
        while (ch && ch <= ' ') {
          next();
        }
      }`,
  },
  {
    code: `
      // False positive scenario: loop with break statement
      // Pattern from paper.js: valid is local but loop has breaks
      function processSegments(segments) {
        for (var i = 0; i < segments.length; i++) {
          var seg = segments[i];
          var valid = isValid(seg);

          while (valid) {
            if (shouldFinish(seg)) {
              seg.visited = true;
              break;
            }
            if (!isValid(seg)) {
              break;
            }
            seg = getNext(seg);
          }
        }
      }`,
  },
  {
    code: `
      // False positive scenario: function call in loop condition modifies variable
      // Pattern from json_parse.js: next() modifies ch, which is also in the condition
      var at = 0;
      var ch = '';
      var text = 'some text';

      var next = function() {
        ch = text.charAt(at);
        at += 1;
        return ch;
      };

      function parseNumber() {
        var string = '';
        while (next() && ch >= '0' && ch <= '9') {
          string += ch;
        }
        return string;
      }`,
  },
  {
    code: `
      // False positive scenario: local variable with switch and break
      // Pattern from csslint.js: c is not modified but loop has break
      function tokenize() {
        var c = getChar();
        while (c) {
          switch (c) {
            case 'a':
              processA();
              break;
            case 'b':
              processB();
              break;
          }
          break; // Always exits after one iteration
        }
      }`,
  },
  {
    code: `
      // False positive scenario: local variable with default case without break, then break outside
      // Pattern from csslint.js: default case has no break, but there's a break after the switch
      function tokenize() {
        var c = getChar(), token;
        while (c) {
          switch (c) {
            case '/':
              token = 1;
              break;
            default:
              token = 2;
          }
          break; // Always exits after one iteration
        }
      }`,
  },
  {
    code: `
      // False positive scenario: method context with large switch and break
      // Pattern from ace csslint.js:4691
      var TokenStream = {};
      TokenStream.prototype = {
        _getToken: function() {
          var c, reader = this._reader, token = null;
          c = reader.read();
          while (c) {
            switch (c) {
              case "/":
                if (reader.peek() === "*") {
                  token = this.commentToken(c);
                } else {
                  token = this.charToken(c);
                }
                break;
              case "|":
              case "~":
                if (reader.peek() === "=") {
                  token = this.comparisonToken(c);
                } else {
                  token = this.charToken(c);
                }
                break;
              case "\\\\":
                token = this.identOrFunctionToken(c);
                break;
              default:
                token = this._getDefaultToken(c);
            }
            break;
          }
          return token;
        }
      };`,
  },
  {
    code: `
      // False positive scenario: parameter in OR condition with break
      // Pattern from TypeScript scanner: scanAsManyAsPossible is parameter
      function scanHexDigits(minCount, scanAsManyAsPossible) {
        var digits = 0;
        while (digits < minCount || scanAsManyAsPossible) {
          var ch = getChar();
          if (ch >= '0' && ch <= '9') {
            digits++;
          } else {
            break;
          }
        }
      }`,
  },
  {
    code: `
      // False positive scenario: for loop with parameter in compound condition
      // Pattern from knockout: parameter limitFailedCompares with changing variables
      function findMatches(left, right, limitFailedCompares) {
        var failedCompares, l, leftItem, rightItem;
        for (failedCompares = l = 0; (!limitFailedCompares || failedCompares < limitFailedCompares) && (leftItem = left[l]); ++l) {
          rightItem = findMatch(leftItem);
          if (rightItem) {
            failedCompares = 0;
          }
          failedCompares += 1;
        }
      }`,
  },
  {
    code: `
      // False positive scenario: complex compound condition with changing variable
      // Pattern from TypeScript: multiple logical operators with variable that changes
      function processContainers(container, declarationContainer) {
        var flowContainer = getFlowContainer();
        while (flowContainer !== declarationContainer &&
               (flowContainer.kind === 186 || flowContainer.kind === 187) &&
               isConstVariable(flowContainer)) {
          flowContainer = getFlowContainer();
        }
      }`,
  },
];

const invalidTestCases = [
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
];

describe('S2189', () => {
  it('S2189', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run('Loops should not be infinite', rule, {
      valid: validTestCases,
      invalid: invalidTestCases,
    });
  });
});
