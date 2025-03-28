/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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

describe('S128', () => {
  it('S128', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run('No fallthrough in switch statement', rule, {
      valid: [
        {
          code: `
        switch (x) {
          case 0:
            process.exit(1);
          default:
            doSomething();
        }
            `,
        },
        {
          code: `
        switch (x) {
          case 0:
            if (foo()) {
              hello();
              process.exit(1);
            } else {
              there();
              process.exit(1);
            }
          default:
            doSomething();
        }
            `,
        },
        {
          code: `
        switch (x) {
          case 0:
            if (foo()) {
              hello();
              process.exit(1);
            } else {
              there();
              process.exit(1);
            }
            if (bar()) {
              console.log("unreachable");
            }
          default:
            doSomething();
        }
            `,
        },
        {
          code: `
        switch (param) {}

        // with not executable clause
        switch(x) {
          case a:
            break;
          case a:
            function f () {}
        }

        // with 0 case clauses
        switch(x) {
          default:
            foo();
        }

        // case with parentheses
        switch(x) {
          case (a):
            break;
          case (b):
            break;
        }
      `,
        },
        {
          code: `
      switch ( x ) {
        case 0:
          while ( isTrue() ) {
            doSomething();
          }
          /* falls through */
        default:
          console.log("hello");
      }
            `,
        },
      ],
      invalid: [
        {
          code: `
      function func(){
        while(condition) {
          switch (param) {
            case 0: // OK
            case 1: // OK
              break;
            case 2: // OK
              return;
            case 3: // OK
              throw new Error();
            case 4: // Noncompliant
              doSomething();
            case 5: // OK
              continue;
            default: // OK
              doSomethingElse();
          }
        }
      }`,
          errors: [
            {
              message:
                'End this switch case with an unconditional break, continue, return or throw statement.',
              line: 12,
              column: 13,
              endLine: 12,
              endColumn: 17,
            },
          ],
        },

        {
          code: `
        switch (param) {
          default: // Noncompliant
            doSomething();
          case 0: // OK
            doSomethingElse();
        }`,
          errors: [{ messageId: 'switchEnd', line: 3 }],
        },
        {
          code: `
      function fun() {
        switch (param) {
          case 0: // OK
            doSomething(); break;
          case 1: // OK
            { break; }
          case 2: // Noncompliant
            {  }
          case 3: // Noncompliant
            {  doSomething(); }
          case 4: // OK
            { { return; } }
          case 5: // OK
            ;
            break;
          default: // OK
            doSomethingElse();
        }
      }
      `,
          errors: [
            { messageId: 'switchEnd', line: 8 },
            { messageId: 'switchEnd', line: 10 },
          ],
        },
        {
          code: `
      function fun(){
        switch (param) {
          case a:
            break;
          case c:
            while(d) { doSomething(); }
            break;
          case g:
            break;
          case h || i:
            break;
          case g2:
            break;
          case j && k:
            break;
          case l ? m : n:
            break;
          case x: // Noncompliant
            if (f) {
              break;
            }
          case y: // OK
            if (condition) {
              return 0;
            } else {
              return 1;
            }
          default:
            doSomething();
        }
      }
      `,
          errors: [{ messageId: 'switchEnd', line: 19 }],
        },
        {
          code: `
        function fun() {
            switch (param) {
              case 0: // Noncompliant
                doSomethingElse();
              case 1:
                break;
              default:
                doSomething();
            }
          }
    `,
          errors: [{ messageId: 'switchEnd', line: 4 }],
        },
        {
          code: `
        function fun() {
          // OK with comment
          switch (x) {
            case 0:
              foo(); // fallthrough
    
            case 2:
              foo();
              // fall-through
    
            case 3:
              foo();
              // one more comment
              // fall through
    
            case 4:
              if (condition) {
                return foo();
              }
              /* falls through */
    
            case 5:
              foo();
              // passthrough because of this and that
    
            case 6:
              foo();
              // nobreak
    
            case 7:
              foo();
              // proceed
    
            case 8:  // Noncompliant
              if (condition) {
                return foo();
              }
            case 9: // some comment
            case 10:
              bar();
          }
        }
      `,
          errors: [{ messageId: 'switchEnd', line: 35 }],
        },
        {
          code: `
        switch (x) {
          case 0:
            if (foo()) {
              process.exit(1);
            }
          default:
            doSomething();
        }
            `,
          errors: [{ messageId: 'switchEnd', line: 3 }],
        },
        {
          code: `
        switch (x) {
          case 0:
            if (foo()) {
              process.exit(1);
            }
            doSomething();
          default:
            doSomething();
        }
            `,
          errors: [{ messageId: 'switchEnd', line: 3 }],
        },
        {
          code: `
        process.exit(1);
        switch (x) {
          case 0:
            doSomething();
          default:
            doSomethingElse();
        }
            `,
          errors: [{ messageId: 'switchEnd', line: 4 }],
        },
        {
          code: `
      switch (x) {
        case 0:
          doSomething();
          ForEachRecord(target, function(options) {
              doSomethingElse();
          });
          break;
        case 1:
          doSomething();
        default:
          doSomethingElse();
      }
      
            `,
          errors: [{ messageId: 'switchEnd', line: 9 }],
        },
        {
          code: `
        function doSomething() {
            doSmth();
        }
        switch (x) {
            case 0:
                doSomething();
            case 1:
                doSomething();
            default:
                doSomethingElse();
        }
            `,
          errors: [
            { messageId: 'switchEnd', line: 6 },
            { messageId: 'switchEnd', line: 8 },
          ],
        },
      ],
    });
  });
});
