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
import { decorateNoThrowLiteral } from '../../../src/rules/decorators/no-throw-literal-decorator';

const ruleTester = new RuleTester();
const rule = decorateNoThrowLiteral(eslintRules['no-throw-literal']);

ruleTester.run(`Decorated rule should provide suggestion`, rule, {
  valid: [
    {
      code: `{ throw new Error('foo'); }`,
    },
  ],
  invalid: [
    {
      code: `{ throw 'foo'; }`,
      errors: [
        { suggestions: [{ output: `{ throw new Error('foo'); }`, desc: 'Throw an error object' }] },
      ],
    },
    {
      code: `{ throw 'foo' + bar(); }`,
      errors: [{ suggestions: [{ output: `{ throw new Error('foo' + bar()); }` }] }],
    },
    {
      code: `{ throw foo() + 'bar'; }`,
      errors: [{ suggestions: [{ output: `{ throw new Error(foo() + 'bar'); }` }] }],
    },
    {
      code: `{ throw 1; }`,
      errors: [{ suggestions: [] }],
    },
    {
      code: `{ throw undefined; }`,
      errors: [{ suggestions: [] }],
    },
    {
      code: `{ throw 1 + 2; }`,
      errors: [{ suggestions: [] }],
    },
  ],
});
