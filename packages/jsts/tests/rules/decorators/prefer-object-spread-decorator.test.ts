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
import { decoratePreferObjectSpread } from '../../../src/rules/decorators/prefer-object-spread-decorator';

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });
const rule = decoratePreferObjectSpread(eslintRules['prefer-object-spread']);

ruleTester.run('Object spread syntax should be used instead of Object.assign', rule, {
  valid: [
    {
      code: `Object.assign(foo, bar);`,
    },
  ],
  invalid: [
    {
      code: `const a = Object.assign({}, foo);`,
      output: `const a = { ...foo};`,
      errors: [
        {
          line: 1,
          endLine: 1,
          column: 11,
          endColumn: 24,
        },
      ],
    },
    {
      code: `const b = Object.assign({}, foo, bar);`,
      output: `const b = { ...foo, ...bar};`,
      errors: [
        {
          line: 1,
          endLine: 1,
          column: 11,
          endColumn: 24,
        },
      ],
    },
  ],
});
