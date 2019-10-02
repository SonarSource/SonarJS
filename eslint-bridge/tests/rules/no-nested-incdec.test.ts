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
import { rule } from "../../src/rules/no-nested-incdec";

ruleTester.run("Nested increment (++) and decrement (--) operators should not be used", rule, {
  valid: [
    {
      code: `i++;`,
    },
    {
      code: `++i;`,
    },
    {
      code: `i--;`,
    },
    {
      code: `--i;`,
    },
    {
      code: `foo[i]++;`,
    },
    {
      code: `foo[-i] = 0;`,
    },
    {
      code: `let j = 0;
            for (i = 0; i < 10; i++, j++, k++) {
            }`,
    },
  ],
  invalid: [
    {
      code: `foo[i++]++;`,
      errors: [
        {
          message: "Extract this increment operation into a dedicated statement.",
          line: 1,
          column: 5,
          endLine: 1,
          endColumn: 8,
        },
      ],
    },
    {
      code: `foo[i++] = 0;`,
      errors: 1,
    },
    {
      code: `foo[i--] = 0;`,
      errors: [
        {
          message: "Extract this decrement operation into a dedicated statement.",
        },
      ],
    },
    {
      code: `foo[++i] = 0;`,
      errors: 1,
    },
    {
      code: `foo[--i] = 0;`,
      errors: 1,
    },
    {
      code: `() => {if (i == 1) {
        return i++;
      } else if (i == 2) {
        return ++i;
      } else if (i == 3) {
        return foo[++i];
      } else if (i == 4) {
        throw foo[i++];
      }}`,
      errors: [
        {
          message: "Extract this increment operation into a dedicated statement.",
          line: 2,
          column: 16,
          endLine: 2,
          endColumn: 19,
        },
        {
          message: "Extract this increment operation into a dedicated statement.",
          line: 4,
          column: 16,
          endLine: 4,
          endColumn: 19,
        },
        {
          message: "Extract this increment operation into a dedicated statement.",
          line: 6,
          column: 20,
          endLine: 6,
          endColumn: 23,
        },
        {
          message: "Extract this increment operation into a dedicated statement.",
          line: 8,
          column: 19,
          endLine: 8,
          endColumn: 22,
        },
      ],
    },
    {
      code: `if (i++) {}`,
      errors: 1,
    },
    {
      code: `i = i++ - 1;`,
      errors: [
        {
          message: "Extract this increment operation into a dedicated statement.",
          line: 1,
          column: 5,
          endLine: 1,
          endColumn: 8,
        },
      ],
    },
    {
      code: `i = 5 * --i;`,
      errors: 1,
    },
    {
      code: `console.log(i++);`,
      errors: [
        {
          message: "Extract this increment operation into a dedicated statement.",
          line: 1,
          column: 13,
          endLine: 1,
          endColumn: 16,
        },
      ],
    },
    {
      code: `foo[--i] = 0;`,
      errors: 1,
    },
    {
      code: `for (var i = 0; i < 10; i = j++ - 2, i++) {}`,
      errors: [
        {
          message: "Extract this increment operation into a dedicated statement.",
          line: 1,
          column: 29,
          endLine: 1,
          endColumn: 32,
        },
      ],
    },
    {
      code: `for (i++ ; i < 10; i++) {}`,
      errors: 1,
    },
    {
      code: `for (i++, j++ ; i < 10; i++) {}`,
      errors: 2,
    },
    {
      code: `for (var i = 0; i++ < 10; i++) {}`,
      errors: 1,
    },
    {
      code: `while (i++ > 10) {}`,
      errors: [
        {
          message: "Extract this increment operation into a dedicated statement.",
          line: 1,
          column: 8,
          endLine: 1,
          endColumn: 11,
        },
      ],
    },
    {
      code: `while (i++) {}`,
      errors: 1,
    },
    {
      code: `do {} while (i++);`,
      errors: 1,
    },
    {
      code: `for (let el of [foo[i++]]) {}`,
      errors: 1,
    },
    {
      code: `switch (i++) {
                case j--: break;
                default: break;
              }`,
      errors: [
        {
          message: "Extract this increment operation into a dedicated statement.",
          line: 1,
          column: 9,
          endLine: 1,
          endColumn: 12,
        },
        {
          message: "Extract this decrement operation into a dedicated statement.",
          line: 2,
          column: 22,
          endLine: 2,
          endColumn: 25,
        },
      ],
    },
  ],
});
