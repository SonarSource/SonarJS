/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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
import { decorateUseIsNan } from 'linting/eslint/rules/decorators/use-isnan-decorator';

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });
const rule = decorateUseIsNan(eslintRules['use-isnan']);

ruleTester.run(`Decorated rule should provide suggestion`, rule, {
  valid: [
    {
      code: `if (isNaN(n)) {}`,
    },
  ],
  invalid: [
    {
      code: `if (n == NaN) {}`,
      errors: [
        {
          suggestions: [
            {
              desc: `Use "isNaN()"`,
              output: `if (isNaN(n)) {}`,
            },
            {
              desc: `Use "Number.isNaN()"`,
              output: `if (Number.isNaN(n)) {}`,
            },
          ],
        },
      ],
    },
    {
      code: `if (n != NaN) {}`,
      errors: [
        {
          suggestions: [
            {
              output: `if (!isNaN(n)) {}`,
            },
            {
              output: `if (!Number.isNaN(n)) {}`,
            },
          ],
        },
      ],
    },
    {
      code: `if (Number.NaN === n) {}`,
      errors: [
        {
          suggestions: [
            {
              output: `if (isNaN(n)) {}`,
            },
            {
              output: `if (Number.isNaN(n)) {}`,
            },
          ],
        },
      ],
    },
    {
      code: `switch (n) { case NaN: break; }`,
      errors: [{ suggestions: [] }],
    },
    {
      code: `if (n < NaN) {}`,
      errors: [{ suggestions: [] }],
    },
  ],
});
