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
import { NodeRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';

const ruleTester = new NodeRuleTester({ parserOptions: { ecmaVersion: 2018 } });
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
