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
import { eslintRules } from 'linting/eslint/rules/core';
import { decorateNoSelfCompare } from 'linting/eslint/rules/decorators/no-self-compare-decorator';

const rule = decorateNoSelfCompare(eslintRules['no-self-compare']);
const ruleTester = new RuleTester();

ruleTester.run('Number.isNaN() should be used to check for NaN value', rule, {
  valid: [`x > x`, `x < x`, `x >= x`, `x <= x`],
  invalid: [
    {
      code: `x === x`,
      errors: [
        {
          suggestions: [
            {
              desc: `Replace self-compare with Number.isNaN()`,
              output: `!Number.isNaN(x)`,
            },
          ],
        },
      ],
    },
    {
      code: `x == x`,
      errors: [
        {
          suggestions: [
            {
              desc: `Replace self-compare with Number.isNaN()`,
              output: `!Number.isNaN(x)`,
            },
          ],
        },
      ],
    },
    {
      code: `x !== x`,
      errors: [
        {
          suggestions: [
            {
              desc: `Replace self-compare with Number.isNaN()`,
              output: `Number.isNaN(x)`,
            },
          ],
        },
      ],
    },
    {
      code: `x != x`,
      errors: [
        {
          suggestions: [
            {
              desc: `Replace self-compare with Number.isNaN()`,
              output: `Number.isNaN(x)`,
            },
          ],
        },
      ],
    },
  ],
});
