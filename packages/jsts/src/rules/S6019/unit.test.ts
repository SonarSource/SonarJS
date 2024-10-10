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
import { TypeScriptRuleTester } from '../../../tests/tools/index.js';
import { rule } from './index.js';

const ruleTesterTs = new TypeScriptRuleTester();
ruleTesterTs.run('Reluctant quantifiers followed by an optional', rule, {
  valid: [
    {
      code: `
      /a*?x/;
      /a*?[abc]/;
      /|x|a*x/;
      `,
    },
  ],
  invalid: [
    {
      code: `/a*?$/`,
      errors: [
        {
          message: `Remove the '?' from this unnecessarily reluctant quantifier.`,
          line: 1,
          column: 2,
          endLine: 1,
          endColumn: 5,
        },
      ],
    },
    {
      code: `/a*?x?/`,
      errors: [
        {
          message: `Fix this reluctant quantifier that will only ever match 0 repetitions.`,
        },
      ],
    },
    {
      code: `/a*?x*/`,
      errors: [
        {
          message: `Fix this reluctant quantifier that will only ever match 0 repetitions.`,
        },
      ],
    },
    {
      code: `/a{5,25}?/`,
      errors: [
        {
          message: `Fix this reluctant quantifier that will only ever match 5 repetitions.`,
        },
      ],
    },
    {
      code: `/a*?|a*?x?/`,
      errors: [
        {
          message: `Fix this reluctant quantifier that will only ever match 0 repetitions.`,
          column: 2,
        },
        {
          message: `Fix this reluctant quantifier that will only ever match 0 repetitions.`,
          column: 6,
        },
      ],
    },
    {
      code: `/a+?(x)?/`,
      errors: [
        {
          message: `Fix this reluctant quantifier that will only ever match 1 repetition.`,
        },
      ],
    },
    {
      code: `/foo_a+?/`,
      errors: [
        {
          message: `Fix this reluctant quantifier that will only ever match 1 repetition.`,
        },
      ],
    },
  ],
});
