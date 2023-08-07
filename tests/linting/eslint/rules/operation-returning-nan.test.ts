/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
import { rule } from '@sonar/jsts/rules/operation-returning-nan';
import { RuleTester } from 'eslint';
import { TypeScriptRuleTester } from '../../../tools';

const ruleTesterJs = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: 'module' } });
ruleTesterJs.run('Arithmetic operation returning NaN [NoParserServices]', rule, {
  valid: [
    {
      code: `
        let x = 42 - [1,2];
      `,
    },
  ],
  invalid: [],
});

const ruleTester = new TypeScriptRuleTester();
ruleTester.run('Arithmetic operation returning NaN', rule, {
  valid: [
    {
      code: `
        let x = 42 - 7;
      `,
    },
    {
      code: ` 
          var obj1 = {}
          obj1 + 42; // concatenation 
       `,
    },
    {
      code: `
      function dates() {
        var date1 = new Date();
        var date2 = new Date();
        +date1; // ok
        date1 - date2; // ok
        date1 / date2; // ok
        new Date() / 42; // ok
        42 / new Date(); // ok
      }
    `,
    },
    {
      code: `
      null + 42; // ok
      true + 42; // ok
    `,
    },
    {
      code: `
        typeof {} == 'string';
      `,
    },
    {
      code: `
        function doSomething(something) {
           if ((typeof something === 'number' || something instanceof Number) && !isFinite(+something)) {
               console.log("hello");
           }
       }
      `,
    },
  ],
  invalid: [
    {
      code: `
        let x = 42 - [1,2];
        let y = [1,2] - 42;
      `,
      errors: [
        {
          message: `Change the expression which uses this operand so that it can't evaluate to "NaN" (Not a Number).`,
          line: 2,
          column: 22,
          endLine: 2,
          endColumn: 27,
        },
        {
          message: `Change the expression which uses this operand so that it can't evaluate to "NaN" (Not a Number).`,
          line: 3,
          column: 17,
          endLine: 3,
          endColumn: 22,
        },
      ],
    },
    {
      code: `
        var array7 = [1,2];
        array7 /= 42;
      `,
      errors: 1,
    },
    {
      code: ` 
          var obj1 = {}
          obj1 - 42; 
       `,
      errors: 1,
    },
    {
      code: `
      var array2 = [1,2];
      array2--;
    `,
      errors: 1,
    },
    {
      code: `
      foo(+[1,2]);
    `,
      errors: 1,
    },
  ],
});
