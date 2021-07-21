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
import { rule } from 'rules/no-empty-alternatives';

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: 'module' } });
ruleTester.run('Alternation with empty alternatives', rule, {
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
          message: 'Remove this empty alternative.',
          line: 1,
          endLine: 1,
          column: 1,
          endColumn: 4,
        },
      ],
    },
    {
      code: `/a|/`,
      errors: 1,
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
      errors: 1,
    },
    {
      code: `/(|)/`,
      errors: 1,
    },
    {
      code: `/(?:|)/;`,
      errors: 1,
    },
  ],
});
