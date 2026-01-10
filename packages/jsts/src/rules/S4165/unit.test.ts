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
import { NoTypeCheckingRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { describe, it } from 'node:test';

describe('S4165', () => {
  it('S4165', () => {
    const ruleTesterTs = new NoTypeCheckingRuleTester();

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
        // False positive scenario: for-loop re-initialization should NOT raise an issue
        // The variable j is re-initialized in the inner for-loop header; this is idiomatic
        {
          code: `var dedentStringsArray = function (template) {
      var length = 10;
      var lines = [];
      for (var i = 0; i < length; i++) {
        for (var j = 2; j < lines.length; j += 2) {
          console.log(lines[j]);
        }
      }
    };`,
        },
        // For-loop re-initialization with assignment expression (not var declaration)
        // When i is declared outside and re-initialized in for-loop init
        {
          code: `function forLoopReinitialization() {
      var i = 0;
      for (i = 0; i < 10; i++) {
        console.log(i);
      }
    }`,
        },
        // Multiple for-loops re-initializing the same variable
        {
          code: `function multipleForLoops() {
      var i;
      for (i = 0; i < 5; i++) {
        console.log(i);
      }
      for (i = 0; i < 10; i++) {
        console.log(i);
      }
    }`,
        },
        // For-loop with sequence expression in init (i = 0, j = 0)
        {
          code: `function sequenceExpressionInit() {
      var i = 0, j = 0;
      for (i = 0, j = 0; i < 10; i++, j++) {
        console.log(i, j);
      }
    }`,
        },
        // Switch case with for-loop re-initialization (from ruling context)
        {
          code: `function switchWithForLoop(shapeMode, verts) {
      var i = 0;
      switch (shapeMode) {
        case 'TRIANGLE_STRIP':
          for (i = 0; i < verts - 2; i++) {
            console.log(i);
          }
          break;
        case 'TRIANGLES':
          for (i = 0; i < verts - 2; i += 3) {
            console.log(i);
          }
          break;
      }
    }`,
        },
        // For-loop with var re-declaration (var hoisting case from ruling context)
        // Variable i is declared with var at outer scope and re-declared in for-loop init
        {
          code: `function varRedeclarationInForLoop(selections) {
      var i = 0;
      if (selections === undefined || selections.length === 0) {
        selections = [{ cursor: null }];
      }
      for (var i = 0, n = selections.length; i < n; i++) {
        console.log(selections[i]);
      }
    }`,
        },
        // For-loop with let declaration - new scope per iteration
        // The inner let i shadows the outer let i
        {
          code: `function letForLoopInit(items) {
      let i = 0;
      for (let i = 0; i < items.length; i++) {
        console.log(items[i]);
      }
    }`,
        },
        // Variable declaration inside for-loop body with compound assignment
        // Each iteration creates a fresh variable, so initialization is not redundant
        // (from ruling: p5.js:src/image/image.js:233)
        {
          code: `function varDeclInsideForLoopWithModification(numFrames, palette) {
      for (let i = 0; i < numFrames; i++) {
        let powof2 = 1;
        while (powof2 < palette.length) {
          powof2 <<= 1;
        }
        console.log(powof2);
      }
    }`,
        },
        // Variable declaration inside while-loop body
        // Each iteration reinitializes, not redundant
        // (from ruling: ace:src/mode/folding/vbscript.js:165)
        {
          code: `function varDeclInsideWhileLoop(stream) {
      var token;
      while (token = stream.step()) {
        var outputRange = null;
        var ignore = false;
        if (token.type === 'keyword') {
          outputRange = { start: 0, end: 10 };
        }
        console.log(outputRange, ignore);
      }
    }`,
        },
        // Variable declaration inside do-while loop body
        {
          code: `function varDeclInsideDoWhileLoop() {
      let count = 0;
      do {
        let result = 0;
        result = compute();
        count++;
      } while (count < 10);
    }`,
        },
        // Variable declaration inside for-of loop body
        {
          code: `function varDeclInsideForOfLoop(items) {
      for (const item of items) {
        let processed = false;
        if (item.valid) {
          processed = true;
        }
        console.log(processed);
      }
    }`,
        },
        // Variable declaration inside for-in loop body
        {
          code: `function varDeclInsideForInLoop(obj) {
      for (const key in obj) {
        var value = null;
        if (obj.hasOwnProperty(key)) {
          value = obj[key];
        }
        console.log(value);
      }
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
              messageId: 'reviewAssignment',
              line: 6,
            },
          ],
        },
        // Redundant assignment in if-else else branch when variable is initialized to same value
        // (pattern from ruling: ant-design iconUtil.tsx:72, Ghost description.js:11)
        {
          code: `function redundantElseBranch() {
        let icon = null;
        if (cond1) {
          icon = "check";
        } else if (cond2) {
          icon = "cross";
        } else {
          icon = null; // Noncompliant - already null
        }
      }`,
          errors: 1,
        },
        // Redundant assignment in switch case else branch
        // (pattern from ruling: TypeScript formatting.ts:770, ace javascript_worker.js:146)
        {
          code: `function redundantSwitchCase() {
        let type = "warning";
        switch (raw) {
          case "error":
            type = "error";
            break;
          case "info":
            type = "info";
            break;
          case "unknown":
            type = "warning"; // Noncompliant - already "warning"
            break;
        }
      }`,
          errors: 1,
        },
        // Redundant reassignment in if branch when condition doesn't change the value
        // (pattern from ruling: ace document.js:346)
        {
          code: `function redundantInIfBranch() {
        var column = 0;
        if (row < length) {
          column = 0; // Noncompliant - already 0
        } else {
          column = getLength();
        }
      }`,
          errors: 1,
        },
      ],
    });
  });
});
