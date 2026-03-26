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
import { DefaultParserRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { rule } from './rule.js';
import { describe, it } from 'node:test';

describe('S2392', () => {
  it('S2392', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run('Variables should be used in the blocks where they are declared', rule, {
      valid: [
        {
          code: `
        function fun() {

          if (cond) {
            let a = 42;
          }
          if (cond) {
            let a = 0;
          }

          var b = 42;
          if (cond) {
            foo(b);
          } else {
            bar(b);
          }

          var build;
          var f;

          try {
            build = 1;
          } catch (e) {
            f = build;
          }
        }
        `,
        },
        {
          // Compliant: counter reused across sequential for-loops
          code: `
        function processOps(ops) {
          for (var i = 0; i < ops.length; i++)
            phase1(ops[i]);
          for (var i = 0; i < ops.length; i++)
            phase2(ops[i]);
          for (var i = 0; i < ops.length; i++)
            phase3(ops[i]);
        }
        `,
        },
        {
          // Compliant: for-in and for-loop share same var
          code: `
        function clearAll(items, extras) {
          for (var n in items)
            process(n);
          for (var n = extras.length - 1; n >= 0; n--)
            extras[n].remove();
        }
        `,
        },
        {
          // Compliant: multiple vars reused across sequential for-loops
          code: `
        function extend(args) {
          for (var v, b, i = 0; i < args.length; i++) {
            v = v || args[i].initialize;
            b = b || args[i].prototype;
          }
          for (var v, b, j = 0; j < args.length; j++) {
            finalize(v, b, args[j]);
          }
        }
        `,
        },
        {
          // Compliant: three sequential for-loops reusing counter at same level
          code: `
        function processAll(items) {
          for (var i = 0; i < items.length; i++)
            phase1(items[i]);
          for (var i = 0; i < items.length; i++)
            phase2(items[i]);
          for (var i = 0; i < items.length; i++)
            phase3(items[i]);
        }
        `,
        },
        {
          // Compliant: for-in and for-loop reusing var at same level
          code: `
        function detectIndentation(lines) {
          for (var i = 0; i < lines.length; i++) {
            process(lines[i]);
          }
          for (var i = 1; i < 12; i++) {
            score(i);
          }
        }
        `,
        },
        {
          // Compliant: counter reused across for-loops in if/else branches
          code: `
        function indent(cm, args) {
          if (args.indentMore) {
            for (var j = 0; j < args.repeat; j++) {
              cm.indentMore();
            }
          } else {
            for (var j = 0; j < args.repeat; j++) {
              cm.indentLess();
            }
          }
        }
        `,
        },
        {
          // Compliant: counter reused in switch case branches
          code: `
        function processOp(op, items) {
          switch (op) {
            case 'add':
              for (var i = 0; i < items.length; i++) {
                add(items[i]);
              }
              break;
            case 'remove':
              for (var i = 0; i < items.length; i++) {
                remove(items[i]);
              }
              break;
          }
        }
        `,
        },
      ],
      invalid: [
        {
          code: `
        function fun() {
          if (cond) {
            var a = 42;
          }
          if (cond) {
            var a = 0;
          }
        }
        `,
          errors: [
            {
              message: `{"message":"Consider moving declaration of 'a' as it is referenced outside current binding context.","secondaryLocations":[{"message":"Outside reference.","column":16,"line":7,"endColumn":17,"endLine":7}]}`,
              line: 4,
              endLine: 4,
              column: 17,
              endColumn: 18,
            },
          ],
          settings: { sonarRuntime: true },
        },
        {
          code: `
      function fun() {
        if (cond) {
          var a = 42; // nok
        }
        console.log(a);
      }
        `,
          errors: [
            {
              message: `{"message":"Consider moving declaration of 'a' as it is referenced outside current binding context.","secondaryLocations":[{"message":"Outside reference.","column":20,"line":6,"endColumn":21,"endLine":6}]}`,
              line: 4,
            },
          ],
          settings: { sonarRuntime: true },
        },
        {
          code: `
        function fun() {
          for (var i = 0; ;) {}
          foo(i);
          return i;
        }
        `,
          errors: [
            {
              message: `{"message":"Consider moving declaration of 'i' as it is referenced outside current binding context.","secondaryLocations":[{"message":"Outside reference.","column":14,"line":4,"endColumn":15,"endLine":4},{"message":"Outside reference.","column":17,"line":5,"endColumn":18,"endLine":5}]}`,
              line: 3,
              endLine: 3,
              column: 20,
              endColumn: 21,
            },
          ],
          settings: { sonarRuntime: true },
        },
        {
          code: `
        function fun() {
          for (var i in smth) {}
          foo(i);

          for (var j of smth) {}
          foo(j);

          switch(42) {
            case 0:
              var k = 42;
          }
          foo(k);
        }
        `,
          errors: [
            {
              message:
                "Consider moving declaration of 'i' as it is referenced outside current binding context.",
              line: 3,
            },
            {
              message:
                "Consider moving declaration of 'j' as it is referenced outside current binding context.",
              line: 6,
            },
            {
              message:
                "Consider moving declaration of 'k' as it is referenced outside current binding context.",
              line: 11,
            },
          ],
        },
        {
          // counter used after all loops — not covered by another loop's redeclaration
          code: `
        function fun() {
          for (var i = 0; i < n; i++) {}
          for (var i = 0; i < m; i++) {}
          foo(i);
        }
        `,
          errors: [
            {
              message:
                "Consider moving declaration of 'i' as it is referenced outside current binding context.",
              line: 3,
            },
          ],
        },
        {
          // var in block + for-in in sibling block — should raise at the block declaration
          code: `
        function process(args, themes) {
          if (args) {
            var name = args[0];
            use(name);
          } else {
            for (var name in themes) {
              convert(name);
            }
          }
        }
        `,
          errors: [
            {
              message:
                "Consider moving declaration of 'name' as it is referenced outside current binding context.",
              line: 4,
            },
          ],
        },
      ],
    });
  });
});
