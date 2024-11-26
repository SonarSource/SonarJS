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
import { rule } from './rule.js';
import { JavaScriptRuleTester } from '../../../tests/tools/index.js';

const ruleTester = new JavaScriptRuleTester();

ruleTester.run('max-switch-cases', rule, {
  valid: [
    {
      code: `switch(i) {
      case 1:
        f();
      case 2:
        g();
    }`,
    },
    // default branch is excluded
    {
      code: `switch(i) {
      case 1:
        f();
      case 2:
        g();
      default:
        console.log("foo");
    }`,
      options: [2],
    },
    // empty branches are not counted
    {
      code: `switch(i) {
      case 1:
      case 2:
        g();
      case 3:
        console.log("foo");
    }`,
      options: [2],
    },
    // empty switch statement
    {
      code: `switch(i) {}`,
    },
  ],
  invalid: [
    {
      code: `switch(i) {
        case 1:
          f();
        case 2:
          g();
      }`,
      options: [1],
      errors: [
        {
          messageId: 'reduceNumberOfNonEmptySwitchCases',
          data: {
            numSwitchCases: 2,
            maxSwitchCases: 1,
          },
          line: 1,
          endLine: 1,
          column: 1,
          endColumn: 7,
        },
      ],
    },
  ],
});
