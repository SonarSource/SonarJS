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
import { eslintRules } from '../../../src/rules/core';
import { decoratePreferTemplate } from '../../../src/rules/decorators/prefer-template-decorator';

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });
const rule = decoratePreferTemplate(eslintRules['prefer-template']);

ruleTester.run(`Template strings should be used instead of concatenation`, rule, {
  valid: [
    {
      code: `'hello' + 5;`,
    },
    {
      code: `5 + 'hello'`,
    },
    {
      code: `'hello' + 'world';`,
    },
  ],
  invalid: [
    {
      code: `5 + 'hello' + 10;`,
      errors: [
        {
          message: `Unexpected string concatenation.`,
          line: 1,
          endLine: 1,
          column: 1,
          endColumn: 17,
        },
      ],
      output: '`${5  }hello${  10}`;',
    },
    {
      code: `'hello' + 5 + 'world';`,
      output: '`hello${  5  }world`;',
      errors: 1,
    },
    {
      code: `'hello' + 'world' + 5;`,
      output: '`hello` + `world${  5}`;',
      errors: 1,
    },
    {
      code: `5 + 'hello' + 'world';`,
      output: '`${5  }hello` + `world`;',
      errors: 1,
    },
  ],
});
