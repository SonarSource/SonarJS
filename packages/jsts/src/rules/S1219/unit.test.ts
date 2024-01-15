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
import { RuleTester } from 'eslint';
import { rule } from './';

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });
ruleTester.run(`"switch" statements should not contain non-case labels`, rule, {
  valid: [
    {
      code: `
      switch (k) {
        case 0:
        case 1:
          break;
      }
      `,
    },
    {
      code: `
      l: while (b) {}
      `,
    },
    {
      code: `
      switch (k) {
        case 0:
        case 1:
          function f() {
            l: while (b) {}
          }
      }
      `,
    },
    {
      code: `
      switch (k) {
        case 0:
        case 1:
          let f = function () {
            l: while (b) {}
          }
      }
      `,
    },
  ],
  invalid: [
    {
      code: `
      switch (k) {
        case 0:
        case 1:
          l: while (b) {}
      }
      `,
      errors: [
        {
          message: `Remove this misleading "l" label.`,
          line: 5,
          endLine: 5,
          column: 11,
          endColumn: 12,
        },
      ],
    },
    {
      code: `
      switch (k) {
        case 0:
        case 1:
          if (b) {
            l: while (v) {}
          }
      }
      `,
      errors: 1,
    },
    {
      code: `
      switch (k) {
        case 0:
        case 1:
          switch (l) {
            case 0:
            case 1:
              l: while (b) {}
          }
      }
      `,
      errors: 1,
    },
    {
      code: `
      switch (k) {
        case 0:
        case 1:
          l: while (b) {}
          switch (j) {
            case 0:
            case 1:
              m: while (v) {}
          }
      }
      `,
      errors: 2,
    },
  ],
});
