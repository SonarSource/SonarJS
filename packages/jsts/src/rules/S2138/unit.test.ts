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
import { rule } from './';
import { RuleTester } from 'eslint';
import { TypeScriptRuleTester } from '../tools';

const tests = {
  valid: [
    {
      code: `var a;`,
    },
    {
      code: `undefined = 1;`,
    },
    {
      code: `const a = { foo: "bar" };`,
    },
  ],
  invalid: [
    {
      code: `var a = undefined;`,
      errors: [
        {
          message: `Use null instead.`,
          line: 1,
          endLine: 1,
          column: 9,
          endColumn: 18,
        },
      ],
    },
    {
      code: `a = undefined;`,
      errors: 1,
    },
    {
      code: `const a = { foo: undefined };`,
      errors: 1,
    },
    {
      code: `const a = { foo: "foo", bar: { baz: undefined } };`,
      errors: 1,
    },
  ],
};

const ruleTesterJs = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });
const ruleTesterTs = new TypeScriptRuleTester();

ruleTesterJs.run('"undefined" should not be assigned [js]', rule, tests);
ruleTesterTs.run('"undefined" should not be assigned [ts]', rule, tests);
