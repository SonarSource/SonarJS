/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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
import { rule } from 'rules/sonar-no-regex-spaces';

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: 'module' } });
ruleTester.run('Regex with multiple spaces', rule, {
  valid: [
    {
      code: `/a/`,
    },
    {
      code: `/()/`,
    },
    {
      code: `/(?:)/`,
    },
    {
      code: `/a|b/`,
    },
    {
      code: `/a|b|c/`,
    },
  ],
  invalid: [
    {
      code: `/|/`,
      errors: [
        {
          message: 'Use number quantifier ({2}) these multiple spaces with ',
          line: 1,
          endLine: 1,
          column: 2,
          endColumn: 3,
        },
        {
          message: 'Remove this empty alternative.',
          line: 1,
          endLine: 1,
          column: 2,
          endColumn: 3,
        },
      ],
    },
    {
      code: `/a|/`,
      errors: [
        {
          message: 'Remove this empty alternative.',
          line: 1,
          endLine: 1,
          column: 3,
          endColumn: 4,
        },
      ],
    },
    {
      code: `/|a/`,
      errors: [
        {
          message: 'Remove this empty alternative.',
          line: 1,
          endLine: 1,
          column: 2,
          endColumn: 3,
        },
      ],
    },
    {
      code: `/a|b|/`,
      errors: 1,
    },
    {
      code: `/a||b/`,
      errors: 1,
    },
    {
      code: `/||/`,
      errors: 3,
    },
    {
      code: `/(|)/`,
      errors: 1,
    },
    {
      code: `/(?:|)/;`,
      errors: 1,
    },
    {
      code: `/(a|)?/`,
      errors: 1,
    },
    {
      code: `/(a|)*/`,
      errors: 1,
    },
    {
      code: `/(a|){1,3}/`,
      errors: 1,
    },
  ],
});
