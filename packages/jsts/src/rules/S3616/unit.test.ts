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
import { rule } from './/index.js';

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });
ruleTester.run('Comma and logical OR operators should not be used in switch cases', rule, {
  valid: [
    {
      code: `switch (a) {
             case 0:         // OK
             case 1:         // OK
             case "a" && "b":  // OK, no logical or
               foo1();
             case "a" && "b" || "c": // OK
              foo2();
              break;
      }`,
    },
    {
      code: `switch (true) {
               case cond1() || cond2(): 
                 break;
             }`,
    },
    {
      code: `switch (a) {
               case 2: 
                 switch (true) {
                   case cond3() || cond4(): 
                     break;
                 }
                 break;
             }`,
    },
  ],
  invalid: [
    {
      code: `switch (a) {
             case 2,3:       // Noncompliant
              foo2();
              break;
             case "a","b","c","d": // Noncompliant
              foo3();
              break;
             case bar(), baz(): // Noncompliant
              foo();
              break;
             default:
              foo4();
      }`,
      errors: [
        {
          message:
            'Explicitly specify 2 separate cases that fall through; currently this case clause only works for "3".',
          line: 2,
          endLine: 2,
          column: 19,
          endColumn: 22,
        },
        {
          message:
            'Explicitly specify 4 separate cases that fall through; currently this case clause only works for "d".',
          line: 5,
          endLine: 5,
          column: 19,
          endColumn: 34,
        },
        {
          message:
            'Explicitly specify 2 separate cases that fall through; currently this case clause only works for "baz()".',
          line: 8,
          endLine: 8,
          column: 19,
          endColumn: 31,
        },
      ],
    },
    {
      code: `switch (a) {
             case 2 || 3:       // Noncompliant
              foo2();
              break;
             case "a" || "b" || "c" || "d": // Noncompliant
              foo3();
              break;
             case bar() || baz(): // Noncompliant
              foo();
              break;
             default:
              foo4();
        }`,
      errors: [
        {
          message:
            'Explicitly specify 2 separate cases that fall through; currently this case clause only works for "2".',
          line: 2,
          endLine: 2,
          column: 19,
          endColumn: 25,
        },
        {
          message:
            'Explicitly specify 4 separate cases that fall through; currently this case clause only works for "a".',
          line: 5,
          endLine: 5,
          column: 19,
          endColumn: 43,
        },
        {
          message:
            'Explicitly specify 2 separate cases that fall through; currently this case clause only works for "bar()".',
          line: 8,
          endLine: 8,
          column: 19,
          endColumn: 33,
        },
      ],
    },
    {
      code: `switch (true) {
               case cond1() || cond2(): 
                 switch (a) {
                   case cond3() || cond4(): 
                     break;
                 }
                 break;
             }`,
      errors: 1,
    },
  ],
});
