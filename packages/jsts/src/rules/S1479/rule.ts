/*
 * eslint-plugin-sonarjs
 * Copyright (C) 2018-2021 SonarSource SA
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
import { ruleTester } from '../rule-tester';
import rule = require('../../src/rules/max-switch-cases');

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
