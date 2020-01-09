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
import { rule } from "../../src/rules/function-inside-loop";

ruleTester.run(`Functions should not be defined inside loops`, rule, {
  valid: [
    {
      code: `
      `,
    },
  ],
  invalid: [
    {
      code: `
          var funs = [];     

          for (var i = 0; i < 13; i++) {
            funs[i] = function() {              // Noncompliant
              return i;
            };
          }

          for (let j = 0; j < 13; j++) {
            var y = i;
            funs[i] = function() {              // Noncompliant
              return y;
            };
          }

          var x;

          while (x = foo()) {
            funs[i] = function() {              // Noncompliant
              return x;
            };
          }

          do {
            funs[i] = function() {              // Noncompliant
              return x;
            };
          } while (x = foo())
      `,
      errors: [
        {
          message: `Define this function outside of a loop.`,
          line: 12,
        },
      ],
    },
   
  ],
});
