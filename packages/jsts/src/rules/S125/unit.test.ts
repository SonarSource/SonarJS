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

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });
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
        },
      ],
    },
    {
      code: `
        // // nested comment
        // foo(a, function(){
        //     doSmth();
        // });`,
      errors: [
        {
          message: 'Remove this commented out code.',
          line: 2,
          column: 9,
          endLine: 5,
          endColumn: 15,
        },
      ],
    },
    {
      code: `
        /* // nested comment
         foo(a, function(){
             doSmth();
         });
         */`,
      errors: [
        {
          message: 'Remove this commented out code.',
          line: 2,
          column: 9,
          endLine: 6,
          endColumn: 12,
        },
      ],
    },
    {
      code: `
            // return foo().bar();
        `,
      errors: 1,
    },
    {
      code: `
            // foo();
            // bar();
        `,
      errors: 1,
    },
    {
      code: `
            /* foo();
            bar(); */
            const a = 1;
        `,
      errors: 1,
    },
    {
      code: `
            /* throw foo().bar(); */
        `,
      errors: 1,
    },
    {
      code: `
            // if (condition) {
            //   while (condition) {
            //     doSomething();
        `,
      errors: 1,
    },
    {
      code: `
            //   while (condition) {
            //     doSomething();
            //   }
            // }
        `,
      errors: 1,
    },
    {
      code: `
            // }}
        `,
      errors: 1,
    },
    {
      code: `
            // {{
        `,
      errors: 1,
    },
    {
      code: `
            //   }
            // }
        `,
      errors: 1,
    },
    {
      code: `let x = /* let x = 42; */ 0;`,
      errors: [
        { suggestions: [{ desc: 'Remove this commented out code', output: `let x =  0;` }] },
      ],
    },
    {
      code: `// if (value == 42) {
//   value++
let x = 0;`,
      errors: [
        {
          suggestions: [
            {
              output: `
let x = 0;`,
            },
          ],
        },
      ],
    },
  ],
});
