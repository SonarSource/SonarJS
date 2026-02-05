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

const ruleTester = new DefaultParserRuleTester();

describe('S2310 - valid patterns', () => {
  it('should allow valid patterns', () => {
    ruleTester.run('Loop counter should not be updated inside loop', rule, {
      valid: [
        {
          code: `
      let fl = false;

      for (; i < m && !fl; i++) {
        fl = true;   // Compliant
        m = 10;      // Compliant
      }
      `,
        },
        // False positive scenario: for-of loop iterator variable reassignment is safe
        // The iterator protocol controls loop progression, not the variable
        {
          code: `
      // for-of loop with iterator variable reassignment to refresh object reference
      function processItems(items, updates) {
        const results = [];

        for (let item of items) {
          // Get updated version of item if available
          const updated = updates.get(item.id);
          if (updated) {
            item = updated; // Compliant: Reassignment is safe in for-of loop
          }
          results.push(item);
        }

        return results;
      }
      `,
        },
        // False positive scenario: for-in loop iterator variable reassignment is safe
        {
          code: `
      // for-in loop with key transformation via reassignment
      function processObjectKeys(obj) {
        const results = [];

        for (let key in obj) {
          // Normalize key by removing prefix
          if (key.startsWith('_')) {
            key = key.slice(1); // Compliant: Reassignment is safe in for-in loop
          }
          results.push(key);
        }

        return results;
      }
      `,
        },
        // False positive scenario: for-of loop with value transformation
        // Real-world pattern from Angular compiler (Peachy issue)
        {
          code: `
      // for-of loop with trait transformation via method call
      function resolveTraits(traits) {
        for (let trait of traits) {
          if (trait.state === 'pending') {
            // Transform trait to resolved state
            trait = trait.toResolved(null, []); // Compliant: Safe reassignment in for-of
          }
          console.log(trait.state);
        }
      }
      `,
        },
        // for-of loop with simple iterator variable reassignment (from Jira ticket example 1/2)
        // Real-world pattern from vscode: updating profile reference during iteration
        {
          code: `
      function updateProfiles(allProfiles, updated) {
        const profiles = [];
        for (let profile of allProfiles) {
          if (!profile.isDefault) {
            profile = updated.find(p => profile.id === p.id) || profile;
          }
          profiles.push(profile);
        }
        return profiles;
      }
      `,
        },
        // for-in loop with key-to-value reassignment pattern (from ruling data - jshint.js pattern)
        // Common pattern: using the key to access the value and reassign the iterator variable
        {
          code: `
      // Real-world pattern from jshint: iterating tokens and transforming key to value
      function processTokens(tokens) {
        for (var t in tokens) {
          if (tokens.hasOwnProperty(t)) {
            t = tokens[t]; // Compliant: key-to-value reassignment in for-in is safe
            if (t.id) {
              console.log(t.id);
            }
          }
        }
      }
      `,
        },
        // False positive scenario: Pre-increment (++i) for reading multi-element tuples from a flat array
        // Intentional consumption of consecutive array elements where the loop counter
        // is advanced to skip over already-consumed elements
        {
          code: `
      function processOpcodes(opcodes) {
        for (let i = 0; i < opcodes.length; i++) {
          const opcode = opcodes[i];
          if (opcode < 0) {
            console.log('simple:', opcode);
          } else {
            const param1 = opcodes[++i]; // Compliant: pre-increment skip-ahead
            const param2 = opcodes[++i]; // Compliant: pre-increment skip-ahead
            console.log('complex:', opcode, param1, param2);
          }
        }
      }
      `,
        },
        // False positive scenario: Post-increment (i++) for skipping escape characters in string parsing
        // When an escape character is detected, the next character should be skipped
        {
          code: `
      function containsSpace(value, escapeChar) {
        for (let i = 0; i < value.length; i++) {
          const ch = value[i];
          if (ch === escapeChar) {
            i++; // Compliant: post-increment skip-ahead after escape char
          } else if (ch === ' ') {
            return true;
          }
        }
        return false;
      }
      `,
        },
        // False positive scenario: Compound assignment (i += n) for batch skip-ahead
        // When processing streamed output with multiple items, the counter is advanced
        {
          code: `
      function collectOutputText(viewModels) {
        const outputText = [];
        for (let i = 0; i < viewModels.length; i++) {
          const vm = viewModels[i];
          const { streamCount } = vm;
          if (streamCount > 1) {
            i += streamCount - 1; // Compliant: compound assignment batch skip-ahead
          }
          outputText.push(vm.outputs[0]?.data ?? '');
        }
        return outputText;
      }
      `,
        },
        // False positive scenario: i += 2 to skip path entries for renamed/copied files
        // When parsing git log output, renamed files have old/new paths on separate lines
        {
          code: `
      function isCopyOrRename(status) {
        return /^[RC]/.test(status);
      }
      function parseGitLogNumstat(lines, files) {
        let numStatIndex = 0;
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const match = /^(\\d+|-)\\t(\\d+|-)\\t/.exec(line);
          if (match) {
            if (isCopyOrRename(files[numStatIndex]?.status ?? '')) {
              i += 2; // Compliant: skip old path and new path lines
            }
            numStatIndex++;
          }
        }
      }
      `,
        },
        // Additional: decrement patterns (i--, --i, i -= n) should also be compliant
        {
          code: `
      function processReverse(items) {
        for (let i = items.length - 1; i >= 0; i--) {
          if (items[i] === 'skip') {
            i--; // Compliant: post-decrement skip-back
          }
        }
      }
      `,
        },
        {
          code: `
      function processWithPreDecrement(items) {
        for (let i = items.length - 1; i >= 0; i--) {
          if (items[i] === 'multi') {
            const prev = items[--i]; // Compliant: pre-decrement for consuming previous
            console.log(prev);
          }
        }
      }
      `,
        },
        {
          code: `
      function processWithCompoundDecrement(items, skipCount) {
        for (let i = items.length - 1; i >= 0; i--) {
          if (items[i] === 'batch') {
            i -= skipCount; // Compliant: compound subtraction skip-back
          }
        }
      }
      `,
        },
        // From ruling data: splice with decrement pattern to maintain valid index
        // Common pattern when removing items from arrays during iteration
        {
          code: `
      function removeEmptyItems(items) {
        for (let i = 0; i < items.length; i++) {
          if (!items[i]) {
            items.splice(i, 1);
            i--; // Compliant: post-decrement after splice to maintain valid index
          }
        }
        return items;
      }
      `,
        },
        // From ruling data: inline decrement in splice call
        {
          code: `
      function cleanTokens(token) {
        for (var i = 1; i < token.data.length; i++) {
          if (!token.data[i].nodeName) {
            token.data.splice(i--, 1); // Compliant: inline decrement in splice argument
          }
        }
      }
      `,
        },
        // From ruling data: pre-increment in while loop condition controlling outer for-loop counter
        {
          code: `
      function moveLines(ranges, dir) {
        for (var i = 0; i < ranges.length; i++) {
          var first = ranges[i];
          while (++i < ranges.length) { // Compliant: pre-increment in while condition
            var sub = ranges[i];
            if (sub.first > first.last + 1) break;
          }
          i--; // Compliant: adjust after while loop
        }
      }
      `,
        },
        // From ruling data: post-increment in array access assignment
        {
          code: `
      function replaceElement(arr, index, newNode, removeCount) {
        arr[index++] = newNode; // Compliant: post-increment in array index
        for (var j = index; j < arr.length; j++) {
          arr[j] = arr[j + removeCount - 1];
        }
      }
      `,
        },
        // From ruling data: surrogate pair processing - skip next char after high surrogate
        {
          code: `
      function encodeSurrogatePairs(string) {
        var result = '';
        for (var i = 0; i < string.length; i++) {
          var char = string.charCodeAt(i);
          if (char >= 0xD800 && char <= 0xDBFF) {
            var nextChar = string.charCodeAt(i + 1);
            if (nextChar >= 0xDC00 && nextChar <= 0xDFFF) {
              result += encodeHex((char - 0xD800) * 0x400 + nextChar - 0xDC00 + 0x10000);
              i++; // Compliant: skip the low surrogate already processed
              continue;
            }
          }
          result += string[i];
        }
        return result;
      }
      `,
        },
        // From ruling data: processing coordinate pairs (x,y) from flat array
        {
          code: `
      function drawPath(ctx, coords) {
        for (var i = 0; i < coords.length; i++) {
          var x = coords[i];
          var y = coords[++i]; // Compliant: pre-increment to read y coordinate
          ctx.lineTo(x, y);
        }
      }
      `,
        },
      ],
      invalid: [],
    });
  });
});

describe('S2310 - invalid patterns', () => {
  it('should detect invalid patterns', () => {
    ruleTester.run('Loop counter should not be updated inside loop', rule, {
      valid: [],
      invalid: [
        {
          code: `
        for (var i = 0, j = 2; i < 5; i++) {
          i = 5;      // Noncompliant
          j = 5;      // compliant, not in update section
        }
      `,
          errors: [
            {
              line: 3,
              column: 11,
              endColumn: 12,
              message: String.raw`{"message":"Remove this assignment of \"i\".","secondaryLocations":[{"message":"Counter variable update","column":38,"line":2,"endColumn":39,"endLine":2}]}`,
            },
          ],
          settings: { sonarRuntime: true },
        },
        {
          code: `
        for (var i; i < 5; i++) {
          i = 5;     // Noncompliant
        }
      `,
          errors: 1,
        },
        {
          code: `
        var i;
        i = 0;
        for (; i < 5; i++) {
          i = 5;     // Noncompliant
        }
      `,
          errors: 1,
        },
        {
          code: `
        var k, t, l, m;
        for (k = 0, t = 6, l = 2; k < 5; k++) {
          k = 5;      // Noncompliant
          l = 5;      // Compliant
        }

        for (m = 0; m < 5; m++) {
          m = 5;      // Noncompliant
        }
      `,
          errors: [
            { message: 'Remove this assignment of "k".', line: 4 },
            { message: 'Remove this assignment of "m".', line: 9 },
          ],
        },
        {
          code: `
        var x = 5;

        for (x += 2; x < 5; x++) {
          x = 5;      // Noncompliant
        }
      `,
          errors: [
            {
              line: 5,
              message: String.raw`{"message":"Remove this assignment of \"x\".","secondaryLocations":[{"message":"Counter variable update","column":28,"line":4,"endColumn":29,"endLine":4}]}`,
            },
          ],
          settings: { sonarRuntime: true },
        },
        // Simple assignments should still be flagged
        {
          code: `
      let i = 0, j = 0, k = 0;
      for (;; ++i, j--, k++) {
        i = 5; // Noncompliant: simple assignment
        j = 5; // Noncompliant: simple assignment
        k = 5; // Noncompliant: simple assignment
      }
      `,
          errors: 3,
        },
        {
          code: `
      for (var x = foo(); ; x=next()) {
        x = next(); // Noncompliant
      }
      `,
          errors: 1,
        },
        {
          code: `
      function description_sample_code() {
        var names = [ "Jack", "Jim", "", "John" ];
        for (var i = 0; i < names.length; i++) {
          if (!names[i]) {
            i = names.length;       // Noncompliant
          } else {
            console.log(names[i]);
          }
        }

        i = 42;  // Compliant, out of loop

        for (var name of names) {
          if (!name) {
            break;
          } else {
            console.log(name);
          }
        }

      }
      `,
          errors: [{ message: 'Remove this assignment of "i".', line: 6 }],
        },
        {
          code: `
      function used_several_times(obj) {
        for (var i = 0; i < 10; i++) {
          for (var j = 0; j < 10; j++, i++) {  // Noncompliant
            i = 10;    // Noncompliant x2
          }
        }
      }
      `,
          errors: [
            {
              line: 4,
              column: 40,
              message: String.raw`{"message":"Remove this assignment of \"i\".","secondaryLocations":[{"message":"Counter variable update","column":32,"line":3,"endColumn":33,"endLine":3}]}`,
            },
            {
              line: 5,
              column: 13,
              message: String.raw`{"message":"Remove this assignment of \"i\".","secondaryLocations":[{"message":"Counter variable update","column":32,"line":3,"endColumn":33,"endLine":3}]}`,
            },
            {
              line: 5,
              column: 13,
              message: String.raw`{"message":"Remove this assignment of \"i\".","secondaryLocations":[{"message":"Counter variable update","column":39,"line":4,"endColumn":40,"endLine":4}]}`,
            },
          ],
          settings: { sonarRuntime: true },
        },
      ],
    });
  });
});
