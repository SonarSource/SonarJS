/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2019 SonarSource SA
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
import { RuleTester } from "eslint";

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });
import { rule } from "../../src/rules/no-same-line-conditional";

ruleTester.run("Conditionals should start on new lines", rule, {
  valid: [
    {
      code: `
      if (cond1) {
      } else if (cond2) {
      } else {
      }`,
    },
    {
      code: `
      if (cond1) {
      } else if (cond2) {
      } else if (cond3) {
      }`,
    },
    {
      code: `
      if (cond1) {
      }
      if (cond2) {
      } else if (cond3) {
      }`,
    },
    {
      code: `
      if (cond1)
        doSomething();
      if (cond2) {
      }`,
    },
    {
      code: `foo(); if (cond) bar();`,
    },
    {
      // OK if everything is on one line
      code: `if (cond1) foo(); if (cond2) bar();`,
    },
  ],
  invalid: [
    {
      code: `
      if (cond1) {
      } if (cond2) {
      }`,
      errors: [
        {
          message:
            '{"message":"Move this \\"if\\" to a new line or add the missing \\"else\\".","secondaryLocations":[{"column":6,"line":3,"endColumn":7,"endLine":3}]}',
          line: 3,
          endLine: 3,
          column: 9,
          endColumn: 11,
        },
      ],
    },
    {
      code: `
      if (cond1) {
      } else if (cond2) {
      } if (cond3) {
      }`,
      errors: [
        {
          message:
            '{"message":"Move this \\"if\\" to a new line or add the missing \\"else\\".","secondaryLocations":[{"column":6,"line":4,"endColumn":7,"endLine":4}]}',
          line: 4,
          endLine: 4,
          column: 9,
          endColumn: 11,
        },
      ],
    },
  ],
});
