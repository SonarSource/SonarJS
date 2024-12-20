/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import { RuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { describe, it } from 'node:test';

describe('S125', () => {
  it('S125', () => {
    const ruleTester = new RuleTester();
    ruleTester.run('Sections of code should not be commented out', rule, {
      valid: [
        {
          code: `
        //

        //

        /* */

        //
        //  // nested comment
        //

        /**
         * // this should be ignored
         * if (something) { return true;}
         */

        /*jslint bitwise: false, browser: true, continue: false, devel: true, eqeq: false, evil: false, forin: false, newcap: false, nomen: false, plusplus: true, regexp: true, stupid: false, sub: false, undef: false, vars: false */

        /*jshint bitwise: false, curly: true, eqeqeq: true, forin: true, immed: true, latedef: true, newcap: true, noarg: true, noempty: false, nonew: true, plusplus: false, regexp: false, undef: true, strict: true, trailing: true, expr: true, regexdash: true, browser: true, jquery: true, onevar: true, nomen: true */

        /*global myGlobal: true */

        // ====

        // ----

        // ++++

        // some text with semicolon at the end;

        // http://www.example.com/ = http://www.example.com/

        // labelName : id

        // foo(), bar();

        // continue

        // return blabla

        // break something

        // throw exception

        // throw exception;

        // labelName : id;

        const a = 1; // TODO: $ReadOnlyArray
        const b = 2; // TODO: Not in spec

        //\t\t\t\tbreak;

        // foo.bar

        // a + b

        // foo (see [123])

        // IE

        // shift

        // reduce

        //Object;

        //+ 10;

        // '\\r\\n'
        const c = 1; // '\\n'

        // "abc";

        // 42;

        //"gradientunscaled";

        // some text with some code is ok
        // if (condition) {
        // }


        /*
         some text with some code is ok
         if (condition) {
         }
        */

        // }
        `,
        },
        {
          // FN since 2-step implementation
          code: `
            // return foo().bar()
        `,
        },
        {
          // FN since 2-step implementation
          code: `
            // throw foo().bar()
        `,
        },
        {
          // FN since 2-step implementation
          code: `
            // YUI().use('*'); // Comment following ';'
        `,
        },
      ],
      invalid: [
        {
          code: `// if (something) {}`,
          errors: [
            {
              message: 'Remove this commented out code.',
              line: 1,
              endLine: 1,
              column: 1,
              endColumn: 21,
              suggestions: [{ desc: 'Remove this commented out code', output: '' }],
            },
          ],
        },
        {
          code: `// // nested comment
// foo(a, function(){
//     doSmth();
// });`,
          errors: [
            {
              message: 'Remove this commented out code.',
              line: 1,
              column: 1,
              endLine: 4,
              endColumn: 7,
              suggestions: [{ desc: 'Remove this commented out code', output: '' }],
            },
          ],
        },
        {
          code: `/* // nested comment
@annotation
class MyClass {}

foo(a, function(){
   doSmth();
   const a = <bv></bv>
});*/`,
          errors: [
            {
              message: 'Remove this commented out code.',
              line: 1,
              column: 1,
              endLine: 8,
              endColumn: 6,
              suggestions: [{ desc: 'Remove this commented out code', output: '' }],
            },
          ],
        },
        {
          code: `// return foo().bar();`,
          errors: [
            {
              messageId: 'commentedCode',
              suggestions: [{ desc: 'Remove this commented out code', output: '' }],
            },
          ],
        },
        {
          code: `// foo();
// bar();`,
          errors: [
            {
              messageId: 'commentedCode',
              suggestions: [{ desc: 'Remove this commented out code', output: '' }],
            },
          ],
        },
        {
          code: `/* foo();
bar(); */
const a = 1;`,
          errors: [
            {
              messageId: 'commentedCode',
              suggestions: [
                {
                  desc: 'Remove this commented out code',
                  output: `
const a = 1;`,
                },
              ],
            },
          ],
        },
        {
          code: `/* throw foo().bar(); */`,
          errors: [
            {
              messageId: 'commentedCode',
              suggestions: [{ desc: 'Remove this commented out code', output: '' }],
            },
          ],
        },
        {
          code: `// if (condition) {
//   while (condition) {
//     doSomething();`,
          errors: [
            {
              messageId: 'commentedCode',
              suggestions: [{ desc: 'Remove this commented out code', output: '' }],
            },
          ],
        },
        {
          code: `//   while (condition) {
//     doSomething();
//   }
// }`,
          errors: [
            {
              messageId: 'commentedCode',
              suggestions: [{ desc: 'Remove this commented out code', output: '' }],
            },
          ],
        },
        {
          code: `// }}`,
          errors: [
            {
              messageId: 'commentedCode',
              suggestions: [{ desc: 'Remove this commented out code', output: '' }],
            },
          ],
        },
        {
          code: `// {{`,
          errors: [
            {
              messageId: 'commentedCode',
              suggestions: [{ desc: 'Remove this commented out code', output: '' }],
            },
          ],
        },
        {
          code: `//   }
// }`,
          errors: [
            {
              messageId: 'commentedCode',
              suggestions: [{ desc: 'Remove this commented out code', output: '' }],
            },
          ],
        },
        {
          code: `let x = /* let x = 42; */ 0;`,
          errors: [
            {
              messageId: 'commentedCode',
              suggestions: [{ desc: 'Remove this commented out code', output: `let x =  0;` }],
            },
          ],
        },
        {
          code: `// if (value == 42) {
//   value++
let x = 0;`,
          errors: [
            {
              messageId: 'commentedCode',
              suggestions: [
                {
                  desc: 'Remove this commented out code',
                  output: `
let x = 0;`,
                },
              ],
            },
          ],
        },
      ],
    });
  });
});
