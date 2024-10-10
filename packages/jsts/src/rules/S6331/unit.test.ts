/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import { rule } from './index.js';

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: 'module' } });
ruleTester.run('Empty groups', rule, {
  valid: [
    {
      code: `/\\(\\)/`,
    },
    {
      code: `/(a)/`,
    },
    {
      code: `/(a|)/`,
    },
    {
      code: `/(a|b)/`,
    },
    {
      code: `/(\d+)/`,
    },
  ],
  invalid: [
    {
      code: `/()/`,
      errors: [
        {
          message: 'Remove this empty group.',
          line: 1,
          endLine: 1,
          column: 2,
          endColumn: 4,
        },
      ],
    },
    {
      code: `new RegExp("\\u{000000000061}()")`,
      errors: [
        {
          message: 'Remove this empty group.',
          line: 1,
          endLine: 1,
          column: 29,
          endColumn: 31,
        },
      ],
    },
    {
      code: `/(|)/`,
      errors: 1,
    },
    {
      code: `/(?:)/`,
      errors: 1,
    },
    {
      code: `new RegExp('')`, // parsed as /(?:)/
      errors: 1,
    },
    {
      // \u0009 is unicode escape for TAB
      code: `new RegExp('\\u0009(|)')`,
      errors: [
        {
          message: 'Remove this empty group.',
          line: 1,
          endLine: 1,
          column: 19,
          endColumn: 22,
        },
      ],
    },
    {
      code: `new RegExp('\\t(|)')`,
      errors: [
        {
          message: 'Remove this empty group.',
          line: 1,
          endLine: 1,
          column: 15,
          endColumn: 18,
        },
      ],
    },
    {
      code: `new RegExp('\\n(|)')`,
      errors: [
        {
          message: 'Remove this empty group.',
          line: 1,
          endLine: 1,
          column: 16,
          endColumn: 18,
        },
      ],
    },
  ],
});
