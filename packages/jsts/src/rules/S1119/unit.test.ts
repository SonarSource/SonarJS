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
import { rule } from './index.js';
import { DefaultParserRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

const ruleTester = new DefaultParserRuleTester();
describe('S1119', () => {
  it('S1119', () => {
    ruleTester.run('Labels should not be used', rule, {
      valid: [
        {
          code: `
      let x = doSomething();
      if (x <= 0) {
        doSomethingElse();
      }`,
        },
        {
          // Compliant: break from nested for-loop
          code: `
      outer: for (var cur = target; cur != display.scroll; cur = cur.parentNode) {
        for (var i = 0; i < view.length; i++) {
          if (view[i].node == cur) {
            display.currentTarget = cur;
            break outer;
          }
        }
      }`,
        },
        {
          // Compliant: continue from nested for-loop
          code: `
      function f() {
        outer: do {
          for (var i = 0; i < chunk.children.length; ++i) {
            var child = chunk.children[i];
            if (h < child.height) { chunk = child; continue outer; }
            h -= child.height;
          }
          return n;
        } while (true);
      }`,
        },
        {
          // Compliant: continue from nested for-of
          code: `
      loopTags: for (var tag of newTags) {
        for (var existing of existingTags) {
          if (existing.id === tag.id) continue loopTags;
        }
        result.push(tag);
      }`,
        },
        {
          // Compliant: continue from nested loop (infinite for)
          code: `
      function f() {
        search: for (;;) {
          var line = doc.getLine(curPos.line);
          if (line.markedSpans) {
            for (var i = 0; i < line.markedSpans.length; ++i) {
              var sp = line.markedSpans[i];
              if (sp.from != null && sp.from <= curPos.ch) {
                curPos = { line: curPos.line, ch: sp.to };
                continue search;
              }
            }
          }
          return curPos;
        }
      }`,
        },
        {
          // Compliant: break from nested for-of
          code: `
      propLoop: for (var key in obj) {
        for (var validator of validators) {
          if (!validator(key, obj[key])) {
            invalid = key;
            break propLoop;
          }
        }
      }`,
        },
        {
          // Compliant: continue from nested for-loop
          code: `
      outer: for (var i = 0, j = 0; i < curSize; i++) {
        var child = curNode.child(i);
        for (var scan = j, e = Math.min(oldSize, i + 5); scan < e; scan++) {
          if (oldNode.child(scan) === child) {
            j = scan + 1;
            continue outer;
          }
        }
        changedDescendants(oldNode, child, callback, offset);
      }`,
        },
        {
          // Compliant: break from nested while
          code: `
      outer: while (true) {
        var next = null;
        while (true) {
          if (node === anchorNode) {
            length += anchorOffset;
            break outer;
          }
          if (node.firstChild !== null) {
            next = node.firstChild;
            break;
          }
          if (node === root) {
            break outer;
          }
          while (node.nextSibling === null) {
            node = node.parentNode;
            if (node === root) {
              break outer;
            }
          }
          node = node.nextSibling;
          break;
        }
        if (next !== null) {
          node = next;
        }
      }`,
        },
        {
          // Compliant: break and continue from nested loop
          code: `
      outer: for (var i = 0; i < rows.length; i++) {
        for (var j = 0; j < cols.length; j++) {
          if (rows[i][j] === null) break outer;
          if (rows[i][j] === target) continue outer;
        }
      }`,
        },
      ],
      invalid: [
        {
          code: `
      myLabel: {
        let x = doSomething();
        if (x > 0) {
          break myLabel;
        }
        doSomethingElse();
      }
`,
          errors: [
            {
              message: `Refactor the code to remove this label and the need for it.`,
              line: 2,
              endLine: 2,
              column: 7,
              endColumn: 14,
            },
          ],
        },
        {
          // break not inside a nested loop
          code: `
      outer: for (var i = 0; i < n; i++) {
        if (i === target) break outer;
      }`,
          errors: 1,
        },
        {
          // label on loop with no references
          code: `
      empty: for (var i = 0; i < n; i++) {
        doSomething(i);
      }`,
          errors: 1,
        },
        {
          // label on non-loop body
          code: `
      myLabel: if (condition) {
        break myLabel;
      }`,
          errors: 1,
        },
        {
          // label on block (non-loop), not on the loop itself
          code: `
      myLabel: {
        for (var i = 0; i < n; i++) {
          if (done) break myLabel;
        }
      }`,
          errors: 1,
        },
      ],
    });
  });
});
