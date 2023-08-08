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
import { TypeScriptRuleTester } from '../tools';
import { rule } from '../../src/rules/sonar-no-invalid-regexp';

const ruleTesterTs = new TypeScriptRuleTester();
ruleTesterTs.run('Malformed regular expressions', rule, {
  valid: [
    {
      code: `new RegExp("\\\\(\\\\[");`,
    },
    {
      code: `new RegExp("\\\\(\\\\[", "g");`,
    },
    {
      code: `str.match("\\\\(\\\\[");`,
    },
    {
      code: `str.replace("([", "{");`,
    },
    {
      code: `'xxx'.match();`,
    },
    {
      code: `foo.match('[');`,
    },
    {
      code: `
        new RegExp();
        new RegExp('foo', 4);
      `,
    },
  ],
  invalid: [
    {
      code: `new RegExp("([");`,
      errors: [
        {
          message: 'Invalid regular expression: /([/: Unterminated character class',
          line: 1,
          column: 1,
          endLine: 1,
          endColumn: 17,
        },
      ],
    },
    {
      code: `'xxx'.match("([");`,
      errors: [
        {
          message: 'Invalid regular expression: /([/: Unterminated character class',
          line: 1,
          column: 1,
          endLine: 1,
          endColumn: 18,
        },
      ],
    },
    {
      code: `new RegExp("\\\\(\\\\[", "a");`,
      errors: [
        {
          message: "Invalid flags supplied to RegExp constructor 'a'",
          line: 1,
          column: 1,
          endLine: 1,
          endColumn: 26,
        },
      ],
    },
  ],
});
